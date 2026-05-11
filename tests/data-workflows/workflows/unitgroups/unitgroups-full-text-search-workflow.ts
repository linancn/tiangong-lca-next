import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  UNITGROUP_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP,
  parseUnitgroupFullTextSearchCliArgs,
  runUnitgroupFullTextSearchSmoke,
} from './unitgroups-full-text-search-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseUnitgroupFullTextSearchCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(UNITGROUP_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runUnitgroupFullTextSearchSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.runtimeFixture.runtimeId,
      dataType: 'unit group full-text search',
      passed: result.passed,
      version: result.runtimeFixture.version,
    });
  } else {
    console.log('Unit group full-text-search data workflow');
    result.queryResults.forEach((queryResult) => {
      console.log(
        `[${queryResult.success ? 'PASS' : 'FAIL'}] ${queryResult.label}: ${queryResult.count}/${queryResult.totalCount} matches`,
      );
    });
    result.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });
    console.log(
      `Cleanup: ${result.cleanupAttempted ? (result.cleanupPassed ? 'ok' : 'failed') : 'skipped'}`,
    );
    console.log(
      `Runtime record: ${result.runtimeRecordWritten ? result.runtimeRecordFile : 'skipped'}`,
    );
  }

  if (!result.passed) {
    throw new Error('Unit group full-text-search data workflow failed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
