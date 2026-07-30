import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import {
  buildSnapshotProcessFilter,
  matchesSnapshotDataScopeFilter,
  type LcaDataScope,
  type SnapshotProcessFilter,
} from './lca_snapshot_scope.ts';

export type SnapshotScopeVerificationResult =
  | { ok: true; matches: true; process_filter: SnapshotProcessFilter }
  | { ok: true; matches: false }
  | { ok: false; error: 'snapshot_scope_lookup_failed'; status: 500 };

export async function verifySnapshotMatchesDataScope(
  supabase: SupabaseClient,
  args: {
    snapshotId: string;
    dataScope: LcaDataScope;
    userId: string;
  },
): Promise<SnapshotScopeVerificationResult> {
  const expectedProcessFilter = await buildSnapshotProcessFilter(args.dataScope, args.userId);
  const { data, error } = await supabase
    .from('lca_network_snapshots')
    .select('process_filter')
    .eq('id', args.snapshotId)
    .maybeSingle();

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
