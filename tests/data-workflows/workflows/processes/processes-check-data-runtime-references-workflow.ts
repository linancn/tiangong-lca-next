import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  PROCESS_CHECK_DATA_RUNTIME_REFERENCES_DATA_WORKFLOW_HELP,
  parseCheckDataRuntimeReferencesCliArgs,
  runProcessCheckDataRuntimeReferencesSmoke,
} from './processes-check-data-runtime-references-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseCheckDataRuntimeReferencesCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(PROCESS_CHECK_DATA_RUNTIME_REFERENCES_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runProcessCheckDataRuntimeReferencesSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.processUpdateStep.record.id,
      dataType: 'process',
      passed: result.passed,
      version: result.processUpdateStep.record.version,
    });
  } else {
    console.log('Process check-data runtime-references data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Contact create fixture file: ${options.contactDataFile}`);
    console.log(`Contact check fixture file: ${options.contactCheckDataFile}`);
    console.log(`Source fixture file: ${options.sourceDataFile}`);
    console.log(`Source check fixture file: ${options.sourceCheckDataFile}`);
    console.log(`Flowproperty fixture file: ${options.flowpropertyDataFile}`);
    console.log(`Flowproperty check fixture file: ${options.flowpropertyCheckDataFile}`);
    console.log(`Flow fixture file: ${options.flowDataFile}`);
    console.log(`Flow check fixture file: ${options.flowCheckDataFile}`);
    console.log(`Process create fixture file: ${options.createDataFile}`);
    console.log(`Process check fixture file: ${options.checkDataFile}`);
    console.log(`Keep created data: ${options.keepData ? 'yes' : 'no'}`);
    console.log(`Write runtime record: ${options.writeRuntime ? 'yes' : 'no'}`);

    if (result.frontendProbe.skipped) {
      console.log('Frontend probe: skipped');
    } else {
      console.log(
        `Frontend probe: ${result.frontendProbe.ok ? 'ok' : 'failed'} (${result.frontendProbe.status ?? 'n/a'} ${result.frontendProbe.statusText ?? ''})`.trim(),
      );
    }

    console.log('Runtime datasets:');
    console.log(
      `- contact: ${result.runtimeDatasets.contact.runtimeId} @ ${result.runtimeDatasets.contact.version}`,
    );
    console.log(
      `- source: ${result.runtimeDatasets.source.runtimeId} @ ${result.runtimeDatasets.source.version}`,
    );
    console.log(
      `- flowproperty: ${result.runtimeDatasets.flowproperty.runtimeId} @ ${result.runtimeDatasets.flowproperty.version}`,
    );
    console.log(
      `- flow: ${result.runtimeDatasets.flow.runtimeId} @ ${result.runtimeDatasets.flow.version}`,
    );
    console.log(
      `- process: ${result.runtimeDatasets.process.runtimeId} @ ${result.runtimeDatasets.process.version}`,
    );

    console.log(`Computed datasetSdkValid: ${String(result.validation.datasetSdkValid)}`);
    console.log(`Computed ruleVerification: ${String(result.validation.ruleVerification)}`);
    console.log(`Computed unRuleVerification count: ${result.validation.unRuleVerificationCount}`);
    console.log(`Computed nonExistentRef count: ${result.validation.nonExistentRefCount}`);

    console.log('Contact create step expectations:');
    result.contactCreateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Contact check step expectations:');
    result.contactStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Source create step expectations:');
    result.sourceCreateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Source check step expectations:');
    result.sourceStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Flowproperty create step expectations:');
    result.flowpropertyCreateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Flowproperty check step expectations:');
    result.flowpropertyStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Flow create step expectations:');
    result.flowCreateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Flow check step expectations:');
    result.flowStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Process create step expectations:');
    result.processCreateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Process check step expectations:');
    result.processUpdateStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Process validation checkpoints:');
    result.processValidationCheckpoints.forEach((checkpoint) => {
      console.log(
        `- ${checkpoint.label}: ${checkpoint.validation.ruleVerification ? 'PASS' : 'FAIL'} | blocking=${checkpoint.actualBlockingDatasets.join(', ') || '(none)'}`,
      );
    });

    console.log('Process reference expectations:');
    result.referenceExpectationResults.forEach((expectation) => {
      console.log(
        `[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label} -> ${expectation.path}`,
      );
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
    throw new Error('Process check-data runtime-references data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Process check-data runtime-references data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
