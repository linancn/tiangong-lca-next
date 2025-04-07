import { supabase } from '@/services/supabase';

type DataSetParams = {
  dataSetInternalID: string;
  id: string;
  version: string;
};

// Utility function to avoid linter error with promise executors
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function runCalculationWorkflow(
  dataSetParams1: DataSetParams,
  dataSetParams2: DataSetParams,
) {
  const { data, error } = await supabase.functions.invoke('run_antchain_calculation', {
    method: 'POST',
    body: { dataSetParams1, dataSetParams2 },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Creates a calculation instance by invoking the create_calculation edge function
 *
 * @param dataSetParams1 Parameters for the first dataset
 * @param dataSetParams2 Parameters for the second dataset
 * @param projectId Optional project ID (defaults to the one in edge function)
 * @param envId Optional environment ID (defaults to the one in edge function)
 * @param appId Optional application ID (defaults to the one in edge function)
 * @returns The created calculation instance data
 */
export async function createCalculation(
  dataSetParams1: DataSetParams,
  dataSetParams2: DataSetParams,
  projectId?: string,
  envId?: string,
  appId?: string,
) {
  const { data, error } = await supabase.functions.invoke('create_calculation', {
    method: 'POST',
    body: {
      dataSetParams1,
      dataSetParams2,
      ...(projectId && { projectId }),
      ...(envId && { envId }),
      ...(appId && { appId }),
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Queries the status of a calculation instance
 *
 * @param instanceId The ID of the calculation instance
 * @param projectId Optional project ID
 * @param envId Optional environment ID
 * @returns The calculation status data
 */
export async function queryCalculationStatus(
  instanceId: string,
  projectId?: string,
  envId?: string,
) {
  const { data, error } = await supabase.functions.invoke('query_calculation_status', {
    method: 'POST',
    body: {
      instanceId,
      ...(projectId && { projectId }),
      ...(envId && { envId }),
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Retrieves the results of a completed calculation
 *
 * @param coDatasetId The dataset ID containing the results
 * @param limit Optional number of results to return (default: 20)
 * @returns The calculation results data
 */
export async function queryCalculationResults(coDatasetId: string, limit?: number) {
  const { data, error } = await supabase.functions.invoke('query_calculation_results', {
    method: 'POST',
    body: {
      coDatasetId,
      ...(limit !== undefined && { limit }),
    },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

const isMainModule = async () => {
  try {
    const { fileURLToPath } = await import('url');
    const { argv } = process;

    return argv[1] === fileURLToPath(import.meta.url);
  } catch (e) {
    return typeof require !== 'undefined' && require.main === module;
  }
};

async function runCompleteCalculationWorkflow() {
  const params1 = {
    dataSetInternalID: '0',
    id: '0352d09d-db26-4729-b207-2dcdf6c9a75b',
    version: '00.00.001',
  };
  const params2 = {
    dataSetInternalID: '0',
    id: '04650d44-4eb5-4d29-b70c-ce86bfdff684',
    version: '00.00.001',
  };

  try {
    // 步骤1: 创建计算任务
    console.log('创建计算任务...');
    const createResult = await createCalculation(params1, params2);
    console.log('计算任务创建结果:', createResult);

    if (!createResult.success) {
      throw new Error('创建计算任务失败');
    }

    const instanceId = createResult.instanceId;
    console.log('获得实例ID:', instanceId);

    // 步骤2: 轮询任务状态直到完成
    console.log('开始轮询任务状态...');
    let status;
    let isComplete = false;
    let coDatasetId;

    while (!isComplete) {
      try {
        status = await queryCalculationStatus(instanceId);
        console.log('当前状态:', status);
      } catch (error) {
        // 查询接口偶尔可能失败
        console.error('查询状态失败:', error);
        continue;
      }

      // 根据实际状态响应调整这个条件
      if (status.status === 'INSTANCE_COMPLETED') {
        isComplete = true;
        coDatasetId = status.coDatasetId;
      } else if (['FAILED', 'ERROR'].includes(status.status)) {
        throw new Error(`计算任务失败，状态: ${status.status}`);
      } else {
        console.log('任务进行中，10秒后重新检查...');
        // 等待10秒再检查
        await sleep(10000);
      }
    }
    console.log('coDatasetId:', coDatasetId);
    if (!coDatasetId) {
      throw new Error('状态响应中没有找到数据集ID');
    }

    // 步骤3: 获取计算结果
    console.log('获取计算结果...');
    const results = await queryCalculationResults(coDatasetId);
    console.log('最终结果:', results);
  } catch (error) {
    console.error('错误:', error);
  }
}

// 示例：在模块作为主程序运行时执行工作流
(async () => {
  if (await isMainModule()) {
    console.log('Running in Node.js environment');
    await runCompleteCalculationWorkflow();
  }
})().catch((err) => {
  console.error('执行错误:', err);
  process.exit(1);
});
// npx tsx src/services/antchain/api.ts

/*
// Examples for new functions:

// Example 1: Create a calculation instance
const createCalculationExample = async () => {
  const params1 = {
    dataSetInternalID: '0',
    id: '0352d09d-db26-4729-b207-2dcdf6c9a75b',
    version: '00.00.001',
  };
  const params2 = {
    dataSetInternalID: '0',
    id: '04650d44-4eb5-4d29-b70c-ce86bfdff684',
    version: '00.00.001',
  };
  try {
    const result = await createCalculation(params1, params2);
    console.log('Calculation instance created:', result);
    return result;
  } catch (error) {
    console.error('Error creating calculation:', error);
  }
};

// Example 2: Query calculation status
const queryStatusExample = async (instanceId: string) => {
  try {
    const status = await queryCalculationStatus(instanceId);
    console.log('Calculation status:', status);
    return status;
  } catch (error) {
    console.error('Error querying status:', error);
  }
};

// Example 3: Get calculation results
const getResultsExample = async (coDatasetId: string) => {
  try {
    const results = await queryCalculationResults(coDatasetId);
    console.log('Calculation results:', results);
    return results;
  } catch (error) {
    console.error('Error getting results:', error);
  }
};

// Full workflow example
const runFullWorkflowExample = async () => {
  try {
    // Step 1: Create calculation
    const params1 = {
      dataSetInternalID: '0',
      id: '0352d09d-db26-4729-b207-2dcdf6c9a75b',
      version: '00.00.001',
    };
    const params2 = {
      dataSetInternalID: '0',
      id: '04650d44-4eb5-4d29-b70c-ce86bfdff684',
      version: '00.00.001',
    };
    
    console.log('Creating calculation instance...');
    const createResult = await createCalculation(params1, params2);
    console.log('Calculation created:', createResult);
    
    if (!createResult.success) {
      throw new Error('Failed to create calculation instance');
    }
    
    const instanceId = createResult.instanceId;
    
    // Step 2: Poll for status until complete
    console.log('Polling for calculation status...');
    let status: any;
    let isComplete = false;
    
    // In a real application, you would implement proper polling with timeout
    // This is a simplified example
    while (!isComplete) {
      status = await queryCalculationStatus(instanceId);
      console.log('Current status:', status);
      
      // This condition needs to be adjusted based on the actual status response
      if (status.status === 'SUCCEEDED') {
        isComplete = true;
      } else if (['FAILED', 'ERROR'].includes(status.status)) {
        throw new Error(`Calculation failed with status: ${status.status}`);
      } else {
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Step 3: Retrieve results
    // The coDatasetId would typically come from the status response
    const coDatasetId = status.result?.coDatasetId;
    if (!coDatasetId) {
      throw new Error('No dataset ID found in the status response');
    }
    
    console.log('Retrieving calculation results...');
    const results = await queryCalculationResults(coDatasetId);
    console.log('Final results:', results);
    
    return results;
  } catch (error) {
    console.error('Error in workflow:', error);
  }
};
*/
