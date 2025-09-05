import '@supabase/functions-js/edge-runtime.d.ts';
import { supabaseClient as supabase } from '../_shared/supabase_client.ts';

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
 * Query the execution status of a calculation instance
 *
 * @param params Request parameters
 * @example
 * {
 *   'appId': 'string',
 *   'envId': 'string',
 *   'instanceId': 'string',
 *   'projectId': 'string'
 * }
 * @returns Response data
 */
export async function queryInstanceExecStatus(params: Record<string, any>) {
  const apiUrlPath = '/api/app/instance/queryInstanceExecStatus';
  const method = 'GET';
  const paramsStr = new URLSearchParams(params).toString();

  const getRequestUrl = new URL(`${baseUrl}${apiUrlPath}?${paramsStr}`);
  const headers: Record<string, string> = { ...defaultHeaders };

  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, null);
  headers['x-signature'] = signature;

  const response = await fetch(getRequestUrl, {
    method,
    headers,
  });
  const data = await response.json();
  return data;
}

/**
 * Query a calculation instance
 *
 * @param params Request parameters
 * @example
 * {
 *   'appId': 'string',
 *   'envId': 'string',
 *   'instanceId': 'string',
 *   'projectId': 'string'
 * }
 * @returns Response data
 */
export async function queryInstance(params: Record<string, any>) {
  const apiUrlPath = '/api/app/instance/query';
  const method = 'GET';
  const paramsStr = new URLSearchParams(params).toString();

  const getRequestUrl = new URL(`${baseUrl}${apiUrlPath}?${paramsStr}`);
  const headers: Record<string, string> = { ...defaultHeaders };

  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, null);
  headers['x-signature'] = signature;

  const response = await fetch(getRequestUrl, {
    method,
    headers,
  });
  const data = await response.json();
  return data;
}

/**
 * Get the coDatasetId of a calculation instance
 *
 * @param params Request parameters
 * @example
 * {
 *   'appId': 'string',
 *   'envId': 'string',
 *   'instanceId': 'string',
 *   'projectId': 'string'
 * }
 * @returns The coDatasetId if found, null otherwise
 */
export async function getCoDatasetId(params: Record<string, any>) {
  const instanceInfo = await queryInstance(params);

  if (!instanceInfo.success || !instanceInfo.data || !instanceInfo.data.resultInfoList) {
    return null;
  }

  const resultInfoList: Record<string, any>[] = instanceInfo.data.resultInfoList;
  const successResult = resultInfoList.find(
    (item: Record<string, any>) => item.status === 'SUCCESS',
  );

  return successResult?.coDatasetId || null;
}

// Main handler for the Edge Function
Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // Parse request body
    const {
      projectId = 'PROJ_20250323163915_2nW3f7wz',
      envId = 'ENV_20250323163915_8EJkp60z',
      appId = 'APP_20250325165219_xdyRVNhu',
      instanceId,
    } = await req.json();
    console.log('projectId', projectId);
    console.log('envId', envId);
    console.log('appId', appId);
    console.log('instanceId', instanceId);

    // Validate required inputs
    if (!projectId || !envId || !appId || !instanceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Missing required parameters. Please provide projectId, envId, appId, and instanceId',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Query parameters
    const statusParams = {
      projectId,
      envId,
      appId,
      instanceId,
    };

    // Get instance execution status
    console.log('Checking calculation status...');
    const statusResponse = await queryInstanceExecStatus(statusParams);

    if (!statusResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to query instance status',
          details: statusResponse,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const status = statusResponse.data.status;
    if (!status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Status information not available',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const appInstanceStatus = statusResponse.data.appInstanceStatus;
    const statusCode = status.status;

    // If calculation is complete, get the coDatasetId
    if (statusCode === 'SUCCESS' || statusCode === 'INSTANCE_COMPLETED') {
      console.log('Calculation completed successfully, retrieving coDatasetId...');
      const coDatasetId = await getCoDatasetId(statusParams);

      if (coDatasetId) {
        return new Response(
          JSON.stringify({
            success: true,
            status: statusCode,
            coDatasetId: coDatasetId,
            isComplete: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } else {
        return new Response(
          JSON.stringify({
            success: true,
            status: statusCode,
            isComplete: true,
            error: 'Calculation completed but coDatasetId not found',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    } else if (
      statusCode === 'FAILED' ||
      statusCode === 'TIMEOUT' ||
      statusCode === 'INSTANCE_TERMINATED' ||
      statusCode === 'CANCELED' ||
      appInstanceStatus === 'FAILED'
    ) {
      // Calculation failed
      return new Response(
        JSON.stringify({
          success: false,
          status: statusCode,
          appInstanceStatus: appInstanceStatus,
          isComplete: true,
          error: 'Calculation failed',
          details: status,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else {
      // Calculation is still in progress
      return new Response(
        JSON.stringify({
          success: true,
          status: statusCode,
          appInstanceStatus: appInstanceStatus,
          isComplete: false,
          message: 'Calculation is still in progress',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error: any) {
    console.error('Error querying calculation status:', error);
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
