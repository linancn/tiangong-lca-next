import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeDataProductCommand,
  parseDataProductCommand,
} from '../_shared/commands/data_product/command.ts';
import type { DataProductCommandRequest } from '../_shared/commands/data_product/types.ts';

export function createAppDataProductCommandsHandler(
  overrides: Partial<CommandHandlerOptions<DataProductCommandRequest>> = {},
) {
  return createCommandHandler<DataProductCommandRequest>({
    parse: parseDataProductCommand,
    execute: executeDataProductCommand,
    ...overrides,
  });
}

export const handleAppDataProductCommands = createAppDataProductCommandsHandler();

if (import.meta.main) {
  Deno.serve(handleAppDataProductCommands);
}
