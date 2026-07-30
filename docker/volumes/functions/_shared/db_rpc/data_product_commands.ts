import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type {
  DataProductBuildCreateRequest,
  DataProductClosureCheckCreateRequest,
  DataProductClosureCheckReadRequest,
  DataProductClosureIssuesRequest,
  DataProductClosureReportDownloadRequest,
  DataProductCommandFailure,
  DataProductPackagePreviewRequest,
  DataProductPackagePublishRequest,
  DataProductPackageUnpublishRequest,
  DataProductTaskFeedRequest,
} from '../commands/data_product/types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type DataProductRpcResult = { ok: true; data: unknown } | DataProductCommandFailure;

export type DataProductPublishedResultsRequest = {
  processId: string;
  processVersion: string;
  impactCategoryId?: string;
};

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Data product RPC failed',
    details: error.details ?? null,
  };
}

function isDataProductCommandFailure(data: unknown): data is DataProductCommandFailure {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<DataProductCommandFailure> & { ok?: unknown };
  return (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
}

async function callDataProductRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<DataProductRpcResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return mapRpcError(error);
  }

  if (isDataProductCommandFailure(data)) {
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

export function buildLciaResultBuildRequestRpcArgs(
  request: DataProductBuildCreateRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_name: request.name,
    p_processes: request.processes ?? null,
    p_coverage_mode: request.coverageMode,
    p_default_impact_category: request.defaultImpactCategory ?? null,
    p_lcia_method_set: request.lciaMethodSet,
    p_idempotency_key: request.idempotencyKey ?? null,
    p_audit: audit,
  };
}

export function buildLciaScopeClosureCheckRequestRpcArgs(
  request: DataProductClosureCheckCreateRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_requested_scope: request.requestedScope,
    p_request_idempotency_token: request.requestIdempotencyToken,
    p_audit: audit,
  };
}

export function buildLciaScopeClosureIssuesRpcArgs(
  request: DataProductClosureIssuesRequest,
): Record<string, unknown> {
  return {
    p_closure_check_id: request.closureCheckId,
    p_after_issue_id: request.afterIssueId ?? null,
    p_limit: request.limit ?? 100,
  };
}

export function buildLciaScopeClosureReportDownloadRpcArgs(
  request: DataProductClosureReportDownloadRequest,
): Record<string, unknown> {
  return {
    p_closure_check_id: request.closureCheckId,
    p_artifact_role: request.artifactRole,
  };
}

export function buildTaskSummaryV2FeedRpcArgs(
  request: DataProductTaskFeedRequest,
): Record<string, unknown> {
  return {
    p_category: request.category ?? null,
    p_job_kinds: request.jobKinds ?? null,
    p_statuses: request.statuses ?? null,
    p_updated_since: request.updatedSince ?? null,
    p_cursor_updated_at: request.cursor?.updatedAt ?? null,
    p_cursor_job_id: request.cursor?.jobId ?? null,
    p_limit: request.limit ?? 50,
    p_root_only: request.rootOnly ?? false,
  };
}

export function buildDataProductPackagePreviewRpcArgs(
  request: DataProductPackagePreviewRequest,
): Record<string, unknown> {
  return {
    p_package_id: request.packageId,
  };
}

export function buildDataProductPackagePublishRpcArgs(
  request: DataProductPackagePublishRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_package_id: request.packageId,
    p_display_default_impact_category: request.displayDefaultImpactCategory ?? null,
    p_reason: request.reason ?? null,
    p_audit: audit,
  };
}

export const buildLciaResultPackagePublishRpcArgs = buildDataProductPackagePublishRpcArgs;

export function buildDataProductPackageUnpublishRpcArgs(
  request: DataProductPackageUnpublishRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_publication_id: request.publicationId,
    p_reason: request.reason ?? null,
    p_audit: audit,
  };
}

export function buildDataProductPublishedResultsRpcArgs(
  request: DataProductPublishedResultsRequest,
): Record<string, unknown> {
  return {
    p_process_id: request.processId,
    p_process_version: request.processVersion,
    p_impact_category_id: request.impactCategoryId ?? null,
  };
}

export function callLciaResultBuildRequestRpc(
  supabase: RpcClient,
  request: DataProductBuildCreateRequest,
  audit: CommandAuditPayload,
) {
  if (request.closureCheckId && request.requestedScopeHash && request.policyFingerprint) {
    return callDataProductRpc(supabase, 'cmd_lcia_result_build_request_v2', {
      ...buildLciaResultBuildRequestRpcArgs(request, audit),
      p_closure_check_id: request.closureCheckId,
      p_requested_scope_hash: request.requestedScopeHash,
      p_policy_fingerprint: request.policyFingerprint,
    });
  }
  return callDataProductRpc(
    supabase,
    'cmd_lcia_result_build_request',
    buildLciaResultBuildRequestRpcArgs(request, audit),
  );
}

export function callLciaScopeClosureCheckRequestRpc(
  supabase: RpcClient,
  request: DataProductClosureCheckCreateRequest,
  audit: CommandAuditPayload,
) {
  return callDataProductRpc(
    supabase,
    'cmd_lcia_scope_closure_check_request_v2',
    buildLciaScopeClosureCheckRequestRpcArgs(request, audit),
  );
}

export function callLciaScopeClosureCheckReadRpc(
  supabase: RpcClient,
  request: DataProductClosureCheckReadRequest,
) {
  return callDataProductRpc(supabase, 'get_lcia_scope_closure_check', {
    p_closure_check_id: request.closureCheckId,
  });
}

export function callLciaScopeClosureIssuesRpc(
  supabase: RpcClient,
  request: DataProductClosureIssuesRequest,
) {
  return callDataProductRpc(
    supabase,
    'list_lcia_scope_closure_issues',
    buildLciaScopeClosureIssuesRpcArgs(request),
  );
}

export function callLciaScopeClosureReportDownloadRpc(
  supabase: RpcClient,
  request: DataProductClosureReportDownloadRequest,
) {
  return callDataProductRpc(
    supabase,
    'get_lcia_scope_closure_report_download',
    buildLciaScopeClosureReportDownloadRpcArgs(request),
  );
}

export function callTaskSummaryV2FeedRpc(supabase: RpcClient, request: DataProductTaskFeedRequest) {
  return callDataProductRpc(
    supabase,
    'get_task_summary_v2_feed',
    buildTaskSummaryV2FeedRpcArgs(request),
  );
}

export function callDataProductPackagePreviewRpc(
  supabase: RpcClient,
  request: DataProductPackagePreviewRequest,
) {
  return callDataProductRpc(
    supabase,
    'get_lcia_result_package_preview',
    buildDataProductPackagePreviewRpcArgs(request),
  );
}

export function callLciaResultPackagePublishRpc(
  supabase: RpcClient,
  request: DataProductPackagePublishRequest,
  audit: CommandAuditPayload,
) {
  return callDataProductRpc(
    supabase,
    'cmd_lcia_result_package_publish',
    buildDataProductPackagePublishRpcArgs(request, audit),
  );
}

export function callDataProductPackageUnpublishRpc(
  supabase: RpcClient,
  request: DataProductPackageUnpublishRequest,
  audit: CommandAuditPayload,
) {
  return callDataProductRpc(
    supabase,
    'cmd_lcia_result_publication_unpublish',
    buildDataProductPackageUnpublishRpcArgs(request, audit),
  );
}

export function callDataProductPublishedResultsRpc(
  supabase: RpcClient,
  request: DataProductPublishedResultsRequest,
) {
  return callDataProductRpc(
    supabase,
    'get_published_lcia_result_package',
    buildDataProductPublishedResultsRpcArgs(request),
  );
}
