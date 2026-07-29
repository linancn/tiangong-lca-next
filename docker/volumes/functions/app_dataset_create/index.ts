import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import { executeCreateCommand, parseCreateCommand } from '../_shared/commands/dataset/create.ts';
import type { CreateRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetCreateHandler(
  overrides: Partial<CommandHandlerOptions<CreateRequest>> = {},
) {
  return createCommandHandler<CreateRequest>({
    parse: parseCreateCommand,
    execute: executeCreateCommand,
    ...overrides,
  });
}

export const handleAppDatasetCreate = createAppDatasetCreateHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetCreate);
}
