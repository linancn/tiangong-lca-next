import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ReviewCommandExecutionResult, SimpleReviewDecisionRequest } from './types.ts';
import { parseSimpleReviewDecisionRequest } from './validation.ts';

export function parseSimpleReviewDecisionCommand(body: unknown) {
  return parseSimpleReviewDecisionRequest(body);
}

export async function executeSimpleReviewDecisionCommand(
  request: SimpleReviewDecisionRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'simple_review_decision',
    actorUserId: actor.userId,
    targetTable: 'reviews',
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      decision: request.decision,
    },
  });

  const result = await repository.submitSimpleDecision(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'simple_review_decision',
      data: result.data,
    },
  };
}
