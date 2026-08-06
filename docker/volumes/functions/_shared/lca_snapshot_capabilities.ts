import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

export type LcaSnapshotCandidate = {
  snapshotId: string;
  scope: string;
  processFilter: unknown;
  sourceHash?: string;
  createdAt: string;
  isActive: boolean;
  artifact: {
    artifactId?: string;
    artifactUrl: string;
    artifactSha256?: string;
    artifactByteSize?: number;
    artifactFormat?: string;
    processCount?: number;
    flowCount?: number;
    impactCount?: number;
    snapshotIndexSha256?: string;
    snapshotBuildContractHash?: string;
    effectiveScopeHash?: string;
    dataSnapshotToken?: string;
    closureBundleHash?: string;
  };
};

export type LcaSnapshotCandidatesResult =
  | { ok: true; data: LcaSnapshotCandidate[] }
  | { ok: false; code: string; status: number; details?: unknown };

export async function queryLcaSnapshotCandidates(
  client: Pick<SupabaseClient, 'rpc'>,
  request: {
    scope: 'full_library' | 'data_product';
    snapshotId?: string | null;
    processFilterContains?: unknown;
    limit?: number;
  },
): Promise<LcaSnapshotCandidatesResult> {
  const { data, error } = await client.rpc('svc_lca_snapshot_candidates', {
    p_scope: request.scope,
    p_snapshot_id: request.snapshotId ?? null,
    p_process_filter_contains: request.processFilterContains ?? null,
    p_limit: request.limit ?? 100,
  });

  if (error) {
    return { ok: false, code: error.code ?? 'SNAPSHOT_LOOKUP_FAILED', status: 500, details: error };
  }

  const envelope = data as Record<string, unknown> | null;
  if (!envelope || envelope.ok !== true) {
    return {
      ok: false,
      code: String(envelope?.code ?? 'SNAPSHOT_LOOKUP_FAILED'),
      status: Number(envelope?.status ?? 500),
      details: envelope,
    };
  }

  return {
    ok: true,
    data: Array.isArray(envelope.data) ? (envelope.data as LcaSnapshotCandidate[]) : [],
  };
}
