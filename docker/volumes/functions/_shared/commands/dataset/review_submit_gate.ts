import { z } from 'zod';

import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import type { CommandParseResult } from '../../command_runtime/command.ts';
import { stableJsonSha256 } from './canonical_json.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import {
  DATASET_TABLES,
  REVIEW_SUBMIT_GATE_POLICY_PROFILE,
  REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
  type DatasetCommandExecutionResult,
  type DatasetCommandFailure,
  type ReviewSubmitGateRequest,
  type ReviewSubmitGateResult,
  type ReviewSubmitGateStatus,
} from './types.ts';

const versionPattern = /^\d{2}\.\d{2}\.\d{3}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

export const reviewSubmitGateRequestSchema = z
  .object({
    table: z.enum(DATASET_TABLES),
    id: z.string().uuid(),
    version: z.string().regex(versionPattern, 'version must be in 00.00.000 format'),
    revisionChecksum: z
      .string()
      .regex(sha256Pattern, 'revisionChecksum must be a lowercase SHA-256 hex digest')
      .optional(),
    action: z.enum(['ensure', 'read', 'rerun']).default('ensure'),
    gateRunId: z.string().uuid().optional(),
    policyProfile: z
      .literal(REVIEW_SUBMIT_GATE_POLICY_PROFILE)
      .default(REVIEW_SUBMIT_GATE_POLICY_PROFILE),
    reportSchemaVersion: z
      .literal(REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION)
      .default(REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION),
  })
  .strict();

type RevisionLookupClient = Pick<ActorContext['supabase'], 'from'>;

type ReviewSubmitGateRevisionResult =
  | { ok: true; revisionChecksum: string }
  | DatasetCommandFailure;

export type ReviewSubmitGateRevisionResolver = (
  request: ReviewSubmitGateRequest,
  actor: ActorContext,
) => Promise<ReviewSubmitGateRevisionResult>;

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseReviewSubmitGateCommand(
  body: unknown,
): CommandParseResult<ReviewSubmitGateRequest> {
  const parsed = reviewSubmitGateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset review-submit gate payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

function isReviewSubmitGateStatus(value: unknown): value is ReviewSubmitGateStatus {
  return (
    value === 'queued' ||
    value === 'running' ||
    value === 'passed' ||
    value === 'blocked' ||
    value === 'error' ||
    value === 'stale'
  );
}

function normalizeGateResult(data: unknown): ReviewSubmitGateResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      status: 'error',
      blockingReasons: [
        {
          code: 'invalid_gate_rpc_result',
          message: 'Review-submit gate RPC returned an invalid response payload.',
        },
      ],
    };
  }

  const candidate = data as Record<string, unknown>;
  const status = isReviewSubmitGateStatus(candidate.status) ? candidate.status : 'error';

  return {
    ...candidate,
    status,
  };
}

function statusToHttpStatus(status: ReviewSubmitGateStatus): number {
  switch (status) {
    case 'passed':
      return 200;
    case 'queued':
    case 'running':
      return 202;
    case 'blocked':
    case 'stale':
      return 409;
    case 'error':
      return 502;
  }
}

function mapRevisionLookupError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'REVISION_LOOKUP_FAILED';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Dataset revision lookup failed',
    details: error.details ?? null,
  };
}

function normalizeRevisionRow(row: unknown): { json_ordered?: unknown } | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }

  return row as { json_ordered?: unknown };
}

export async function resolveAuthoritativeReviewSubmitRevision(
  request: ReviewSubmitGateRequest,
  actor: ActorContext,
): Promise<ReviewSubmitGateRevisionResult> {
  const supabase = actor.supabase as RevisionLookupClient;
  const { data, error } = await supabase
    .from(request.table)
    .select('id,version,json_ordered')
    .eq('id', request.id)
    .eq('version', request.version)
    .range(0, 0);

  if (error) {
    return mapRevisionLookupError(error);
  }

  const rows = Array.isArray(data) ? data : data === null || data === undefined ? [] : [data];
  const row = normalizeRevisionRow(rows[0]);
  if (!row) {
    return {
      ok: false,
      code: 'DATASET_NOT_FOUND',
      status: 404,
      message: 'Dataset not found',
    };
  }

  if (row.json_ordered === null || row.json_ordered === undefined) {
    return {
      ok: false,
      code: 'REVISION_PAYLOAD_MISSING',
      status: 409,
      message: 'Dataset revision json_ordered payload is missing',
    };
  }

  return {
    ok: true,
    revisionChecksum: await stableJsonSha256(row.json_ordered),
  };
}

export async function executeReviewSubmitGateCommand(
  request: ReviewSubmitGateRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
  resolveRevision: ReviewSubmitGateRevisionResolver = resolveAuthoritativeReviewSubmitRevision,
): Promise<DatasetCommandExecutionResult> {
  const revisionResult = await resolveRevision(request, actor);
  if (!revisionResult.ok) {
    return revisionResult;
  }

  const authoritativeRequest: ReviewSubmitGateRequest = {
    ...request,
    revisionChecksum: revisionResult.revisionChecksum,
  };
  const audit = buildCommandAuditPayload({
    command: 'dataset_review_submit_gate',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: {
      action: request.action,
      gateRunId: request.gateRunId ?? null,
      policyProfile: request.policyProfile,
      reportSchemaVersion: request.reportSchemaVersion,
      clientRevisionChecksum: request.revisionChecksum ?? null,
      revisionChecksum: revisionResult.revisionChecksum,
    },
  });

  const result = await repository.reviewSubmitGate(authoritativeRequest, audit);
  if (!result.ok) {
    return result;
  }

  const gateResult = normalizeGateResult(result.data);

  return {
    ok: true,
    status: statusToHttpStatus(gateResult.status),
    body: {
      ok: gateResult.status === 'passed',
      command: 'dataset_review_submit_gate',
      data: gateResult,
    },
  };
}
