import type { PostgrestError } from 'jsr:@supabase/supabase-js@2.98.0';

import type { ServiceRoleSupabaseClient } from '../supabase_client.ts';

export const LCA_SNAPSHOT_CAPABILITY_CONTRACT = Object.freeze({
  contractVersion: 'supabase-consumer.v1',
  databaseCommit: '86ba7ee2c33e45df8008117a2dec3ee4deedc32c',
  migrationHead: '20260802091342',
  transport: 'data-api-rpc',
  schema: 'api',
  callerIdentity: 'service-role',
  authPropagation: 'dedicated Edge service client; no request JWT substitution',
  fallback: 'none',
  routines: {
    activeRead: 'lca_snapshot_active_read_v1',
    scopeRead: 'lca_snapshot_scope_read_v1',
    resolve: 'lca_snapshot_resolve_v1',
    artifactRead: 'lca_snapshot_artifact_read_v1',
    artifactLatest: 'lca_snapshot_artifact_latest_v1',
    create: 'cmd_lca_snapshot_create_v1',
  },
  legacyRelations: [
    'public.lca_active_snapshots',
    'public.lca_network_snapshots',
    'public.lca_snapshot_artifacts',
  ],
  legacyRemovalGate: 'static/runtime/owner consumer-zero plus burn-in and Contract approval',
} as const);

export type LcaSnapshotActive = {
  snapshot_id: string;
  source_hash: string;
  activated_at: string;
};

export type LcaSnapshotScope = {
  id: string;
  scope: string;
  process_filter: unknown;
  status: string;
};

export type LcaSnapshotCandidate = {
  id: string;
  created_at: string;
  process_filter: unknown;
};

export type LcaSnapshotArtifact = {
  snapshot_id: string;
  artifact_url: string;
  artifact_format: string;
  process_count: number;
  status: string;
  created_at: string;
};

export type LcaSnapshotCreateResult = {
  snapshotId: string;
  created: boolean;
};

export type LcaSnapshotCapabilityResult<T> = {
  data: T;
  error: PostgrestError | null;
};

export type LcaSnapshotCapabilityRepository = {
  readonly access: 'service-only';
  readActive(scope: string): Promise<LcaSnapshotCapabilityResult<LcaSnapshotActive | null>>;
  readScope(snapshotId: string): Promise<LcaSnapshotCapabilityResult<LcaSnapshotScope | null>>;
  resolveReady(
    scope: string,
    processFilter: Record<string, unknown>,
  ): Promise<LcaSnapshotCapabilityResult<LcaSnapshotCandidate[]>>;
  readArtifact(
    snapshotId: string,
  ): Promise<LcaSnapshotCapabilityResult<LcaSnapshotArtifact | null>>;
  readLatestArtifact(): Promise<LcaSnapshotCapabilityResult<LcaSnapshotArtifact | null>>;
  createDraft(request: {
    snapshotId: string;
    scope: 'full_library';
    processFilter: Record<string, unknown>;
    createdBy: string;
  }): Promise<LcaSnapshotCapabilityResult<LcaSnapshotCreateResult | null>>;
};

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }
  return data && typeof data === 'object' ? (data as T) : null;
}

function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export function createLcaSnapshotCapabilityRepository(
  client: ServiceRoleSupabaseClient,
): LcaSnapshotCapabilityRepository {
  // Keep construction side-effect free so module-level repositories preserve the shared
  // deferred-client contract and do not read runtime credentials before the first request.
  const api = () => client.schema(LCA_SNAPSHOT_CAPABILITY_CONTRACT.schema);
  const routines = LCA_SNAPSHOT_CAPABILITY_CONTRACT.routines;

  return Object.freeze({
    access: 'service-only' as const,
    async readActive(scope: string) {
      const { data, error } = await api().rpc(routines.activeRead, { p_scope: scope });
      return { data: firstRow<LcaSnapshotActive>(data), error };
    },
    async readScope(snapshotId: string) {
      const { data, error } = await api().rpc(routines.scopeRead, {
        p_snapshot_id: snapshotId,
      });
      return { data: firstRow<LcaSnapshotScope>(data), error };
    },
    async resolveReady(scope: string, processFilter: Record<string, unknown>) {
      const { data, error } = await api().rpc(routines.resolve, {
        p_scope: scope,
        p_process_filter: processFilter,
      });
      return { data: rows<LcaSnapshotCandidate>(data), error };
    },
    async readArtifact(snapshotId: string) {
      const { data, error } = await api().rpc(routines.artifactRead, {
        p_snapshot_id: snapshotId,
      });
      return { data: firstRow<LcaSnapshotArtifact>(data), error };
    },
    async readLatestArtifact() {
      const { data, error } = await api().rpc(routines.artifactLatest);
      return { data: firstRow<LcaSnapshotArtifact>(data), error };
    },
    async createDraft(request) {
      const { data, error } = await api().rpc(routines.create, {
        p_snapshot_id: request.snapshotId,
        p_scope: request.scope,
        p_process_filter: request.processFilter,
        p_created_by: request.createdBy,
      });
      return { data: firstRow<LcaSnapshotCreateResult>(data), error };
    },
  });
}
