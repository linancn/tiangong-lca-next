import {
  portalHybridQuerySchema,
  type PortalHybridSearchRequest,
  portalHybridSearchRequestSchema,
  type PortalPublicHybridCandidatePage,
  portalPublicHybridCandidatePageV1Schema,
  portalPublicHybridCandidatePageV2Schema,
} from './portal_hybrid_contract.ts';
import {
  readPortalBoundedStream,
  readPortalPublishableCredential,
  readPortalSupabaseUrl,
  validatePortalPublishableCredential,
  validatePortalSupabaseUrl,
} from './portal_public_transport.ts';

export const PORTAL_HYBRID_MAX_RESPONSE_BYTES = 512 * 1024;

export type PortalHybridRepositoryErrorCode = 'hybrid_upstream_unavailable' | 'contract_failure';

export class PortalHybridRepositoryError extends Error {
  constructor(readonly code: PortalHybridRepositoryErrorCode) {
    super(code);
    this.name = 'PortalHybridRepositoryError';
  }
}

export interface PortalHybridRepository {
  query(
    request: PortalHybridSearchRequest,
    queryTerms: string[],
    queryEmbedding: number[],
    signal: AbortSignal,
  ): Promise<PortalPublicHybridCandidatePage>;
}

export function serializePortalHybridEmbedding(queryEmbedding: number[]): string {
  if (
    queryEmbedding.length !== 1_024 ||
    !queryEmbedding.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    throw new PortalHybridRepositoryError('contract_failure');
  }
  return `[${queryEmbedding.join(',')}]`;
}

async function readRepositoryResponse(response: Response): Promise<unknown> {
  const contentLength = response.headers.get('content-length');
  if (
    contentLength &&
    /^\d+$/u.test(contentLength) &&
    Number(contentLength) > PORTAL_HYBRID_MAX_RESPONSE_BYTES
  ) {
    throw new PortalHybridRepositoryError('contract_failure');
  }
  let bytes: Uint8Array;
  try {
    bytes = await readPortalBoundedStream(response.body, PORTAL_HYBRID_MAX_RESPONSE_BYTES);
  } catch (_error) {
    throw new PortalHybridRepositoryError('contract_failure');
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (_error) {
    throw new PortalHybridRepositoryError('contract_failure');
  }
}

export function createPortalHybridRepository(
  options: {
    supabaseUrl?: string;
    publishableKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): PortalHybridRepository {
  let supabaseUrl: string;
  let publishableKey: string;
  try {
    supabaseUrl = validatePortalSupabaseUrl(options.supabaseUrl ?? readPortalSupabaseUrl());
    publishableKey = validatePortalPublishableCredential(
      options.publishableKey ?? readPortalPublishableCredential(),
    );
  } catch (_error) {
    throw new PortalHybridRepositoryError('hybrid_upstream_unavailable');
  }
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async query(request, queryTerms, queryEmbedding, signal) {
      const parsedRequest = portalHybridSearchRequestSchema.safeParse(request);
      if (!parsedRequest.success || queryTerms.length < 1 || queryTerms.length > 12) {
        throw new PortalHybridRepositoryError('contract_failure');
      }
      const parsedTerms = queryTerms.map((term) => portalHybridQuerySchema.safeParse(term));
      if (
        parsedTerms.some((term) => !term.success) ||
        new Set(parsedTerms.map((term) => (term.success ? term.data : ''))).size !==
          parsedTerms.length
      ) {
        throw new PortalHybridRepositoryError('contract_failure');
      }
      const normalizedTerms = parsedTerms.map((term) => (term.success ? term.data : ''));
      const versioned = parsedRequest.data.schemaVersion === 'portal.hybrid-search-request.v2';
      const rpcPath = versioned
        ? '/rest/v1/rpc/portal_hybrid_search_v2'
        : '/rest/v1/rpc/portal_hybrid_search_v1';
      const response = await fetchImpl(`${supabaseUrl}${rpcPath}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          apikey: publishableKey,
          'Content-Profile': 'api',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_kind: parsedRequest.data.kind,
          p_query_terms: normalizedTerms,
          p_query_embedding: serializePortalHybridEmbedding(queryEmbedding),
          p_filters: parsedRequest.data.filters,
          p_limit: parsedRequest.data.limit,
          ...(parsedRequest.data.schemaVersion === 'portal.hybrid-search-request.v2'
            ? { p_cursor: parsedRequest.data.cursor }
            : {}),
        }),
        signal,
      }).catch(() => {
        throw new PortalHybridRepositoryError('hybrid_upstream_unavailable');
      });
      if (!response.ok) {
        throw new PortalHybridRepositoryError('hybrid_upstream_unavailable');
      }
      const value = await readRepositoryResponse(response);
      const parsed = (
        versioned
          ? portalPublicHybridCandidatePageV2Schema
          : portalPublicHybridCandidatePageV1Schema
      ).safeParse(value);
      if (
        !parsed.success ||
        parsed.data.kind !== parsedRequest.data.kind ||
        parsed.data.items.length > parsedRequest.data.limit
      ) {
        throw new PortalHybridRepositoryError('contract_failure');
      }
      return parsed.data;
    },
  };
}
