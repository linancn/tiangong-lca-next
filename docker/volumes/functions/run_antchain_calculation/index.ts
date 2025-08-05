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
  // console.log('signRequest', baseUrl, path, headers, params, body, isvSk);
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
 * Generates a curl command string from fetch request parameters
 * @param url The request URL
 * @param method HTTP method
 * @param headers Request headers
 * @param body Request body (for POST/PUT requests)
 * @returns A string containing the equivalent curl command
 */
// function generateCurlCommand(
//     url: URL,
//     method: string,
//     headers: Record<string, string>,
//     body: any = null,
// ): string {
//     let curlCommand = `curl -X ${method} '${url.toString()}'`;

//     // Add headers
//     for (const [key, value] of Object.entries(headers)) {
//         curlCommand += ` \\\n  -H '${key}: ${value}'`;
//     }

//     // Add body for POST/PUT requests
//     if (body && (method === 'POST' || method === 'PUT')) {
//         const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
//         curlCommand += ` \\\n  -d '${bodyStr}'`;
//     }

//     return curlCommand;
// }

// API Test
export async function queryProjects() {
  const method = 'GET';
  const apiUrlPath = '/api/project/pageQuery';
  const params = {
    page: '1',
    pageSize: '10',
  };
  const headers: Record<string, string> = { ...defaultHeaders };
  const paramsStr = new URLSearchParams(params).toString();
  const getRequestUrl = new URL(`${baseUrl}${apiUrlPath}?${paramsStr}`);
  const body = null;

  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, body);
  headers['x-signature'] = signature;
  // console.log('sign', signature);

  // Print curl command for debugging
  // console.log('Curl command:');
  // console.log(generateCurlCommand(getRequestUrl, method, headers));

  // 发送请求
  const response = await fetch(getRequestUrl, {
    method,
    headers,
  });
  const data = await response.json();
  // console.log(data);
  return data;
}

export async function testConnecivity(params: Record<string, any>) {
  const apiUrlPath = '/api/dataset/local/testConnecivity';
  const method = 'POST';
  const postRequestUrl = new URL(`${baseUrl}${apiUrlPath}`);
  // console.log('postRequestUrl', postRequestUrl);

  const body = params;
  const headers: Record<string, string> = { ...defaultHeaders };

  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, body);
  headers['x-signature'] = signature;
  headers['Content-Type'] = 'application/json';

  // Print curl command for debugging
  // console.log(generateCurlCommand(postRequestUrl, method, headers, body));

  const response = await fetch(postRequestUrl, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  // console.log(data);
  return data;
}

export async function recognizeSchema(params: Record<string, any>) {
  const apiUrlPath = '/api/dataset/local/recognizeSchema';
  const method = 'POST';
  const postRequestUrl = new URL(`${baseUrl}${apiUrlPath}`);
  // console.log('postRequestUrl', postRequestUrl);

  const body = params;
  const headers: Record<string, string> = { ...defaultHeaders };

  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, body);
  headers['x-signature'] = signature;
  headers['Content-Type'] = 'application/json';

  // Print curl command for debugging
  // console.log('Curl command:');
  // console.log(generateCurlCommand(postRequestUrl, method, headers, body));

  const response = await fetch(postRequestUrl, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();
  // console.log(data);
  return data;
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
  // console.log('postRequestUrl', postRequestUrl);

  /**
       * @param {Object} params
       * {
          'networkId [当前项⽬所属的协作⽹络id 本期非必填，不填写时后端⾃动填补默认的⽹络id]': 'string',
          'projectId [协作项⽬id]': 'string',
          'envId [计算环境的id]': 'string',
          'appId [协作应⽤id]': 'string',
          'dynamicParam [执⾏实例的动态参数，json格式]': 'string'
          }
          @example
          {
          'projectId': 'PROJ_20250323163915_2nW3f7wz',
          'envId': 'ENV_20250323163915_8EJkp60z',
          'appId': 'APP_20250323164059_kHFeIqTg',
          'dynamicParam': '{\'dynamicParameter\':\'\',\'operatorList\':[{\'code\':\'dataset_reader\',\'id\':\'1af6c6a3-f40f-4c99-8d36-3f995e6ce816\',\'meta\':\'{\\\'analyzeRule\\\':{\\\'analyzerType\\\':\\\'PDS_DATASET_READER\\\'},\\\'checkRules\\\':[],\\\'moduleMapRule\\\':{\\\'mapRuleType\\\':\\\'ONLY_ONE\\\',\\\'mapParams\\\':{\\\'openEngineModuleName\\\':\\\'open_engine_mod_v2\\\',\\\'roleMap\\\':{\\\'worker\\\':\\\'role1\\\'}}}}\',\'dynamicParameter\':\'{\\\'custom_params\\\':{\\\'dataSetInternalID\\\':\\\'0\\\',\\\'id\\\':\\\'0352d09d-db26-4729-b207-2dcdf6c9a75b\\\',\\\'version\\\':\\\'00.00.001\\\'},\\\'co_dataset_id\\\':\\\'CO_DATASET_20250323164852_moyjsDA0\\\',\\\'requested_field_list\\\':[\\\'value_0\\\']}\'},{\'code\':\'dataset_reader\',\'id\':\'475f757e-beae-4b70-9e78-892bf5f59855\',\'meta\':\'{\\\'analyzeRule\\\':{\\\'analyzerType\\\':\\\'PDS_DATASET_READER\\\'},\\\'checkRules\\\':[],\\\'moduleMapRule\\\':{\\\'mapRuleType\\\':\\\'ONLY_ONE\\\',\\\'mapParams\\\':{\\\'openEngineModuleName\\\':\\\'open_engine_mod_v2\\\',\\\'roleMap\\\':{\\\'worker\\\':\\\'role1\\\'}}}}\',\'dynamicParameter\':\'{\\\'custom_params\\\':{\\\'dataSetInternalID\\\':\\\'0\\\',\\\'id\\\':\\\'04650d44-4eb5-4d29-b70c-ce86bfdff684\\\',\\\'version\\\':\\\'00.00.001\\\'},\\\'co_dataset_id\\\':\\\'CO_DATASET_20250323164711_44Uq3G97\\\',\\\'requested_field_list\\\':[\\\'value_0\\\']}\'},{\'code\':\'data_writer\',\'id\':\'c9706900-23d8-48a9-b1c3-30d70f7d9db1\',\'meta\':\'{\\\'analyzeRule\\\':{\\\'analyzerType\\\':\\\'PDS_DATA_WRITER\\\',\\\'params\\\':{\\\'isCipherText\\\':false}},\\\'checkRules\\\':[],\\\'moduleMapRule\\\':{\\\'mapRuleType\\\':\\\'ONLY_ONE\\\',\\\'mapParams\\\':{\\\'openEngineModuleName\\\':\\\'open_engine_mod_v2\\\',\\\'roleMap\\\':{\\\'worker\\\':\\\'role1\\\'}}}}\',\'dynamicParameter\':\'{\\\'storage_type\\\':\\\'true\\\',\\\'owner_did\\\':\\\'did:private:0000:698d9f20776b90eb5c1dac2f27074fcb55dee103426e6822d634127bc539ee7d\\\',\\\'format_type\\\':\\\'CSV\\\',\\\'name\\\':\\\'result\\\',\\\'is_manage\\\':true}\'},{\'code\':\'scql\',\'id\':\'550a900b-58ea-4bb9-a976-cedd1c54b88e\',\'meta\':\'{\\\'analyzeRule\\\':{\\\'analyzerType\\\':\\\'SQL\\\',\\\'params\\\':{\\\'receiverRoleName\\\':\\\'receiver\\\'}},\\\'enablePreConfig\\\':true,\\\'preset\\\':\\\'preset-shape-double-knife\\\',\\\'checkRules\\\':[{\\\'parameterPaths\\\':[\\\'$.dp_{workerIndex}__ccl.column_ccl.keySet()\\\'],\\\'constraintRule\\\':\\\'EXIST_IN_DATASET_FIELD\\\',\\\'ports\\\':[\\\'dp_input_file\\\']},{\\\'constraintRule\\\':\\\'WORKER_NOT_SAME\\\',\\\'params\\\':{\\\'roleList\\\':[\\\'dp\\\']}},{\\\'parameterPaths\\\':[\\\'$.dp_0__table_name\\\',\\\'$.dp_1__table_name\\\'],\\\'params\\\':\\\'^[A-Za-z0-9_$]*$\\\',\\\'constraintRule\\\':\\\'REG_EX\\\',\\\'ports\\\':[\\\'dp_input_file\\\']}],\\\'moduleMapRule\\\':{\\\'mapRuleType\\\':\\\'WORKER_NUM\\\',\\\'role\\\':\\\'dp\\\',\\\'mapParams\\\':{\\\'1\\\':{\\\'module\\\':\\\'scql_single_dp\\\'}}}}\',\'dynamicParameter\':\'{\\\'dp_0__ccl\\\':{\\\'column_ccl\\\':{\\\'value_0\\\':\\\'ALL_DISCLOSURE\\\'}},\\\'result_table_create_cmd\\\':\\\'CREATE table result_table (average_value double)\\\',\\\'query_cmd\\\':\\\'SELECT AVG(combined_values) AS average_value FROM ( SELECT value_0 AS combined_values FROM t1 UNION ALL SELECT value_0 AS combined_values FROM t2 ) AS combined_data\\\',\\\'dp_1__ccl\\\':{\\\'column_ccl\\\':{\\\'value_0\\\':\\\'ALL_DISCLOSURE\\\'}},\\\'dp_0__table_name\\\':\\\'t1\\\',\\\'dp_1__table_name\\\':\\\'t2\\\',\\\'_worker\\\':{\\\'receiver\\\':\\\'did:private:0000:698d9f20776b90eb5c1dac2f27074fcb55dee103426e6822d634127bc539ee7d\\\'}}\'}]}'
          }
       */
  // const defaultDynamicParam = await Deno.readTextFile('./dynamicParam.json');
  const headers: Record<string, string> = { ...defaultHeaders };

  const body = params;
  // console.log('------headers', headers);
  // console.log('------body', body);
  // console.log('------body', JSON.stringify(body));
  // console.log('isvSk', isvSk);

  const signature = await signRequest(baseUrl, apiUrlPath, headers, null, body);
  headers['x-signature'] = signature;
  headers['Content-Type'] = 'application/json';

  // Print curl command for debugging
  // console.log('Curl command:');
  // console.log(generateCurlCommand(postRequestUrl, method, headers, body));

  const response = await fetch(postRequestUrl, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json();

  // console.log(data);
  return data;
}

// http://123.57.86.188:32081/api/app/instance/queryInstanceExecStatus?appId=APP_20250323164059_kHFeIqTg&envId=ENV_20250323163915_8EJkp60z&instanceId=INSTANCE_20250325110405_OuCaPfgf&projectId=PROJ_20250323163915_2nW3f7wz

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

  // console.log('getRequestUrl', getRequestUrl);

  const headers: Record<string, string> = { ...defaultHeaders };

  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, null);
  headers['x-signature'] = signature;

  const response = await fetch(getRequestUrl, {
    method,
    headers,
  });
  const data = await response.json();
  // console.log(data);
  return data;
}

// http://123.57.86.188:32081/api/app/instance/query?appId=APP_20250323164059_kHFeIqTg&envId=ENV_20250323163915_8EJkp60z&instanceId=INSTANCE_20250325110405_OuCaPfgf&projectId=PROJ_20250323163915_2nW3f7wz

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

  // console.log('getRequestUrl', getRequestUrl);
  // console.log('getRequestUrl', getRequestUrl.toString());

  const headers: Record<string, string> = { ...defaultHeaders };
  const signature = await signRequest(baseUrl, apiUrlPath, headers, params, null);
  headers['x-signature'] = signature;
  // console.log('headers', headers);

  const response = await fetch(getRequestUrl, {
    method,
    headers,
  });
  const data = await response.json();
  // console.log(data);
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
 * @returns Response data
 */
export async function getCoDatasetId(params: Record<string, any>) {
  const instanceInfo = await queryInstance(params);
  const resultInfoList: Record<string, any>[] = instanceInfo.data.resultInfoList;
  const coDatasetId = resultInfoList.find(
    (item: Record<string, any>) => item.status === 'SUCCESS',
  )?.coDatasetId;
  return coDatasetId;
}

// http://123.57.86.188:32081/api/dataset/io/sampleDataByCoDatasetId

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

  // console.log('postRequestUrl', postRequestUrl);
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
  console.log(data);
  return data;
}

/**
 * Utility function to wait for a specified duration
 * @param ms Time to wait in milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

/**
 * Orchestrates the end-to-end process of creating a calculation task, monitoring its status,
 * and retrieving the results after completion.
 *
 * @param projectId The project ID. Default: 'PROJ_20250323163915_2nW3f7wz'
 * @param envId The environment ID. Default: 'ENV_20250323163915_8EJkp60z'
 * @param appId The application ID. Default: 'APP_20250325165219_xdyRVNhu'
 * @param dataSetParams1 Parameters for the first dataset node
 * @param dataSetParams2 Parameters for the second dataset node
 * @param maxRetries Maximum number of retries if calculation fails (default: 3)
 * @param pollIntervalMs Interval between status checks in milliseconds (default: 5000)
 * @param sampleLimit Number of data samples to retrieve (default: 20)
 * @returns The sample data from the calculation result or null if all retries failed
 */
export async function runCalculationWorkflow(
  projectId: string = 'PROJ_20250323163915_2nW3f7wz',
  envId: string = 'ENV_20250323163915_8EJkp60z',
  appId: string = 'APP_20250325165219_xdyRVNhu',
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
  maxRetries: number = 3,
  pollIntervalMs: number = 5000,
  sampleLimit: number = 20,
): Promise<any> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1} of ${maxRetries} to run calculation workflow`);

      // Step 1: Create dynamic parameters with the provided dataset values
      const dynamicParam = createDynamicParamWithDatasetValues(dataSetParams1, dataSetParams2);
      const stringifiedDynamicParam = JSON.stringify(dynamicParam);
      // console.log('stringifiedDynamicParam', stringifiedDynamicParam);
      // Step 2: Create calculation instance
      const createParams = {
        projectId: projectId,
        envId: envId,
        appId: appId,
        dynamicParam: stringifiedDynamicParam,
      };

      console.log('Creating calculation instance...');
      const createResponse = await createCalculateInstance(createParams);

      if (!createResponse.success) {
        console.error('Failed to create calculation instance:', createResponse);
        retryCount++;
        continue;
      }

      const instanceId = createResponse.data.instanceId;
      console.log(`Calculation instance created with ID: ${instanceId}`);

      // Step 3: Poll for calculation status until completion
      const statusParams = {
        projectId,
        envId,
        appId,
        instanceId,
      };

      let calculationSuccess = false;
      let statusResponse;

      console.log('Polling for calculation status...');
      while (true) {
        statusResponse = await queryInstanceExecStatus(statusParams);

        if (!statusResponse.success) {
          console.error('Failed to query instance status:', statusResponse);
          break;
        }

        const status = statusResponse.data.status;
        if (!status) {
          continue;
        }
        // console.log('statusResponse', JSON.stringify(statusResponse));
        const appInstanceStatus = statusResponse.data.appInstanceStatus;
        if (appInstanceStatus === 'FAILED') {
          console.error(`Calculation failed with status: ${JSON.stringify(status)}`);
          break;
        } else {
          console.log(`Current status: ${JSON.stringify(status.status)}`);
        }
        const statusCode = status.status;

        // Check if calculation completed or failed
        if (statusCode === 'SUCCESS' || statusCode === 'INSTANCE_COMPLETED') {
          calculationSuccess = true;
          break;
        } else if (
          statusCode === 'FAILED' ||
          statusCode === 'TIMEOUT' ||
          statusCode === 'INSTANCE_TERMINATED' ||
          statusCode === 'CANCELED'
        ) {
          console.error(`Calculation failed with status: ${JSON.stringify(status)}`);
          break;
        }

        // Wait before polling again
        await sleep(pollIntervalMs);
      }

      if (!calculationSuccess) {
        retryCount++;
        continue;
      }

      // Step 4: Get the coDatasetId
      console.log('Retrieving coDatasetId...');
      const coDatasetId = await getCoDatasetId(statusParams);

      if (!coDatasetId) {
        console.error('Failed to get coDatasetId');
        retryCount++;
        continue;
      }

      console.log(`Retrieved coDatasetId: ${coDatasetId}`);

      // Step 5: Sample data using coDatasetId
      const sampleParams = {
        coDatasetId,
        sampleRule: {
          type: 'FORWARD_SAMPLE',
          limit: sampleLimit,
        },
      };

      console.log('Retrieving sample data...');
      const sampleResponse = await sampleDataByCoDatasetId(sampleParams);

      if (!sampleResponse.success) {
        console.error('Failed to retrieve sample data:', sampleResponse);
        retryCount++;
        continue;
      }

      console.log('Calculation workflow completed successfully');
      const vectorList = sampleResponse.data.sampleData.vectorList;
      return vectorList;
    } catch (error) {
      console.error(`Error during calculation workflow (attempt ${retryCount + 1}):`, error);
      retryCount++;
    }
  }

  console.error(`All ${maxRetries} attempts to run calculation workflow failed`);
  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const { dataSetParams1, dataSetParams2 } = await req.json();
  const vectorList = await runCalculationWorkflow(
    'PROJ_20250323163915_2nW3f7wz',
    'ENV_20250323163915_8EJkp60z',
    'APP_20250325165219_xdyRVNhu',
    dataSetParams1,
    dataSetParams2,
  );
  return new Response(JSON.stringify(vectorList));
});
