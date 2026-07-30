import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeReviewSubmitJobCommand,
  parseReviewSubmitJobCommand,
} from '../_shared/commands/dataset/review_submit_jobs.ts';
import type { ReviewSubmitJobRequest } from '../_shared/commands/dataset/types.ts';

export function createAppDatasetReviewSubmitJobsHandler(
  overrides: Partial<CommandHandlerOptions<ReviewSubmitJobRequest>> = {},
) {
  return createCommandHandler<ReviewSubmitJobRequest>({
    parse: parseReviewSubmitJobCommand,
    execute: executeReviewSubmitJobCommand,
    ...overrides,
  });
}

export const handleAppDatasetReviewSubmitJobs = createAppDatasetReviewSubmitJobsHandler();

if (import.meta.main) {
  Deno.serve(handleAppDatasetReviewSubmitJobs);
}
