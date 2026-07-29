import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeAssignReviewersCommand,
  parseAssignReviewersCommand,
} from '../_shared/commands/review/assign_reviewers.ts';
import type { AssignReviewersRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewAssignReviewersHandler(
  overrides: Partial<CommandHandlerOptions<AssignReviewersRequest>> = {},
) {
  return createCommandHandler<AssignReviewersRequest>({
    parse: parseAssignReviewersCommand,
    execute: executeAssignReviewersCommand,
    ...overrides,
  });
}

export const handleAdminReviewAssignReviewers = createAdminReviewAssignReviewersHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewAssignReviewers);
}
