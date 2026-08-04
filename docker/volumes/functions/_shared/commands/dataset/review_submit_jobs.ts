import { z } from 'zod';

import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import type { CommandParseResult } from '../../command_runtime/command.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import {
  resolveAuthoritativeReviewSubmitRevision,
  type ReviewSubmitGateRevisionResolver,
} from './review_submit_gate.ts';
import {
  REVIEW_SUBMIT_GATE_POLICY_PROFILE,
  REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
  type DatasetCommandExecutionResult,
  type DatasetCommandFailure,
  type ReviewSubmitGateRequest,
  type ReviewSubmitJobEnqueueRequest,
  type ReviewSubmitJobRequest,
  type ReviewSubmitJobResult,
  type ReviewSubmitJobStatus,
} from './types.ts';

const versionPattern = /^\d{2}\.\d{2}\.\d{3}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

const enqueueSchema = z
  .object({
    action: z.literal('enqueue').default('enqueue'),
    table: z.literal('processes'),
    id: z.string().uuid(),
    version: z.string().regex(versionPattern, 'version must be in 00.00.000 format'),
    revisionChecksum: z
      .string()
      .regex(sha256Pattern, 'revisionChecksum must be a lowercase SHA-256 hex digest')
      .optional(),
    policyProfile: z
      .literal(REVIEW_SUBMIT_GATE_POLICY_PROFILE)
      .default(REVIEW_SUBMIT_GATE_POLICY_PROFILE),
    reportSchemaVersion: z
      .literal(REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION)
      .default(REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION),
  })
  .strict();

const readSchema = z
  .object({
    action: z.literal('read'),
    reviewSubmitJobId: z.string().uuid(),
  })
  .strict();

const readLatestSchema = z
  .object({
    action: z.literal('read_latest'),
    table: z.literal('processes'),
    id: z.string().uuid(),
    version: z.string().regex(versionPattern, 'version must be in 00.00.000 format'),
    revisionChecksum: z
      .string()
      .regex(sha256Pattern, 'revisionChecksum must be a lowercase SHA-256 hex digest')
      .optional(),
  })
  .strict();

export const reviewSubmitJobRequestSchema = z.union([enqueueSchema, readSchema, readLatestSchema]);

type ReviewSubmitJobRevisionResult = { ok: true; revisionChecksum: string } | DatasetCommandFailure;

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseReviewSubmitJobCommand(
  body: unknown,
): CommandParseResult<ReviewSubmitJobRequest> {
  const parsed = reviewSubmitJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset review-submit job payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

function isReviewSubmitJobStatus(value: unknown): value is ReviewSubmitJobStatus {
  return (
    value === 'queued' ||
    value === 'waiting_gate' ||
    value === 'submitting' ||
    value === 'submitted' ||
    value === 'blocked' ||
    value === 'stale' ||
    value === 'error' ||
    value === 'cancelled'
  );
}

export function normalizeReviewSubmitJobResult(data: unknown): ReviewSubmitJobResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      status: 'error',
      error: {
        code: 'invalid_review_submit_job_rpc_result',
        message: 'Review-submit job RPC returned an invalid response payload.',
      },
    };
  }

  const candidate = data as Record<string, unknown>;
  const status = isReviewSubmitJobStatus(candidate.status) ? candidate.status : 'error';

  return {
    ...candidate,
    status,
  };
}

function statusToHttpStatus(status: ReviewSubmitJobStatus): number {
  switch (status) {
    case 'submitted':
      return 200;
    case 'queued':
    case 'waiting_gate':
    case 'submitting':
      return 202;
    case 'blocked':
    case 'stale':
    case 'cancelled':
      return 409;
    case 'error':
      return 502;
  }
}

function commandName(action: ReviewSubmitJobRequest['action']): string {
  switch (action) {
    case 'enqueue':
      return 'dataset_review_submit_job_enqueue';
    case 'read':
      return 'dataset_review_submit_job_read';
    case 'read_latest':
      return 'dataset_review_submit_job_read_latest';
  }
}

async function resolveJobRevision(
  request: Extract<ReviewSubmitJobRequest, { action: 'enqueue' | 'read_latest' }>,
  actor: ActorContext,
  resolveRevision: ReviewSubmitGateRevisionResolver,
): Promise<ReviewSubmitJobRevisionResult> {
  const gateRequest: ReviewSubmitGateRequest = {
    table: request.table,
    id: request.id,
    version: request.version,
    revisionChecksum: request.revisionChecksum,
    action: 'ensure',
    policyProfile: REVIEW_SUBMIT_GATE_POLICY_PROFILE,
    reportSchemaVersion: REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
  };

  return await resolveRevision(gateRequest, actor);
}

export async function executeReviewSubmitJobCommand(
  request: ReviewSubmitJobRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
  resolveRevision: ReviewSubmitGateRevisionResolver = resolveAuthoritativeReviewSubmitRevision,
): Promise<DatasetCommandExecutionResult> {
  if (request.action === 'read') {
    const result = await repository.reviewSubmitJobRead(request);
    if (!result.ok) {
      return result;
    }

    const jobResult = normalizeReviewSubmitJobResult(result.data);
    return {
      ok: true,
      status: statusToHttpStatus(jobResult.status),
      body: {
        ok: jobResult.status === 'submitted',
        command: commandName(request.action),
        data: jobResult,
      },
    };
  }

  const revisionResult = await resolveJobRevision(request, actor, resolveRevision);
  if (!revisionResult.ok) {
    return revisionResult;
  }

  if (request.action === 'read_latest') {
    const result = await repository.reviewSubmitJobReadLatest({
      ...request,
      revisionChecksum: revisionResult.revisionChecksum,
    });
    if (!result.ok) {
      return result;
    }

    const jobResult = normalizeReviewSubmitJobResult(result.data);
    return {
      ok: true,
      status: statusToHttpStatus(jobResult.status),
      body: {
        ok: jobResult.status === 'submitted',
        command: commandName(request.action),
        data: jobResult,
      },
    };
  }

  const authoritativeRequest: ReviewSubmitJobEnqueueRequest = {
    ...request,
    revisionChecksum: revisionResult.revisionChecksum,
  };
  const audit = buildCommandAuditPayload({
    command: 'dataset_review_submit_job_enqueue',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: {
      policyProfile: request.policyProfile,
      reportSchemaVersion: request.reportSchemaVersion,
      clientRevisionChecksum: request.revisionChecksum ?? null,
      revisionChecksum: revisionResult.revisionChecksum,
    },
  });

  const result = await repository.reviewSubmitJobEnqueue(authoritativeRequest, audit);
  if (!result.ok) {
    return result;
  }

  const jobResult = normalizeReviewSubmitJobResult(result.data);
  return {
    ok: true,
    status: statusToHttpStatus(jobResult.status),
    body: {
      ok: jobResult.status === 'submitted',
      command: commandName(request.action),
      data: jobResult,
    },
  };
}
