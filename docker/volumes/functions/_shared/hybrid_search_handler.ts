import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';

import { authenticateRequest, AuthMethod } from './auth.ts';
import { corsHeaders } from './cors.ts';
import { extractEmbeddingVector } from './embedding_vector.ts';
import {
  buildHybridFulltextQueryTerms,
  HYBRID_SYNONYM_RULES,
  hybridQuerySchema,
  sanitizeHybridQueryOutput,
  type HybridSearchQuery,
} from './hybrid_query_utils.ts';
import {
  buildHybridSearchRpcRequest,
  parseHybridSearchClientRequest,
} from './hybrid_search_request.ts';
import {
  createHybridSearchRpcClient,
  HybridSearchRpcContextError,
  type HybridSearchRpcClientContext,
} from './hybrid_search_rpc_context.ts';
import { openaiStructuredOutput } from './openai_structured.ts';
import { getRedisClient } from './redis_client.ts';
import { supabaseAuthClient } from './supabase_client.ts';

export interface HybridSearchRouteConfig {
  functionName: string;
  entityKind: string;
  entityLabel: string;
  entityPlural: string;
  rpcName: string;
  forwardVisibilityContext?: boolean;
}

interface HybridSearchAuthResult {
  isAuthenticated: boolean;
  response?: Response;
}

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

const OPENAI_CHAT_MODEL = Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4.1-mini';
const SAGEMAKER_ENDPOINT_NAME = Deno.env.get('SAGEMAKER_ENDPOINT_NAME');
const AWS_REGION = 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_SESSION_TOKEN = Deno.env.get('AWS_SESSION_TOKEN');
const textDecoder = new TextDecoder();

let sagemakerClient: SageMakerRuntimeClient | undefined;

function getSageMakerClient(): SageMakerRuntimeClient {
  if (!sagemakerClient) {
    sagemakerClient = new SageMakerRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: AWS_SECRET_ACCESS_KEY ?? '',
        sessionToken: AWS_SESSION_TOKEN ?? undefined,
      },
    });
  }
  return sagemakerClient;
}

async function defaultAuthenticate(request: Request): Promise<HybridSearchAuthResult> {
  const redis = await getRedisClient();
  return await authenticateRequest(request, {
    authClient: supabaseAuthClient,
    redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
  });
}

async function defaultRewriteQuery(
  config: HybridSearchRouteConfig,
  queryText: string,
): Promise<HybridSearchQuery> {
  return await openaiStructuredOutput<HybridSearchQuery>({
    schemaName: `${config.functionName}_queries`,
    schema: hybridQuerySchema,
    systemPrompt: `Field: Life Cycle Assessment (LCA)
Task: Transform description of ${config.entityPlural} into three specific queries: SemanticQueryEN, FulltextQueryEN and FulltextQueryZH.
${HYBRID_SYNONYM_RULES}`,
    userPrompt: `${config.entityLabel} description: ${queryText}`,
    options: { model: OPENAI_CHAT_MODEL, temperature: 0 },
  });
}

async function readSageMakerBody(rawBody: unknown): Promise<string> {
  if (typeof rawBody === 'string') return rawBody;
  if (rawBody instanceof Uint8Array) return textDecoder.decode(rawBody);
  if (
    rawBody &&
    typeof rawBody === 'object' &&
    'transformToByteArray' in rawBody &&
    typeof (rawBody as { transformToByteArray?: unknown }).transformToByteArray === 'function'
  ) {
    const bytes = await (
      rawBody as unknown as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return textDecoder.decode(bytes);
  }
  throw new Error('unexpected response body type from SageMaker endpoint');
}

async function defaultGenerateEmbedding(text: string): Promise<number[]> {
  if (!SAGEMAKER_ENDPOINT_NAME) {
    throw new Error('missing SAGEMAKER_ENDPOINT_NAME environment variable');
  }
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variable');
  }

  const response = await getSageMakerClient().send(
    new InvokeEndpointCommand({
      EndpointName: SAGEMAKER_ENDPOINT_NAME,
      ContentType: 'application/json',
      Accept: 'application/json',
      Body: JSON.stringify({ inputs: text }),
    }),
  );
  const httpStatus = response.$metadata.httpStatusCode ?? 500;
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(`SageMaker endpoint request failed: ${httpStatus}`);
  }
  if (!response.Body) throw new Error('empty response body from SageMaker endpoint');

  return extractEmbeddingVector(JSON.parse(await readSageMakerBody(response.Body)));
}

const DEFAULT_DEPENDENCIES: HybridSearchHandlerDependencies = {
  authenticate: defaultAuthenticate,
  rewriteQuery: defaultRewriteQuery,
  generateEmbedding: defaultGenerateEmbedding,
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

export function createHybridSearchHandler(
  config: HybridSearchRouteConfig,
  dependencyOverrides: Partial<HybridSearchHandlerDependencies> = {},
): (request: Request) => Promise<Response> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencyOverrides };

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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
          { error: error instanceof Error ? error.message : 'Invalid request body' },
          400,
        );
      }

      const normalizedQuery = sanitizeHybridQueryOutput(
        await dependencies.rewriteQuery(config, parsedRequest.queryText),
        parsedRequest.queryText,
      );
      if (!normalizedQuery.semantic_query_en) {
        throw new Error('OpenAI structured output missing semantic_query_en');
      }

      const queryTerms = buildHybridFulltextQueryTerms(normalizedQuery);
      const embedding = extractEmbeddingVector(
        await dependencies.generateEmbedding(normalizedQuery.semantic_query_en),
      );
      const requestBody = buildHybridSearchRpcRequest(
        parsedRequest.queryText,
        queryTerms,
        `[${embedding.join(',')}]`,
        parsedRequest.rpcOptions,
        config.forwardVisibilityContext ? parsedRequest.visibilityOptions : undefined,
      );

      let rpcClientContext: HybridSearchRpcClientContext;
      try {
        rpcClientContext = dependencies.createRpcClient(
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
      dependencies.logger.log('[hybrid_search]', { ...logBase, stage: 'rpc_start' });

      let { data, error } = await rpcClientContext.client.rpc(config.rpcName, requestBody);
      let fallbackUsed = false;
      if (!error && Array.isArray(data) && data.length === 0 && requestBody.match_threshold > 0) {
        fallbackUsed = true;
        const fallbackRequestBody = { ...requestBody, match_threshold: 0 };
        dependencies.logger.log('[hybrid_search]', {
          ...logBase,
          stage: 'rpc_empty_fallback',
          match_threshold: 0,
          duration_ms: dependencies.now() - rpcStartedAt,
        });
        ({ data, error } = await rpcClientContext.client.rpc(config.rpcName, fallbackRequestBody));
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

      dependencies.logger.log('[hybrid_search]', {
        ...logBase,
        stage: 'rpc_success',
        duration_ms: dependencies.now() - rpcStartedAt,
        result_count: Array.isArray(data) ? data.length : 0,
        fallback_used: fallbackUsed,
      });
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
