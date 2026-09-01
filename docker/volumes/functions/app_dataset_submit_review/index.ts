import '@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeSubmitReviewCommand,
  parseSubmitReviewCommand,
} from '../_shared/commands/dataset/submit_review.ts';
import type { SubmitReviewRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetSubmitReviewHandler(
  overrides: Partial<CommandHandlerOptions<SubmitReviewRequest>> = {},
) {
  return createCommandHandler<SubmitReviewRequest>({
    parse: parseSubmitReviewCommand,
    execute: executeSubmitReviewCommand,
    ...overrides,
  });
}

export const handleAppDatasetSubmitReview = createAppDatasetSubmitReviewHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetSubmitReview);
}
