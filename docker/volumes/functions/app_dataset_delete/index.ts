import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import { executeDeleteCommand, parseDeleteCommand } from '../_shared/commands/dataset/delete.ts';
import type { DeleteRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetDeleteHandler(
  overrides: Partial<CommandHandlerOptions<DeleteRequest>> = {},
) {
  return createCommandHandler<DeleteRequest>({
    parse: parseDeleteCommand,
    execute: executeDeleteCommand,
    ...overrides,
  });
}

export const handleAppDatasetDelete = createAppDatasetDeleteHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetDelete);
}
