import '@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeAssignTeamCommand,
  parseAssignTeamCommand,
} from '../_shared/commands/dataset/assign_team.ts';
import type { AssignTeamRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetAssignTeamHandler(
  overrides: Partial<CommandHandlerOptions<AssignTeamRequest>> = {},
) {
  return createCommandHandler<AssignTeamRequest>({
    parse: parseAssignTeamCommand,
    execute: executeAssignTeamCommand,
    ...overrides,
  });
}

export const handleAppDatasetAssignTeam = createAppDatasetAssignTeamHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetAssignTeam);
}
