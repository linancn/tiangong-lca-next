import { assertEquals } from 'jsr:@std/assert';

import {
  buildSnapshotBuildPayloadFields,
  buildSnapshotContainsFilter,
  buildSnapshotProcessFilter,
  matchesSnapshotProcessFilter,
  normalizeLcaDataScope,
} from './lca_snapshot_scope.ts';

Deno.test('normalizeLcaDataScope defaults to current_user and rejects unknown values', () => {
  assertEquals(normalizeLcaDataScope(undefined), 'current_user');
  assertEquals(normalizeLcaDataScope(''), 'current_user');
  assertEquals(normalizeLcaDataScope('open_data'), 'open_data');
  assertEquals(normalizeLcaDataScope('all_data'), 'all_data');
  assertEquals(normalizeLcaDataScope('unexpected_scope'), null);
});

Deno.test('buildSnapshotProcessFilter maps each analysis scope to the expected filter', () => {
  assertEquals(buildSnapshotProcessFilter('current_user', 'user-1'), {
    all_states: false,
    process_states: [100],
    include_user_id: 'user-1',
  });
  assertEquals(buildSnapshotProcessFilter('open_data', 'user-1'), {
    all_states: false,
    process_states: [100],
  });
  assertEquals(buildSnapshotProcessFilter('all_data', 'user-1'), {
    all_states: true,
  });
});

Deno.test(
  'matchesSnapshotProcessFilter keeps current_user and open_data snapshots distinct',
  () => {
    const currentUserFilter = buildSnapshotProcessFilter('current_user', 'user-1');
    const openDataFilter = buildSnapshotProcessFilter('open_data', 'user-1');

    assertEquals(matchesSnapshotProcessFilter(currentUserFilter, currentUserFilter), true);
    assertEquals(matchesSnapshotProcessFilter(openDataFilter, openDataFilter), true);
    assertEquals(matchesSnapshotProcessFilter(currentUserFilter, openDataFilter), false);
    assertEquals(matchesSnapshotProcessFilter(openDataFilter, currentUserFilter), false);
    assertEquals(
      matchesSnapshotProcessFilter(
        {
          all_states: true,
          process_states: [100],
          include_user_id: 'user-1',
        },
        buildSnapshotProcessFilter('all_data', 'user-1'),
      ),
      true,
    );
  },
);

Deno.test('snapshot query/build payload filters stay aligned with scope semantics', () => {
  const currentUserFilter = buildSnapshotProcessFilter('current_user', 'user-1');
  const openDataFilter = buildSnapshotProcessFilter('open_data', 'user-1');
  const allDataFilter = buildSnapshotProcessFilter('all_data', 'user-1');

  assertEquals(buildSnapshotContainsFilter(currentUserFilter), {
    all_states: false,
    process_states: [100],
    include_user_id: 'user-1',
  });
  assertEquals(buildSnapshotContainsFilter(openDataFilter), {
    all_states: false,
    process_states: [100],
  });
  assertEquals(buildSnapshotContainsFilter(allDataFilter), {
    all_states: true,
  });

  assertEquals(buildSnapshotBuildPayloadFields(currentUserFilter), {
    all_states: false,
    process_states: '100',
    include_user_id: 'user-1',
  });
  assertEquals(buildSnapshotBuildPayloadFields(openDataFilter), {
    all_states: false,
    process_states: '100',
  });
  assertEquals(buildSnapshotBuildPayloadFields(allDataFilter), {
    all_states: true,
  });
});
