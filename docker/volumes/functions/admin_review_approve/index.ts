import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeApproveReviewCommand,
  parseApproveReviewCommand,
} from '../_shared/commands/review/approve_review.ts';
import type { ApproveReviewRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewApproveHandler(
  overrides: Partial<CommandHandlerOptions<ApproveReviewRequest>> = {},
) {
  return createCommandHandler<ApproveReviewRequest>({
    parse: parseApproveReviewCommand,
    execute: executeApproveReviewCommand,
    ...overrides,
  });
}

export const handleAdminReviewApprove = createAdminReviewApproveHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewApprove);
}
