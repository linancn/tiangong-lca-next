import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  FLOWPROPERTY_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP,
  parseFlowpropertyFullTextSearchCliArgs,
  runFlowpropertyFullTextSearchSmoke,
} from './flowproperties-full-text-search-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseFlowpropertyFullTextSearchCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(FLOWPROPERTY_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runFlowpropertyFullTextSearchSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.runtimeFixture.runtimeId,
      dataType: 'flow property full-text search',
      passed: result.passed,
      version: result.runtimeFixture.version,
    });
  } else {
    console.log('Flow property full-text-search data workflow');
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
    throw new Error('Flow property full-text-search data workflow failed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
