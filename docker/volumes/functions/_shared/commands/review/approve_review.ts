import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertApproveReviewPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ApproveReviewRequest, ReviewCommandExecutionResult } from './types.ts';
import { parseApproveReviewRequest } from './validation.ts';

export function parseApproveReviewCommand(body: unknown) {
  return parseApproveReviewRequest(body);
}

export async function executeApproveReviewCommand(
  request: ApproveReviewRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertApproveReviewPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_approve',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.reviewId,
    targetVersion: '',
    payload: {},
  });

  const result = await repository.approveReview(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_approve',
      data: result.data,
    },
  };
}
