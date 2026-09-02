import '@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeReviewerBatchDecisionCommand,
  parseReviewBatchDecisionCommand,
} from '../_shared/commands/review/batch_decision.ts';
import type { ReviewBatchDecisionRequest } from '../_shared/commands/review/types.ts';

export function createReviewerBatchDecisionHandler(
  overrides: Partial<CommandHandlerOptions<ReviewBatchDecisionRequest>> = {},
) {
  return createCommandHandler<ReviewBatchDecisionRequest>({
    parse: parseReviewBatchDecisionCommand,
    execute: executeReviewerBatchDecisionCommand,
    ...overrides,
  });
}

export const handleReviewerBatchDecision = createReviewerBatchDecisionHandler();

if (import.meta.main) {
  Deno.serve(handleReviewerBatchDecision);
}
