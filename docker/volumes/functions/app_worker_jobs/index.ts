import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeWorkerJobCommand,
  parseWorkerJobCommand,
  type WorkerJobRequest,
} from '../_shared/commands/worker_jobs.ts';

export function createAppWorkerJobsHandler(
  overrides: Partial<CommandHandlerOptions<WorkerJobRequest>> = {},
) {
  return createCommandHandler<WorkerJobRequest>({
    parse: parseWorkerJobCommand,
    execute: executeWorkerJobCommand,
    ...overrides,
  });
}

export const handleAppWorkerJobs = createAppWorkerJobsHandler();

if (import.meta.main) {
  Deno.serve(handleAppWorkerJobs);
}
