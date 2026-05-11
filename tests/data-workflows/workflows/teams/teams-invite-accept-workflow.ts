import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  TEAMS_INVITE_ACCEPT_DATA_WORKFLOW_HELP,
  parseTeamsInviteAcceptCliArgs,
  runTeamsInviteAcceptSmoke,
} from './teams-invite-accept-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseTeamsInviteAcceptCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(TEAMS_INVITE_ACCEPT_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runTeamsInviteAcceptSmoke(options);
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
    console.log('Teams invite-accept data workflow');
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

    console.log(`Role after invite: ${result.inviteeRoleAfterInvite.role ?? '(missing)'}`);
    console.log(`Role after accept: ${result.inviteeRoleAfterAccept.role ?? '(missing)'}`);
    console.log(
      `Notification after accept: ${result.inviteeNotificationAfterAccept.exists ? 'present' : 'cleared'}`,
    );
    console.log(
      `Member list role after accept: ${result.memberListRoleAfterAccept.role ?? '(missing)'}`,
    );

    if (result.runtimeRecordWritten) {
      console.log(`Runtime record: ${result.runtimeRecordFile}`);
    } else {
      console.log('Runtime record: skipped');
    }
  }

  if (!result.passed) {
    throw new Error('Teams invite-accept data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Teams invite-accept data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
