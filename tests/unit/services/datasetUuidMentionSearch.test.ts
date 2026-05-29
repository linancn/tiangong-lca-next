import {
  normalizeDatasetUuidMentionStateCode,
  normalizeDatasetUuidSearchQuery,
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
    expect(normalizeDatasetUuidSearchQuery('prefix d1380000-0000-4000-8000-000000000001')).toBe(
      null,
    );
    expect(normalizeDatasetUuidSearchQuery('d1380000')).toBe(null);
  });

  it('normalizes state code filters', () => {
    expect(normalizeDatasetUuidMentionStateCode(100)).toBe(100);
    expect(normalizeDatasetUuidMentionStateCode('200')).toBe(200);
    expect(normalizeDatasetUuidMentionStateCode('all')).toBe(null);
    expect(normalizeDatasetUuidMentionStateCode('draft')).toBe(null);
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
});
