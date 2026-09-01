import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { createReviewCommandRepository, type ReviewCommandRepository } from './repository.ts';
import type { ReviewCommandExecutionResult, ReviewQualityDiagnosticRequest } from './types.ts';
import {
  parseReviewQualityDiagnosticRequest,
  reviewQualityDiagnosticRequestSchema,
} from './validation.ts';

export { reviewQualityDiagnosticRequestSchema };

export function parseReviewQualityDiagnosticCommand(body: unknown) {
  return parseReviewQualityDiagnosticRequest(body);
}

export async function executeReviewQualityDiagnosticCommand(
  request: ReviewQualityDiagnosticRequest,
  actor: ActorContext,
  repository: ReviewCommandRepository = createReviewCommandRepository(actor.supabase),
): Promise<ReviewCommandExecutionResult> {
  const result =
    request.action === 'start'
      ? await repository.startQualityDiagnostic()
      : await repository.readQualityDiagnostic(request);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: request.action === 'start' ? 202 : 200,
    body: {
      ok: true,
      command: 'review_quality_diagnostic',
      action: request.action,
      data: result.data,
    },
  };
}
