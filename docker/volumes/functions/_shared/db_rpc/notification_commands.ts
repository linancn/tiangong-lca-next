import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type {
  NotificationCommandFailure,
  NotificationSendValidationIssueRequest,
} from '../commands/notification/types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type NotificationRpcResult = { ok: true; data: unknown } | NotificationCommandFailure;

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Notification command RPC failed',
    details: error.details ?? null,
  };
}

function isNotificationCommandFailure(data: unknown): data is NotificationCommandFailure {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<NotificationCommandFailure> & {
    ok?: unknown;
  };
  return (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
}

async function callNotificationRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<NotificationRpcResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return mapRpcError(error);
  }

  if (isNotificationCommandFailure(data)) {
    return data;
  }

  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as { ok?: unknown }).ok === true &&
    'data' in (data as Record<string, unknown>)
  ) {
    return {
      ok: true,
      data: (data as Record<string, unknown>).data,
    };
  }

  return {
    ok: true,
    data,
  };
}

export function buildNotificationSendValidationIssueRpcArgs(
  request: NotificationSendValidationIssueRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_recipient_user_id: request.recipientUserId,
    p_dataset_type: request.datasetType,
    p_dataset_id: request.datasetId,
    p_dataset_version: request.datasetVersion,
    p_link: request.link ?? null,
    p_issue_codes: request.issueCodes ?? [],
    p_tab_names: request.tabNames ?? [],
    p_issue_count: request.issueCount ?? 0,
    p_audit: audit,
  };
}

export function callNotificationSendValidationIssueRpc(
  supabase: RpcClient,
  request: NotificationSendValidationIssueRequest,
  audit: CommandAuditPayload,
) {
  return callNotificationRpc(
    supabase,
    'cmd_notification_send_validation_issue',
    buildNotificationSendValidationIssueRpcArgs(request, audit),
  );
}
