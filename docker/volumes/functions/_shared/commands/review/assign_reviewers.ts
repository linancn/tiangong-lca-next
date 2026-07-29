import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertAssignReviewersPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { AssignReviewersRequest, ReviewCommandExecutionResult } from './types.ts';
import { parseAssignReviewersRequest } from './validation.ts';

export function parseAssignReviewersCommand(body: unknown) {
  return parseAssignReviewersRequest(body);
}

export async function executeAssignReviewersCommand(
  request: AssignReviewersRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertAssignReviewersPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_assign_reviewers',
    actorUserId: actor.userId,
    targetTable: 'reviews',
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      reviewerIds: request.reviewerIds,
      deadline: request.deadline ?? null,
    },
  });

  const result = await repository.assignReviewers(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_assign_reviewers',
      data: result.data,
    },
  };
}
