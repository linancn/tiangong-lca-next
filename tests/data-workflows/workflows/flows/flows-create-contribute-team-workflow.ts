import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  FLOW_CREATE_CONTRIBUTE_TEAM_DATA_WORKFLOW_HELP,
  parseCreateContributeTeamCliArgs,
  runFlowCreateContributeTeamSmoke,
} from './flows-create-contribute-team-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseCreateContributeTeamCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(FLOW_CREATE_CONTRIBUTE_TEAM_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runFlowCreateContributeTeamSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.contributeStep.record.id,
      dataType: 'flow',
      passed: result.passed,
      version: result.contributeStep.record.version,
    });
  } else {
    console.log('Flow create-contribute-team data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Create fixture file: ${options.createDataFile}`);
    console.log(`Runtime flow ID: ${result.runtimeFixture.runtimeId}`);
    console.log(`Runtime flow version: ${result.runtimeFixture.version}`);
    console.log(`Current team ID: ${result.contribute.currentTeamId}`);
    console.log(
      `Create submitted rule_verification: ${String(result.createStep.submittedRuleVerification)}`,
    );
    console.log(`Contribute command: ${result.contribute.commandSucceeded ? 'ok' : 'failed'}`);
    console.log(`Contributed team_id: ${result.contributeStep.record.team_id ?? '(null)'}`);
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

    console.log('Contribute step expectations:');
    result.contributeStep.expectationResults.forEach((expectation) => {
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
    throw new Error('Flow create-contribute-team data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('Flow create-contribute-team data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
