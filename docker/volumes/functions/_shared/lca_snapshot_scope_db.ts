import { createLcaSnapshotCapabilityRepository } from './capabilities/lca_snapshot_family.ts';
import {
  buildSnapshotProcessFilter,
  matchesSnapshotDataScopeFilter,
  type LcaDataScope,
  type SnapshotProcessFilter,
} from './lca_snapshot_scope.ts';
import type { ServiceRoleSupabaseClient } from './supabase_client.ts';

export type SnapshotScopeVerificationResult =
  | { ok: true; matches: true; process_filter: SnapshotProcessFilter }
  | { ok: true; matches: false }
  | { ok: false; error: 'snapshot_scope_lookup_failed'; status: 500 };

export async function verifySnapshotMatchesDataScope(
  supabase: ServiceRoleSupabaseClient,
  args: {
    snapshotId: string;
    dataScope: LcaDataScope;
    userId: string;
  },
): Promise<SnapshotScopeVerificationResult> {
  const expectedProcessFilter = await buildSnapshotProcessFilter(args.dataScope, args.userId);
  const snapshotRepository = createLcaSnapshotCapabilityRepository(supabase);
  const { data, error } = await snapshotRepository.readScope(args.snapshotId);

  if (error) {
    console.warn('read explicit snapshot process filter failed', {
      error: error.message,
      code: error.code,
      snapshot_id: args.snapshotId,
      data_scope: args.dataScope,
      user_id: args.userId,
    });
    return { ok: false, error: 'snapshot_scope_lookup_failed', status: 500 };
  }

  const processFilter = (data as { process_filter?: unknown } | null)?.process_filter;
  if (!matchesSnapshotDataScopeFilter(processFilter, expectedProcessFilter)) {
    return { ok: true, matches: false };
  }

  return {
    ok: true,
    matches: true,
    process_filter: expectedProcessFilter,
  };
}
