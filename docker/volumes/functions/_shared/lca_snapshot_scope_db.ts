import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';
import { queryLcaSnapshotCandidates } from './lca_snapshot_capabilities.ts';

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
  const result = await queryLcaSnapshotCandidates(supabase, {
    scope: 'full_library',
    snapshotId: args.snapshotId,
    limit: 1,
  });

  if (!result.ok) {
    console.warn('read explicit snapshot process filter failed', {
      code: result.code,
      snapshot_id: args.snapshotId,
      data_scope: args.dataScope,
      user_id: args.userId,
    });
    return { ok: false, error: 'snapshot_scope_lookup_failed', status: 500 };
  }

  const processFilter = result.data[0]?.processFilter;
  if (!matchesSnapshotDataScopeFilter(processFilter, expectedProcessFilter)) {
    return { ok: true, matches: false };
  }

  return {
    ok: true,
    matches: true,
    process_filter: expectedProcessFilter,
  };
}
