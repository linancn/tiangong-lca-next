import '@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import { executePublishCommand, parsePublishCommand } from '../_shared/commands/dataset/publish.ts';
import type { PublishRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetPublishHandler(
  overrides: Partial<CommandHandlerOptions<PublishRequest>> = {},
) {
  return createCommandHandler<PublishRequest>({
    parse: parsePublishCommand,
    execute: executePublishCommand,
    ...overrides,
  });
}

export const handleAppDatasetPublish = createAppDatasetPublishHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetPublish);
}
