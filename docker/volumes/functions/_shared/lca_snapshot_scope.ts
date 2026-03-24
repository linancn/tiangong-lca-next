export const DEFAULT_PUBLISHED_PROCESS_STATE_START = 100;
export const DEFAULT_PUBLISHED_PROCESS_STATE_END = 199;
export const DEFAULT_PUBLISHED_PROCESS_STATES: readonly number[] = Array.from(
  {
    length: DEFAULT_PUBLISHED_PROCESS_STATE_END - DEFAULT_PUBLISHED_PROCESS_STATE_START + 1,
  },
  (_, index) => DEFAULT_PUBLISHED_PROCESS_STATE_START + index,
);

export type LcaDataScope = 'current_user' | 'open_data' | 'all_data';

export type SnapshotProcessFilter = {
  all_states: boolean;
  process_states?: number[];
  include_user_id?: string;
};

export type ParsedSnapshotProcessFilter = {
  allStates: boolean;
  processStates: number[];
  includeUserId: string | null;
};

export function parseLcaDataScope(raw: unknown): LcaDataScope {
  if (raw === 'open_data' || raw === 'all_data' || raw === 'current_user') {
    return raw;
  }
  return 'current_user';
}

export function buildSnapshotProcessFilter(
  dataScope: LcaDataScope,
  userId: string,
): SnapshotProcessFilter {
  switch (dataScope) {
    case 'open_data':
    case 'all_data':
    case 'current_user':
    default:
      // Business semantics: open_data, all_data, and current_user all reuse the same
      // snapshot family for solving, i.e. published data plus the current user's
      // private data. Published data currently covers state_code 100..199, while
      // root-process scope is validated separately per request.
      return {
        all_states: false,
        process_states: [...DEFAULT_PUBLISHED_PROCESS_STATES],
        include_user_id: userId,
      };
  }
}

export function shouldAutoBuildSnapshot(dataScope: LcaDataScope): boolean {
  return dataScope === 'current_user' || dataScope === 'all_data' || dataScope === 'open_data';
}

export function buildSnapshotContainsFilter(
  filter: SnapshotProcessFilter,
): Record<string, unknown> {
  const parsed = parseSnapshotProcessFilter(filter);
  const containsFilter: Record<string, unknown> = {
    all_states: parsed.allStates,
  };

  if (!parsed.allStates && parsed.processStates.length > 0) {
    containsFilter.process_states = parsed.processStates;
  }
  if (!parsed.allStates && parsed.includeUserId) {
    containsFilter.include_user_id = parsed.includeUserId;
  }

  return containsFilter;
}

export function buildSnapshotBuildPayloadFields(
  filter: SnapshotProcessFilter,
): Record<string, unknown> {
  const parsed = parseSnapshotProcessFilter(filter);
  const payloadFields: Record<string, unknown> = {
    all_states: parsed.allStates,
  };

  if (!parsed.allStates && parsed.processStates.length > 0) {
    payloadFields.process_states = parsed.processStates.join(',');
  }
  if (!parsed.allStates && parsed.includeUserId) {
    payloadFields.include_user_id = parsed.includeUserId;
  }

  return payloadFields;
}

export function parseSnapshotProcessFilter(raw: unknown): ParsedSnapshotProcessFilter {
  const obj = (raw ?? {}) as {
    all_states?: unknown;
    process_states?: unknown;
    include_user_id?: unknown;
  };

  if (obj.all_states === true) {
    return {
      allStates: true,
      processStates: [],
      includeUserId: null,
    };
  }

  return {
    allStates: false,
    processStates: normalizeProcessStates(obj.process_states),
    includeUserId: normalizeIncludeUserId(obj.include_user_id),
  };
}

export function matchesSnapshotProcessFilter(
  raw: unknown,
  expected: SnapshotProcessFilter,
): boolean {
  const actual = parseSnapshotProcessFilter(raw);
  const normalizedExpected = parseSnapshotProcessFilter(expected);

  if (actual.allStates !== normalizedExpected.allStates) {
    return false;
  }
  if (actual.includeUserId !== normalizedExpected.includeUserId) {
    return false;
  }
  if (actual.processStates.length !== normalizedExpected.processStates.length) {
    return false;
  }

  return actual.processStates.every(
    (value, index) => value === normalizedExpected.processStates[index],
  );
}

function normalizeProcessStates(raw: unknown): number[] {
  const values: number[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const value = Number(item);
      if (Number.isInteger(value)) {
        values.push(value);
      }
    }
  } else if (typeof raw === 'string') {
    for (const token of raw.split(',')) {
      const value = Number(token.trim());
      if (Number.isInteger(value)) {
        values.push(value);
      }
    }
  }

  return [...new Set(values)].sort((left, right) => left - right);
}

function normalizeIncludeUserId(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const value = raw.trim();
  return value.length > 0 ? value : null;
}
