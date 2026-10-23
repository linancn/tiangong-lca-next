import { supabase } from '@/services/supabase';
import { type OpenDataDatasetKind } from './types';

export { type OpenDataDatasetKind } from './types';

export type OpenDataCatalogRow = {
  id: string;
  json?: unknown;
  version: string;
  modified_at?: string;
  team_id?: string;
  model_id?: string;
  model_version?: string | null;
  is_published?: boolean;
  total_count?: number | string | null;
};

type QueryOpenDataCatalogOptions = {
  datasetKind: OpenDataDatasetKind;
  filterCondition?: unknown;
  mode: 'list' | 'lexical' | 'uuid';
  pageCurrent?: number;
  pageSize?: number;
  queryText?: string;
  queryTerms?: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export type OpenDataCatalogPageResult<ResultRow> = {
  capped?: boolean;
  data: ResultRow[];
  error?: unknown;
  page: number;
  success: boolean;
  total: number;
};

export async function queryOpenDataCatalog(options: QueryOpenDataCatalogOptions) {
  return supabase.rpc('search_open_data_catalog', {
    p_dataset_kind: options.datasetKind,
    p_search_mode: options.mode,
    p_query_text: options.queryText ?? '',
    p_query_terms: options.queryTerms ?? null,
    p_filter_condition: options.filterCondition ?? {},
    p_source_filter: 'all',
    p_publication_filter: 'all',
    p_page_size: options.pageSize ?? 10,
    p_page_current: options.pageCurrent ?? 1,
    p_sort_by: options.sortBy ?? 'modified_at',
    p_sort_direction: options.sortDirection ?? 'desc',
  });
}

export async function queryMappedOpenDataCatalog<ResultRow>(
  options: QueryOpenDataCatalogOptions,
  mapRows: (rows: OpenDataCatalogRow[]) => Promise<ResultRow[]>,
): Promise<OpenDataCatalogPageResult<ResultRow>> {
  const page = options.pageCurrent ?? 1;
  const result = await queryOpenDataCatalog(options);
  if (result.error) {
    return { data: [], error: result.error, page, success: false, total: 0 };
  }
  const rows = (result.data ?? []) as OpenDataCatalogRow[];
  return {
    capped: false,
    data: rows.length > 0 ? await mapRows(rows) : [],
    page,
    success: true,
    total: Number(rows[0]?.total_count ?? 0) || 0,
  };
}

// The backend selects catalog search by these fields' presence. Keep that route explicit
// while requesting every source and publication state; there is no user-selectable filter.
export function addOpenDataCatalogScope(
  body: Record<string, unknown>,
  useOpenDataCatalog?: boolean,
) {
  if (!useOpenDataCatalog) {
    return body;
  }
  return {
    ...body,
    source_filter: 'all',
    publication_filter: 'all',
  };
}
