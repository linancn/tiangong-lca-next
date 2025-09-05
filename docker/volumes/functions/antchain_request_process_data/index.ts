// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateRequest(req, {
      supabase: supabaseClient,
      allowedMethods: [AuthMethod.JWT],
    });

    if (!authResult.isAuthenticated) {
      return authResult.response!;
    }

    // Parse request body
    const { id, version, dataSetInternalID } = await req.json();
    console.log('request_process_data', id, version, dataSetInternalID);

    // Validate input parameters
    if (!id || !dataSetInternalID) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: id and dataSetInternalID' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    // Query the processes table
    let query = supabaseClient.from('processes').select('json').eq('id', id);

    // Add version filter if provided
    if (version) {
      query = query.eq('version', version);
    } else {
      // If no version provided, get the latest
      query = query.order('version', { ascending: false }).limit(1);
    }

    const result = await query;

    if (result.error) {
      console.error('Database query error:', result.error);
      return new Response(
        JSON.stringify({ error: 'Error querying database', details: result.error }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      );
    }

    if (!result.data || result.data.length === 0) {
      return new Response(JSON.stringify({ error: 'Process not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Extract process data
    const processData = result.data[0].json;

    // Navigate to the exchanges array in the data structure
    const exchanges = processData?.processDataSet?.exchanges?.exchange;

    if (!exchanges || !Array.isArray(exchanges)) {
      return new Response(JSON.stringify({ error: 'No exchanges found in process data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Find the exchange with the matching dataSetInternalID
    const targetExchange = exchanges.find(
      (exchange) => exchange['@dataSetInternalID'] === dataSetInternalID,
    );

    if (!targetExchange) {
      return new Response(
        JSON.stringify({ error: 'Exchange with specified dataSetInternalID not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      );
    }

    // Extract only the resultingAmount value and convert to number
    const resultingAmount = parseFloat(targetExchange.resultingAmount);
    console.log('resultingAmount', resultingAmount);
    // Return the resultingAmount as a number in an array with key 'value'
    return new Response(
      JSON.stringify({
        value: [resultingAmount],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: 'Request Process Data Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
