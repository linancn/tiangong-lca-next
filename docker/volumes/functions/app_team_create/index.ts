import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import type { TeamCreateRequest } from '../_shared/commands/membership/types.ts';
import {
  executeTeamCreateCommand,
  parseTeamCreateCommand,
} from '../_shared/commands/team/create_team.ts';

export function createAppTeamCreateHandler(
  overrides: Partial<CommandHandlerOptions<TeamCreateRequest>> = {},
) {
  return createCommandHandler<TeamCreateRequest>({
    parse: parseTeamCreateCommand,
    execute: executeTeamCreateCommand,
    ...overrides,
  });
}

export const handleAppTeamCreate = createAppTeamCreateHandler();

if (import.meta.main) {
  Deno.serve(handleAppTeamCreate);
}
