import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  PROCESS_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP,
  parseProcessFullTextSearchCliArgs,
  runProcessFullTextSearchSmoke,
} from './processes-full-text-search-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseProcessFullTextSearchCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(PROCESS_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runProcessFullTextSearchSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.runtimeFixture.runtimeId,
      dataType: 'process full-text search',
      passed: result.passed,
      version: result.runtimeFixture.version,
    });
  } else {
    console.log('Process full-text-search data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Search fixture file: ${options.dataFile}`);
    console.log(`Seed fixture file: ${options.seedDataFile}`);
    console.log(`Runtime ID: ${result.runtimeFixture.runtimeId}`);
    console.log(`Runtime version: ${result.runtimeFixture.version}`);
    console.log(`Keep created data: ${options.keepData ? 'yes' : 'no'}`);
    console.log(`Write runtime record: ${options.writeRuntime ? 'yes' : 'no'}`);

    if (result.frontendProbe.skipped) {
      console.log('Frontend probe: skipped');
    } else {
      console.log(
        `Frontend probe: ${result.frontendProbe.ok ? 'ok' : 'failed'} (${result.frontendProbe.status ?? 'n/a'} ${result.frontendProbe.statusText ?? ''})`.trim(),
      );
    }

    result.queryResults.forEach((queryResult) => {
      console.log(
        `[${queryResult.success ? 'PASS' : 'FAIL'}] ${queryResult.label}: ${queryResult.count}/${queryResult.totalCount} matches`,
      );
    });

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
    throw new Error('Process full-text-search data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Process full-text-search data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
