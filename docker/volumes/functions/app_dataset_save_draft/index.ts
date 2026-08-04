import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeSaveDraftCommand,
  parseSaveDraftCommand,
} from '../_shared/commands/dataset/save_draft.ts';
import type { SaveDraftRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetSaveDraftHandler(
  overrides: Partial<CommandHandlerOptions<SaveDraftRequest>> = {},
) {
  return createCommandHandler<SaveDraftRequest>({
    parse: parseSaveDraftCommand,
    execute: executeSaveDraftCommand,
    ...overrides,
  });
}

export const handleAppDatasetSaveDraft = createAppDatasetSaveDraftHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetSaveDraft);
}
