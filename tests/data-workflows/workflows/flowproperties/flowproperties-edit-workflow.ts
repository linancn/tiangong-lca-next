import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  FLOWPROPERTY_EDIT_DATA_WORKFLOW_HELP,
  parseEditCliArgs,
  runFlowpropertyEditSmoke,
} from './flowproperties-edit-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseEditCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(FLOWPROPERTY_EDIT_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runFlowpropertyEditSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.failingEditStep.record.id,
      dataType: 'flowproperty',
      passed: result.passed,
      version: result.failingEditStep.record.version,
    });
  } else {
    console.log('Flowproperty edit data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Create fixture file: ${options.createDataFile}`);
    console.log(`Success edit fixture file: ${options.successDataFile}`);
    console.log(`Final edit fixture file: ${options.editDataFile}`);
    console.log(`Runtime flowproperty ID: ${result.runtimeFixture.runtimeId}`);
    console.log(`Runtime version: ${result.runtimeFixture.version}`);
    console.log(
      `Create submitted rule_verification: ${String(result.createStep.submittedRuleVerification)}`,
    );
    console.log(
      `Success edit submitted rule_verification: ${String(result.successEditStep.submittedRuleVerification)}`,
    );
    console.log(
      `Final edit submitted rule_verification: ${String(result.failingEditStep.submittedRuleVerification)}`,
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

    console.log('Create step expectations:');
    result.createStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Success edit validation summary:');
    console.log(`  datasetSdkValid=${String(result.successValidation.datasetSdkValid)}`);
    console.log(`  ruleVerification=${String(result.successValidation.ruleVerification)}`);
    console.log(`  unRuleVerificationCount=${result.successValidation.unRuleVerificationCount}`);
    console.log(`  nonExistentRefCount=${result.successValidation.nonExistentRefCount}`);

    console.log('Success edit expectations:');
    result.successEditStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Final edit validation summary:');
    console.log(`  datasetSdkValid=${String(result.failingValidation.datasetSdkValid)}`);
    console.log(`  ruleVerification=${String(result.failingValidation.ruleVerification)}`);
    console.log(`  unRuleVerificationCount=${result.failingValidation.unRuleVerificationCount}`);
    console.log(`  nonExistentRefCount=${result.failingValidation.nonExistentRefCount}`);

    console.log('Final edit expectations:');
    result.failingEditStep.expectationResults.forEach((expectation) => {
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
    throw new Error('Flowproperty edit data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Flowproperty edit data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
