import '@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeLcaReleaseCommand,
  parseLcaReleaseCommand,
} from '../_shared/commands/lca_release/command.ts';
import type { LcaReleaseCommandRequest } from '../_shared/commands/lca_release/types.ts';

export function createAppLcaReleaseCommandsHandler(
  overrides: Partial<CommandHandlerOptions<LcaReleaseCommandRequest>> = {},
) {
  return createCommandHandler<LcaReleaseCommandRequest>({
    parse: parseLcaReleaseCommand,
    execute: executeLcaReleaseCommand,
    ...overrides,
  });
}

export const handleAppLcaReleaseCommands = createAppLcaReleaseCommandsHandler();

if (import.meta.main) {
  Deno.serve(handleAppLcaReleaseCommands);
}
