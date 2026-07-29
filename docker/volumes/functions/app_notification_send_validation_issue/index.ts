import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeNotificationSendValidationIssueCommand,
  parseNotificationSendValidationIssueCommand,
} from '../_shared/commands/notification/send_validation_issue.ts';
import type { NotificationSendValidationIssueRequest } from '../_shared/commands/notification/types.ts';

export function createAppNotificationSendValidationIssueHandler(
  overrides: Partial<CommandHandlerOptions<NotificationSendValidationIssueRequest>> = {},
) {
  return createCommandHandler<NotificationSendValidationIssueRequest>({
    parse: parseNotificationSendValidationIssueCommand,
    execute: executeNotificationSendValidationIssueCommand,
    ...overrides,
  });
}

export const handleAppNotificationSendValidationIssue =
  createAppNotificationSendValidationIssueHandler();

if (import.meta.main) {
  Deno.serve(handleAppNotificationSendValidationIssue);
}
