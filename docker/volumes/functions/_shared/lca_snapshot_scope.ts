export const DEFAULT_PUBLISHED_PROCESS_STATES = [100] as const;

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

export function normalizeLcaDataScope(raw: unknown): LcaDataScope | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value || value === 'current_user') {
    return 'current_user';
  }
  if (value === 'open_data' || value === 'all_data') {
    return value;
  }
  return null;
}

export function buildSnapshotProcessFilter(
  dataScope: LcaDataScope,
  userId: string,
): SnapshotProcessFilter {
  switch (dataScope) {
    case 'open_data':
      return {
        all_states: false,
        process_states: [...DEFAULT_PUBLISHED_PROCESS_STATES],
      };
    case 'all_data':
      return {
        all_states: true,
      };
    case 'current_user':
    default:
      return {
        all_states: false,
        process_states: [...DEFAULT_PUBLISHED_PROCESS_STATES],
        include_user_id: userId,
      };
  }
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

  const allStates = obj.all_states === true;
  if (allStates) {
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
