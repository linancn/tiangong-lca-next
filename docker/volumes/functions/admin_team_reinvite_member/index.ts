import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeTeamReinviteMemberCommand,
  parseTeamReinviteMemberCommand,
} from '../_shared/commands/membership/reinvite_member.ts';
import type { TeamReinviteMemberRequest } from '../_shared/commands/membership/types.ts';

export function createAdminTeamReinviteMemberHandler(
  overrides: Partial<CommandHandlerOptions<TeamReinviteMemberRequest>> = {},
) {
  return createCommandHandler<TeamReinviteMemberRequest>({
    parse: parseTeamReinviteMemberCommand,
    execute: executeTeamReinviteMemberCommand,
    ...overrides,
  });
}

export const handleAdminTeamReinviteMember = createAdminTeamReinviteMemberHandler();

if (import.meta.main) {
  Deno.serve(handleAdminTeamReinviteMember);
}
