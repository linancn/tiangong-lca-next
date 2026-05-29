import { supabase } from '@/services/supabase';
import { getTeamIdByUserId } from '../general/api';

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
