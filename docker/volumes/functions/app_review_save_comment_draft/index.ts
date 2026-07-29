import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeSaveCommentDraftCommand,
  parseSaveCommentDraftCommand,
} from '../_shared/commands/review/save_comment_draft.ts';
import type { SaveCommentDraftRequest } from '../_shared/commands/review/types.ts';

export function createAppReviewSaveCommentDraftHandler(
  overrides: Partial<CommandHandlerOptions<SaveCommentDraftRequest>> = {},
) {
  return createCommandHandler<SaveCommentDraftRequest>({
    parse: parseSaveCommentDraftCommand,
    execute: executeSaveCommentDraftCommand,
    ...overrides,
  });
}

export const handleAppReviewSaveCommentDraft = createAppReviewSaveCommentDraftHandler();

if (import.meta.main) {
  Deno.serve(handleAppReviewSaveCommentDraft);
}
