import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeRejectReviewCommand,
  parseRejectReviewCommand,
} from '../_shared/commands/review/reject_review.ts';
import type { RejectReviewRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewRejectHandler(
  overrides: Partial<CommandHandlerOptions<RejectReviewRequest>> = {},
) {
  return createCommandHandler<RejectReviewRequest>({
    parse: parseRejectReviewCommand,
    execute: executeRejectReviewCommand,
    ...overrides,
  });
}

export const handleAdminReviewReject = createAdminReviewRejectHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewReject);
}
