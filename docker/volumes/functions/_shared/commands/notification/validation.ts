import { z } from 'zod';

import type { CommandParseResult } from '../../command_runtime/command.ts';
import type { NotificationSendValidationIssueRequest } from './types.ts';

const uuidSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);

export const notificationSendValidationIssueRequestSchema = z
  .object({
    recipientUserId: uuidSchema,
    datasetType: nonEmptyStringSchema,
    datasetId: uuidSchema,
    datasetVersion: nonEmptyStringSchema,
    link: z.string().trim().optional().nullable(),
    issueCodes: z.array(nonEmptyStringSchema).optional(),
    tabNames: z.array(nonEmptyStringSchema).optional(),
    issueCount: z.number().int().nonnegative().optional(),
  })
  .strict();

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseNotificationSendValidationIssueRequest(
  body: unknown,
): CommandParseResult<NotificationSendValidationIssueRequest> {
  const parsed = notificationSendValidationIssueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid notification send-validation-issue payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}
