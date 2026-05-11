import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  TEAMS_CREATE_DATA_WORKFLOW_HELP,
  parseTeamsCreateCliArgs,
  runTeamsCreateSmoke,
} from './teams-create-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseTeamsCreateCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(TEAMS_CREATE_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runTeamsCreateSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.step.runtimeTeamId,
      dataType: 'team',
      passed: result.passed,
    });
  } else {
    console.log('Teams create data workflow');
    console.log(`Role: ${options.role}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Fixture file: ${options.dataFile}`);
    console.log(`Workspace file: ${result.workspaceFile}`);
    console.log(`Source team ID: ${result.step.fixture.teamId}`);
    console.log(`Runtime team ID: ${result.step.runtimeTeamId}`);

    if (result.frontendProbe.skipped) {
      console.log('Frontend probe: skipped');
    } else {
      console.log(
        `Frontend probe: ${result.frontendProbe.ok ? 'ok' : 'failed'} (${result.frontendProbe.status ?? 'n/a'} ${result.frontendProbe.statusText ?? ''})`.trim(),
      );
    }

    result.step.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log(`Owner role row: ${result.ownerRole.role ?? '(missing)'}`);

    if (result.runtimeRecordWritten) {
      console.log(`Runtime record: ${result.runtimeRecordFile}`);
    } else {
      console.log('Runtime record: skipped');
    }
  }

  if (!result.passed) {
    throw new Error('Teams create data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Teams create data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
