import {
  LIFECYCLEMODEL_WORKFLOW_CONFIGS,
  runLifeCycleModelSmokeMain,
} from './lifecyclemodels-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  await runLifeCycleModelSmokeMain(LIFECYCLEMODEL_WORKFLOW_CONFIGS['create-contribute-team'], argv);
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
