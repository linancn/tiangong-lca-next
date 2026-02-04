import '@supabase/functions-js/edge-runtime.d.ts';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient as supabase } from '../_shared/supabase_client.ts';
const openai_api_key = Deno.env.get('OPENAI_API_KEY') ?? '';
const openai_chat_model = Deno.env.get('OPENAI_CHAT_MODEL') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    supabase: supabase,
    redis: redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
    serviceApiKey: Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY') ?? '',
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
Task: Transform description of lifecycle models into three specific queries: SemanticQueryEN, FulltextQueryEN and FulltextQueryZH.`,
    ],
    ['human', 'Lifecycle model description: {input}'],
  ]);

  const chain = prompt.pipe(modelWithStructuredOutput);

  const res = await chain.invoke({ input: query });

  const combinedFulltextQueries = [...res.fulltext_query_zh, ...res.fulltext_query_en].map(
    (query) => `(${query})`,
  );
  const queryFulltextString = combinedFulltextQueries.join(' OR ');

  const semanticQueryEn = res.semantic_query_en;

  const session = new Supabase.ai.Session('gte-small');
  const vectors = (await session.run(semanticQueryEn, {
    mean_pool: true,
    normalize: true,
  })) as number[];
  const vectorStr = `[${vectors.join(',')}]`;

  const filterCondition =
    filter !== undefined ? (typeof filter === 'string' ? filter : JSON.stringify(filter)) : {};

  const requestBody = {
    query_text: queryFulltextString,
    query_embedding: vectorStr,
    filter_condition: filterCondition,
  };

  // console.log('LLM structured res:', JSON.stringify(res, null, 2));
  // console.log('combinedFulltextQueries:', combinedFulltextQueries);
  // console.log('queryFulltextString.len:', queryFulltextString.length);
  // console.log('semanticQueryEn:', semanticQueryEn);
  // console.log('requestBody:', JSON.stringify(requestBody, null, 2));

  const { data, error } = await supabase.rpc('hybrid_search_lifecyclemodels', requestBody);

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
