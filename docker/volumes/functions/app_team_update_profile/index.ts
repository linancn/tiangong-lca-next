import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import type { TeamUpdateProfileRequest } from '../_shared/commands/membership/types.ts';
import {
  executeTeamUpdateProfileCommand,
  parseTeamUpdateProfileCommand,
} from '../_shared/commands/profile/update_team_profile.ts';

export function createAppTeamUpdateProfileHandler(
  overrides: Partial<CommandHandlerOptions<TeamUpdateProfileRequest>> = {},
) {
  return createCommandHandler<TeamUpdateProfileRequest>({
    parse: parseTeamUpdateProfileCommand,
    execute: executeTeamUpdateProfileCommand,
    ...overrides,
  });
}

export const handleAppTeamUpdateProfile = createAppTeamUpdateProfileHandler();

if (import.meta.main) {
  Deno.serve(handleAppTeamUpdateProfile);
}
