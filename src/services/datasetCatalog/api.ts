import { supabase } from '@/services/supabase';
import type { OpenDataDatasetKind } from '../openDataCatalog/types';
import type { DatasetTableParams } from '../general/datasetClassification';

export type DatasetCatalogRow = {
  id: string;
  json?: any;
  version: string;
  modified_at?: string;
  created_at?: string;
  state_code?: number;
  team_id?: string;
  model_id?: string;
  model_version?: string | null;
  total_count?: number | string | null;
};

export type DatasetCatalogOptions = {
  datasetKind: OpenDataDatasetKind;
  dataSource: string;
  filterCondition?: Record<string, unknown>;
  stateCode?: number | string | null;
  teamId?: string | null;
  pageCurrent?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  ownerDraftOnly?: boolean;
  versionScope?: 'latest' | 'all';
};

export function hasDatasetCatalogFilters(params: DatasetTableParams) {
  return Boolean(
    params.classification?.length ||
    Object.entries(params.datasetFilters ?? {}).some(
      ([key, value]) => key !== 'flowType' || (value !== '' && value !== undefined),
    ),
  );
}

export function datasetCatalogRpcArgs(options: DatasetCatalogOptions) {
  return {
    p_dataset_kind: options.datasetKind,
    p_data_source: options.dataSource,
    p_filter_condition: options.filterCondition ?? {},
    p_state_code: typeof options.stateCode === 'number' ? options.stateCode : null,
    p_team_id: options.teamId ?? null,
    p_page_size: options.pageSize ?? 50,
    p_page_current: options.pageCurrent ?? 1,
    p_sort_by: options.sortBy ?? 'modified_at',
    p_sort_direction: options.sortDirection ?? 'desc',
    p_owner_draft_only: options.ownerDraftOnly ?? false,
    p_version_scope: options.versionScope ?? 'latest',
  };
}

/** The shared client already targets api; the database derives the current actor itself. */
export async function queryDatasetCatalog(options: DatasetCatalogOptions) {
  return supabase.rpc('query_dataset_catalog', datasetCatalogRpcArgs(options));
}

export async function queryMappedDatasetCatalog<ResultRow>(
  options: DatasetCatalogOptions,
  mapRows: (rows: DatasetCatalogRow[]) => Promise<ResultRow[]>,
) {
  const page = options.pageCurrent ?? 1;
  const result = await queryDatasetCatalog(options);
  if (result.error) {
    return { data: [] as ResultRow[], error: result.error, page, success: false, total: 0 };
  }
  const rows = (result.data ?? []) as DatasetCatalogRow[];
  return {
    data: rows.length > 0 ? await mapRows(rows) : [],
    page,
    success: true,
    total: Number(rows[0]?.total_count ?? 0) || 0,
  };
}

/** Project raw facade JSON into the existing AllVersions localization/rendering boundary. */
export function toDatasetVersionSelectRow(tableName: string, row: DatasetCatalogRow): any {
  const rootNames: Record<string, [string, string]> = {
    contacts: ['contactDataSet', 'contactInformation'],
    sources: ['sourceDataSet', 'sourceInformation'],
    unitgroups: ['unitGroupDataSet', 'unitGroupInformation'],
    flowproperties: ['flowPropertyDataSet', 'flowPropertiesInformation'],
    flows: ['flowDataSet', 'flowInformation'],
    processes: ['processDataSet', 'processInformation'],
    lifecyclemodels: ['lifeCycleModelDataSet', 'lifeCycleModelInformation'],
  };
  const [rootName, informationName] = rootNames[tableName] ?? [];
  const root = row.json?.[rootName];
  const info = root?.[informationName];
  const dataset = info?.dataSetInformation;
  return {
    ...row,
    ...dataset,
    'common:class': dataset?.classificationInformation?.['common:classification']?.['common:class'],
    'common:referenceYear': info?.time?.['common:referenceYear'],
    '@location': info?.geography?.locationOfOperationSupplyOrProduction?.['@location'],
    locationOfSupply: info?.geography?.locationOfSupply,
    typeOfDataSet:
      root?.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ??
      root?.modellingAndValidation?.LCIMethod?.typeOfDataSet,
    referenceToReferenceUnit: info?.quantitativeReference?.referenceToReferenceUnit,
    unit: root?.units?.unit,
    ...info?.quantitativeReference?.referenceToReferenceUnitGroup,
    referenceToFlowPropertyDataSet:
      root?.flowProperties?.flowProperty?.referenceToFlowPropertyDataSet,
  };
}
