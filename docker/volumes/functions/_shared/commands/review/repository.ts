import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { CommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  callReviewApproveRpc,
  callReviewAssignReviewersRpc,
  callReviewRejectRpc,
  callReviewRevokeReviewerRpc,
  callReviewSaveAssignmentDraftRpc,
  callReviewSaveCommentDraftRpc,
  callReviewSubmitCommentRpc,
  type ReviewRpcResult,
} from '../../db_rpc/review_commands.ts';
import type {
  ApproveReviewRequest,
  AssignReviewersRequest,
  RejectReviewRequest,
  RevokeReviewerRequest,
  SaveAssignmentDraftRequest,
  SaveCommentDraftRequest,
  SubmitCommentRequest,
} from './types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type ReviewCommandRepository = {
  saveAssignmentDraft: (
    request: SaveAssignmentDraftRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
  assignReviewers: (
    request: AssignReviewersRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
  revokeReviewer: (
    request: RevokeReviewerRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
  saveCommentDraft: (
    request: SaveCommentDraftRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
  submitComment: (
    request: SubmitCommentRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
  approveReview: (
    request: ApproveReviewRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
  rejectReview: (
    request: RejectReviewRequest,
    audit: CommandAuditPayload,
  ) => Promise<ReviewRpcResult>;
};

function requireExplicitClient(supabase: RpcClient | null | undefined): RpcClient {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('Review command repository requires an explicit Supabase client');
  }

  return supabase;
}

export function createReviewCommandRepository(supabase: RpcClient): ReviewCommandRepository {
  const client = requireExplicitClient(supabase);

  return {
    saveAssignmentDraft: (request, audit) =>
      callReviewSaveAssignmentDraftRpc(client, request, audit),
    assignReviewers: (request, audit) => callReviewAssignReviewersRpc(client, request, audit),
    revokeReviewer: (request, audit) => callReviewRevokeReviewerRpc(client, request, audit),
    saveCommentDraft: (request, audit) => callReviewSaveCommentDraftRpc(client, request, audit),
    submitComment: (request, audit) => callReviewSubmitCommentRpc(client, request, audit),
    approveReview: (request, audit) => callReviewApproveRpc(client, request, audit),
    rejectReview: (request, audit) => callReviewRejectRpc(client, request, audit),
  };
}
