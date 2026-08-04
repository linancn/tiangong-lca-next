import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeSimpleReviewDecisionCommand,
  parseSimpleReviewDecisionCommand,
} from '../_shared/commands/review/simple_review_decision.ts';
import type { SimpleReviewDecisionRequest } from '../_shared/commands/review/types.ts';

export function createAppSimpleReviewSubmitDecisionHandler(
  overrides: Partial<CommandHandlerOptions<SimpleReviewDecisionRequest>> = {},
) {
  return createCommandHandler<SimpleReviewDecisionRequest>({
    parse: parseSimpleReviewDecisionCommand,
    execute: executeSimpleReviewDecisionCommand,
    ...overrides,
  });
}

export const handleAppSimpleReviewSubmitDecision = createAppSimpleReviewSubmitDecisionHandler();

if (import.meta.main) {
  Deno.serve(handleAppSimpleReviewSubmitDecision);
}
