import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeSystemChangeMemberRoleCommand,
  parseSystemChangeMemberRoleCommand,
} from '../_shared/commands/membership/change_role.ts';
import type { SystemChangeMemberRoleRequest } from '../_shared/commands/membership/types.ts';

export function createAdminSystemChangeMemberRoleHandler(
  overrides: Partial<CommandHandlerOptions<SystemChangeMemberRoleRequest>> = {},
) {
  return createCommandHandler<SystemChangeMemberRoleRequest>({
    parse: parseSystemChangeMemberRoleCommand,
    execute: executeSystemChangeMemberRoleCommand,
    ...overrides,
  });
}

export const handleAdminSystemChangeMemberRole = createAdminSystemChangeMemberRoleHandler();

if (import.meta.main) {
  Deno.serve(handleAdminSystemChangeMemberRole);
}
