import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeNationalCarbonGraphCacheJobCommand,
  parseNationalCarbonGraphCacheJobCommand,
  type NationalCarbonGraphCacheJobRequest,
} from '../_shared/commands/national_carbon_graph_cache_jobs.ts';

export function createAppNationalCarbonGraphCacheJobsHandler(
  overrides: Partial<CommandHandlerOptions<NationalCarbonGraphCacheJobRequest>> = {},
) {
  return createCommandHandler<NationalCarbonGraphCacheJobRequest>({
    parse: parseNationalCarbonGraphCacheJobCommand,
    execute: executeNationalCarbonGraphCacheJobCommand,
    ...overrides,
  });
}

export const handleAppNationalCarbonGraphCacheJobs = createAppNationalCarbonGraphCacheJobsHandler();

if (import.meta.main) {
  Deno.serve(handleAppNationalCarbonGraphCacheJobs);
}
