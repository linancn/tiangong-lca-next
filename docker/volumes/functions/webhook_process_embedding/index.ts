// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { openaiChat } from '../_shared/openai_chat.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    allowedMethods: [AuthMethod.SERVICE_API_KEY],
    serviceApiKey: Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY') ?? '',
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  try {
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

    const jsonData = record.json_ordered;
    if (!jsonData) {
      throw new Error('No json_ordered data found in record');
    }

    // console.log(`${table} ${record.id} ${record.version} summary ${type} request`);

    const systemPrompt = `From the given life cycle assessment ILCD Process JSON, write one continuous English paragraph (<500 tokens) suitable for embedding and retrieval. The paragraph must strictly follow the natural language template below. Fill in values only if explicitly available. Do not add, remove, or reorder sentences. If a field has no value, omit the entire sentence where it belongs, not just the placeholder. <name.baseName> must be presented.
If the reference product or flow cannot be resolved to a valid exchange with both name, amount, and unit, omit the entire sentence. Do not output placeholder values such as 0 or "unit as in source". When listing main inputs or outputs, include at most 3–6 key items and write them as a natural English sentence, using commas and "and" instead of a mechanical list. Keep the technology and included processes description concise. If any field values are in Chinese or other non-English languages, always translate them into clear, natural English. Preserve all codes, IDs, and UUIDs exactly as given, without translation. Do not output untranslated Chinese or mixed-language text. Always keep the output in English only.

Template:
<name.baseName> is of type <typeOfDataSet, including whether it implies background inclusion/aggregation such as unit process single operation, unit process black box, partly terminated system, or LCI result>. Its intended purpose or application is <processInformation.purposeAndIntendedApplication>. The reference product or flow is <reference product/exchange name that matches processInformation.quantitativeReference.referenceToReferenceFlow> with a reported amount of <amount and unit, or “unit as in source” if unit is not explicit>. The main inputs are <top 3-6 inputs by presence in exchanges, each with name, amount, and note Measured/Estimated>. The main outputs and emissions are <key product plus notable wastewater and emissions with amounts>. The technology and included processes are <plain language description>. The location and time representativeness are <country or sub-location, reference year>. Methodological details are: dataset type, allocation note, cut-off or completeness rule, review type or reviewer if present, and compliance system. The data source is <short description from dataSource or publication info>. (<UUID>)

Additional rules:
Preserve any codes or IDs verbatim.
Exclude all URIs or schema references.
Do not infer or invent values.`;
    const modelInput = `${systemPrompt}\nJSON:\n${JSON.stringify(jsonData)}`;

    const { text } = await openaiChat(modelInput, { stream: false });
    const summary = (text || '').trim();
    if (!summary) throw new Error('Empty summary from model');

    const { error: updateError } = await supabaseClient
      .from(table)
      .update({
        extracted_text: summary,
      })
      .eq('id', record.id)
      .eq('version', record.version);

    if (updateError) {
      throw updateError;
    }
    console.log(summary);
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
