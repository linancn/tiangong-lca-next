import '@supabase/functions-js/edge-runtime.d.ts';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { langgraphClient, listAssistants } from '../_shared/langgraph_client.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient as supabase } from '../_shared/supabase_client.ts';

async function suggestData(tidasData: string, dataType: string, options: Record<string, unknown>) {
  const assistants = await listAssistants();
  // console.log("assistants", JSON.stringify(assistants, null, 2));

  // Find the assistant with graph_id "lca_ai_suggestion"
  const targetAssistant = assistants.find(
    (assistant) => assistant.graph_id === 'lca_ai_suggestion',
  );

  if (!targetAssistant) {
    throw new Error("Assistant with graph_id 'lca_ai_suggestion' not found");
  }

  console.log('targetAssistant', JSON.stringify(targetAssistant, null, 2));

  // Create a thread first
  const thread = await langgraphClient.threads.create();
  const threadId = thread.thread_id;
  console.log('threadId', threadId);

  // Run with correct parameter order: thread_id, assistant_id, options
  const result = await langgraphClient.runs.wait(threadId, targetAssistant.assistant_id, {
    input: {
      data: tidasData,
      dataType,
      options,
    },
  });
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const time_start = Date.now();

  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    supabase: supabase,
    redis: redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  const { tidasData, dataType, options } = await req.json();

  if (!tidasData) {
    return new Response('Missing tidas_data', { status: 400 });
  }

  if (!dataType) {
    return new Response('Missing dataType', { status: 400 });
  }
  const result = await suggestData(tidasData, dataType, options);
  const time_end = Date.now();
  const time_cost = time_end - time_start;
  console.log('AI Suggest Edge Function cost: ', time_cost, 'ms');

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
