import '@supabase/functions-js/edge-runtime.d.ts';

import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient as supabase } from '../_shared/supabase_client.ts';
const openai_api_key = Deno.env.get('OPENAI_API_KEY') ?? '';
const openai_chat_model = Deno.env.get('OPENAI_CHAT_MODEL') ?? '';
const SAGEMAKER_ENDPOINT_NAME = Deno.env.get('SAGEMAKER_ENDPOINT_NAME');
const AWS_REGION = 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_SESSION_TOKEN = Deno.env.get('AWS_SESSION_TOKEN');
const textDecoder = new TextDecoder();

let sagemakerClient: SageMakerRuntimeClient | undefined;

function getSageMakerClient() {
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

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

/**
 * Attempts to parse a JSON string, returning undefined when parsing is not possible.
 */
function safeParseJsonString(value: string): unknown | undefined {
  const trimmed = value.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn('failed to parse JSON string from model response', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function findFirstNumberArray(value: unknown): number[] | undefined {
  if (typeof value === 'string') {
    const parsed = safeParseJsonString(value);
    if (parsed !== undefined) {
      return findFirstNumberArray(parsed);
    }
    return undefined;
  }

  if (isNumberArray(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumberArray(item);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    for (const key of ['embedding', 'embeddings', 'data']) {
      if (key in obj) {
        const found = findFirstNumberArray(obj[key]);
        if (found) {
          return found;
        }
      }
    }

    for (const candidate of Object.values(obj)) {
      const found = findFirstNumberArray(candidate);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function extractEmbedding(result: unknown): number[] | undefined {
  return findFirstNumberArray(result);
}

async function generateEmbedding(text: string) {
  if (!SAGEMAKER_ENDPOINT_NAME) {
    throw new Error('missing SAGEMAKER_ENDPOINT_NAME environment variable');
  }

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variable');
  }

  const client = getSageMakerClient();

  const command = new InvokeEndpointCommand({
    EndpointName: SAGEMAKER_ENDPOINT_NAME,
    ContentType: 'application/json',
    Accept: 'application/json',
    Body: JSON.stringify({ inputs: text }),
  });

  const response = await client.send(command);

  const httpStatus = response.$metadata.httpStatusCode ?? 500;
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(`SageMaker endpoint request failed: ${httpStatus}`);
  }

  const rawBody = response.Body;

  if (!rawBody) {
    throw new Error('empty response body from SageMaker endpoint');
  }

  let bodyString: string;

  if (typeof rawBody === 'string') {
    bodyString = rawBody;
  } else if (rawBody instanceof Uint8Array) {
    bodyString = textDecoder.decode(rawBody);
  } else if (
    rawBody &&
    typeof rawBody === 'object' &&
    'transformToByteArray' in rawBody &&
    typeof (rawBody as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray ===
      'function'
  ) {
    const bytes = await (
      rawBody as unknown as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    bodyString = textDecoder.decode(bytes);
  } else {
    throw new Error('unexpected response body type from SageMaker endpoint');
  }

  const parsed = JSON.parse(bodyString);
  const embedding = extractEmbedding(parsed);

  if (!embedding) {
    throw new Error('failed to generate embedding from SageMaker response');
  }

  return embedding;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    supabase: supabase,
    redis: redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  console.log('Auth Success:', authResult);

  const { query, filter } = await req.json();

  if (!query) {
    return new Response('Missing query', { status: 400 });
  }

  const model = new ChatOpenAI({
    model: openai_chat_model,
    temperature: 0,
    streaming: false,
    apiKey: openai_api_key,
  });

  const querySchema = {
    type: 'object',
    properties: {
      semantic_query_en: {
        title: 'SemanticQueryEN',
        description: 'A query for semantic retrieval in English.',
        type: 'string',
      },
      fulltext_query_en: {
        title: 'FulltextQueryEN',
        description:
          'FulltextQueryEN: A query list for full-text search in English, including original names and synonyms.',
        type: 'array',
        items: {
          type: 'string',
        },
      },
      fulltext_query_zh: {
        title: 'FulltextQueryZH',
        description:
          'FulltextQueryZH: A query list for full-text search in Simplified Chinese, including original names and synonyms.',
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['semantic_query_en', 'fulltext_query_en', 'fulltext_query_zh'],
  };

  const modelWithStructuredOutput = model.withStructuredOutput(querySchema);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `Field: Life Cycle Assessment (LCA)
Task: Transform description of flows into three specific queries: SemanticQueryEN, FulltextQueryEN and FulltextQueryZH.`,
    ],
    ['human', 'Flow description: {input}'],
  ]);

  const chain = prompt.pipe(modelWithStructuredOutput);

  const res = await chain.invoke({ input: query });

  const combinedFulltextQueries = [...res.fulltext_query_zh, ...res.fulltext_query_en].map(
    (query) => `(${query})`,
  );
  const queryFulltextString = combinedFulltextQueries.join(' OR ');

  const semanticQueryEn = res.semantic_query_en;

  const embedding = await generateEmbedding(semanticQueryEn);
  const vectorStr = `[${embedding.join(',')}]`;

  const filterCondition =
    filter !== undefined ? (typeof filter === 'string' ? filter : JSON.stringify(filter)) : {};

  const requestBody = {
    query_text: queryFulltextString,
    query_embedding: vectorStr,
    filter_condition: filterCondition,
  };

  const { data, error } = await supabase.rpc('hybrid_search_flows', requestBody);

  if (error) {
    console.error('Hybrid search error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
  if (data) {
    if (data.length > 0) {
      return new Response(
        JSON.stringify({
          data,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );
    }
  }
  return new Response('[]', {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status: 200,
  });
});
