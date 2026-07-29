import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeReviewChangeMemberRoleCommand,
  parseReviewChangeMemberRoleCommand,
} from '../_shared/commands/membership/change_role.ts';
import type { ReviewChangeMemberRoleRequest } from '../_shared/commands/membership/types.ts';

export function createAdminReviewChangeMemberRoleHandler(
  overrides: Partial<CommandHandlerOptions<ReviewChangeMemberRoleRequest>> = {},
) {
  return createCommandHandler<ReviewChangeMemberRoleRequest>({
    parse: parseReviewChangeMemberRoleCommand,
    execute: executeReviewChangeMemberRoleCommand,
    ...overrides,
  });
}

export const handleAdminReviewChangeMemberRole = createAdminReviewChangeMemberRoleHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewChangeMemberRole);
}
