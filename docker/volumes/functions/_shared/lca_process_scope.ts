import { DEFAULT_PUBLISHED_PROCESS_STATES, type LcaDataScope } from './lca_snapshot_scope.ts';

export type ProcessScopeMeta = {
  state_code: number | null;
  user_id: string | null;
};

export type ProcessScopeEntry = {
  process_id: string;
  process_version?: string;
};

export type ProcessScopeValidationResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> };

export function processScopeLookupKey(processId: string, processVersion?: string): string {
  return `${processId}:${String(processVersion ?? '').trim()}`;
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
): Promise<{ ok: true; data: Map<string, ProcessScopeMeta> } | { ok: false; error: string }> {
  const uniqueIds = [...new Set(entries.map((entry) => entry.process_id).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: true, data: new Map<string, ProcessScopeMeta>() };
  }

  const { supabaseClient } = await import('./supabase_client.ts');
  const lookup = new Map<string, ProcessScopeMeta>();
  const chunkSize = 500;

  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { data, error } = await supabaseClient
      .from('processes')
      .select('id,version,state_code,user_id')
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

      lookup.set(processScopeLookupKey(processId, processVersion), {
        state_code: stateCode,
        user_id: userId,
      });
    }
  }

  return { ok: true, data: lookup };
}

export async function validateProcessEntriesInDataScope(
  entries: ProcessScopeEntry[],
  dataScope: LcaDataScope,
  userId: string,
): Promise<ProcessScopeValidationResult> {
  const scopeMeta = await fetchProcessScopeLookup(entries);
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
