export type DatasetUuidMentionEntityKind =
  | 'flow'
  | 'process'
  | 'lifecyclemodel'
  | 'source'
  | 'contact'
  | 'unitgroup'
  | 'flowproperty';

export type DatasetUuidMentionRow = {
  matched_by: string;
  matched_entity_table: string;
  rank: number;
  source_entity_kind: DatasetUuidMentionEntityKind;
  source_id: string;
  source_json?: Record<string, unknown>;
  source_modified_at?: string | null;
  source_name?: string | null;
  source_team_id?: string | null;
  source_version: string;
};

type SearchDatasetJsonUuidMentionsOptions = {
  dataSource: string;
  limit?: number;
  sourceEntityKinds: DatasetUuidMentionEntityKind[];
  stateCode?: number | string | null;
  teamId?: string | null;
  uuid: string;
};

export type SearchDatasetJsonUuidMentionsResult = {
  data: DatasetUuidMentionRow[];
  error?: string;
  success: boolean;
};

export type SearchDatasetJsonUuidMentionPageOptions = Omit<
  SearchDatasetJsonUuidMentionsOptions,
  'limit'
> & {
  maxResults?: number;
  pageCurrent?: number;
  pageSize?: number;
};

export type SearchDatasetJsonUuidMentionPageResult = SearchDatasetJsonUuidMentionsResult & {
  capped: boolean;
  page: number;
  total: number;
};

export const DATASET_UUID_MENTION_PAGE_SIZE = 10;
export const DATASET_UUID_MENTION_MAX_RESULTS = 50;

const DATASET_UUID_QUERY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeOptionalTeamId(teamId?: string | null): string | null {
  const normalizedTeamId = typeof teamId === 'string' ? teamId.trim() : '';
  return normalizedTeamId.length > 0 ? normalizedTeamId : null;
}

async function getDatasetUuidMentionTeamFilter(
  dataSource: string,
  teamId?: string | null,
): Promise<string | null> {
  if (dataSource === 'te') {
    const { getTeamIdByUserId } = require('../general/api') as typeof import('../general/api');
    return (await getTeamIdByUserId()) ?? null;
  }
  if (dataSource === 'tg' || dataSource === 'co') {
    return normalizeOptionalTeamId(teamId);
  }
  return null;
}

export function normalizeDatasetUuidSearchQuery(queryText?: string | null): string | null {
  const normalizedQuery = (queryText ?? '').trim();
  if (!DATASET_UUID_QUERY_PATTERN.test(normalizedQuery)) {
    return null;
  }
  return normalizedQuery.toLowerCase();
}

export function normalizeDatasetUuidMentionStateCode(
  stateCode?: number | string | null,
): number | null {
  if (typeof stateCode === 'number' && Number.isFinite(stateCode)) {
    return stateCode;
  }
  if (typeof stateCode === 'string') {
    const normalizedStateCode = stateCode.trim();
    if (normalizedStateCode.length > 0 && normalizedStateCode !== 'all') {
      const parsedStateCode = Number(normalizedStateCode);
      return Number.isFinite(parsedStateCode) ? parsedStateCode : null;
    }
  }
  return null;
}

export function normalizeDatasetUuidMentionTeamId(tid?: string | [] | null): string | null {
  const normalizedTeamId = typeof tid === 'string' ? tid.trim() : '';
  return normalizedTeamId.length > 0 ? normalizedTeamId : null;
}

export async function searchDatasetJsonUuidMentions({
  dataSource,
  limit = 20,
  sourceEntityKinds,
  stateCode,
  teamId,
  uuid,
}: SearchDatasetJsonUuidMentionsOptions): Promise<SearchDatasetJsonUuidMentionsResult> {
  const normalizedUuid = normalizeDatasetUuidSearchQuery(uuid);
  if (!normalizedUuid || sourceEntityKinds.length === 0) {
    return { data: [], success: true };
  }

  const { supabase } = require('@/services/supabase') as typeof import('@/services/supabase');
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    return { data: [], success: false, error: 'not_authenticated' };
  }

  const teamIdFilter = await getDatasetUuidMentionTeamFilter(dataSource, teamId);
  if (dataSource === 'te' && !teamIdFilter) {
    return { data: [], success: true };
  }

  const result = await supabase.rpc('search_dataset_json_uuid_mentions', {
    p_data_source: dataSource,
    p_limit: limit,
    p_source_entity_kinds: sourceEntityKinds,
    p_state_code_filter: normalizeDatasetUuidMentionStateCode(stateCode),
    p_team_id_filter: teamIdFilter,
    p_this_user_id: session.data.session.user?.id ?? '',
    p_uuid: normalizedUuid,
  });

  if (result.error) {
    return {
      data: [],
      error: result.error.message,
      success: false,
    };
  }

  return {
    data: (result.data ?? []) as DatasetUuidMentionRow[],
    success: true,
  };
}

export async function searchDatasetJsonUuidMentionPage({
  maxResults = DATASET_UUID_MENTION_MAX_RESULTS,
  pageCurrent = 1,
  pageSize = DATASET_UUID_MENTION_PAGE_SIZE,
  ...options
}: SearchDatasetJsonUuidMentionPageOptions): Promise<SearchDatasetJsonUuidMentionPageResult> {
  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  const normalizedPage = Math.max(1, Math.floor(pageCurrent));
  const normalizedMaxResults = Math.min(
    DATASET_UUID_MENTION_MAX_RESULTS,
    Math.max(1, Math.floor(maxResults)),
  );
  const pageStart = (normalizedPage - 1) * normalizedPageSize;

  if (pageStart >= normalizedMaxResults) {
    return {
      capped: true,
      data: [],
      page: normalizedPage,
      success: true,
      total: normalizedMaxResults,
    };
  }

  const fetchLimit = Math.min(normalizedMaxResults, pageStart + normalizedPageSize + 1);
  const result = await searchDatasetJsonUuidMentions({
    ...options,
    limit: fetchLimit,
  });

  if (!result.success) {
    return {
      ...result,
      capped: false,
      page: normalizedPage,
      total: 0,
    };
  }

  const pageRows = result.data.slice(pageStart, pageStart + normalizedPageSize);
  const hasNextPage = result.data.length > pageStart + normalizedPageSize;
  const capped = fetchLimit >= normalizedMaxResults && result.data.length >= normalizedMaxResults;
  const total = Math.min(
    normalizedMaxResults,
    hasNextPage ? pageStart + pageRows.length + 1 : pageStart + pageRows.length,
  );

  return {
    ...result,
    capped,
    data: pageRows,
    page: normalizedPage,
    total,
  };
}

export function mapDatasetUuidMentionRowsToListRows(rows: DatasetUuidMentionRow[]) {
  return rows.map((row) => ({
    id: row.source_id,
    json: row.source_json,
    modified_at: row.source_modified_at ?? undefined,
    team_id: row.source_team_id ?? undefined,
    version: row.source_version,
  }));
}
