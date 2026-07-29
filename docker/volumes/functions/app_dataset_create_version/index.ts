import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeCreateVersionCommand,
  parseCreateVersionCommand,
} from '../_shared/commands/dataset/create_version.ts';
import type { CreateVersionRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetCreateVersionHandler(
  overrides: Partial<CommandHandlerOptions<CreateVersionRequest>> = {},
) {
  return createCommandHandler<CreateVersionRequest>({
    parse: parseCreateVersionCommand,
    execute: executeCreateVersionCommand,
    ...overrides,
  });
}

export const handleAppDatasetCreateVersion = createAppDatasetCreateVersionHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetCreateVersion);
}
