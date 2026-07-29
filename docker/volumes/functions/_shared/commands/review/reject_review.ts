import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertRejectReviewPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { RejectReviewRequest, ReviewCommandExecutionResult } from './types.ts';
import { parseRejectReviewRequest } from './validation.ts';

export function parseRejectReviewCommand(body: unknown) {
  return parseRejectReviewRequest(body);
}

export async function executeRejectReviewCommand(
  request: RejectReviewRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertRejectReviewPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_reject',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      reason: request.reason,
    },
  });

  const result = await repository.rejectReview(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_reject',
      data: result.data,
    },
  };
}
