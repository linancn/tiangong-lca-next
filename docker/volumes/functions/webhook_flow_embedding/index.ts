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
  // Authenticate the request by apikey
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

    const systemPrompt = `From the given life cycle assessment ILCD flow JSON, write one continuous English paragraph (<500 tokens) suitable for embedding and retrieval. The paragraph must strictly follow the natural language template below. Fill in values only if explicitly available. Do not add, remove, or reorder sentences. If a field has no value, omit the entire sentence where it belongs, not just the placeholder. When joining multiple qualifiers from name.treatmentStandardsRoutes or name.mixAndLocationTypes, separate them with commas, not semicolons. If the classification path or names already contain semicolons as part of the original text, keep them, but never add additional semicolons when combining values. The output must contain only English text — translate all non-English words or characters into English. Never include Chinese, Japanese, or other non-English text. Always output as a single continuous paragraph in English only and without mechanical punctuation, never a list or key-value format.

Template:
<name.baseName [plus any qualifiers from name.treatmentStandardsRoutes and name.mixAndLocationTypes, joined with commas as non-geographic tags]> is classified under <classification path highest→lowest, using classificationInformation.elementaryFlowCategorization for elementary flows or classificationInformation.classification for product or waste flows>. [If common:synonyms exists] It is also known as <common:synonyms>, with identifiers such as CAS number <CAS> and EC number <EC> if available. This dataset is of type <typeOfDataSet> and includes the following general comment: <generalComment>. The reference flow property is <referenceFlowProperty.name> with a mean value of <referenceFlowProperty.meanValue>. It follows the compliance system <complianceSystem> with approval status <approvalStatus>. The dataset is provided in version <version> and was last updated on <timeStamp>, with ownership or publisher described as <ownership/publisher>. (<UUID>)

Additional rules:
Must include name.baseName, translated to English if necessary.
Preserve any codes or IDs verbatim.
Exclude all URIs or schema references.
Never interpret mixAndLocationTypes as geography (treat them only as non-geographic tags).
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
