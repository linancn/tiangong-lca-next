import {
  DATASET_UUID_MENTION_PAGE_SIZE,
  mapDatasetUuidMentionRowsToListRows,
  normalizeDatasetUuidMentionStateCode,
  normalizeDatasetUuidMentionTeamId,
  normalizeDatasetUuidSearchQuery,
  searchDatasetJsonUuidMentionPage,
  searchDatasetJsonUuidMentions,
} from '@/services/datasetUuidMentionSearch/api';
import { getTeamIdByUserId } from '@/services/general/api';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('@/services/general/api', () => ({
  getTeamIdByUserId: jest.fn(),
}));

const supabaseMock = supabase as unknown as {
  auth: { getSession: jest.Mock };
  rpc: jest.Mock;
};
const getTeamIdByUserIdMock = getTeamIdByUserId as jest.Mock;

describe('datasetUuidMentionSearch service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });
  });

  it('normalizes only full UUID search queries', () => {
    expect(normalizeDatasetUuidSearchQuery(' D1380000-0000-4000-8000-000000000001 ')).toBe(
      'd1380000-0000-4000-8000-000000000001',
    );
    expect(normalizeDatasetUuidSearchQuery()).toBe(null);
    expect(normalizeDatasetUuidSearchQuery('prefix d1380000-0000-4000-8000-000000000001')).toBe(
      null,
    );
    expect(normalizeDatasetUuidSearchQuery('d1380000')).toBe(null);
  });

  it('normalizes state code filters', () => {
    expect(normalizeDatasetUuidMentionStateCode(100)).toBe(100);
    expect(normalizeDatasetUuidMentionStateCode('200')).toBe(200);
    expect(normalizeDatasetUuidMentionStateCode('all')).toBe(null);
    expect(normalizeDatasetUuidMentionStateCode('')).toBe(null);
    expect(normalizeDatasetUuidMentionStateCode('draft')).toBe(null);
    expect(normalizeDatasetUuidMentionStateCode(Number.NaN)).toBe(null);
  });

  it('normalizes optional route team ids', () => {
    expect(normalizeDatasetUuidMentionTeamId(' team-1 ')).toBe('team-1');
    expect(normalizeDatasetUuidMentionTeamId('')).toBe(null);
    expect(normalizeDatasetUuidMentionTeamId([])).toBe(null);
    expect(normalizeDatasetUuidMentionTeamId()).toBe(null);
  });

  it('calls the JSON UUID mention RPC with bounded params', async () => {
    await searchDatasetJsonUuidMentions({
      dataSource: 'my',
      sourceEntityKinds: ['process'],
      stateCode: '100',
      teamId: 'team-ignored-for-my',
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith('search_dataset_json_uuid_mentions', {
      p_data_source: 'my',
      p_limit: 20,
      p_source_entity_kinds: ['process'],
      p_state_code_filter: 100,
      p_team_id_filter: null,
      p_this_user_id: 'user-1',
      p_uuid: 'd1380000-0000-4000-8000-000000000001',
    });
  });

  it('preserves new backend entity kinds for the UI localized fallback', async () => {
    supabaseMock.rpc.mockResolvedValue({
      data: [
        {
          matched_by: 'json_uuid',
          matched_entity_table: 'future_datasets',
          rank: 1,
          source_entity_kind: 'future_dataset_kind',
          source_id: 'd1380000-0000-4000-8000-000000000001',
          source_version: '01.00.000',
        },
      ],
      error: null,
    });

    await expect(
      searchDatasetJsonUuidMentions({
        dataSource: 'my',
        sourceEntityKinds: ['process'],
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [expect.objectContaining({ source_entity_kind: 'future_dataset_kind' })],
        success: true,
      }),
    );
  });

  it('uses the current user team for team data searches', async () => {
    getTeamIdByUserIdMock.mockResolvedValue('team-1');

    await searchDatasetJsonUuidMentions({
      dataSource: 'te',
      sourceEntityKinds: ['flow'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_json_uuid_mentions',
      expect.objectContaining({
        p_data_source: 'te',
        p_team_id_filter: 'team-1',
      }),
    );
  });

  it('uses trimmed open-data team filters when present', async () => {
    await searchDatasetJsonUuidMentions({
      dataSource: 'co',
      sourceEntityKinds: ['flow'],
      stateCode: 200,
      teamId: ' team-1 ',
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_json_uuid_mentions',
      expect.objectContaining({
        p_data_source: 'co',
        p_state_code_filter: 200,
        p_team_id_filter: 'team-1',
      }),
    );
  });

  it('uses null team filters for blank public team values', async () => {
    await searchDatasetJsonUuidMentions({
      dataSource: 'tg',
      sourceEntityKinds: ['flow'],
      teamId: ' ',
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_json_uuid_mentions',
      expect.objectContaining({
        p_data_source: 'tg',
        p_team_id_filter: null,
      }),
    );
  });

  it('uses null team filters when public team values are omitted', async () => {
    await searchDatasetJsonUuidMentions({
      dataSource: 'tg',
      sourceEntityKinds: ['flow'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_json_uuid_mentions',
      expect.objectContaining({
        p_data_source: 'tg',
        p_team_id_filter: null,
      }),
    );
  });

  it('returns early for invalid UUID or empty source kinds', async () => {
    await expect(
      searchDatasetJsonUuidMentions({
        dataSource: 'my',
        sourceEntityKinds: ['process'],
        uuid: 'not-a-uuid',
      }),
    ).resolves.toEqual({ data: [], success: true });

    await expect(
      searchDatasetJsonUuidMentions({
        dataSource: 'my',
        sourceEntityKinds: [],
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).resolves.toEqual({ data: [], success: true });

    expect(supabaseMock.auth.getSession).not.toHaveBeenCalled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('skips team-data search when no current team can be resolved', async () => {
    getTeamIdByUserIdMock.mockResolvedValue(null);

    const result = await searchDatasetJsonUuidMentions({
      dataSource: 'te',
      sourceEntityKinds: ['flow'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(result).toEqual({ data: [], success: true });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('does not call RPC without an authenticated session', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

    const result = await searchDatasetJsonUuidMentions({
      dataSource: 'tg',
      sourceEntityKinds: ['flow'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(result).toEqual({ data: [], error: 'not_authenticated', success: false });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('uses an empty user id when the session user is missing', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: {} },
    });

    await searchDatasetJsonUuidMentions({
      dataSource: 'my',
      sourceEntityKinds: ['process'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_json_uuid_mentions',
      expect.objectContaining({
        p_this_user_id: '',
      }),
    );
  });

  it('returns RPC errors and falls back to empty data when needed', async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'rpc failed' },
    });

    await expect(
      searchDatasetJsonUuidMentions({
        dataSource: 'my',
        sourceEntityKinds: ['process'],
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).resolves.toEqual({ data: [], error: 'rpc failed', success: false });

    supabaseMock.rpc.mockResolvedValueOnce({ data: undefined, error: null });

    await expect(
      searchDatasetJsonUuidMentions({
        dataSource: 'my',
        sourceEntityKinds: ['process'],
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).resolves.toEqual({ data: [], success: true });
  });

  it('uses server count and pages beyond the former 50-result cap without slicing backend rows', async () => {
    const rows = [{ source_id: 'process-251', total_count: '1200' }];
    supabaseMock.rpc.mockResolvedValueOnce({ data: rows, error: null });
    const classification = [{ scope: 'classification' as const, code: 'C' }];
    const result = await searchDatasetJsonUuidMentionPage({
      dataSource: 'my',
      pageCurrent: 6,
      pageSize: 50,
      maxResults: 1,
      filterCondition: { classification, typeOfDataSet: 'LCI result' },
      sourceEntityKinds: ['process'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });
    expect(result).toEqual({ capped: false, data: rows, page: 6, success: true, total: 1200 });
    expect(supabaseMock.rpc).toHaveBeenCalledWith('search_dataset_uuid_mentions_page', {
      p_dataset_kind: 'process',
      p_data_source: 'my',
      p_filter_condition: { classification, typeOfDataSet: 'LCI result' },
      p_state_code: null,
      p_team_id: null,
      p_page_size: 50,
      p_page_current: 6,
      p_sort_by: 'modified_at',
      p_sort_direction: 'desc',
      p_owner_draft_only: false,
      p_version_scope: 'latest',
      p_uuid: 'd1380000-0000-4000-8000-000000000001',
    });
  });

  it('defaults to the shared 50-row size and retains mixed kinds inside server filters', async () => {
    expect(DATASET_UUID_MENTION_PAGE_SIZE).toBe(50);
    await searchDatasetJsonUuidMentionPage({
      dataSource: 'tg',
      sourceEntityKinds: ['process', 'flow'],
      stateCode: '100',
      teamId: ' team-1 ',
      uuid: ' D1380000-0000-4000-8000-000000000001 ',
      versionScope: 'all',
      ownerDraftOnly: true,
    });
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_uuid_mentions_page',
      expect.objectContaining({
        p_dataset_kind: 'all',
        p_filter_condition: { sourceEntityKinds: ['process', 'flow'] },
        p_page_size: 50,
        p_page_current: 1,
        p_state_code: 100,
        p_team_id: 'team-1',
        p_version_scope: 'all',
        p_owner_draft_only: true,
        p_uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    );
  });

  it('skips invalid UUIDs, empty kind selections, missing sessions and unresolvable teams', async () => {
    const options = { dataSource: 'my', sourceEntityKinds: ['process' as const], uuid: 'invalid' };
    expect(await searchDatasetJsonUuidMentionPage(options)).toMatchObject({
      data: [],
      success: true,
      total: 0,
    });
    expect(
      await searchDatasetJsonUuidMentionPage({
        ...options,
        sourceEntityKinds: [],
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).toMatchObject({ data: [], success: true });
    expect(supabaseMock.auth.getSession).not.toHaveBeenCalled();
    supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    expect(
      await searchDatasetJsonUuidMentionPage({
        ...options,
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).toMatchObject({ success: false, error: 'not_authenticated' });
    getTeamIdByUserIdMock.mockResolvedValueOnce(null);
    expect(
      await searchDatasetJsonUuidMentionPage({
        ...options,
        dataSource: 'te',
        uuid: 'd1380000-0000-4000-8000-000000000001',
      }),
    ).toMatchObject({ success: true, total: 0 });
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('resolves team scope and reports RPC failures without an unfiltered fallback', async () => {
    getTeamIdByUserIdMock.mockResolvedValueOnce('resolved-team');
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'page RPC unavailable' },
    });
    const result = await searchDatasetJsonUuidMentionPage({
      dataSource: 'te',
      teamId: 'ignored-team',
      sourceEntityKinds: ['flow'],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    });
    expect(result).toMatchObject({ success: false, total: 0, error: 'page RPC unavailable' });
    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'search_dataset_uuid_mentions_page',
      expect.objectContaining({ p_team_id: 'resolved-team' }),
    );
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
  });

  it('handles empty backend pages and malformed absent counts explicitly', async () => {
    const options = {
      dataSource: 'co',
      sourceEntityKinds: ['flow' as const],
      uuid: 'd1380000-0000-4000-8000-000000000001',
    };
    supabaseMock.rpc.mockResolvedValueOnce({ data: undefined, error: null });
    expect(await searchDatasetJsonUuidMentionPage(options)).toMatchObject({
      success: true,
      data: [],
      total: 0,
    });
    supabaseMock.rpc.mockResolvedValueOnce({ data: [{ total_count: 'not-a-count' }], error: null });
    expect(await searchDatasetJsonUuidMentionPage(options)).toMatchObject({
      success: true,
      total: 0,
    });
  });

  it('maps reference lookup RPC rows into list-row inputs', () => {
    expect(
      mapDatasetUuidMentionRowsToListRows([
        {
          matched_by: 'json',
          matched_entity_table: 'flows',
          rank: 1,
          source_entity_kind: 'flow',
          source_id: 'flow-1',
          source_json: { flowDataSet: {} },
          source_modified_at: null,
          source_team_id: null,
          source_version: '01.00.000',
        },
      ]),
    ).toEqual([
      {
        id: 'flow-1',
        json: { flowDataSet: {} },
        modified_at: undefined,
        team_id: undefined,
        version: '01.00.000',
      },
    ]);
  });
});
