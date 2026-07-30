import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeSubmitCommentCommand,
  parseSubmitCommentCommand,
} from '../_shared/commands/review/submit_comment.ts';
import type { SubmitCommentRequest } from '../_shared/commands/review/types.ts';

export function createAppReviewSubmitCommentHandler(
  overrides: Partial<CommandHandlerOptions<SubmitCommentRequest>> = {},
) {
  return createCommandHandler<SubmitCommentRequest>({
    parse: parseSubmitCommentCommand,
    execute: executeSubmitCommentCommand,
    ...overrides,
  });
}

export const handleAppReviewSubmitComment = createAppReviewSubmitCommentHandler();

if (import.meta.main) {
  Deno.serve(handleAppReviewSubmitComment);
}
