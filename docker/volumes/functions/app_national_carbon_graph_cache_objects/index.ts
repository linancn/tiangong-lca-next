import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  createCommandHandler,
  type CommandHandlerOptions,
} from '../_shared/command_runtime/command.ts';
import {
  executeNationalCarbonGraphCacheObjectsCommand,
  parseNationalCarbonGraphCacheObjectsCommand,
  type NationalCarbonGraphCacheObjectsRequest,
} from '../_shared/commands/national_carbon_graph_cache_objects.ts';

export function createAppNationalCarbonGraphCacheObjectsHandler(
  overrides: Partial<CommandHandlerOptions<NationalCarbonGraphCacheObjectsRequest>> = {},
) {
  return createCommandHandler<NationalCarbonGraphCacheObjectsRequest>({
    parse: parseNationalCarbonGraphCacheObjectsCommand,
    execute: executeNationalCarbonGraphCacheObjectsCommand,
    ...overrides,
  });
}

export const handleAppNationalCarbonGraphCacheObjects =
  createAppNationalCarbonGraphCacheObjectsHandler();

if (import.meta.main) {
  Deno.serve(handleAppNationalCarbonGraphCacheObjects);
}
