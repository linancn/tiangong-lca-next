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

    const systemPrompt = `From the given life cycle assessment ILCD Life Cycle Model JSON, write one continuous English paragraph (<500 tokens) suitable for embedding and retrieval. The paragraph must strictly follow the natural language template below. Fill in values only if explicitly available. Do not add, remove, or reorder sentences. If a field has no value, omit the entire sentence where it belongs, not just the placeholder.
Always output in English only. Prefer English values if multilingual entries exist; if no English value is available, keep the original value verbatim but write all other sentences in English. Omit or translate non-English names. For technology and included processes, write concise natural sentences, do not mechanically list all referenced processes. Summarize supporting processes by category (utilities, water, energy, treatment) instead of enumerating all. If LCI method information is incomplete, output only what is explicitly given, but note that additional details are not stated.

Template:
<name.baseName [plus any qualifiers from name.treatmentStandardsRoutes and name.mixAndLocationTypes, joined with commas as non-geographic tags]>. [If classification exists] It is classified under <classification path highest→lowest>. [If reference year exists] The reference time is <representative year>. [If valid location exists] The location is <location code(s) exactly as given; if multiple, state “multiple” and keep codes verbatim>. The technology and included processes are <summary of included unit processes and operation flow synthesized from common:generalComment and referenced process common:shortDescription, deduplicated>. [If LCIMethodPrinciple exists] The LCI method principle is <LCIMethodPrinciple, e.g. Attributional/Consequential>. [If method details exist] The LCI method approaches are <dataset type such as Partly/Non-terminated system, cut-off/completeness rules, and main data sources/DB versions, or note that the model follows the referenced processes practice>. [If intended application exists] Its intended applications are <explicit intended application if provided>.(<UUID>)

Additional rules:
The <name.baseName> sentence must always be included if any name exists. Prefer English (@xml:lang="en") if available; otherwise keep the given value verbatim. Never omit the name sentence if present.
Exclude the classification, reference time, or location sentence only if the corresponding field is completely missing or empty.
Treat any string containing "/", "", "../", ".xml", ".xsd", "http", or "https" as a URI/path. Do not output such values for location or any other field.
Preserve any codes or IDs verbatim, but integrate them smoothly into sentences (e.g., “… ethylene production (7553090001) …”).
Never treat mixAndLocationTypes as geography (use them only as non-geographic tags).
Do not infer or invent values. Only use explicitly available content.
Keep the entire output as one continuous English paragraph, without lists or bullet points.`;
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
