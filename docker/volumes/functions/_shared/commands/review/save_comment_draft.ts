import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertSaveCommentDraftPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ReviewCommandExecutionResult, SaveCommentDraftRequest } from './types.ts';
import { parseSaveCommentDraftRequest } from './validation.ts';

export function parseSaveCommentDraftCommand(body: unknown) {
  return parseSaveCommentDraftRequest(body);
}

export async function executeSaveCommentDraftCommand(
  request: SaveCommentDraftRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertSaveCommentDraftPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_save_comment_draft',
    actorUserId: actor.userId,
    targetTable: 'reviews',
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      hasJson: request.json !== undefined,
    },
  });

  const result = await repository.saveCommentDraft(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_save_comment_draft',
      data: result.data,
    },
  };
}
