import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertSubmitCommentPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ReviewCommandExecutionResult, SubmitCommentRequest } from './types.ts';
import { parseSubmitCommentRequest, submitCommentRequestSchema } from './validation.ts';

export { submitCommentRequestSchema };

export function parseSubmitCommentCommand(body: unknown) {
  return parseSubmitCommentRequest(body);
}

export async function executeSubmitCommentCommand(
  request: SubmitCommentRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertSubmitCommentPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_submit_comment',
    actorUserId: actor.userId,
    targetTable: 'reviews',
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      hasJson: request.json !== undefined,
      commentState: request.commentState ?? 1,
    },
  });

  const result = await repository.submitComment(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_submit_comment',
      data: result.data,
    },
  };
}
