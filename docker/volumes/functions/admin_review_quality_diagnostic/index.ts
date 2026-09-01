import '@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeReviewQualityDiagnosticCommand,
  parseReviewQualityDiagnosticCommand,
} from '../_shared/commands/review/quality_diagnostic.ts';
import type { ReviewQualityDiagnosticRequest } from '../_shared/commands/review/types.ts';

export function createAdminReviewQualityDiagnosticHandler(
  overrides: Partial<CommandHandlerOptions<ReviewQualityDiagnosticRequest>> = {},
) {
  return createCommandHandler<ReviewQualityDiagnosticRequest>({
    parse: parseReviewQualityDiagnosticCommand,
    execute: executeReviewQualityDiagnosticCommand,
    ...overrides,
  });
}

export const handleAdminReviewQualityDiagnostic = createAdminReviewQualityDiagnosticHandler();

if (import.meta.main) {
  Deno.serve(handleAdminReviewQualityDiagnostic);
}
