// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from '@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  // if (req.method === 'OPTIONS') {
  //   return new Response('ok', { headers: corsHeaders });
  // }

  // Get the session or user object
  const secretApiKey = req.headers.get('apikey');

  // If no Authorization header, return error immediately
  if (!secretApiKey) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  try {
    const supabaseUrl = Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseClient = createClient(supabaseUrl, secretApiKey);

    const payload: WebhookPayload = await req.json();
    const { type, table, record } = payload;

    if (type !== 'INSERT' && type !== 'UPDATE') {
      return new Response('Ignored operation type', {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (!record) {
      throw new Error('No record data found');
    }

    const jsonData = record.json;
    if (!jsonData) {
      throw new Error('No JSON data found in record');
    }
    const embeddingServiceUrl = `${supabaseUrl}/functions/v1/process_embedding`;
    const response = await fetch(embeddingServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: secretApiKey,
      },
      body: JSON.stringify(jsonData),
    });
    // console.log('response', response);

    if (!response.ok) {
      throw new Error(
        `Process embedding service error:${JSON.stringify(
          response.json(),
        )} ${response.statusText} ${response.status}, embeddingServiceUrl: ${embeddingServiceUrl}, data: ${JSON.stringify(jsonData)}`,
      );
    }

    const { embedding, extracted_text } = await response.json();

    const { error: updateError } = await supabaseClient
      .from(table)
      .update({
        embedding: embedding,
        extracted_text: extracted_text,
        embedding_at: new Date().toISOString(),
      })
      .eq('id', record.id);
    console.log(`${table} ${record.id} embedding ${type} request`);

    if (updateError) {
      throw updateError;
    }
    console.log(`${table} ${record.id} embedding ${type} success`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
