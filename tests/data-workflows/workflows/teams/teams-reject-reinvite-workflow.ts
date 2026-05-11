import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  TEAMS_REJECT_REINVITE_DATA_WORKFLOW_HELP,
  parseTeamsRejectReinviteCliArgs,
  runTeamsRejectReinviteSmoke,
} from './teams-reject-reinvite-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseTeamsRejectReinviteCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(TEAMS_REJECT_REINVITE_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runTeamsRejectReinviteSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.teamId,
      dataType: 'team',
      passed: result.passed,
    });
  } else {
    console.log('Teams reject-reinvite data workflow');
    console.log(`Owner role: ${options.ownerRole}`);
    console.log(`Invitee role: ${options.inviteeRole}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Bootstrap create: ${result.bootstrapCreated ? 'yes' : 'no'}`);
    console.log(`Workspace file: ${result.workspaceFile}`);
    console.log(`Team ID: ${result.teamId}`);
    console.log(`Fixture file: ${options.dataFile}`);

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

    console.log(`Role after reject: ${result.rejectRole.role ?? '(missing)'}`);
    console.log(`Role after reinvite: ${result.reinviteRole.role ?? '(missing)'}`);
    console.log(
      `Notification after reject: ${result.rejectNotification.exists ? 'present' : 'cleared'}`,
    );
    console.log(
      `Notification after reinvite: ${result.reinviteNotification.exists ? 'present' : 'cleared'}`,
    );

    if (result.runtimeRecordWritten) {
      console.log(`Runtime record: ${result.runtimeRecordFile}`);
    } else {
      console.log('Runtime record: skipped');
    }
  }

  if (!result.passed) {
    throw new Error('Teams reject-reinvite data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Teams reject-reinvite data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
