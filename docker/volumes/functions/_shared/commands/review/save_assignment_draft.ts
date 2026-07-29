import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertSaveAssignmentDraftPolicy } from './policy.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ReviewCommandExecutionResult, SaveAssignmentDraftRequest } from './types.ts';
import { parseSaveAssignmentDraftRequest, saveAssignmentDraftRequestSchema } from './validation.ts';

export { saveAssignmentDraftRequestSchema };

export function parseSaveAssignmentDraftCommand(body: unknown) {
  return parseSaveAssignmentDraftRequest(body);
}

export async function executeSaveAssignmentDraftCommand(
  request: SaveAssignmentDraftRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const policy = assertSaveAssignmentDraftPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'review_save_assignment_draft',
    actorUserId: actor.userId,
    targetTable: 'reviews',
    targetId: request.reviewId,
    targetVersion: '',
    payload: {
      reviewerIds: request.reviewerIds,
    },
  });

  const result = await repository.saveAssignmentDraft(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'review_save_assignment_draft',
      data: result.data,
    },
  };
}
