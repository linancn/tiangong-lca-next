import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  FLOWPROPERTY_CHECK_DATA_WORKFLOW_HELP,
  parseCheckDataCliArgs,
  runFlowpropertyCheckDataSmoke,
} from './flowproperties-check-data-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseCheckDataCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(FLOWPROPERTY_CHECK_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runFlowpropertyCheckDataSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.updateStep.record.id,
      dataType: 'flowproperty',
      passed: result.passed,
      version: result.updateStep.record.version,
    });
  } else {
    console.log('Flowproperty check-data data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Create fixture file: ${options.createDataFile}`);
    console.log(`Check fixture file: ${options.checkDataFile}`);
    console.log(`Runtime flowproperty ID: ${result.runtimeFixture.runtimeId}`);
    console.log(`Runtime version: ${result.runtimeFixture.version}`);
    console.log(
      `Create submitted rule_verification: ${String(result.createStep.submittedRuleVerification)}`,
    );
    console.log(
      `Update submitted rule_verification: ${String(result.updateStep.submittedRuleVerification)}`,
    );
    console.log(`Keep created data: ${options.keepData ? 'yes' : 'no'}`);
    console.log(`Write runtime record: ${options.writeRuntime ? 'yes' : 'no'}`);

    if (result.frontendProbe.skipped) {
      console.log('Frontend probe: skipped');
    } else {
      console.log(
        `Frontend probe: ${result.frontendProbe.ok ? 'ok' : 'failed'} (${result.frontendProbe.status ?? 'n/a'} ${result.frontendProbe.statusText ?? ''})`.trim(),
      );
    }

    console.log(`Computed datasetSdkValid: ${String(result.validation.datasetSdkValid)}`);
    console.log(`Computed ruleVerification: ${String(result.validation.ruleVerification)}`);
    console.log(`Computed unRuleVerification count: ${result.validation.unRuleVerificationCount}`);
    console.log(`Computed nonExistentRef count: ${result.validation.nonExistentRefCount}`);

    console.log('Create step expectations:');
    result.createStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Check step expectations:');
    result.updateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    if (result.cleanupAttempted) {
      console.log(`Cleanup: ${result.cleanupPassed ? 'ok' : 'failed'}`);
    } else {
      console.log('Cleanup: skipped');
    }

    if (result.runtimeRecordWritten) {
      console.log(`Runtime record: ${result.runtimeRecordFile}`);
    } else {
      console.log('Runtime record: skipped');
    }
  }

  if (!result.passed) {
    throw new Error('Flowproperty check-data data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Flowproperty check-data data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
