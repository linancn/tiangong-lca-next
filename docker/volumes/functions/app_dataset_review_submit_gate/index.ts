import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeReviewSubmitGateCommand,
  parseReviewSubmitGateCommand,
} from '../_shared/commands/dataset/review_submit_gate.ts';
import type { ReviewSubmitGateRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetReviewSubmitGateHandler(
  overrides: Partial<CommandHandlerOptions<ReviewSubmitGateRequest>> = {},
) {
  return createCommandHandler<ReviewSubmitGateRequest>({
    parse: parseReviewSubmitGateCommand,
    execute: executeReviewSubmitGateCommand,
    ...overrides,
  });
}

export const handleAppDatasetReviewSubmitGate = createAppDatasetReviewSubmitGateHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetReviewSubmitGate);
}
