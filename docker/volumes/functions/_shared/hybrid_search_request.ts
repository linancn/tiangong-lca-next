export class HybridSearchRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HybridSearchRequestError';
  }
}

export interface HybridSearchClientRequest {
  queryText: string;
  versionScope: 'latest' | 'matched';
  rpcOptions: HybridSearchRpcOptions;
  visibilityOptions: HybridSearchVisibilityOptions;
}

export interface HybridSearchRpcOptions {
  filter_condition: Record<string, unknown>;
  match_threshold: number;
  match_count: number;
  lexical_weight: number;
  semantic_weight: number;
  rrf_k: number;
  data_source: string;
  page_size: number;
  page_current: number;
}

export interface HybridSearchRpcRequest extends HybridSearchRpcOptions {
  query_text: string;
  query_terms: string[];
  query_embedding: string;
}

export interface HybridSearchVisibilityOptions {
  state_code_filter: number | null;
  team_id_filter: string | null;
}

export type HybridSearchRpcPayload = HybridSearchRpcRequest &
  Partial<HybridSearchVisibilityOptions>;

const VALID_DATA_SOURCES = new Set(['tg', 'co', 'my', 'te']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseNumber(value: unknown, fieldName: string, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isFinite(parsed)) {
    throw new HybridSearchRequestError(`${fieldName} must be a finite number`);
  }

  return parsed;
}

function parsePositiveInteger(value: unknown, fieldName: string, fallback: number): number {
  const parsed = parseNumber(value, fieldName, fallback);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HybridSearchRequestError(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

function parseNonNegativeNumber(value: unknown, fieldName: string, fallback: number): number {
  const parsed = parseNumber(value, fieldName, fallback);

  if (parsed < 0) {
    throw new HybridSearchRequestError(`${fieldName} must be greater than or equal to 0`);
  }

  return parsed;
}

function parseMatchThreshold(value: unknown): number {
  const parsed = parseNumber(value, 'match_threshold', 0.5);

  if (parsed < 0 || parsed > 1) {
    throw new HybridSearchRequestError('match_threshold must be between 0 and 1');
  }

  return parsed;
}

function parseDataSource(value: unknown): string {
  const dataSource = value === undefined || value === null || value === '' ? 'tg' : String(value);

  if (!VALID_DATA_SOURCES.has(dataSource)) {
    throw new HybridSearchRequestError('data_source must be one of tg, co, my, or te');
  }

  return dataSource;
}

function parseNullableStateCode(value: unknown): number | null {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return null;
  }

  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new HybridSearchRequestError('state_code must be a non-negative integer');
  }
  return parsed;
}

function parseNullableTeamId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const teamId = typeof value === 'string' ? value.trim() : '';
  if (!UUID_PATTERN.test(teamId)) {
    throw new HybridSearchRequestError('team_id must be a UUID');
  }
  return teamId;
}

function normalizeFilterCondition(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null || value === '') {
    return {};
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!isRecord(parsed)) {
        throw new HybridSearchRequestError('filter_condition must be a JSON object');
      }
      return parsed;
    } catch (error) {
      if (error instanceof HybridSearchRequestError) {
        throw error;
      }
      throw new HybridSearchRequestError('filter_condition must be a valid JSON object string');
    }
  }

  if (!isRecord(value)) {
    throw new HybridSearchRequestError('filter_condition must be a JSON object');
  }

  return value;
}

export function parseHybridSearchClientRequest(body: unknown): HybridSearchClientRequest {
  if (!isRecord(body)) {
    throw new HybridSearchRequestError('request body must be a JSON object');
  }

  const query = body.query;
  if (query === undefined || query === null || query === '') {
    throw new HybridSearchRequestError('Missing query');
  }

  const queryText = typeof query === 'string' ? query.trim() : String(query).trim();
  if (!queryText) {
    throw new HybridSearchRequestError('Missing query');
  }

  const filterInput = body.filter_condition ?? body.filter;
  const versionScope = body.version_scope ?? 'latest';
  if (versionScope !== 'latest' && versionScope !== 'matched') {
    throw new HybridSearchRequestError('version_scope must be latest or matched');
  }
  const matchCount = parsePositiveInteger(
    body.match_count,
    'match_count',
    versionScope === 'matched' ? 200 : 20,
  );
  if (versionScope === 'matched' && matchCount !== 200) {
    throw new HybridSearchRequestError('matched version search uses 200 candidates per branch');
  }

  return {
    queryText,
    versionScope,
    rpcOptions: {
      filter_condition: normalizeFilterCondition(filterInput),
      match_threshold: parseMatchThreshold(body.match_threshold),
      match_count: matchCount,
      lexical_weight: parseNonNegativeNumber(body.lexical_weight, 'lexical_weight', 0.5),
      semantic_weight: parseNonNegativeNumber(body.semantic_weight, 'semantic_weight', 0.5),
      rrf_k: parsePositiveInteger(body.rrf_k, 'rrf_k', 10),
      data_source: parseDataSource(body.data_source),
      page_size: parsePositiveInteger(body.page_size, 'page_size', 10),
      page_current: parsePositiveInteger(body.page_current, 'page_current', 1),
    },
    visibilityOptions: {
      state_code_filter: parseNullableStateCode(body.state_code),
      team_id_filter: parseNullableTeamId(body.team_id),
    },
  };
}

export function buildHybridSearchRpcRequest(
  queryText: string,
  queryTerms: string[],
  queryEmbedding: string,
  options: HybridSearchRpcOptions,
  visibilityOptions?: HybridSearchVisibilityOptions,
): HybridSearchRpcPayload {
  const request: HybridSearchRpcRequest = {
    query_text: queryText,
    query_terms: queryTerms,
    query_embedding: queryEmbedding,
    ...options,
  };
  return visibilityOptions ? { ...request, ...visibilityOptions } : request;
}
