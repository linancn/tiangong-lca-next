import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertSubmitReviewPolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import {
  REVIEW_SUBMIT_GATE_POLICY_PROFILE,
  REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
  type DatasetCommandExecutionResult,
  type SubmitReviewRequest,
} from './types.ts';
import { parseSubmitReviewRequest, submitReviewRequestSchema } from './validation.ts';

export { submitReviewRequestSchema };

export function parseSubmitReviewCommand(body: unknown) {
  return parseSubmitReviewRequest(body);
}

export async function executeSubmitReviewCommand(
  request: SubmitReviewRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertSubmitReviewPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_submit_review',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: {
      reviewSubmitGateRunId: request.reviewSubmitGateRunId ?? null,
      revisionChecksum: request.revisionChecksum ?? null,
      reviewSubmitPolicyProfile:
        request.reviewSubmitPolicyProfile ?? REVIEW_SUBMIT_GATE_POLICY_PROFILE,
      reviewSubmitReportSchemaVersion:
        request.reviewSubmitReportSchemaVersion ?? REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION,
    },
  });

  const result = await repository.submitReview(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_submit_review',
      data: result.data,
    },
  };
}
