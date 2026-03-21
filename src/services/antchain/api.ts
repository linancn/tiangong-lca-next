import { supabase } from '@/services/supabase';

type DataSetParams = {
  dataSetInternalID: string;
  id: string;
  version: string;
};

type AntchainLogger = Pick<Console, 'log' | 'error'>;
type MainModuleRuntime = {
  override?: string;
  argv1?: string;
  resolveCurrentFilePath?: () => Promise<string>;
  fallbackRequireMain?: () => boolean;
};
type AntchainWorkflowOptions = {
  params1?: DataSetParams;
  params2?: DataSetParams;
  createCalculationFn?: typeof createCalculation;
  queryCalculationStatusFn?: typeof queryCalculationStatus;
  queryCalculationResultsFn?: typeof queryCalculationResults;
  sleepFn?: typeof sleep;
  logger?: AntchainLogger;
  now?: () => number;
};
type AntchainCliEntryOptions = AntchainWorkflowOptions & {
  logger?: AntchainLogger;
  runWorkflowFn?: typeof runCompleteCalculationWorkflow;
};

// Utility function to avoid linter error with promise executors
export const sleep = (ms: number): Promise<void> =>
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

const FORCE_RUN_ENV_KEY = 'ANTCHAIN_CLI_FORCE_RUN';

export const isMainModule = async (runtime: MainModuleRuntime = {}) => {
  const override = runtime.override ?? process.env[FORCE_RUN_ENV_KEY];
  if (override === 'true') {
    return true;
  }
  if (override === 'false') {
    return false;
  }
  try {
    const argv1 = runtime.argv1 ?? process.argv[1];
    if (!runtime.resolveCurrentFilePath) {
      return typeof require !== 'undefined' && require.main === module;
    }
    const currentFilePath = await runtime.resolveCurrentFilePath();

    return argv1 === currentFilePath;
  } catch (e) {
    return runtime.fallbackRequireMain
      ? runtime.fallbackRequireMain()
      : typeof require !== 'undefined' && require.main === module;
  }
};

export async function runCompleteCalculationWorkflow(options: AntchainWorkflowOptions = {}) {
  const now = options.now ?? Date.now;
  const logger = options.logger ?? console;
  const createCalculationFn = options.createCalculationFn ?? createCalculation;
  const queryCalculationStatusFn = options.queryCalculationStatusFn ?? queryCalculationStatus;
  const queryCalculationResultsFn = options.queryCalculationResultsFn ?? queryCalculationResults;
  const sleepFn = options.sleepFn ?? sleep;
  const startTime = now();
  const params1 = options.params1 ?? {
    dataSetInternalID: '2',
    id: '2fbace5c-b2ff-4fd1-9162-04889ba12bca',
    version: '01.01.000',
  };
  const params2 = options.params2 ?? {
    dataSetInternalID: '2',
    id: '07c8922f-151c-4013-813a-f9e7a20a7fbe',
    version: '01.01.000',
  };

  const getTimestamp = () => new Date(now()).toLocaleTimeString();
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}min ${remainingSeconds}sec` : `${remainingSeconds}sec`;
  };

  const logSection = (title: string, startTime?: number) => {
    logger.log('\n' + '='.repeat(50));
    if (startTime) {
      const duration = formatDuration(now() - startTime);
      logger.log(`🕒 ${getTimestamp()} | ${title} | Duration: ${duration}`);
    } else {
      logger.log(`🕒 ${getTimestamp()} | ${title}`);
    }
    logger.log('='.repeat(50) + '\n');
  };

  try {
    // Step 1: Create calculation task
    const createStartTime = now();
    logSection('🚀 Starting Calculation Task');
    logger.log('🔑 Node 1 Data:', params1);
    logger.log('🔑 Node 2 Data:', params2);
    const createResult = await createCalculationFn(params1, params2);
    logger.log('📋 Creation Result:');
    logger.log(JSON.stringify(createResult, null, 2));
    logSection('✅ Task Creation Completed', createStartTime);

    if (!createResult.success) {
      throw new Error('❌ Failed to create calculation task');
    }

    const instanceId = createResult.instanceId;
    logger.log('🔑 Calculation Instance ID:', instanceId);

    // Step 2: Poll task status until completion
    const pollStartTime = now();
    logSection('🔄 Starting Status Polling');
    let status;
    let isComplete = false;
    let coDatasetId;
    let retryCount = 0;

    while (!isComplete) {
      try {
        status = await queryCalculationStatusFn(instanceId);
        logger.log(`📊 Check #${++retryCount} - Current Status:`);
        logger.log(JSON.stringify(status, null, 2));
      } catch (error) {
        logger.error('⚠️ Status Query Failed:', error);
        continue;
      }

      if (status.status === 'INSTANCE_COMPLETED') {
        isComplete = true;
        coDatasetId = status.coDatasetId;
        logSection('✅ Calculation Task Completed', pollStartTime);
        logger.log('📦 Dataset ID:', coDatasetId);
      } else if (['FAILED', 'ERROR'].includes(status.status)) {
        throw new Error(`❌ Calculation task failed, status: ${status.status}`);
      } else {
        logger.log('⏳ Task in progress, checking again in 10 seconds...\n');
        await sleepFn(10000);
      }
    }

    if (!coDatasetId) {
      throw new Error('❌ No dataset ID found in status response');
    }

    // Step 3: Retrieve calculation results
    const resultStartTime = now();
    logSection('📊 Retrieving Calculation Results');
    const results = await queryCalculationResultsFn(coDatasetId);
    logger.log('📋 Final Results:');
    logger.log(JSON.stringify(results, null, 2));

    if (results.success && results.data && results.data[0]?.valueList) {
      logSection('✨ Trusted Computation Results', resultStartTime);
      logger.log(JSON.stringify(results.data[0].valueList, null, 2));
    }

    // Output total duration
    const totalDuration = formatDuration(now() - startTime);
    logSection(`🏁 Task Execution Completed | Total Duration: ${totalDuration}`);
  } catch (error) {
    const errorDuration = formatDuration(now() - startTime);
    logSection(`❌ Error Occurred | Runtime: ${errorDuration}`);
    logger.error(error);
  }
}

export async function runAntchainCliEntry(
  runtime: MainModuleRuntime = {},
  options: AntchainCliEntryOptions = {},
) {
  const logger = options.logger ?? console;
  const runWorkflowFn = options.runWorkflowFn ?? runCompleteCalculationWorkflow;
  if (await isMainModule(runtime)) {
    logger.log('Running in Node.js environment');
    await runWorkflowFn({ ...options, logger });
  }
}

export function handleAntchainCliError(
  err: unknown,
  logger: Pick<Console, 'error'> = console,
  exitFn: (code: number) => void = process.exit,
) {
  logger.error('执行错误:', err);
  exitFn(1);
}

void runAntchainCliEntry().catch(handleAntchainCliError);
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
