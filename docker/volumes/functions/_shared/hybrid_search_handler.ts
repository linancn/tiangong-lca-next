import { authenticateRequest, AuthMethod, type AuthResult } from './auth.ts';
import { corsHeaders } from './cors.ts';
import { extractEmbeddingVector } from './embedding_vector.ts';
import { generateHybridSearchEmbedding, rewriteHybridSearchQuery } from './hybrid_search_kernel.ts';
import {
  buildBoundedHybridFulltextQueryTerms,
  buildHybridFulltextQueryTerms,
  type HybridSearchQuery,
  sanitizeHybridQueryOutput,
} from './hybrid_query_utils.ts';
import {
  buildHybridSearchRpcRequest,
  parseHybridSearchClientRequest,
} from './hybrid_search_request.ts';
import {
  createHybridSearchRpcClient,
  type HybridSearchRpcClientContext,
  HybridSearchRpcContextError,
} from './hybrid_search_rpc_context.ts';
import { supabaseAuthClient } from './supabase_client.ts';

export interface HybridSearchRouteConfig {
  functionName: string;
  entityKind: string;
  entityLabel: string;
  entityPlural: string;
  rpcName: string;
  versionedRpcName?: string;
  forwardVisibilityContext?: boolean;
  forwardProcessTypeFilter?: boolean;
  requireSelectedTeamContext?: boolean;
  rpcOwnsThresholdFallback?: boolean;
}

type HybridSearchAuthResult = Pick<AuthResult, 'isAuthenticated' | 'principal' | 'response'>;

export interface HybridSearchHandlerDependencies {
  authenticate: (request: Request) => Promise<HybridSearchAuthResult>;
  rewriteQuery: (config: HybridSearchRouteConfig, queryText: string) => Promise<HybridSearchQuery>;
  generateEmbedding: (text: string) => Promise<number[]>;
  createRpcClient: (
    authorizationHeader: string | null,
    dataSource: string,
  ) => HybridSearchRpcClientContext;
  now: () => number;
  logger: Pick<Console, 'log' | 'error'>;
}

async function defaultAuthenticate(request: Request): Promise<HybridSearchAuthResult> {
  return await authenticateRequest(request, {
    authClient: supabaseAuthClient,
    allowedMethods: [AuthMethod.JWT, AuthMethod.SERVICE_API_KEY],
  });
}

const DEFAULT_DEPENDENCIES: HybridSearchHandlerDependencies = {
  authenticate: defaultAuthenticate,
  rewriteQuery: rewriteHybridSearchQuery,
  generateEmbedding: generateHybridSearchEmbedding,
  createRpcClient: createHybridSearchRpcClient,
  now: Date.now,
  logger: console,
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    if (typeof code === 'string' && code.trim()) return code;
  }
  return 'HYBRID_SEARCH_FAILED';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const VALID_FLOW_TYPES = new Set(['Elementary flow', 'Product flow', 'Waste flow', 'Other flow']);

function hasInvalidMatchedFlowFilter(filter: Record<string, unknown>): boolean {
  if ('flowType' in filter) {
    if (typeof filter.flowType !== 'string') return true;
    const flowTypes = filter.flowType
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      flowTypes.length === 0 ||
      flowTypes.length > VALID_FLOW_TYPES.size ||
      flowTypes.some((value) => !VALID_FLOW_TYPES.has(value))
    ) {
      return true;
    }
  }
  if (
    'asInput' in filter &&
    typeof filter.asInput !== 'boolean' &&
    filter.asInput !== 'true' &&
    filter.asInput !== 'false'
  ) {
    return true;
  }
  if (!('classification' in filter)) return false;
  if (!Array.isArray(filter.classification) || filter.classification.length > 50) return true;
  return filter.classification.some(
    (item) =>
      !isRecord(item) ||
      (item.scope !== 'classification' && item.scope !== 'elementary') ||
      typeof item.code !== 'string' ||
      !item.code.trim() ||
      item.code.length > 200,
  );
}

export function createHybridSearchHandler(
  config: HybridSearchRouteConfig,
  dependencyOverrides: Partial<HybridSearchHandlerDependencies> = {},
): (request: Request) => Promise<Response> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencyOverrides };

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const handlerStartedAt = dependencies.now();
    try {
      const authResult = await dependencies.authenticate(request);
      if (!authResult.isAuthenticated) {
        return authResult.response ?? jsonResponse({ error: 'Unauthorized' }, 401);
      }

      let parsedRequest;
      try {
        parsedRequest = parseHybridSearchClientRequest(await request.json());
      } catch (error) {
        return jsonResponse(
          {
            error: error instanceof Error ? error.message : 'Invalid request body',
          },
          400,
        );
      }

      const versioned = parsedRequest.versionScope === 'matched';
      if (versioned && !config.versionedRpcName) {
        return jsonResponse(
          { error: 'Matched version search is not supported by this route' },
          400,
        );
      }
      if (
        versioned &&
        (parsedRequest.rpcOptions.page_size > 100 ||
          parsedRequest.rpcOptions.page_current > 400 ||
          parsedRequest.rpcOptions.rrf_k > 1_000 ||
          parsedRequest.rpcOptions.lexical_weight > 1 ||
          parsedRequest.rpcOptions.semantic_weight > 1 ||
          parsedRequest.rpcOptions.lexical_weight + parsedRequest.rpcOptions.semantic_weight <= 0)
      ) {
        return jsonResponse({ error: 'Invalid matched version search bounds' }, 400);
      }
      if (
        versioned &&
        config.requireSelectedTeamContext &&
        parsedRequest.rpcOptions.data_source === 'te' &&
        !parsedRequest.visibilityOptions.team_id_filter
      ) {
        return jsonResponse(
          {
            error: 'team_id is required for selected-team search',
          },
          400,
        );
      }
      if (
        versioned &&
        config.entityKind === 'flow' &&
        parsedRequest.entityFilterOptions.type_of_data_set_filter !== null
      ) {
        return jsonResponse({ error: 'Process dataset type is not supported by Flow search' }, 400);
      }
      if (
        versioned &&
        config.entityKind === 'flow' &&
        hasInvalidMatchedFlowFilter(parsedRequest.rpcOptions.filter_condition)
      ) {
        return jsonResponse({ error: 'Invalid matched Flow filter contract' }, 400);
      }
      const rpcName = versioned ? config.versionedRpcName! : config.rpcName;
      let rpcClientContext: HybridSearchRpcClientContext | undefined;
      if (versioned) {
        if (authResult.principal?.authMethod !== 'supabase_jwt') {
          return jsonResponse(
            {
              error: 'Matched version search requires a verified Supabase JWT user context',
              code: 'HYBRID_SEARCH_USER_CONTEXT_REQUIRED',
            },
            403,
          );
        }
        try {
          rpcClientContext = dependencies.createRpcClient(
            request.headers.get('Authorization'),
            parsedRequest.rpcOptions.data_source,
          );
        } catch (error) {
          if (error instanceof HybridSearchRpcContextError) {
            return jsonResponse({ error: error.message, code: error.code }, error.status);
          }
          throw error;
        }
        if (rpcClientContext.userContextKind !== 'jwt') {
          return jsonResponse(
            {
              error: 'Matched version search requires a Supabase JWT user context',
              code: 'HYBRID_SEARCH_USER_CONTEXT_REQUIRED',
            },
            403,
          );
        }
      }
      const rewriteStartedAt = dependencies.now();
      const rawRewrite = await dependencies.rewriteQuery(config, parsedRequest.queryText);
      if (versioned && !rawRewrite.semantic_query_en?.trim()) {
        throw new Error('OpenAI structured output missing semantic_query_en');
      }
      const normalizedQuery = sanitizeHybridQueryOutput(rawRewrite, parsedRequest.queryText);
      if (!normalizedQuery.semantic_query_en) {
        throw new Error('OpenAI structured output missing semantic_query_en');
      }

      dependencies.logger.log('[hybrid_search]', {
        function: config.functionName,
        entity_kind: config.entityKind,
        stage: 'rewrite_success',
        duration_ms: dependencies.now() - rewriteStartedAt,
        query_length: parsedRequest.queryText.length,
        semantic_query_length: normalizedQuery.semantic_query_en.length,
      });

      const queryTerms = versioned
        ? buildBoundedHybridFulltextQueryTerms(normalizedQuery, parsedRequest.queryText)
        : buildHybridFulltextQueryTerms(normalizedQuery);
      const embeddingStartedAt = dependencies.now();
      const embedding = extractEmbeddingVector(
        await dependencies.generateEmbedding(normalizedQuery.semantic_query_en),
      );
      dependencies.logger.log('[hybrid_search]', {
        function: config.functionName,
        entity_kind: config.entityKind,
        stage: 'embedding_success',
        duration_ms: dependencies.now() - embeddingStartedAt,
        embedding_dimensions: embedding.length,
      });
      const requestBody = buildHybridSearchRpcRequest(
        parsedRequest.queryText,
        queryTerms,
        `[${embedding.join(',')}]`,
        parsedRequest.rpcOptions,
        config.forwardVisibilityContext ? parsedRequest.visibilityOptions : undefined,
        config.forwardProcessTypeFilter ? parsedRequest.entityFilterOptions : undefined,
      );

      try {
        rpcClientContext ??= dependencies.createRpcClient(
          request.headers.get('Authorization'),
          requestBody.data_source,
        );
      } catch (error) {
        if (error instanceof HybridSearchRpcContextError) {
          return jsonResponse({ error: error.message, code: error.code }, error.status);
        }
        throw error;
      }

      const logBase = {
        function: config.functionName,
        entity_kind: config.entityKind,
        query_length: parsedRequest.queryText.length,
        semantic_query_length: normalizedQuery.semantic_query_en.length,
        fulltext_term_count: queryTerms.length,
        match_threshold: requestBody.match_threshold,
        data_source: requestBody.data_source,
        user_context_kind: rpcClientContext.userContextKind,
      };
      const rpcStartedAt = dependencies.now();
      dependencies.logger.log('[hybrid_search]', {
        ...logBase,
        stage: 'rpc_start',
      });

      let { data, error } = await rpcClientContext.client.rpc(rpcName, requestBody);
      let fallbackUsed = false;
      if (
        !config.rpcOwnsThresholdFallback &&
        !error &&
        Array.isArray(data) &&
        data.length === 0 &&
        requestBody.match_threshold > 0
      ) {
        fallbackUsed = true;
        const fallbackRequestBody = { ...requestBody, match_threshold: 0 };
        dependencies.logger.log('[hybrid_search]', {
          ...logBase,
          stage: 'rpc_empty_fallback',
          match_threshold: 0,
          duration_ms: dependencies.now() - rpcStartedAt,
        });
        ({ data, error } = await rpcClientContext.client.rpc(rpcName, fallbackRequestBody));
      }

      if (error) {
        dependencies.logger.error('[hybrid_search]', {
          ...logBase,
          stage: 'rpc_error',
          duration_ms: dependencies.now() - rpcStartedAt,
          error_code: error.code ?? 'HYBRID_SEARCH_RPC_ERROR',
          error_message: error.message,
          fallback_used: fallbackUsed,
        });
        return jsonResponse({ error: error.message }, 500);
      }

      if (versioned) {
        const keys = new Set<string>();
        if (
          !Array.isArray(data) ||
          data.some((row) => {
            if (
              !row ||
              typeof row !== 'object' ||
              typeof row.id !== 'string' ||
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(row.id) ||
              typeof row.version !== 'string' ||
              !/^\d{2}\.\d{2}\.\d{3}$/u.test(row.version)
            ) {
              return true;
            }
            const key = row.id + ':' + row.version;
            if (keys.has(key)) return true;
            keys.add(key);
            return false;
          })
        ) {
          throw new Error('Version search returned invalid exact identities');
        }
      }
      dependencies.logger.log('[hybrid_search]', {
        ...logBase,
        stage: 'rpc_success',
        duration_ms: dependencies.now() - rpcStartedAt,
        complete_duration_ms: dependencies.now() - handlerStartedAt,
        result_count: Array.isArray(data) ? data.length : 0,
        fallback_used: fallbackUsed,
        database_fallback_used:
          Array.isArray(data) &&
          data.some(
            (row) =>
              row && typeof row === 'object' && Reflect.get(row, 'semantic_fallback_used') === true,
          ),
        semantic_route:
          Array.isArray(data) && data[0] && typeof data[0] === 'object'
            ? Reflect.get(data[0], 'semantic_route')
            : undefined,
        semantic_candidate_population:
          Array.isArray(data) && data[0] && typeof data[0] === 'object'
            ? Reflect.get(data[0], 'semantic_candidate_population')
            : undefined,
      });
      if (versioned) {
        return jsonResponse({ data, versionScope: 'matched' }, 200);
      }
      return Array.isArray(data) && data.length > 0
        ? jsonResponse({ data }, 200)
        : jsonResponse([], 200);
    } catch (error) {
      const code = errorCode(error);
      dependencies.logger.error('[hybrid_search]', {
        function: config.functionName,
        entity_kind: config.entityKind,
        stage: 'handler_error',
        error_code: code,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return jsonResponse({ error: 'Hybrid search failed', code }, 500);
    }
  };
}
