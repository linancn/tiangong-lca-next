import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import type { TeamSetRankRequest } from '../_shared/commands/membership/types.ts';
import {
  executeTeamSetRankCommand,
  parseTeamSetRankCommand,
} from '../_shared/commands/profile/update_team_profile.ts';

export function createAdminTeamSetRankHandler(
  overrides: Partial<CommandHandlerOptions<TeamSetRankRequest>> = {},
) {
  return createCommandHandler<TeamSetRankRequest>({
    parse: parseTeamSetRankCommand,
    execute: executeTeamSetRankCommand,
    ...overrides,
  });
}

export const handleAdminTeamSetRank = createAdminTeamSetRankHandler();

if (import.meta.main) {
  Deno.serve(handleAdminTeamSetRank);
}
