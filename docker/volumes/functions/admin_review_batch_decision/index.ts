import '@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeAdminReviewBatchDecisionCommand,
  parseReviewBatchDecisionCommand,
} from '../_shared/commands/review/batch_decision.ts';
import type { ReviewBatchDecisionRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewBatchDecisionHandler(
  overrides: Partial<CommandHandlerOptions<ReviewBatchDecisionRequest>> = {},
) {
  return createCommandHandler<ReviewBatchDecisionRequest>({
    parse: parseReviewBatchDecisionCommand,
    execute: executeAdminReviewBatchDecisionCommand,
    ...overrides,
  });
}

export const handleAdminReviewBatchDecision = createAdminReviewBatchDecisionHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewBatchDecision);
}
