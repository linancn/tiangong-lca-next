import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type {
  LcaReleaseApproveRequest,
  LcaReleaseCommandFailure,
  LcaReleaseFinalizeArtifactsRequest,
  LcaReleasePrepareRequest,
  LcaReleasePublishRequest,
  LcaReleaseReadbackVerifyRequest,
  LcaReleaseUnpublishRequest,
} from '../commands/lca_release/types.ts';

export type LcaReleaseRpcClient = Pick<SupabaseClient, 'rpc'>;
export type LcaReleaseRpcResult = { ok: true; data: unknown } | LcaReleaseCommandFailure;

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'LCA release RPC failed',
    details: error.details ?? null,
  };
}

function isCommandFailure(data: unknown): data is LcaReleaseCommandFailure {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  const candidate = data as Partial<LcaReleaseCommandFailure> & {
    ok?: unknown;
  };
  return (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
}

export async function callLcaReleaseRpc(
  supabase: LcaReleaseRpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<LcaReleaseRpcResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return mapRpcError(error);
  }
  if (isCommandFailure(data)) {
    return data;
  }
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as { ok?: unknown }).ok === true &&
    'data' in (data as Record<string, unknown>)
  ) {
    return { ok: true, data: (data as Record<string, unknown>).data };
  }
  return { ok: true, data };
}

export function callLcaReleasePrepareRpc(
  supabase: LcaReleaseRpcClient,
  request: LcaReleasePrepareRequest,
  audit: CommandAuditPayload,
) {
  return callLcaReleaseRpc(supabase, 'cmd_lca_release_prepare', {
    p_release_run_id: request.releaseRunId,
    p_release_version: request.releaseVersion,
    p_selection_manifest_hash: request.selectionManifestHash,
    p_input_manifest_hash: request.inputManifestHash,
    p_calculation_bundle_ref: request.calculationBundleRef,
    p_calculation_bundle_hash: request.calculationBundleHash,
    p_profile_lock_hash: request.profileLockHash,
    p_publish_plan: request.publishPlan,
    p_publish_plan_hash: request.publishPlanHash,
    p_idempotency_key: request.idempotencyKey,
    p_audit: audit,
  });
}

export function callLcaReleaseFinalizeArtifactsRpc(
  supabase: LcaReleaseRpcClient,
  request: LcaReleaseFinalizeArtifactsRequest,
  audit: Record<string, unknown>,
) {
  return callLcaReleaseRpc(supabase, 'cmd_lca_release_artifacts_finalize_service', {
    p_release_run_id: request.releaseRunId,
    p_publish_plan_hash: request.publishPlanHash,
    p_release_manifest: request.releaseManifest,
    p_release_manifest_hash: request.releaseManifestHash,
    p_artifacts: request.artifacts,
    p_audit: audit,
  });
}

export function callLcaReleaseApproveRpc(
  supabase: LcaReleaseRpcClient,
  request: LcaReleaseApproveRequest,
  audit: CommandAuditPayload,
) {
  return callLcaReleaseRpc(supabase, 'cmd_lca_release_approve', {
    p_release_run_id: request.releaseRunId,
    p_publish_plan_hash: request.publishPlanHash,
    p_expires_at: request.expiresAt ?? null,
    p_reason: request.reason ?? null,
    p_audit: audit,
  });
}

export function callLcaReleasePublishRpc(
  supabase: LcaReleaseRpcClient,
  request: LcaReleasePublishRequest,
  audit: CommandAuditPayload,
) {
  return callLcaReleaseRpc(supabase, 'cmd_lca_release_publish', {
    p_release_run_id: request.releaseRunId,
    p_approval_id: request.approvalId,
    p_approval_hash: request.approvalHash,
    p_publish_plan_hash: request.publishPlanHash,
    p_idempotency_key: request.idempotencyKey,
    p_credential_fingerprint: request.credentialFingerprint,
    p_reason: request.reason ?? null,
    p_audit: audit,
  });
}

export function callLcaReleaseReadbackVerifyRpc(
  supabase: LcaReleaseRpcClient,
  request: LcaReleaseReadbackVerifyRequest,
  audit: CommandAuditPayload,
) {
  return callLcaReleaseRpc(supabase, 'cmd_lca_release_readback_verify', {
    p_release_run_id: request.releaseRunId,
    p_release_manifest_hash: request.releaseManifestHash,
    p_artifact_hashes: request.artifactHashes,
    p_audit: audit,
  });
}

export function callLcaReleaseUnpublishRpc(
  supabase: LcaReleaseRpcClient,
  request: LcaReleaseUnpublishRequest,
  audit: CommandAuditPayload,
) {
  return callLcaReleaseRpc(supabase, 'cmd_lca_release_unpublish', {
    p_publication_id: request.publicationId,
    p_reason: request.reason,
    p_audit: audit,
  });
}

export function callLcaReleaseRunRpc(supabase: LcaReleaseRpcClient, releaseRunId: string) {
  return callLcaReleaseRpc(supabase, 'get_lca_release_run', {
    p_release_run_id: releaseRunId,
  });
}

export function callLcaReleaseManagerAssertionRpc(supabase: LcaReleaseRpcClient) {
  return callLcaReleaseRpc(supabase, 'assert_lca_release_manager', {});
}

export function callCurrentLcaReleaseRpc(supabase: LcaReleaseRpcClient) {
  return callLcaReleaseRpc(supabase, 'get_current_lca_release', {});
}

export function callCurrentLcaReleaseProcessRpc(
  supabase: LcaReleaseRpcClient,
  processId: string,
  processVersion: string,
) {
  return callLcaReleaseRpc(supabase, 'get_current_lca_release_process', {
    p_process_uuid: processId,
    p_process_version: processVersion,
  });
}

export function callLcaReleaseArtifactDownloadRpc(
  supabase: LcaReleaseRpcClient,
  artifactId: string,
) {
  return callLcaReleaseRpc(supabase, 'get_lca_release_artifact_download', {
    p_artifact_id: artifactId,
  });
}

export function callLciaResultCalculationBundleRpc(
  supabase: LcaReleaseRpcClient,
  packageId: string,
) {
  return callLcaReleaseRpc(supabase, 'get_lcia_result_calculation_bundle', {
    p_package_id: packageId,
  });
}
