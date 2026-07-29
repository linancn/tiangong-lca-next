import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeRevokeReviewerCommand,
  parseRevokeReviewerCommand,
} from '../_shared/commands/review/revoke_reviewer.ts';
import type { RevokeReviewerRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewRevokeReviewerHandler(
  overrides: Partial<CommandHandlerOptions<RevokeReviewerRequest>> = {},
) {
  return createCommandHandler<RevokeReviewerRequest>({
    parse: parseRevokeReviewerCommand,
    execute: executeRevokeReviewerCommand,
    ...overrides,
  });
}

export const handleAdminReviewRevokeReviewer = createAdminReviewRevokeReviewerHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewRevokeReviewer);
}
