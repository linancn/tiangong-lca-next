import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type { SaveDraftRequest } from '../commands/dataset/types.ts';
import {
  buildDatasetSaveDraftRpcArgs,
  type DatasetRpcResult,
  mapDatasetRpcResponse,
} from '../db_rpc/dataset_commands.ts';
import type { RequestJwtSupabaseClient } from '../supabase_client.ts';

export const DATASET_API_V1_CONTRACT = Object.freeze({
  contractVersion: 'supabase-consumer.v1',
  logicalCapability: 'dataset.save-draft',
  transport: 'data-api-rpc',
  schema: 'api',
  object: 'cmd_dataset_save_draft',
  signature: 'cmd_dataset_save_draft(text,uuid,text,jsonb,uuid,boolean,jsonb)',
  callerIdentity: 'request-jwt',
  authPropagation: 'caller-access-token',
  compatibility: 'preserve-request-response-error-auth-idempotency-audit',
  fallback: 'none',
  legacyIdentity: 'public.cmd_dataset_save_draft',
  legacyRemovalGate: 'consumer-zero-burn-in-contract-approval',
} as const);

export type DatasetApiV1Repository = {
  saveDraft(request: SaveDraftRequest, audit: CommandAuditPayload): Promise<DatasetRpcResult>;
};

export function createDatasetApiV1Repository(
  client: RequestJwtSupabaseClient,
): DatasetApiV1Repository {
  const api = client.schema(DATASET_API_V1_CONTRACT.schema);

  return Object.freeze({
    async saveDraft(request: SaveDraftRequest, audit: CommandAuditPayload) {
      return mapDatasetRpcResponse(
        await api.rpc(DATASET_API_V1_CONTRACT.object, buildDatasetSaveDraftRpcArgs(request, audit)),
      );
    },
  });
}
