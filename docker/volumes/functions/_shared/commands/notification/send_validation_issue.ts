import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createNotificationCommandRepository,
  type NotificationCommandRepository,
} from './repository.ts';
import type {
  NotificationCommandExecutionResult,
  NotificationSendValidationIssueRequest,
} from './types.ts';
import { parseNotificationSendValidationIssueRequest } from './validation.ts';

export function parseNotificationSendValidationIssueCommand(body: unknown) {
  return parseNotificationSendValidationIssueRequest(body);
}

export async function executeNotificationSendValidationIssueCommand(
  request: NotificationSendValidationIssueRequest,
  actor: ActorContext,
  repository: NotificationCommandRepository = createNotificationCommandRepository(actor.supabase),
): Promise<NotificationCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'notification_send_validation_issue',
    actorUserId: actor.userId,
    targetTable: 'notifications',
    targetId: request.datasetId,
    targetVersion: request.datasetVersion,
    payload: {
      recipientUserId: request.recipientUserId,
      datasetType: request.datasetType,
      issueCount: request.issueCount ?? 0,
    },
  });

  const result = await repository.sendValidationIssue(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'notification_send_validation_issue',
      data: result.data,
    },
  };
}
