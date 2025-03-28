import { supabase } from '@/services/supabase';

type DataSetParams = {
  dataSetInternalID: string;
  id: string;
  version: string;
};

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

const isMainModule = async () => {
  try {
    const { fileURLToPath } = await import('url');
    const { argv } = process;

    return argv[1] === fileURLToPath(import.meta.url);
  } catch (e) {
    return typeof require !== 'undefined' && require.main === module;
  }
};

// 示例
(async () => {
  if (await isMainModule()) {
    console.log('Running in Node.js environment');
    // console.log('example for createCalculateInstance');

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
      const result = await runCalculationWorkflow(params1, params2);
      console.log(result);
    } catch (error) {
      console.error('Error:', error);
    }
  }
})();
// npx tsx src/services/antchain/api.ts --envfile=.env.public
// result: [{"name":"average_value","type":"DOUBLE","valueList":[43.200668]}]
