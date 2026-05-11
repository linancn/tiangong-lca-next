import {
  extractDetailResultFlag,
  printCompactSmokeSummary,
  printDataWorkflowHelp,
  shouldPrintDetailedResult,
} from '../workflow-shared';
import {
  UNITGROUP_CREATE_VERSION_UPDATE_REFERENCE_DATA_WORKFLOW_HELP,
  parseCreateVersionUpdateReferenceCliArgs,
  runUnitGroupCreateVersionUpdateReferenceSmoke,
} from './unitgroups-create-version-update-reference-workflow-lib';

export async function main(argv: string[] = process.argv.slice(2)) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseCreateVersionUpdateReferenceCliArgs(detailResultState.argv);

  if (options.help) {
    printDataWorkflowHelp(UNITGROUP_CREATE_VERSION_UPDATE_REFERENCE_DATA_WORKFLOW_HELP);
    return;
  }

  const result = await runUnitGroupCreateVersionUpdateReferenceSmoke(options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: result.updateReferenceStep.record.id,
      dataType: 'unitgroup',
      passed: result.passed,
      version: result.updateReferenceStep.record.version,
    });
  } else {
    console.log('UnitGroup create-version-update-reference data workflow');
    console.log(`Role: ${result.selectedUser.role}`);
    console.log(`Account: ${result.selectedUser.email}`);
    console.log(`User ID: ${result.selectedUser.userId}`);
    console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
    console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
    console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
    console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
    console.log(`Fixture file: ${options.dataFile}`);
    console.log(`Runtime unit group ID: ${result.runtimeFixture.runtimeId}`);
    console.log(`Created versions: ${result.createdVersions.join(', ')}`);
    console.log(
      `Create submitted rule_verification: ${String(result.createStep.submittedRuleVerification)}`,
    );
    console.log(
      `Create-version submitted rule_verification: ${String(result.createVersionStep.submittedRuleVerification)}`,
    );
    console.log(
      `Update-reference submitted rule_verification: ${String(result.updateReferenceStep.submittedRuleVerification)}`,
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
    result.createStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Create-version step expectations:');
    result.createVersionStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log('Update-reference step expectations:');
    result.updateReferenceStep.expectationResults.forEach((expectation) => {
      console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
    });

    console.log(
      `Create-version comparable JSON match: ${result.versionCreation.comparableJsonMatchesCreate ? 'yes' : 'no'}`,
    );
    console.log(`Update-reference candidate count: ${result.referenceUpdate.availableNewRefCount}`);
    console.log(
      `Update-reference selected version: ${result.referenceUpdate.selectedNewRef?.newVersion ?? '(not found)'}`,
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
    throw new Error('UnitGroup create-version-update-reference data workflow failed.');
  }

  if (showDetailedResult) {
    console.log('UnitGroup create-version-update-reference data workflow passed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
