import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import {
  DEFAULT_PUBLISHED_PROCESS_STATES,
  OWNER_DRAFT_PROCESS_STATE,
  PUBLIC_PLUS_OWNER_DRAFT_SCOPE,
  PUBLIC_PROCESS_STATE,
  isTidasVersion,
  isUuid,
  type LcaDataScope,
  type LcaSnapshotRequestRoot,
} from './lca_snapshot_scope.ts';

export type ProcessScopeMeta = {
  state_code: number | null;
  user_id: string | null;
  team_id: string | null;
  review_id: string | null;
};

export type ProcessScopeEntry = {
  process_id: string;
  process_version?: string;
};

export type ProcessScopeValidationResult =
  { ok: true } | { ok: false; status: number; body: Record<string, unknown> };

export type NormalizedSingleProcessDemand =
  | {
      selector: 'process_id';
      process_id: string;
      process_version?: string;
      amount: number;
    }
  | {
      selector: 'process_index';
      process_index: number;
      amount: number;
    };

export type SingleProcessDemandNormalizationResult =
  | { ok: true; demand: NormalizedSingleProcessDemand }
  | { ok: false; status: 400; body: { error: string } };

export function processScopeLookupKey(processId: string, processVersion?: string): string {
  return `${processId}:${String(processVersion ?? '').trim()}`;
}

export function normalizeSingleProcessDemand(raw: unknown): SingleProcessDemandNormalizationResult {
  const demand = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const rawIndex = (demand as { process_index?: unknown }).process_index;
  const processId = String((demand as { process_id?: unknown }).process_id ?? '')
    .trim()
    .toLowerCase();
  const processVersion = String(
    (demand as { process_version?: unknown }).process_version ?? '',
  ).trim();
  const amountRaw = (demand as { amount?: unknown }).amount;
  const amount = amountRaw === undefined || amountRaw === null ? 1 : amountRaw;

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { ok: false, status: 400, body: { error: 'invalid_amount' } };
  }

  const hasIndexDemand = rawIndex !== undefined && rawIndex !== null;
  const hasProcessIdDemand = processId.length > 0;
  if (!hasIndexDemand && !hasProcessIdDemand) {
    return {
      ok: false,
      status: 400,
      body: { error: 'process_index_or_process_id_required' },
    };
  }
  if (hasIndexDemand && hasProcessIdDemand) {
    return {
      ok: false,
      status: 400,
      body: { error: 'provide_process_index_or_process_id' },
    };
  }

  if (hasProcessIdDemand) {
    if (!isUuid(processId)) {
      return { ok: false, status: 400, body: { error: 'invalid_process_id' } };
    }
    if (processVersion && !isTidasVersion(processVersion)) {
      return { ok: false, status: 400, body: { error: 'invalid_process_version' } };
    }
    return {
      ok: true,
      demand: {
        selector: 'process_id',
        process_id: processId,
        ...(processVersion ? { process_version: processVersion } : {}),
        amount,
      },
    };
  }

  if (!Number.isInteger(rawIndex) || Number(rawIndex) < 0) {
    return { ok: false, status: 400, body: { error: 'invalid_process_index' } };
  }
  return {
    ok: true,
    demand: {
      selector: 'process_index',
      process_index: Number(rawIndex),
      amount,
    },
  };
}

export function requestRootFromSingleProcessDemand(
  demand: NormalizedSingleProcessDemand,
): LcaSnapshotRequestRoot | null {
  if (demand.selector !== 'process_id' || !demand.process_version) {
    return null;
  }
  return {
    process_id: demand.process_id,
    process_version: demand.process_version,
  };
}

export function hasClientSuppliedSnapshotRoots(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(raw, 'request_roots') ||
    Object.prototype.hasOwnProperty.call(raw, 'requestRoots')
  );
}

export function matchesProcessDataScope(
  meta: ProcessScopeMeta | undefined,
  dataScope: LcaDataScope,
  userId: string,
): boolean {
  if (!meta) {
    return false;
  }

  const isPublished =
    meta.state_code !== null && DEFAULT_PUBLISHED_PROCESS_STATES.includes(meta.state_code);
  const isOwnedByCurrentUser = meta.user_id === userId;

  switch (dataScope) {
    case PUBLIC_PLUS_OWNER_DRAFT_SCOPE:
      return (
        meta.state_code === PUBLIC_PROCESS_STATE ||
        (meta.state_code === OWNER_DRAFT_PROCESS_STATE &&
          isOwnedByCurrentUser &&
          meta.team_id === null &&
          meta.review_id === null)
      );
    case 'open_data':
      return isPublished;
    case 'all_data':
      return isPublished || isOwnedByCurrentUser;
    case 'current_user':
    default:
      return isOwnedByCurrentUser;
  }
}

export async function fetchProcessScopeLookup(
  entries: ProcessScopeEntry[],
  client?: SupabaseClient,
): Promise<{ ok: true; data: Map<string, ProcessScopeMeta> } | { ok: false; error: string }> {
  const uniqueIds = [...new Set(entries.map((entry) => entry.process_id).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: true, data: new Map<string, ProcessScopeMeta>() };
  }

  const supabaseClient = client ?? (await import('./supabase_client.ts')).supabaseClient;
  const lookup = new Map<string, ProcessScopeMeta>();
  const chunkSize = 500;

  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { data, error } = await supabaseClient
      .from('processes')
      .select('id,version,state_code,user_id,team_id,review_id')
      .in('id', chunk);

    if (error) {
      console.error('fetch process scope metadata failed', {
        error: error.message,
        code: error.code,
      });
      return { ok: false, error: 'process_scope_lookup_failed' };
    }

    for (const row of data ?? []) {
      const processId = String((row as { id?: unknown }).id ?? '').trim();
      const processVersion = String((row as { version?: unknown }).version ?? '').trim();
      if (!processId || !processVersion) {
        continue;
      }

      const stateCodeRaw = (row as { state_code?: unknown }).state_code;
      const stateCodeCandidate =
        typeof stateCodeRaw === 'number'
          ? stateCodeRaw
          : typeof stateCodeRaw === 'string' && stateCodeRaw.trim().length > 0
            ? Number(stateCodeRaw)
            : Number.NaN;
      const stateCode = Number.isInteger(stateCodeCandidate) ? stateCodeCandidate : null;
      const userId =
        typeof (row as { user_id?: unknown }).user_id === 'string'
          ? String((row as { user_id?: unknown }).user_id).trim() || null
          : null;
      const teamId =
        typeof (row as { team_id?: unknown }).team_id === 'string'
          ? String((row as { team_id?: unknown }).team_id).trim() || null
          : null;
      const reviewId =
        typeof (row as { review_id?: unknown }).review_id === 'string'
          ? String((row as { review_id?: unknown }).review_id).trim() || null
          : null;

      lookup.set(processScopeLookupKey(processId, processVersion), {
        state_code: stateCode,
        user_id: userId,
        team_id: teamId,
        review_id: reviewId,
      });
    }
  }

  return { ok: true, data: lookup };
}

export async function validateProcessEntriesInDataScope(
  entries: ProcessScopeEntry[],
  dataScope: LcaDataScope,
  userId: string,
  client?: SupabaseClient,
): Promise<ProcessScopeValidationResult> {
  const scopeMeta = await fetchProcessScopeLookup(entries, client);
  if (!scopeMeta.ok) {
    return {
      ok: false,
      status: 500,
      body: { error: scopeMeta.error },
    };
  }

  const outOfScopeProcessIds = [
    ...new Set(
      entries
        .filter(
          (entry) =>
            !matchesProcessDataScope(
              scopeMeta.data.get(processScopeLookupKey(entry.process_id, entry.process_version)),
              dataScope,
              userId,
            ),
        )
        .map((entry) => entry.process_id),
    ),
  ];

  if (outOfScopeProcessIds.length === 0) {
    return { ok: true };
  }

  if (outOfScopeProcessIds.length === 1) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'process_not_in_data_scope',
        data_scope: dataScope,
        process_id: outOfScopeProcessIds[0],
      },
    };
  }

  return {
    ok: false,
    status: 403,
    body: {
      error: 'processes_not_in_data_scope',
      data_scope: dataScope,
      process_ids: outOfScopeProcessIds,
    },
  };
}
