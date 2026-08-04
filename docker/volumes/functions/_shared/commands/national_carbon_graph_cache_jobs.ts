import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { z } from 'zod';

import type { ActorContext } from '../command_runtime/actor_context.ts';
import type { CommandExecutionResult, CommandParseResult } from '../command_runtime/command.ts';
import {
  callWorkerJobEnqueueRpc,
  callWorkerJobListRpc,
  callWorkerJobReadRpc,
  type WorkerJobRpcResult,
} from '../db_rpc/worker_jobs.ts';
import { createSupabaseServiceClient } from '../supabase_client.ts';
import type { WorkerJobResult, WorkerJobStatus } from './dataset/types.ts';

export const NATIONAL_CARBON_GRAPH_CACHE_JOB_KIND =
  'national_carbon.process_flow_graph_cache_build';
export const NATIONAL_CARBON_GRAPH_CACHE_SUBJECT_TYPE = 'national_carbon_process_flow_graph_cache';

const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_MANAGER_ROLES = ['owner', 'admin', 'member'];
const DEFAULT_JOB_ENVIRONMENT = 'main';

const uuidSchema = z.string().uuid();
const workerJobStatuses = [
  'queued',
  'running',
  'waiting',
  'completed',
  'blocked',
  'stale',
  'failed',
  'cancelled',
] as const;

const enqueueSchema = z
  .object({
    action: z.literal('enqueue'),
  })
  .strict();

const readSchema = z
  .object({
    action: z.literal('read'),
    jobId: uuidSchema,
  })
  .strict();

const readLatestSchema = z
  .object({
    action: z.literal('read_latest'),
    statuses: z.array(z.enum(workerJobStatuses)).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export const nationalCarbonGraphCacheJobRequestSchema = z.union([
  enqueueSchema,
  readSchema,
  readLatestSchema,
]);

export type NationalCarbonGraphCacheJobRequest = z.infer<
  typeof nationalCarbonGraphCacheJobRequestSchema
>;

export type EnvReader = (name: string) => string | undefined;

export type NationalCarbonGraphCacheJobExecutionOptions = {
  now?: () => Date;
  readEnv?: EnvReader;
};

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseNationalCarbonGraphCacheJobCommand(
  body: unknown,
): CommandParseResult<NationalCarbonGraphCacheJobRequest> {
  const parsed = nationalCarbonGraphCacheJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid national carbon graph cache job payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

function defaultReadEnv(name: string): string | undefined {
  try {
    const value = Deno.env.get(name);
    return value && value.trim().length > 0 ? value.trim() : undefined;
  } catch (_error) {
    return undefined;
  }
}

function readJobEnvironment(readEnv: EnvReader = defaultReadEnv): string {
  return (
    readEnv('NATIONAL_CARBON_GRAPH_CACHE_ENVIRONMENT') ??
    readEnv('LCA_WORKER_ENVIRONMENT') ??
    readEnv('APP_ENV') ??
    DEFAULT_JOB_ENVIRONMENT
  );
}

function buildJobPayload(readEnv: EnvReader, environment: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    environment,
    execute: true,
  };

  const cachePrefix = readEnv('NATIONAL_CARBON_GRAPH_CACHE_PREFIX');
  if (cachePrefix) {
    payload.cachePrefix = cachePrefix;
  }

  const cacheBucket = readEnv('NATIONAL_CARBON_GRAPH_CACHE_BUCKET');
  if (cacheBucket) {
    payload.cacheBucket = cacheBucket;
  }

  return payload;
}

function isWorkerJobStatus(value: unknown): value is WorkerJobStatus {
  return workerJobStatuses.some((status) => status === value);
}

function normalizeWorkerJob(data: unknown): WorkerJobResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      status: 'failed',
      errorCode: 'invalid_worker_job_rpc_result',
      errorMessage: 'Worker job RPC returned an invalid response payload.',
    };
  }

  const candidate = data as Record<string, unknown>;
  return {
    ...candidate,
    status: isWorkerJobStatus(candidate.status) ? candidate.status : 'failed',
  } as WorkerJobResult;
}

function normalizeWorkerJobList(data: unknown): WorkerJobResult[] {
  return Array.isArray(data) ? data.map(normalizeWorkerJob) : [];
}

function isNationalCarbonGraphCacheJob(job: WorkerJobResult): boolean {
  return (
    job.jobKind === NATIONAL_CARBON_GRAPH_CACHE_JOB_KIND &&
    job.subjectType === NATIONAL_CARBON_GRAPH_CACHE_SUBJECT_TYPE
  );
}

async function ensureSystemManager(
  actor: ActorContext,
  serviceClient: SupabaseClient,
): Promise<CommandExecutionResult | null> {
  const { data, error } = await serviceClient
    .from('roles')
    .select('user_id')
    .eq('user_id', actor.userId)
    .eq('team_id', SYSTEM_TEAM_ID)
    .in('role', SYSTEM_MANAGER_ROLES)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      code: 'SYSTEM_MANAGER_CHECK_FAILED',
      status: 502,
      message: 'Unable to verify system-manager permissions',
      details: error,
    };
  }

  if (!data) {
    return {
      ok: false,
      code: 'SYSTEM_MANAGER_REQUIRED',
      status: 403,
      message: 'System-manager permissions are required to manage national carbon graph cache jobs',
    };
  }

  return null;
}

function rpcFailure(result: WorkerJobRpcResult): CommandExecutionResult {
  if (result.ok) {
    return {
      ok: false,
      code: 'WORKER_JOB_RPC_RESULT_INVALID',
      status: 502,
      message: 'Worker job RPC result was unexpectedly successful',
    };
  }

  return result;
}

function graphCacheJobNotFound(): CommandExecutionResult {
  return {
    ok: false,
    code: 'NATIONAL_CARBON_GRAPH_CACHE_JOB_NOT_FOUND',
    status: 404,
    message: 'National carbon graph cache job not found',
  };
}

export async function executeNationalCarbonGraphCacheJobCommand(
  request: NationalCarbonGraphCacheJobRequest,
  actor: ActorContext,
  serviceClient: SupabaseClient = createSupabaseServiceClient(),
  options: NationalCarbonGraphCacheJobExecutionOptions = {},
): Promise<CommandExecutionResult> {
  const aclFailure = await ensureSystemManager(actor, serviceClient);
  if (aclFailure) {
    return aclFailure;
  }

  if (request.action === 'read_latest') {
    const result = await callWorkerJobListRpc(serviceClient, {
      requestedBy: null,
      subjectType: NATIONAL_CARBON_GRAPH_CACHE_SUBJECT_TYPE,
      subjectId: null,
      statuses: request.statuses ?? null,
      visibility: 'operator',
      limit: request.limit ?? 5,
      includeInternal: false,
    });
    if (!result.ok) {
      return rpcFailure(result);
    }

    return {
      ok: true,
      body: {
        ok: true,
        command: 'national_carbon_graph_cache_jobs_read_latest',
        data: normalizeWorkerJobList(result.data).filter(isNationalCarbonGraphCacheJob),
      },
    };
  }

  if (request.action === 'read') {
    const result = await callWorkerJobReadRpc(serviceClient, {
      jobId: request.jobId,
      includeInternal: false,
    });
    if (!result.ok) {
      return rpcFailure(result);
    }

    const job = normalizeWorkerJob(result.data);
    if (!isNationalCarbonGraphCacheJob(job)) {
      return graphCacheJobNotFound();
    }

    return {
      ok: true,
      body: {
        ok: true,
        command: 'national_carbon_graph_cache_jobs_read',
        data: job,
      },
    };
  }

  const readEnv = options.readEnv ?? defaultReadEnv;
  const environment = readJobEnvironment(readEnv);
  const now = (options.now ?? (() => new Date()))();
  const idempotencyWindow = now.toISOString().slice(0, 16);
  const activeKey = `${NATIONAL_CARBON_GRAPH_CACHE_JOB_KIND}:${environment}:execute`;
  const result = await callWorkerJobEnqueueRpc(serviceClient, {
    jobKind: NATIONAL_CARBON_GRAPH_CACHE_JOB_KIND,
    payload: buildJobPayload(readEnv, environment),
    payloadSchemaVersion: 'national_carbon.process_flow_graph_cache_build.request.v1',
    subjectType: NATIONAL_CARBON_GRAPH_CACHE_SUBJECT_TYPE,
    subjectId: null,
    subjectVersion: environment,
    requestedBy: actor.userId,
    requesterType: 'operator',
    idempotencyKey: `${activeKey}:${actor.userId}:${idempotencyWindow}`,
    concurrencyKey: activeKey,
    priority: 0,
    queueKey: environment,
    visibility: 'operator',
    maxAttempts: 1,
  });

  if (!result.ok) {
    if (result.code === 'WORKER_JOB_CONCURRENCY_CONFLICT' && result.details) {
      return {
        ok: true,
        body: {
          ok: true,
          command: 'national_carbon_graph_cache_jobs_enqueue',
          reused: true,
          data: normalizeWorkerJob(result.details),
        },
      };
    }

    return rpcFailure(result);
  }

  return {
    ok: true,
    body: {
      ok: true,
      command: 'national_carbon_graph_cache_jobs_enqueue',
      reused: false,
      data: normalizeWorkerJob(result.data),
    },
  };
}
