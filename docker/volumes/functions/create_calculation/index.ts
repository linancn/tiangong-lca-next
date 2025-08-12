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

export const dynamicParam = {
  dynamicParameter: '',
  operatorList: [
    {
      code: 'dataset_reader',
      id: '1af6c6a3-f40f-4c99-8d36-3f995e6ce816',
      meta: {
        analyzeRule: { analyzerType: 'PDS_DATASET_READER' },
        checkRules: [],
        moduleMapRule: {
          mapRuleType: 'ONLY_ONE',
          mapParams: {
            openEngineModuleName: 'open_engine_mod_v2',
            roleMap: { worker: 'role1' },
          },
        },
      },
      dynamicParameter: {
        custom_params: {
          dataSetInternalID: '1',
          id: '0352d09d-db26-4729-b207-2dcdf6c9a75b',
          version: '00.00.001',
        },
        co_dataset_id: 'CO_DATASET_20250323164852_moyjsDA0',
        requested_field_list: ['value_0'],
      },
    },
    {
      code: 'dataset_reader',
      id: '475f757e-beae-4b70-9e78-892bf5f59855',
      meta: {
        analyzeRule: { analyzerType: 'PDS_DATASET_READER' },
        checkRules: [],
        moduleMapRule: {
          mapRuleType: 'ONLY_ONE',
          mapParams: {
            openEngineModuleName: 'open_engine_mod_v2',
            roleMap: { worker: 'role1' },
          },
        },
      },
      dynamicParameter: {
        custom_params: {
          dataSetInternalID: '0',
          id: '04650d44-4eb5-4d29-b70c-ce86bfdff684',
          version: '00.00.001',
        },
        co_dataset_id: 'CO_DATASET_20250323164711_44Uq3G97',
        requested_field_list: ['value_0'],
      },
    },
    {
      code: 'data_writer',
      id: 'c9706900-23d8-48a9-b1c3-30d70f7d9db1',
      meta: {
        analyzeRule: {
          analyzerType: 'PDS_DATA_WRITER',
          params: { isCipherText: false },
        },
        checkRules: [],
        moduleMapRule: {
          mapRuleType: 'ONLY_ONE',
          mapParams: {
            openEngineModuleName: 'open_engine_mod_v2',
            roleMap: { worker: 'role1' },
          },
        },
      },
      dynamicParameter: {
        storage_type: 'true',
        owner_did:
          'did:private:0000:698d9f20776b90eb5c1dac2f27074fcb55dee103426e6822d634127bc539ee7d',
        format_type: 'CSV',
        name: 'result',
        is_manage: true,
      },
    },
    {
      code: 'scql',
      id: '550a900b-58ea-4bb9-a976-cedd1c54b88e',
      meta: {
        analyzeRule: {
          analyzerType: 'SQL',
          params: { receiverRoleName: 'receiver' },
        },
        enablePreConfig: true,
        preset: 'preset-shape-double-knife',
        checkRules: [
          {
            parameterPaths: ['$.dp_{workerIndex}__ccl.column_ccl.keySet()'],
            constraintRule: 'EXIST_IN_DATASET_FIELD',
            ports: ['dp_input_file'],
          },
          {
            constraintRule: 'WORKER_NOT_SAME',
            params: { roleList: ['dp'] },
          },
          {
            parameterPaths: ['$.dp_0__table_name', '$.dp_1__table_name'],
            params: '^[A-Za-z0-9_$]*$',
            constraintRule: 'REG_EX',
            ports: ['dp_input_file'],
          },
        ],
        moduleMapRule: {
          mapRuleType: 'WORKER_NUM',
          role: 'dp',
          mapParams: { '1': { module: 'scql_single_dp' } },
        },
      },
      dynamicParameter: {
        dp_0__ccl: { column_ccl: { value_0: 'ALL_DISCLOSURE' } },
        result_table_create_cmd: 'CREATE table result_table (average_value double)',
        query_cmd:
          'SELECT AVG(combined_values) AS average_value FROM ( SELECT value_0 AS combined_values FROM t1 UNION ALL SELECT value_0 AS combined_values FROM t2 ) AS combined_data',
        dp_1__ccl: { column_ccl: { value_0: 'ALL_DISCLOSURE' } },
        dp_0__table_name: 't1',
        dp_1__table_name: 't2',
        _worker: {
          receiver:
            'did:private:0000:698d9f20776b90eb5c1dac2f27074fcb55dee103426e6822d634127bc539ee7d',
        },
      },
    },
  ],
};

/**
 * Modifies the custom_params of a specific operator in dynamicParam
 * @param params Original dynamicParam object
 * @param operatorId ID of the operator to modify
 * @param newCustomParams New custom_params object to replace the existing one
 * @returns Modified dynamicParam object
 */
export function updateCustomParams(
  params: typeof dynamicParam,
  operatorId: string,
  newCustomParams: Record<string, any>,
): typeof dynamicParam {
  // Create a deep copy of the original parameters to avoid mutation
  const updatedParams = JSON.parse(JSON.stringify(params));

  // Find the operator with the matching ID
  const operatorIndex = updatedParams.operatorList.findIndex(
    (operator: any) => operator.id === operatorId,
  );

  if (operatorIndex === -1) {
    console.warn(`Operator with ID ${operatorId} not found`);
    return updatedParams;
  }

  const operator = updatedParams.operatorList[operatorIndex];

  // Check if the operator has dynamicParameter with custom_params
  if (operator.dynamicParameter && 'custom_params' in operator.dynamicParameter) {
    // Update the custom_params
    operator.dynamicParameter.custom_params = {
      ...operator.dynamicParameter.custom_params,
      ...newCustomParams,
    };
  } else {
    console.warn(`Operator with ID ${operatorId} does not have custom_params`);
  }

  return updatedParams;
}

/**
 * Updates multiple operators' custom_params in a single call
 * @param params Original dynamicParam object
 * @param updates Array of updates with operator IDs and their new custom_params
 * @returns Modified dynamicParam object
 */
export function batchUpdateCustomParams(
  params: typeof dynamicParam,
  updates: Array<{ operatorId: string; customParams: Record<string, any> }>,
): typeof dynamicParam {
  let updatedParams = JSON.parse(JSON.stringify(params));

  for (const update of updates) {
    updatedParams = updateCustomParams(updatedParams, update.operatorId, update.customParams);
  }

  return updatedParams;
}

/**
 * Creates a new dynamicParam object with updated dataset parameters for two nodes
 *
 * @param dataSetParams1 Parameters for the first dataset node (ID: 1af6c6a3-f40f-4c99-8d36-3f995e6ce816)
 * @param dataSetParams2 Parameters for the second dataset node (ID: 475f757e-beae-4b70-9e78-892bf5f59855)
 * @returns Modified dynamicParam object
 */
export function createDynamicParamWithDatasetValues(
  dataSetParams1: {
    dataSetInternalID: string;
    id: string;
    version: string;
  },
  dataSetParams2: {
    dataSetInternalID: string;
    id: string;
    version: string;
  },
): typeof dynamicParam {
  // IDs of the two dataset reader nodes
  const firstNodeId = '1af6c6a3-f40f-4c99-8d36-3f995e6ce816';
  const secondNodeId = '475f757e-beae-4b70-9e78-892bf5f59855';

  // Update both nodes simultaneously using the batch update function
  return batchUpdateCustomParams(dynamicParam, [
    {
      operatorId: firstNodeId,
      customParams: dataSetParams1,
    },
    {
      operatorId: secondNodeId,
      customParams: dataSetParams2,
    },
  ]);
}

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
 * Create a calculation instance
 *
 * @param params Request parameters
 * @example
 * {
 *   'projectId': 'string',
 *   'envId': 'string',
 *   'appId': 'string',
 *   'dynamicParam': 'string' // dynamicParam is the dynamic parameter for the calculation instance
 * }
 * @returns Response data
 */
export async function createCalculateInstance(params: Record<string, any>) {
  const apiUrlPath = '/api/app/instance/create';
  const method = 'POST';
  const postRequestUrl = new URL(`${baseUrl}${apiUrlPath}`);

  const headers: Record<string, string> = { ...defaultHeaders };
  const body = params;

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
    const {
      projectId = 'PROJ_20250323163915_2nW3f7wz',
      envId = 'ENV_20250323163915_8EJkp60z',
      appId = 'APP_20250325165219_xdyRVNhu',
      dataSetParams1,
      dataSetParams2,
    } = await req.json();

    // Validate required inputs
    if (!dataSetParams1 || !dataSetParams2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required dataset parameters',
        }),
        { status: 400 },
      );
    }

    // Prepare dynamic parameters
    const dynamicParam = createDynamicParamWithDatasetValues(dataSetParams1, dataSetParams2);
    const stringifiedDynamicParam = JSON.stringify(dynamicParam);

    // Create calculation instance
    const createParams = {
      projectId,
      envId,
      appId,
      dynamicParam: stringifiedDynamicParam,
    };

    console.log('Creating calculation instance...');
    const createResponse = await createCalculateInstance(createParams);

    if (!createResponse.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create calculation instance',
          details: createResponse,
        }),
        { status: 500 },
      );
    }

    // Return success with instance ID
    return new Response(
      JSON.stringify({
        success: true,
        instanceId: createResponse.data.instanceId,
        projectId,
        envId,
        appId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error creating calculation:', error);
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
