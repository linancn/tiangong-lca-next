import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeSaveAssignmentDraftCommand,
  parseSaveAssignmentDraftCommand,
} from '../_shared/commands/review/save_assignment_draft.ts';
import type { SaveAssignmentDraftRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewSaveAssignmentDraftHandler(
  overrides: Partial<CommandHandlerOptions<SaveAssignmentDraftRequest>> = {},
) {
  return createCommandHandler<SaveAssignmentDraftRequest>({
    parse: parseSaveAssignmentDraftCommand,
    execute: executeSaveAssignmentDraftCommand,
    ...overrides,
  });
}

export const handleAdminReviewSaveAssignmentDraft = createAdminReviewSaveAssignmentDraftHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewSaveAssignmentDraft);
}
