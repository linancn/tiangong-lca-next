import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { CommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  callNotificationSendValidationIssueRpc,
  type NotificationRpcResult,
} from '../../db_rpc/notification_commands.ts';
import type { NotificationSendValidationIssueRequest } from './types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type NotificationCommandRepository = {
  sendValidationIssue: (
    request: NotificationSendValidationIssueRequest,
    audit: CommandAuditPayload,
  ) => Promise<NotificationRpcResult>;
};

function requireExplicitClient(supabase: RpcClient | null | undefined): RpcClient {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('Notification command repository requires an explicit Supabase client');
  }

  return supabase;
}

export function createNotificationCommandRepository(
  supabase: RpcClient,
): NotificationCommandRepository {
  const client = requireExplicitClient(supabase);

  return {
    sendValidationIssue: (request, audit) =>
      callNotificationSendValidationIssueRpc(client, request, audit),
  };
}
