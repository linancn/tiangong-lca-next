import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js@2';

export const ANT_CHAIN_KEY = JSON.parse(atob(Deno.env.get('ANT_CHAIN_KEY') ?? ''));

export const defaultAntchainConfig = {
  baseUrl: ANT_CHAIN_KEY.baseUrl,
  authenticationType: ANT_CHAIN_KEY.authenticationType,
  authenticationVersion: ANT_CHAIN_KEY.authenticationVersion,
  tenantId: ANT_CHAIN_KEY.tenantId,
  isvAk: ANT_CHAIN_KEY.isvAk,
  isvSk: ANT_CHAIN_KEY.isvSk,
  signatureMethod: ANT_CHAIN_KEY.signatureMethod,
};
const baseUrl = ANT_CHAIN_KEY.baseUrl;

const supabase = createClient(
  Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('REMOTE_SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

const defaultHeaders = {
  'x-authentication-version': defaultAntchainConfig.authenticationVersion,
  'x-authentication-type': defaultAntchainConfig.authenticationType,
  'x-tenant-id': defaultAntchainConfig.tenantId,
  'x-isv-ak': defaultAntchainConfig.isvAk,
  'x-signature-method': defaultAntchainConfig.signatureMethod,
};

export async function signRequest(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  params: Record<string, any> | null,
  body: any,
) {
  const { data, error } = await supabase.functions.invoke('sign_request', {
    method: 'POST',
    body: { baseUrl, path, headers, params, body },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data.signature;
}

/**
 * Sample data by coDatasetId
 *
 * @param params Request parameters
 * @example
 * {
 *     'coDatasetId': coDatasetId,
 *     'sampleRule': {
 *       'type': 'FORWARD_SAMPLE',
 *       'limit': 20
 *     }
 *   }
 * @returns Response data
 */
export async function sampleDataByCoDatasetId(params: Record<string, any>) {
  const apiUrlPath = '/api/dataset/io/sampleDataByCoDatasetId';
  const method = 'POST';
  const body = params;

  const postRequestUrl = new URL(`${baseUrl}${apiUrlPath}`);
  const headers: Record<string, string> = { ...defaultHeaders };

  const signature = await signRequest(baseUrl, apiUrlPath, headers, null, body);
  headers['x-signature'] = signature;
  headers['Content-Type'] = 'application/json';

  const response = await fetch(postRequestUrl, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return data;
}

// Main handler for the Edge Function
Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const { coDatasetId, limit = 20 } = await req.json();

    // Validate required inputs
    if (!coDatasetId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required coDatasetId parameter',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Prepare sample parameters
    const sampleParams = {
      coDatasetId,
      sampleRule: {
        type: 'FORWARD_SAMPLE',
        limit: limit,
      },
    };

    // Get sample data
    console.log('Retrieving calculation results...');
    const sampleResponse = await sampleDataByCoDatasetId(sampleParams);

    if (!sampleResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to retrieve calculation results',
          details: sampleResponse,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Return the data
    return new Response(
      JSON.stringify({
        success: true,
        data: sampleResponse.data.sampleData.vectorList,
        metadata: sampleResponse.data.sampleData.metadata,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error retrieving calculation results:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});
