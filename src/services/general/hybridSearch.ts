import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export type FoundationHybridSearchFunctionName =
  | 'contact_hybrid_search'
  | 'flowproperty_hybrid_search'
  | 'source_hybrid_search'
  | 'unitgroup_hybrid_search';

type FoundationHybridSearchRow = {
  total_count?: number | string | null;
};

type FoundationHybridSearchOptions<Row extends FoundationHybridSearchRow, ResultRow> = {
  dataSource: string;
  filterCondition: unknown;
  functionName: FoundationHybridSearchFunctionName;
  lang: string;
  mapRows: (rows: Row[], lang: string) => Promise<ResultRow[]>;
  params: {
    current?: number;
    pageSize?: number;
  };
  queryText: string;
  stateCode?: string | number;
  teamId?: string | null;
};

export type FoundationHybridSearchResult<ResultRow> = {
  data: ResultRow[];
  error?: unknown;
  page: number;
  success: boolean;
  total: number;
};

function failureResult<ResultRow>(
  page: number,
  error: unknown,
): FoundationHybridSearchResult<ResultRow> {
  return {
    data: [],
    error,
    page,
    success: false,
    total: 0,
  };
}

export async function invokeFoundationHybridSearch<
  Row extends FoundationHybridSearchRow,
  ResultRow,
>(
  options: FoundationHybridSearchOptions<Row, ResultRow>,
): Promise<FoundationHybridSearchResult<ResultRow>> {
  const page = options.params.current ?? 1;
  if (options.dataSource === 'te' && !options.teamId) {
    return { data: [], page, success: true, total: 0 };
  }

  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;
  if (!session) {
    return failureResult(
      page,
      sessionResult.error ?? new Error('Hybrid search requires an authenticated session'),
    );
  }

  const body: Record<string, unknown> = {
    query: options.queryText,
    filter_condition: options.filterCondition,
    data_source: options.dataSource,
    page_size: options.params.pageSize ?? 10,
    page_current: page,
  };
  if (typeof options.stateCode === 'number') {
    body.state_code = options.stateCode;
  }
  if (options.teamId) {
    body.team_id = options.teamId;
  }

  try {
    const result = await supabase.functions.invoke(options.functionName, {
      headers: {
        Authorization: `Bearer ${session.access_token ?? ''}`,
      },
      body,
      region: FunctionRegion.UsEast1,
    });
    if (result.error) {
      return failureResult(page, result.error);
    }

    const rows = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.data)
        ? result.data.data
        : null;
    if (!rows) {
      return failureResult(page, new Error('Hybrid search returned an invalid response'));
    }

    return {
      data: rows.length > 0 ? await options.mapRows(rows, options.lang) : [],
      page,
      success: true,
      total: Number(rows[0]?.total_count ?? 0) || 0,
    };
  } catch (error) {
    return failureResult(page, error);
  }
}
