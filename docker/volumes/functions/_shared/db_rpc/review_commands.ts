import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type {
  ApproveReviewRequest,
  AssignReviewersRequest,
  RejectReviewRequest,
  ReviewCommandFailure,
  ReviewerDecisionRequest,
  ReviewIdRequest,
  ReviewQualityDiagnosticRequest,
  RevokeReviewerRequest,
  SaveAssignmentDraftRequest,
  SaveCommentDraftRequest,
  SimpleReviewDecisionRequest,
  SubmitCommentRequest,
} from '../commands/review/types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type ReviewRpcResult = { ok: true; data: unknown } | ReviewCommandFailure;

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Review command RPC failed',
    details: error.details ?? null,
  };
}

function isReviewCommandFailure(data: unknown): data is ReviewCommandFailure {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<ReviewCommandFailure> & { ok?: unknown };
  return (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
}

async function callReviewRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<ReviewRpcResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return mapRpcError(error);
  }

  if (isReviewCommandFailure(data)) {
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

export function buildReviewSaveAssignmentDraftRpcArgs(
  request: SaveAssignmentDraftRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_reviewer_ids: request.reviewerIds,
    p_audit: audit,
  };
}

export function buildReviewAssignReviewersRpcArgs(
  request: AssignReviewersRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_reviewer_ids: request.reviewerIds,
    p_deadline: request.deadline ?? null,
    p_audit: audit,
  };
}

export function buildReviewRevokeReviewerRpcArgs(
  request: RevokeReviewerRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_reviewer_id: request.reviewerId,
    p_audit: audit,
  };
}

export function buildReviewSaveCommentDraftRpcArgs(
  request: SaveCommentDraftRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_json: request.json,
    p_audit: audit,
  };
}

export function buildReviewSubmitCommentRpcArgs(
  request: SubmitCommentRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_json: request.json,
    p_comment_state: request.commentState ?? 1,
    p_audit: audit,
  };
}

export function buildReviewApproveRpcArgs(
  request: ApproveReviewRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_audit: audit,
  };
}

export function buildReviewRejectRpcArgs(
  request: RejectReviewRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_reason: request.reason,
    p_audit: audit,
  };
}

export function buildSimpleReviewDecisionRpcArgs(
  request: SimpleReviewDecisionRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_decision: request.decision,
    p_reason: request.decision === 'reject' ? request.reason : null,
    p_audit: audit,
  };
}

export function buildReviewFinalizeApproveByIdRpcArgs(
  request: ReviewIdRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_audit: audit,
  };
}

export function buildReviewFinalizeRejectByIdRpcArgs(
  request: ReviewIdRequest & { reason: string },
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_reason: request.reason,
    p_audit: audit,
  };
}

export function buildReviewerDecisionRpcArgs(
  request: ReviewerDecisionRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_review_id: request.reviewId,
    p_decision: request.decision,
    p_reason: request.decision === 'reject' ? request.reason : null,
    p_audit: audit,
  };
}

export function callReviewSaveAssignmentDraftRpc(
  supabase: RpcClient,
  request: SaveAssignmentDraftRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_save_assignment_draft',
    buildReviewSaveAssignmentDraftRpcArgs(request, audit),
  );
}

export function callReviewAssignReviewersRpc(
  supabase: RpcClient,
  request: AssignReviewersRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_assign_reviewers',
    buildReviewAssignReviewersRpcArgs(request, audit),
  );
}

export function callReviewRevokeReviewerRpc(
  supabase: RpcClient,
  request: RevokeReviewerRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_revoke_reviewer',
    buildReviewRevokeReviewerRpcArgs(request, audit),
  );
}

export function callReviewSaveCommentDraftRpc(
  supabase: RpcClient,
  request: SaveCommentDraftRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_save_comment_draft',
    buildReviewSaveCommentDraftRpcArgs(request, audit),
  );
}

export function callReviewSubmitCommentRpc(
  supabase: RpcClient,
  request: SubmitCommentRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_submit_comment',
    buildReviewSubmitCommentRpcArgs(request, audit),
  );
}

export function callReviewApproveRpc(
  supabase: RpcClient,
  request: ApproveReviewRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_finalize_approve',
    buildReviewApproveRpcArgs(request, audit),
  );
}

export function callReviewRejectRpc(
  supabase: RpcClient,
  request: RejectReviewRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_finalize_reject',
    buildReviewRejectRpcArgs(request, audit),
  );
}

export function callSimpleReviewDecisionRpc(
  supabase: RpcClient,
  request: SimpleReviewDecisionRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_simple_review_submit_decision',
    buildSimpleReviewDecisionRpcArgs(request, audit),
  );
}

export function callReviewFinalizeApproveByIdRpc(
  supabase: RpcClient,
  request: ReviewIdRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_finalize_approve',
    buildReviewFinalizeApproveByIdRpcArgs(request, audit),
  );
}

export function callReviewFinalizeRejectByIdRpc(
  supabase: RpcClient,
  request: ReviewIdRequest & { reason: string },
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_review_finalize_reject',
    buildReviewFinalizeRejectByIdRpcArgs(request, audit),
  );
}

export function callReviewerDecisionRpc(
  supabase: RpcClient,
  request: ReviewerDecisionRequest,
  audit: CommandAuditPayload,
) {
  return callReviewRpc(
    supabase,
    'cmd_reviewer_submit_decision',
    buildReviewerDecisionRpcArgs(request, audit),
  );
}

export function callReviewQualityDiagnosticStartRpc(supabase: RpcClient) {
  return callReviewRpc(supabase, 'cmd_review_quality_diagnostic_start', {});
}

export function callReviewQualityDiagnosticReadRpc(
  supabase: RpcClient,
  request: Extract<ReviewQualityDiagnosticRequest, { action: 'read' }>,
) {
  return callReviewRpc(supabase, 'qry_review_quality_diagnostic', {
    p_run_id: request.runId ?? null,
  });
}
