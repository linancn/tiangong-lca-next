import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeVerifyRemoteCommand,
  parseVerifyRemoteCommand,
  type VerifyRemoteRequest,
} from '../_shared/commands/dataset/verify_remote.ts';

export function createAppDatasetVerifyRemoteHandler(
  overrides: Partial<CommandHandlerOptions<VerifyRemoteRequest>> = {},
) {
  return createCommandHandler<VerifyRemoteRequest>({
    parse: parseVerifyRemoteCommand,
    execute: executeVerifyRemoteCommand,
    ...overrides,
  });
}

export const handleAppDatasetVerifyRemote = createAppDatasetVerifyRemoteHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetVerifyRemote);
}
