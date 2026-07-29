import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeTeamChangeMemberRoleCommand,
  parseTeamChangeMemberRoleCommand,
} from '../_shared/commands/membership/change_role.ts';
import type { TeamChangeMemberRoleRequest } from '../_shared/commands/membership/types.ts';

export function createAdminTeamChangeMemberRoleHandler(
  overrides: Partial<CommandHandlerOptions<TeamChangeMemberRoleRequest>> = {},
) {
  return createCommandHandler<TeamChangeMemberRoleRequest>({
    parse: parseTeamChangeMemberRoleCommand,
    execute: executeTeamChangeMemberRoleCommand,
    ...overrides,
  });
}

export const handleAdminTeamChangeMemberRole = createAdminTeamChangeMemberRoleHandler();

if (import.meta.main) {
  Deno.serve(handleAdminTeamChangeMemberRole);
}
