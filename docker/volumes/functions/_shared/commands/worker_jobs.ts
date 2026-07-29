import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { z } from 'zod';

import type { ActorContext } from '../command_runtime/actor_context.ts';
import type { CommandExecutionResult, CommandParseResult } from '../command_runtime/command.ts';
import {
  callWorkerJobCancelRpc,
  callWorkerJobListRpc,
  callWorkerJobReadRpc,
  type WorkerJobRpcResult,
} from '../db_rpc/worker_jobs.ts';
import { createSupabaseServiceClient } from '../supabase_client.ts';
import type { WorkerJobResult, WorkerJobStatus } from './dataset/types.ts';

const uuidSchema = z.string().uuid();
const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';
const DATA_PRODUCT_MANAGER_ROLES = ['data_product_manager'] as const;
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

const readSchema = z
  .object({
    action: z.literal('read'),
    jobId: uuidSchema,
  })
  .strict();

const listSchema = z
  .object({
    action: z.literal('list').default('list'),
    subjectType: z.string().min(1).optional(),
    subjectId: uuidSchema.optional(),
    statuses: z.array(z.enum(workerJobStatuses)).optional(),
    visibility: z.enum(['user', 'operator']).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .strict();

const cancelSchema = z
  .object({
    action: z.literal('cancel'),
    jobId: uuidSchema,
    reason: z.string().min(1).max(200).optional(),
  })
  .strict();

export const workerJobRequestSchema = z.union([readSchema, listSchema, cancelSchema]);

export type WorkerJobRequest = z.infer<typeof workerJobRequestSchema>;

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseWorkerJobCommand(body: unknown): CommandParseResult<WorkerJobRequest> {
  const parsed = workerJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid worker job payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => stringValue(value) !== undefined);
}

function numberValue(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function isLciaResultBuildJob(job: WorkerJobResult): boolean {
  return job.subjectType === 'lcia_result_build' || job.jobKind === 'lcia_result.package_build';
}

function dataProductWorkerJobId(job: WorkerJobResult): string | undefined {
  return isLciaResultBuildJob(job) ? stringValue(job.id) : undefined;
}

function payloadName(row: Record<string, unknown> | undefined): string | undefined {
  const payload = isRecord(row?.payload_json) ? row.payload_json : {};
  return firstString(payload.name, payload.packageName, payload.package_name);
}

function resultPackageFrom(job: WorkerJobResult): Record<string, unknown> {
  const result = isRecord(job.result) ? job.result : {};
  return isRecord(result.package) ? result.package : {};
}

function mergedResultPackage(
  job: WorkerJobResult,
  name: string | undefined,
  packageRow: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const currentPackage = resultPackageFrom(job);
  const hasPackageMetadata = Boolean(packageRow) || Object.keys(currentPackage).length > 0;
  if (!hasPackageMetadata) {
    return null;
  }

  return {
    ...currentPackage,
    ...(packageRow?.id ? { packageId: packageRow.id } : {}),
    ...(name ? { packageName: name } : {}),
    ...(packageRow?.package_version ? { packageVersion: packageRow.package_version } : {}),
    ...(packageRow?.status ? { status: packageRow.status } : {}),
    ...(numberValue(packageRow?.eligible_input_count) !== undefined
      ? { eligibleInputCount: numberValue(packageRow?.eligible_input_count) }
      : {}),
    ...(numberValue(packageRow?.included_input_count) !== undefined
      ? { includedInputCount: numberValue(packageRow?.included_input_count) }
      : {}),
  };
}

export function mergeDataProductWorkerJobMetadata(
  jobs: WorkerJobResult[],
  workerRows: Record<string, unknown>[],
  packageRows: Record<string, unknown>[],
): WorkerJobResult[] {
  const payloadByJobId = new Map<string, Record<string, unknown>>();
  workerRows.forEach((row) => {
    const id = stringValue(row.id);
    if (id) {
      payloadByJobId.set(id, row);
    }
  });

  const packageByWorkerJobId = new Map<string, Record<string, unknown>>();
  packageRows.forEach((row) => {
    const workerJobId = stringValue(row.build_worker_job_id);
    if (workerJobId) {
      packageByWorkerJobId.set(workerJobId, row);
    }
  });

  return jobs.map((job) => {
    const jobId = dataProductWorkerJobId(job);
    if (!jobId) {
      return job;
    }

    const name = payloadName(payloadByJobId.get(jobId));
    const packageRow = packageByWorkerJobId.get(jobId);
    const resultPackage = mergedResultPackage(job, name, packageRow);
    return {
      ...job,
      ...(name ? { packageName: name, resultSetName: name } : {}),
      ...(resultPackage
        ? {
            result: {
              ...(isRecord(job.result) ? job.result : {}),
              package: resultPackage,
            },
          }
        : {}),
    };
  });
}

async function enrichDataProductWorkerJobMetadata(
  jobs: WorkerJobResult[],
  serviceClient: SupabaseClient,
): Promise<WorkerJobResult[]> {
  const jobIds = Array.from(new Set(jobs.map(dataProductWorkerJobId).filter(Boolean)));
  if (jobIds.length === 0) {
    return jobs;
  }

  const [{ data: workerRows, error: workerError }, { data: packageRows, error: packageError }] =
    await Promise.all([
      serviceClient.from('worker_jobs').select('id,payload_json').in('id', jobIds),
      serviceClient
        .from('lcia_result_packages')
        .select(
          'build_worker_job_id,id,package_version,status,eligible_input_count,included_input_count',
        )
        .in('build_worker_job_id', jobIds),
    ]);

  if (workerError || packageError) {
    return jobs;
  }

  return mergeDataProductWorkerJobMetadata(
    jobs,
    Array.isArray(workerRows) ? workerRows : [],
    Array.isArray(packageRows) ? packageRows : [],
  );
}

function ensureUserCanRead(
  job: WorkerJobResult,
  actor: ActorContext,
): CommandExecutionResult | null {
  if (job.requestedBy !== actor.userId) {
    return {
      ok: false,
      code: 'WORKER_JOB_NOT_FOUND',
      status: 404,
      message: 'Worker job not found',
    };
  }

  return null;
}

async function ensureDataProductManager(
  actor: ActorContext,
  serviceClient: SupabaseClient,
): Promise<CommandExecutionResult | null> {
  const { data, error } = await serviceClient
    .from('roles')
    .select('user_id')
    .eq('user_id', actor.userId)
    .eq('team_id', SYSTEM_TEAM_ID)
    .in('role', [...DATA_PRODUCT_MANAGER_ROLES])
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      code: 'DATA_PRODUCT_MANAGER_CHECK_FAILED',
      status: 502,
      message: 'Unable to verify data-product-manager permissions',
      details: error,
    };
  }

  if (!data) {
    return {
      ok: false,
      code: 'DATA_PRODUCT_MANAGER_REQUIRED',
      status: 403,
      message: 'Data product manager permissions are required to list operator worker jobs',
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

export async function executeWorkerJobCommand(
  request: WorkerJobRequest,
  actor: ActorContext,
  serviceClient: SupabaseClient = createSupabaseServiceClient(),
): Promise<CommandExecutionResult> {
  if (request.action === 'list') {
    const visibility = request.visibility ?? 'user';
    if (visibility === 'operator') {
      const aclFailure = await ensureDataProductManager(actor, serviceClient);
      if (aclFailure) {
        return aclFailure;
      }
    }

    const result = await callWorkerJobListRpc(serviceClient, {
      requestedBy: actor.userId,
      subjectType: request.subjectType ?? null,
      subjectId: request.subjectId ?? null,
      statuses: request.statuses ?? null,
      visibility,
      limit: request.limit ?? 50,
      includeInternal: false,
    });
    if (!result.ok) {
      return rpcFailure(result);
    }

    const jobs = await enrichDataProductWorkerJobMetadata(
      normalizeWorkerJobList(result.data),
      serviceClient,
    );

    return {
      ok: true,
      body: {
        ok: true,
        command: 'worker_jobs_list',
        data: jobs,
      },
    };
  }

  const readResult = await callWorkerJobReadRpc(serviceClient, {
    jobId: request.jobId,
    includeInternal: false,
  });
  if (!readResult.ok) {
    return rpcFailure(readResult);
  }

  const job = normalizeWorkerJob(readResult.data);
  const aclFailure = ensureUserCanRead(job, actor);
  if (aclFailure) {
    return aclFailure;
  }

  if (request.action === 'read') {
    return {
      ok: true,
      body: {
        ok: true,
        command: 'worker_jobs_read',
        data: job,
      },
    };
  }

  const cancelResult = await callWorkerJobCancelRpc(serviceClient, {
    jobId: request.jobId,
    cancelledBy: actor.userId,
    reason: request.reason ?? null,
  });
  if (!cancelResult.ok) {
    return rpcFailure(cancelResult);
  }

  return {
    ok: true,
    body: {
      ok: true,
      command: 'worker_jobs_cancel',
      data: normalizeWorkerJob(cancelResult.data),
    },
  };
}
