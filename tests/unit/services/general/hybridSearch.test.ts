import { FunctionRegion } from '@supabase/supabase-js';

import { invokeFoundationHybridSearch } from '@/services/general/hybridSearch';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

const { supabase } = jest.requireMock('@/services/supabase');
const getSession = supabase.auth.getSession as jest.Mock;
const invoke = supabase.functions.invoke as jest.Mock;

const row = { id: 'row-1', total_count: '7' };
const mapRows = jest.fn(async (rows: (typeof row)[], lang: string) =>
  rows.map((item) => ({ id: item.id, lang })),
);

const makeOptions = (overrides: Record<string, unknown> = {}) => ({
  dataSource: 'tg',
  filterCondition: { classification: 'energy' },
  functionName: 'contact_hybrid_search' as const,
  lang: 'en',
  mapRows,
  params: { current: 2, pageSize: 25 },
  queryText: 'electricity',
  stateCode: 100,
  teamId: 'c3000000-0000-4000-8000-000000000297',
  ...overrides,
});

describe('invokeFoundationHybridSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({
      data: { session: { access_token: 'jwt-token' } },
      error: null,
    });
  });

  it('forwards paging, filter, state and team context and maps nested results', async () => {
    invoke.mockResolvedValue({ data: { data: [row] }, error: null });

    await expect(invokeFoundationHybridSearch(makeOptions())).resolves.toEqual({
      data: [{ id: 'row-1', lang: 'en' }],
      page: 2,
      success: true,
      total: 7,
    });
    expect(invoke).toHaveBeenCalledWith('contact_hybrid_search', {
      headers: { Authorization: 'Bearer jwt-token' },
      body: {
        query: 'electricity',
        filter_condition: { classification: 'energy' },
        data_source: 'tg',
        page_size: 25,
        page_current: 2,
        state_code: 100,
        team_id: 'c3000000-0000-4000-8000-000000000297',
      },
      region: FunctionRegion.UsEast1,
    });
    expect(mapRows).toHaveBeenCalledWith([row], 'en');
  });

  it('accepts the Edge Function top-level empty-list response with defaults', async () => {
    getSession.mockResolvedValue({ data: { session: {} }, error: null });
    invoke.mockResolvedValue({ data: [], error: null });

    await expect(
      invokeFoundationHybridSearch(
        makeOptions({
          params: {},
          stateCode: 'all',
          teamId: null,
        }),
      ),
    ).resolves.toEqual({ data: [], page: 1, success: true, total: 0 });
    expect(invoke).toHaveBeenCalledWith(
      'contact_hybrid_search',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: {
          query: 'electricity',
          filter_condition: { classification: 'energy' },
          data_source: 'tg',
          page_size: 10,
          page_current: 1,
        },
      }),
    );
    expect(mapRows).not.toHaveBeenCalled();
  });

  it('returns a genuine empty team result before authentication when no team is selected', async () => {
    await expect(
      invokeFoundationHybridSearch(makeOptions({ dataSource: 'te', teamId: null })),
    ).resolves.toEqual({ data: [], page: 2, success: true, total: 0 });
    expect(getSession).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('distinguishes missing sessions with and without an auth error', async () => {
    const authError = new Error('session failed');
    getSession.mockResolvedValueOnce({ data: { session: null }, error: authError });
    await expect(invokeFoundationHybridSearch(makeOptions())).resolves.toEqual({
      data: [],
      error: authError,
      page: 2,
      success: false,
      total: 0,
    });

    getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    const result = await invokeFoundationHybridSearch(makeOptions());
    expect(result).toMatchObject({ data: [], page: 2, success: false, total: 0 });
    expect(result.error).toEqual(new Error('Hybrid search requires an authenticated session'));
  });

  it('returns invocation errors and malformed successful responses as failures', async () => {
    const invokeError = new Error('function failed');
    invoke.mockResolvedValueOnce({ data: null, error: invokeError });
    await expect(invokeFoundationHybridSearch(makeOptions())).resolves.toEqual({
      data: [],
      error: invokeError,
      page: 2,
      success: false,
      total: 0,
    });

    invoke.mockResolvedValueOnce({ data: { unexpected: true }, error: null });
    const malformed = await invokeFoundationHybridSearch(makeOptions());
    expect(malformed).toMatchObject({ data: [], page: 2, success: false, total: 0 });
    expect(malformed.error).toEqual(new Error('Hybrid search returned an invalid response'));
  });

  it('converts thrown transport and mapping failures into explicit failures', async () => {
    const transportError = new Error('network failed');
    invoke.mockRejectedValueOnce(transportError);
    await expect(invokeFoundationHybridSearch(makeOptions())).resolves.toEqual({
      data: [],
      error: transportError,
      page: 2,
      success: false,
      total: 0,
    });

    const mappingError = new Error('mapping failed');
    invoke.mockResolvedValueOnce({ data: [row], error: null });
    mapRows.mockRejectedValueOnce(mappingError);
    await expect(invokeFoundationHybridSearch(makeOptions())).resolves.toEqual({
      data: [],
      error: mappingError,
      page: 2,
      success: false,
      total: 0,
    });
  });

  it('normalizes missing or invalid total_count metadata to zero', async () => {
    invoke.mockResolvedValue({
      data: { data: [{ id: 'row-2', total_count: 'not-a-number' }] },
      error: null,
    });

    await expect(invokeFoundationHybridSearch(makeOptions())).resolves.toMatchObject({
      success: true,
      total: 0,
    });
  });
});
