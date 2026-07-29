import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertRevokeReviewerPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ReviewCommandExecutionResult, RevokeReviewerRequest } from './types.ts';
import { parseRevokeReviewerRequest } from './validation.ts';

export function parseRevokeReviewerCommand(body: unknown) {
  return parseRevokeReviewerRequest(body);
}

export async function executeRevokeReviewerCommand(
  request: RevokeReviewerRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertRevokeReviewerPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_revoke_reviewer',
    actorUserId: actor.userId,
    targetTable: 'reviews',
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      reviewerId: request.reviewerId,
    },
  });

  const result = await repository.revokeReviewer(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_revoke_reviewer',
      data: result.data,
    },
  };
}
