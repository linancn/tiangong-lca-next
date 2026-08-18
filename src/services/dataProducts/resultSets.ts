import { invokeDataProductCommand, type DataProductApiResult } from './api';

export type LciaResultSetV1 = {
  schemaVersion: 'lcia.result-set.v1';
  resultSetId: string;
  name: string;
  createdAt: string;
};

export type LciaResultSetListV1 = {
  items: LciaResultSetV1[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function decodeLciaResultSet(value: unknown): LciaResultSetV1 | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['schemaVersion', 'resultSetId', 'name', 'createdAt'])
  ) {
    return null;
  }
  const resultSetId = typeof value.resultSetId === 'string' ? value.resultSetId : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : '';
  if (
    value.schemaVersion !== 'lcia.result-set.v1' ||
    !uuidPattern.test(resultSetId) ||
    !name ||
    !createdAt ||
    !Number.isFinite(Date.parse(createdAt))
  ) {
    return null;
  }
  return { schemaVersion: 'lcia.result-set.v1', resultSetId, name, createdAt };
}

function invalidProjection<T>(response: DataProductApiResult<unknown>): DataProductApiResult<T> {
  return {
    ...response,
    data: null,
    error: {
      message: 'Invalid result set response',
      code: 'INVALID_RESULT_SET_PROJECTION',
      details: '',
      hint: '',
    },
  };
}

async function invokeResultSetCommand<T>(
  payload: Record<string, unknown>,
  decode: (value: unknown) => T | null,
): Promise<DataProductApiResult<T>> {
  const response = await invokeDataProductCommand<unknown>(payload);
  if (response.error) return response as DataProductApiResult<T>;
  const decoded = decode(response.data);
  return decoded ? { ...response, data: decoded } : invalidProjection<T>(response);
}

export function createLciaResultSet(name: string): Promise<DataProductApiResult<LciaResultSetV1>> {
  return invokeResultSetCommand({ action: 'create_result_set', name }, decodeLciaResultSet);
}

export function getLciaResultSet(
  resultSetId: string,
): Promise<DataProductApiResult<LciaResultSetV1>> {
  return invokeResultSetCommand({ action: 'get_result_set', resultSetId }, decodeLciaResultSet);
}

export function listLciaResultSets(
  limit = 200,
): Promise<DataProductApiResult<LciaResultSetListV1>> {
  return invokeResultSetCommand({ action: 'list_result_sets', limit }, (value) => {
    if (!isRecord(value) || !hasExactKeys(value, ['items']) || !Array.isArray(value.items)) {
      return null;
    }
    const items = value.items.map(decodeLciaResultSet);
    return items.every((item): item is LciaResultSetV1 => Boolean(item)) ? { items } : null;
  });
}
