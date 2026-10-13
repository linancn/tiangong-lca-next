import {
  datasetCatalogRpcArgs,
  hasDatasetCatalogFilters,
  queryDatasetCatalog,
  queryMappedDatasetCatalog,
  toDatasetVersionSelectRow,
} from '@/services/datasetCatalog/api';
import { withDatasetClassification } from '@/services/general/datasetClassification';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({ supabase: { rpc: jest.fn() } }));

describe('Dataset catalog query boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('binds actor-free api facade arguments and retains exact server scope, filters and pagination', async () => {
    const classification = [{ scope: 'classification' as const, code: 'C', path: ['A', 'C'] }];
    const options = {
      datasetKind: 'process' as const,
      dataSource: 'all_data',
      filterCondition: { classification, datasetId: 'id-1' },
      ownerDraftOnly: true,
      versionScope: 'all' as const,
      pageCurrent: 3,
      pageSize: 100,
      stateCode: 0,
      teamId: 'team-1',
      sortBy: 'version',
      sortDirection: 'asc' as const,
    };
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
    await queryDatasetCatalog(options);
    expect(supabase.rpc).toHaveBeenCalledWith('query_dataset_catalog', {
      p_dataset_kind: 'process',
      p_data_source: 'all_data',
      p_filter_condition: options.filterCondition,
      p_state_code: 0,
      p_team_id: 'team-1',
      p_page_size: 100,
      p_page_current: 3,
      p_sort_by: 'version',
      p_sort_direction: 'asc',
      p_owner_draft_only: true,
      p_version_scope: 'all',
    });
    expect(
      datasetCatalogRpcArgs({ datasetKind: 'flow', dataSource: 'my', stateCode: 'all' }),
    ).toEqual({
      p_dataset_kind: 'flow',
      p_data_source: 'my',
      p_filter_condition: {},
      p_state_code: null,
      p_team_id: null,
      p_page_size: 50,
      p_page_current: 1,
      p_sort_by: 'modified_at',
      p_sort_direction: 'desc',
      p_owner_draft_only: false,
      p_version_scope: 'latest',
    });
  });

  it('combines stable-code classification and dataset filters without mutating caller filters', () => {
    const classification = [{ scope: 'classification' as const, code: 'C' }];
    const original = {
      classification: [{ scope: 'classification', code: 'old' }],
      flowType: 'old',
    };
    expect(
      withDatasetClassification({ classification, datasetFilters: { flowType: 'new' } }, original),
    ).toEqual({ classification, flowType: 'new' });
    expect(original.flowType).toBe('old');
    expect(withDatasetClassification({}, null)).toEqual({});
    expect(withDatasetClassification({}, ['unexpected'])).toEqual({});
    expect(withDatasetClassification({}, 'unexpected')).toEqual({});
    expect(withDatasetClassification({})).toEqual({});
    expect(hasDatasetCatalogFilters({ classification: [] })).toBe(false);
    expect(hasDatasetCatalogFilters({ classification: [], datasetFilters: { flowType: '' } })).toBe(
      false,
    );
    expect(hasDatasetCatalogFilters({ classification })).toBe(true);
    expect(hasDatasetCatalogFilters({ datasetFilters: { flowType: 'Product flow' } })).toBe(true);
  });

  it('uses the server total instead of current page length and reports failures without fallbacks', async () => {
    const options = { datasetKind: 'flow' as const, dataSource: 'my', pageCurrent: 3 };
    const mapRows = jest.fn(async (rows) => rows.map((row: any) => ({ id: row.id })));
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [{ id: 'flow-101', total_count: '321' }],
      error: null,
    });
    expect(await queryMappedDatasetCatalog(options, mapRows)).toEqual({
      data: [{ id: 'flow-101' }],
      page: 3,
      success: true,
      total: 321,
    });
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC missing' },
    });
    expect(await queryMappedDatasetCatalog(options, mapRows)).toEqual({
      data: [],
      page: 3,
      success: false,
      total: 0,
      error: { message: 'RPC missing' },
    });
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: undefined, error: null });
    expect(
      await queryMappedDatasetCatalog({ datasetKind: 'flow', dataSource: 'tg' }, mapRows),
    ).toEqual({ data: [], page: 1, success: true, total: 0 });
    expect(mapRows).toHaveBeenCalledTimes(1);
  });

  it('projects all seven raw dataset schemas into version-list fields and preserves identity metadata', () => {
    const schemas = [
      ['contacts', 'contactDataSet', 'contactInformation'],
      ['sources', 'sourceDataSet', 'sourceInformation'],
      ['unitgroups', 'unitGroupDataSet', 'unitGroupInformation'],
      ['flowproperties', 'flowPropertyDataSet', 'flowPropertiesInformation'],
      ['flows', 'flowDataSet', 'flowInformation'],
      ['processes', 'processDataSet', 'processInformation'],
      ['lifecyclemodels', 'lifeCycleModelDataSet', 'lifeCycleModelInformation'],
    ];
    for (const [table, root, info] of schemas) {
      const record = {
        id: 'id-1',
        version: '01.00.001',
        created_at: '2026-10-13T00:00:00Z',
        state_code: 100,
        team_id: 'team',
        json: {
          [root]: {
            [info]: {
              dataSetInformation: {
                name: { baseName: 'Name' },
                classificationInformation: { 'common:classification': { 'common:class': ['C'] } },
              },
              time: { 'common:referenceYear': 2025 },
              geography: {
                locationOfSupply: 'CN',
                locationOfOperationSupplyOrProduction: { '@location': 'CN' },
              },
              quantitativeReference: {
                referenceToReferenceUnit: '1',
                referenceToReferenceUnitGroup: { '@refObjectId': 'unitgroup-1' },
              },
            },
            modellingAndValidation: { LCIMethodAndAllocation: { typeOfDataSet: 'LCI result' } },
            units: { unit: [{ name: 'kg' }] },
            flowProperties: {
              flowProperty: {
                referenceToFlowPropertyDataSet: { '@refObjectId': 'flowproperty-1' },
              },
            },
          },
        },
      };
      expect(toDatasetVersionSelectRow(table, record)).toMatchObject({
        id: 'id-1',
        version: '01.00.001',
        created_at: record.created_at,
        state_code: 100,
        team_id: 'team',
        name: { baseName: 'Name' },
        'common:class': ['C'],
        'common:referenceYear': 2025,
        '@location': 'CN',
        locationOfSupply: 'CN',
        typeOfDataSet: 'LCI result',
        referenceToReferenceUnit: '1',
        '@refObjectId': 'unitgroup-1',
        unit: [{ name: 'kg' }],
      });
    }
    expect(
      toDatasetVersionSelectRow('unknown', { id: 'id-1', version: '01.00.001' }),
    ).toMatchObject({ id: 'id-1', version: '01.00.001' });
  });
});
