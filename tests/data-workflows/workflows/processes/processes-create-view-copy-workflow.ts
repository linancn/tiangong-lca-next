import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  printExpectationResults,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  PROCESS_CREATE_VIEW_COPY_DATA_WORKFLOW_HELP,
  parseCreateViewCopyCliArgs,
  runProcessCreateViewCopySmoke,
} from './processes-create-view-copy-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseCreateViewCopyCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(PROCESS_CREATE_VIEW_COPY_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runProcessCreateViewCopySmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.copy.copiedId,
      dataType: 'process',
      passed: result.passed,
      version: result.copy.copiedVersion,
    });
  } else {
    console.log('Process create-view-copy data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Create fixture file: ${options.createDataFile}`);
    console.log(`Runtime source process ID: ${result.runtimeFixture.runtimeId}`);
    console.log(`Copied process ID: ${result.copy.copiedId}`);
    console.log(`Copied process version: ${result.copy.copiedVersion}`);
    console.log(
      `Create submitted rule_verification: ${String(result.createStep.submittedRuleVerification)}`,
    );
    console.log(
      `Copy submitted rule_verification: ${String(result.copy.submittedRuleVerification)}`,
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
    printExpectationResults(result.createStep.expectationResults, 'Create expectation');

    console.log('View-source step expectations:');
    printExpectationResults(result.sourceViewStep.expectationResults, 'View-source expectation');

    console.log('Copy step expectations:');
    printExpectationResults(result.copyStep.expectationResults, 'Copy expectation');

    console.log('View-copy step expectations:');
    printExpectationResults(result.viewCopyStep.expectationResults, 'View-copy expectation');

    console.log(
      `Copy comparable JSON match: ${result.copy.comparableJsonMatchesSource ? 'yes' : 'no'}`,
    );

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
    throw new Error('Process create-view-copy data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Process create-view-copy data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
