/**
 * @jest-environment jsdom
 */

type CatalogRouteOptions = {
  datasetKind: string;
  mode: string;
};

const mockQueryMappedOpenDataCatalog = jest.fn(
  async (_options: CatalogRouteOptions, mapRows: (rows: unknown[]) => Promise<unknown[]>) => ({
    data: await mapRows([]),
    page: 1,
    success: true,
    total: 0,
  }),
);

const mockRpc = jest.fn();
const mockGetSession = jest.fn();
const mockInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

jest.mock('@/services/openDataCatalog/api', () => ({
  ...jest.requireActual('@/services/openDataCatalog/api'),
  queryMappedOpenDataCatalog: (
    options: CatalogRouteOptions,
    mapRows: (rows: unknown[]) => Promise<unknown[]>,
  ) => mockQueryMappedOpenDataCatalog(options, mapRows),
}));

jest.mock('@/services/classifications/cache', () => ({
  getCachedClassificationData: jest.fn(async () => []),
  getCachedFlowCategorizationAll: jest.fn(async () => []),
}));

jest.mock('@/services/locations/cache', () => ({
  getCachedLocationData: jest.fn(async () => []),
}));

import {
  contact_hybrid_search,
  getContactTableAll,
  getContactTablePgroongaSearch,
  getContactTableUuidMentionSearch,
} from '@/services/contacts/api';
import {
  flowproperty_hybrid_search,
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
  getFlowpropertyTableUuidMentionSearch,
} from '@/services/flowproperties/api';
import {
  flow_hybrid_search,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
  getFlowTableUuidMentionSearch,
} from '@/services/flows/api';
import {
  lifeCycleModel_hybrid_search,
  getLifeCycleModelTableAll,
  getLifeCycleModelTablePgroongaSearch,
  getLifeCycleModelTableUuidMentionSearch,
} from '@/services/lifeCycleModels/api';
import { getOpenDataCatalogArgs } from '@/services/openDataCatalog/types';
import {
  process_hybrid_search,
  getProcessTableAll,
  getProcessTablePgroongaSearch,
  getProcessTableUuidMentionSearch,
} from '@/services/processes/api';
import {
  source_hybrid_search,
  getSourceTableAll,
  getSourceTablePgroongaSearch,
  getSourceTableUuidMentionSearch,
} from '@/services/sources/api';
import {
  unitgroup_hybrid_search,
  getUnitGroupTableAll,
  getUnitGroupTablePgroongaSearch,
  getUnitGroupTableUuidMentionSearch,
} from '@/services/unitgroups/api';

const params = { current: 2, pageSize: 25 };
const sort = { modifiedAt: 'descend' as const };

const uuid = 'd1380000-0000-4000-8000-000000000001';
const selectorRoutes = [
  ['contact', getContactTableAll, getContactTablePgroongaSearch, getContactTableUuidMentionSearch],
  [
    'flowproperty',
    getFlowpropertyTableAll,
    getFlowpropertyTablePgroongaSearch,
    getFlowpropertyTableUuidMentionSearch,
  ],
  ['source', getSourceTableAll, getSourceTablePgroongaSearch, getSourceTableUuidMentionSearch],
  [
    'unitgroup',
    getUnitGroupTableAll,
    getUnitGroupTablePgroongaSearch,
    getUnitGroupTableUuidMentionSearch,
  ],
] as const;

const hybridRoutes = [
  [
    'contact',
    (scope: [] | [boolean]) =>
      contact_hybrid_search(params, 'en', 'tg', 'query', {}, 100, 'team-id', ...scope),
  ],
  [
    'flowproperty',
    (scope: [] | [boolean]) =>
      flowproperty_hybrid_search(params, 'en', 'tg', 'query', {}, 100, 'team-id', ...scope),
  ],
  [
    'source',
    (scope: [] | [boolean]) =>
      source_hybrid_search(params, 'en', 'tg', 'query', {}, 100, 'team-id', ...scope),
  ],
  [
    'unitgroup',
    (scope: [] | [boolean]) =>
      unitgroup_hybrid_search(params, 'en', 'tg', 'query', {}, 100, 'team-id', ...scope),
  ],
  [
    'flow',
    (scope: [] | [boolean]) =>
      flow_hybrid_search(params, 'en', 'tg', 'query', {}, 100, 'team-id', ...scope),
  ],
  [
    'process',
    (scope: [] | [boolean]) =>
      process_hybrid_search(params, 'en', 'tg', 'query', {}, 100, 'all', 'team-id', ...scope),
  ],
  [
    'lifecyclemodel',
    (scope: [] | [boolean]) =>
      lifeCycleModel_hybrid_search(params, 'en', 'tg', 'query', {}, 100, scope[0], 'team-id'),
  ],
] as const;

describe('open data catalog service route matrix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'actor' }, access_token: 'fixture-token' } },
    });
    mockInvoke.mockResolvedValue({
      data: { data: [], version_scope: 'matched' },
      error: null,
    });
  });

  it('routes list, lexical, and UUID searches for every dataset kind', async () => {
    await (getContactTableAll as any)(params, sort, 'en', 'tg', [], 100, true);
    await (getContactTablePgroongaSearch as any)(params, 'en', 'tg', 'contact', {}, 100, [], true);
    await (getContactTableUuidMentionSearch as any)(
      params,
      'en',
      'tg',
      'contact-id',
      100,
      [],
      true,
    );

    await (getFlowpropertyTableAll as any)(params, sort, 'en', 'tg', [], 100, true);
    await (getFlowpropertyTablePgroongaSearch as any)(
      params,
      'en',
      'tg',
      'property',
      {},
      100,
      [],
      true,
    );
    await (getFlowpropertyTableUuidMentionSearch as any)(
      params,
      'en',
      'tg',
      'property-id',
      100,
      [],
      true,
    );

    await (getFlowTableAll as any)(params, sort, 'en', 'tg', [], {}, 100, true);
    await (getFlowTablePgroongaSearch as any)(
      params,
      'en',
      'tg',
      'flow',
      {},
      100,
      undefined,
      [],
      true,
    );
    await (getFlowTableUuidMentionSearch as any)(params, 'en', 'tg', 'flow-id', 100, [], true);

    await (getLifeCycleModelTableAll as any)(params, sort, 'en', 'tg', '', 100, true);
    await (getLifeCycleModelTablePgroongaSearch as any)(
      params,
      'en',
      'tg',
      'model',
      {},
      100,
      undefined,
      [],
      true,
    );
    await (getLifeCycleModelTableUuidMentionSearch as any)(
      params,
      'en',
      'tg',
      'model-id',
      100,
      [],
      true,
    );

    await (getProcessTableAll as any)(params, sort, 'en', 'tg', [], 100, undefined, true);
    await (getProcessTablePgroongaSearch as any)(
      params,
      'en',
      'tg',
      'process',
      {},
      100,
      undefined,
      undefined,
      [],
      false,
      true,
    );
    await (getProcessTableUuidMentionSearch as any)(
      params,
      'en',
      'tg',
      'process-id',
      100,
      undefined,
      [],
      true,
    );

    await (getSourceTableAll as any)(params, sort, 'en', 'tg', [], 100, true);
    await (getSourceTablePgroongaSearch as any)(params, 'en', 'tg', 'source', {}, 100, [], true);
    await (getSourceTableUuidMentionSearch as any)(params, 'en', 'tg', 'source-id', 100, [], true);

    await (getUnitGroupTableAll as any)(params, sort, 'en', 'tg', [], 100, true);
    await (getUnitGroupTablePgroongaSearch as any)(
      params,
      'en',
      'tg',
      'unit group',
      {},
      100,
      [],
      true,
    );
    await (getUnitGroupTableUuidMentionSearch as any)(
      params,
      'en',
      'tg',
      'unit-group-id',
      100,
      [],
      true,
    );

    expect(mockQueryMappedOpenDataCatalog).toHaveBeenCalledTimes(21);
    const routeMatrix = mockQueryMappedOpenDataCatalog.mock.calls.map(([options]) => ({
      datasetKind: options.datasetKind,
      mode: options.mode,
    }));
    expect(routeMatrix).toEqual(
      [
        'contact',
        'flowproperty',
        'flow',
        'lifecyclemodel',
        'process',
        'source',
        'unitgroup',
      ].flatMap((datasetKind) =>
        ['list', 'lexical', 'uuid'].map((mode) => ({
          datasetKind,
          mode,
        })),
      ),
    );
    for (const [options] of mockQueryMappedOpenDataCatalog.mock.calls) {
      expect(options).not.toHaveProperty('filters');
    }
  });

  it.each([
    ['omitted', []],
    ['false', [false]],
  ] as const)(
    'preserves legacy public selector routes when the catalog flag is %s',
    async (_label, scope) => {
      for (const [kind, list, lexical, byUuid] of selectorRoutes) {
        await list(params, sort, 'en', 'tg', '', 100, ...scope);
        await lexical(params, 'en', 'tg', 'query', {}, 100, '', ...scope);
        await byUuid(params, 'en', 'tg', uuid, 100, '', ...scope);
        expect(mockRpc).toHaveBeenCalledWith(`get_latest_${kind}_versions`, expect.any(Object));
        expect(mockRpc).toHaveBeenCalledWith(
          `search_${kind === 'flowproperty' ? 'flowproperties' : kind === 'source' ? 'sources' : kind === 'contact' ? 'contacts' : 'unitgroups'}`,
          expect.any(Object),
        );
      }
      await getFlowTableAll(params, sort, 'en', 'tg', '', {}, 100, ...scope);
      await getFlowTablePgroongaSearch(
        params,
        'en',
        'tg',
        'query',
        {},
        100,
        undefined,
        '',
        ...scope,
      );
      await getFlowTableUuidMentionSearch(params, 'en', 'tg', uuid, 100, '', ...scope);
      await getProcessTableAll(params, sort, 'en', 'tg', '', 100, 'all', ...scope);
      await getProcessTablePgroongaSearch(
        params,
        'en',
        'tg',
        'query',
        {},
        100,
        'all',
        undefined,
        '',
        false,
        ...scope,
      );
      await getProcessTableUuidMentionSearch(
        params,
        'en',
        'tg',
        uuid,
        100,
        undefined,
        '',
        ...scope,
      );
      await getLifeCycleModelTableAll(params, sort, 'en', 'tg', '', 100, ...scope);
      await getLifeCycleModelTablePgroongaSearch(
        params,
        'en',
        'tg',
        'query',
        {},
        100,
        undefined,
        '',
        ...scope,
      );
      await getLifeCycleModelTableUuidMentionSearch(params, 'en', 'tg', uuid, 100, '', ...scope);
      expect(mockQueryMappedOpenDataCatalog).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalledWith('search_open_data_catalog', expect.any(Object));
      expect(mockRpc).toHaveBeenCalledWith(
        'search_dataset_uuid_mentions_page',
        expect.objectContaining({ p_data_source: 'tg' }),
      );
      for (const name of [
        'get_latest_flow_versions',
        'get_latest_process_versions',
        'get_latest_lifecyclemodel_versions',
        'search_flows',
        'search_processes',
        'search_lifecyclemodels',
      ]) {
        expect(mockRpc).toHaveBeenCalledWith(name, expect.any(Object));
      }
    },
  );

  it.each(hybridRoutes)(
    'forwards the opt-in scope for %s Hybrid Search without changing selector requests',
    async (kind, search) => {
      for (const scope of [[], [false], [true]] satisfies ([] | [boolean])[]) {
        const previousCalls = mockInvoke.mock.calls.length;
        await search(scope);
        expect(mockInvoke).toHaveBeenCalledTimes(previousCalls + 1);
        const [functionName, request] = mockInvoke.mock.calls.at(-1)!;
        expect(functionName).toBe(`${kind}_hybrid_search`);
        expect(request.body).toMatchObject({
          query: 'query',
          data_source: 'tg',
          page_current: 2,
          page_size: 25,
          state_code: 100,
          team_id: 'team-id',
        });
        expect(request.body.source_filter).toBe(scope[0] ? 'all' : undefined);
        expect(request.body.publication_filter).toBe(scope[0] ? 'all' : undefined);
        expect(Object.hasOwn(request.body, 'source_filter')).toBe(scope[0] === true);
        expect(Object.hasOwn(request.body, 'publication_filter')).toBe(scope[0] === true);
      }
    },
  );

  it('preserves positional signatures outside the open-data scope', () => {
    expect(getOpenDataCatalogArgs('tg')).toEqual([true]);
    for (const dataSource of ['my', 'co', 'te', '']) {
      expect(getOpenDataCatalogArgs(dataSource)).toEqual([]);
    }
  });
});
