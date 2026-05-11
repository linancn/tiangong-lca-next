import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  CONTACT_CREATE_DATA_WORKFLOW_HELP,
  parseCliArgs,
  runContactCreateSmoke,
} from './contacts-create-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(CONTACT_CREATE_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runContactCreateSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.record.id,
      dataType: 'contact',
      passed: result.passed,
      version: result.record.version,
    });
  } else {
    console.log('Contact create data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Fixture file: ${options.dataFile}`);
    console.log(`Fixture ID: ${result.runtimeFixture.fixture.id}`);
    console.log(`Source fixture ID: ${result.runtimeFixture.sourceFixtureId}`);
    console.log(`Runtime version: ${result.runtimeFixture.version}`);
    console.log(`Submitted rule_verification: ${String(result.submittedRuleVerification)}`);
    console.log(`Keep created data: ${options.keepData ? 'yes' : 'no'}`);
    console.log(`Write runtime record: ${options.writeRuntime ? 'yes' : 'no'}`);

    if (result.frontendProbe.skipped) {
      console.log('Frontend probe: skipped');
    } else {
      console.log(
        `Frontend probe: ${result.frontendProbe.ok ? 'ok' : 'failed'} (${result.frontendProbe.status ?? 'n/a'} ${result.frontendProbe.statusText ?? ''})`.trim(),
      );
    }

    result.expectationResults.forEach((expectation) => {
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
    throw new Error('Contact create data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Contact create data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
