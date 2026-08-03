import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import {
  createDatasetApiV1Repository,
  type DatasetApiV1Repository,
} from '../../capabilities/dataset_api_v1.ts';
import type { CommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  callDatasetAssignTeamRpc,
  callDatasetCreateRpc,
  callDatasetCreateVersionRpc,
  callDatasetDeleteRpc,
  callDatasetPublishRpc,
  callDatasetReviewSubmitGateRpc,
  callDatasetReviewSubmitJobEnqueueRpc,
  callDatasetReviewSubmitJobReadLatestRpc,
  callDatasetReviewSubmitJobReadRpc,
  callDatasetSubmitReviewRpc,
  type DatasetRpcResult,
} from '../../db_rpc/dataset_commands.ts';
import type { RequestJwtSupabaseClient } from '../../supabase_client.ts';
import type {
  AssignTeamRequest,
  CreateRequest,
  CreateVersionRequest,
  DeleteRequest,
  PublishRequest,
  ReviewSubmitGateRequest,
  ReviewSubmitJobEnqueueRequest,
  ReviewSubmitJobReadLatestRequest,
  ReviewSubmitJobReadRequest,
  SaveDraftRequest,
  SubmitReviewRequest,
} from './types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type DatasetCommandRepository = {
  create: (request: CreateRequest, audit: CommandAuditPayload) => Promise<DatasetRpcResult>;
  createVersion: (
    request: CreateVersionRequest,
    audit: CommandAuditPayload,
  ) => Promise<DatasetRpcResult>;
  delete: (request: DeleteRequest, audit: CommandAuditPayload) => Promise<DatasetRpcResult>;
  saveDraft: (request: SaveDraftRequest, audit: CommandAuditPayload) => Promise<DatasetRpcResult>;
  assignTeam: (request: AssignTeamRequest, audit: CommandAuditPayload) => Promise<DatasetRpcResult>;
  publish: (request: PublishRequest, audit: CommandAuditPayload) => Promise<DatasetRpcResult>;
  submitReview: (
    request: SubmitReviewRequest,
    audit: CommandAuditPayload,
  ) => Promise<DatasetRpcResult>;
  reviewSubmitGate: (
    request: ReviewSubmitGateRequest,
    audit: CommandAuditPayload,
  ) => Promise<DatasetRpcResult>;
  reviewSubmitJobEnqueue: (
    request: ReviewSubmitJobEnqueueRequest,
    audit: CommandAuditPayload,
  ) => Promise<DatasetRpcResult>;
  reviewSubmitJobRead: (request: ReviewSubmitJobReadRequest) => Promise<DatasetRpcResult>;
  reviewSubmitJobReadLatest: (
    request: ReviewSubmitJobReadLatestRequest,
  ) => Promise<DatasetRpcResult>;
};

function requireExplicitClient(supabase: RpcClient | null | undefined): RpcClient {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('Dataset command repository requires an explicit Supabase client');
  }

  return supabase;
}

export function createDatasetCommandRepository(
  supabase: RequestJwtSupabaseClient,
): DatasetCommandRepository {
  const client = requireExplicitClient(supabase);
  const legacy = createLegacyDatasetCommandRepository(client);
  let apiV1: DatasetApiV1Repository | undefined;

  return {
    ...legacy,
    saveDraft(request, audit) {
      apiV1 ??= createDatasetApiV1Repository(supabase);
      return apiV1.saveDraft(request, audit);
    },
  };
}

export type LegacyDatasetCommandRepository = Omit<DatasetCommandRepository, 'saveDraft'>;

export function createLegacyDatasetCommandRepository(
  supabase: RpcClient,
): LegacyDatasetCommandRepository {
  const client = requireExplicitClient(supabase);

  return {
    create: (request, audit) => callDatasetCreateRpc(client, request, audit),
    createVersion: (request, audit) => callDatasetCreateVersionRpc(client, request, audit),
    delete: (request, audit) => callDatasetDeleteRpc(client, request, audit),
    assignTeam: (request, audit) => callDatasetAssignTeamRpc(client, request, audit),
    publish: (request, audit) => callDatasetPublishRpc(client, request, audit),
    submitReview: (request, audit) => callDatasetSubmitReviewRpc(client, request, audit),
    reviewSubmitGate: (request, audit) => callDatasetReviewSubmitGateRpc(client, request, audit),
    reviewSubmitJobEnqueue: (request, audit) =>
      callDatasetReviewSubmitJobEnqueueRpc(client, request, audit),
    reviewSubmitJobRead: (request) => callDatasetReviewSubmitJobReadRpc(client, request),
    reviewSubmitJobReadLatest: (request) =>
      callDatasetReviewSubmitJobReadLatestRpc(client, request),
  };
}
