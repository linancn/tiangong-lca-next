// This is the dynamic parameter for the average value calculation task

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
