import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type {
  ReviewBatchDecisionRequest,
  ReviewCommandExecutionResult,
  ReviewCommandFailure,
} from './types.ts';
import { parseReviewBatchDecisionRequest } from './validation.ts';

type BatchRole = 'admin' | 'reviewer';

export function parseReviewBatchDecisionCommand(body: unknown) {
  return parseReviewBatchDecisionRequest(body);
}

function toBatchFailure(reviewId: string, failure: ReviewCommandFailure) {
  return {
    reviewId,
    ok: false as const,
    code: failure.code,
    message: failure.message,
    status: failure.status,
  };
}

async function executeBatch(
  role: BatchRole,
  request: ReviewBatchDecisionRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository,
): Promise<ReviewCommandExecutionResult> {
  const batchId = crypto.randomUUID();
  const results: Array<Record<string, unknown>> = [];

  // Each item keeps its own short database transaction. A stale review therefore
  // cannot roll back decisions that already succeeded for other selected rows.
  for (const [itemIndex, reviewId] of request.reviewIds.entries()) {
    const command = `${role}_review_batch_${request.decision}`;
    const audit = buildCommandAuditPayload({
      command,
      actorUserId: actor.userId,
      targetTable: 'reviews',
      targetId: reviewId,
      targetVersion: '',
      payload: {
        batchId,
        itemIndex,
        batchSize: request.reviewIds.length,
      },
    });

    const result =
      role === 'admin'
        ? request.decision === 'approve'
          ? await repository.finalizeApproveById({ reviewId }, audit)
          : await repository.finalizeRejectById(
              { reviewId, reason: request.reason as string },
              audit,
            )
        : await repository.submitReviewerDecision(
            {
              reviewId,
              decision: request.decision,
              ...(request.decision === 'reject' ? { reason: request.reason } : {}),
            },
            audit,
          );

    results.push(result.ok ? { reviewId, ok: true } : toBatchFailure(reviewId, result));
  }

  const succeeded = results.filter((result) => result.ok === true).length;
  const failed = results.length - succeeded;

  return {
    ok: true,
    status: 200,
    body: {
      ok: failed === 0,
      command: `${role}_review_batch_decision`,
      batchId,
      summary: {
        total: results.length,
        succeeded,
        failed,
      },
      results,
    },
  };
}

export function executeAdminReviewBatchDecisionCommand(
  request: ReviewBatchDecisionRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
) {
  return executeBatch('admin', request, actor, repository);
}

export function executeReviewerBatchDecisionCommand(
  request: ReviewBatchDecisionRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
) {
  return executeBatch('reviewer', request, actor, repository);
}
