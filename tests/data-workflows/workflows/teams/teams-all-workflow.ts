import { spawn, type SpawnOptions } from 'node:child_process';
import path from 'node:path';

import { buildDataWorkflowHelpText } from '../workflow-shared';

export const TEAM_DATA_WORKFLOWS = [
  {
    command: 'test:teams:create',
    scriptPath: 'tests/data-workflows/workflows/teams/teams-create-workflow.ts',
  },
  {
    command: 'test:teams:edit',
    scriptPath: 'tests/data-workflows/workflows/teams/teams-edit-workflow.ts',
  },
  {
    command: 'test:teams:reject-reinvite',
    scriptPath: 'tests/data-workflows/workflows/teams/teams-reject-reinvite-workflow.ts',
  },
  {
    command: 'test:teams:member-role',
    scriptPath: 'tests/data-workflows/workflows/teams/teams-member-role-workflow.ts',
  },
  {
    command: 'test:teams:invite-accept',
    scriptPath: 'tests/data-workflows/workflows/teams/teams-invite-accept-workflow.ts',
  },
  {
    command: 'test:teams:homepage-rank',
    scriptPath: 'tests/data-workflows/workflows/teams/teams-homepage-rank-workflow.ts',
  },
] as const;

export const TEAM_ALL_DATA_WORKFLOW_HELP = `Teams data workflow suite

Usage:
  npm run test:teams:all -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co --supabase-publishable-key <key>
  npm run test:teams:all -- --detail-result --no-write-runtime

Behavior:
  - Runs all current team data workflows sequentially
  - Forwards the same CLI arguments to every workflow
  - Continues after failures and prints a per-command summary at the end

Workflows:
  1. test:teams:create
  2. test:teams:edit
  3. test:teams:reject-reinvite
  4. test:teams:member-role
  5. test:teams:invite-accept
  6. test:teams:homepage-rank

Notes:
  - Prefer shared flags such as frontend/supabase/auth/output-control arguments.
  - Workflow-specific flags may not be supported by every command in this suite.
  - --help shows this suite help instead of running the workflows.
`;

type TeamDataWorkflow = (typeof TEAM_DATA_WORKFLOWS)[number];

export type TeamDataWorkflowResult = {
  command: string;
  durationMs: number;
  errorMessage?: string;
  exitCode: number | null;
  passed: boolean;
  signal: NodeJS.Signals | null;
};

type SpawnedProcessLike = {
  once(event: 'error', listener: (error: Error) => void): void;
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
};

type WorkflowRunner = (
  workflow: TeamDataWorkflow,
  argv: string[],
) => Promise<TeamDataWorkflowResult>;

type RunTeamDataWorkflowDependencies = {
  now?: () => number;
  spawnImpl?: (
    command: string,
    args: readonly string[],
    options: SpawnOptions,
  ) => SpawnedProcessLike;
};

type RunAllTeamSmokeTestsDependencies = {
  log?: (message: string) => void;
  runWorkflow?: WorkflowRunner;
};

export type TeamSmokeSuiteResult = {
  helpShown: boolean;
  passed: boolean;
  results: TeamDataWorkflowResult[];
};

function formatDuration(durationMs: number) {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }

  return `${durationMs}ms`;
}

export function formatWorkflowResult(result: TeamDataWorkflowResult) {
  const summaryParts = [
    `${result.command}: ${result.passed ? 'success' : 'failure'}`,
    `duration ${formatDuration(result.durationMs)}`,
  ];

  if (result.exitCode !== null) {
    summaryParts.push(`exit code ${result.exitCode}`);
  }

  if (result.signal) {
    summaryParts.push(`signal ${result.signal}`);
  }

  if (result.errorMessage) {
    summaryParts.push(result.errorMessage);
  }

  return summaryParts.join(' | ');
}

export async function runTeamDataWorkflow(
  workflow: TeamDataWorkflow,
  argv: string[],
  dependencies: RunTeamDataWorkflowDependencies = {},
): Promise<TeamDataWorkflowResult> {
  const now = dependencies.now ?? Date.now;
  const spawnImpl =
    dependencies.spawnImpl ??
    ((command: string, args: readonly string[], options: SpawnOptions) =>
      spawn(command, args, options) as unknown as SpawnedProcessLike);
  const startedAt = now();
  const scriptPath = path.resolve(process.cwd(), workflow.scriptPath);
  const childArgs = ['--import', 'tsx', scriptPath, ...argv];

  return new Promise<TeamDataWorkflowResult>((resolve) => {
    let settled = false;

    const finalize = (result: Omit<TeamDataWorkflowResult, 'command' | 'durationMs'>) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({
        command: workflow.command,
        durationMs: now() - startedAt,
        ...result,
      });
    };

    const childProcess = spawnImpl(process.execPath, childArgs, {
      env: process.env,
      stdio: 'inherit',
    });

    childProcess.once('error', (error: Error) => {
      finalize({
        errorMessage: error.message,
        exitCode: null,
        passed: false,
        signal: null,
      });
    });

    childProcess.once('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      finalize({
        exitCode: code,
        passed: code === 0 && signal === null,
        signal,
      });
    });
  });
}

export async function runAllTeamSmokeTests(
  argv: string[] = process.argv.slice(2),
  dependencies: RunAllTeamSmokeTestsDependencies = {},
): Promise<TeamSmokeSuiteResult> {
  const log = dependencies.log ?? console.log;
  const runWorkflow =
    dependencies.runWorkflow ??
    ((workflow, forwardedArgv) => runTeamDataWorkflow(workflow, forwardedArgv));

  if (argv.includes('--help')) {
    log(buildDataWorkflowHelpText(TEAM_ALL_DATA_WORKFLOW_HELP));
    return {
      helpShown: true,
      passed: true,
      results: [],
    };
  }

  const results: TeamDataWorkflowResult[] = [];

  log('Teams data workflow suite');

  for (let index = 0; index < TEAM_DATA_WORKFLOWS.length; index += 1) {
    const workflow = TEAM_DATA_WORKFLOWS[index];

    if (index > 0) {
      log('');
    }

    log(`[${index + 1}/${TEAM_DATA_WORKFLOWS.length}] ${workflow.command}`);

    try {
      const result = await runWorkflow(workflow, argv);
      results.push(result);
      log(`Command result: ${formatWorkflowResult(result)}`);
    } catch (error) {
      const failureResult: TeamDataWorkflowResult = {
        command: workflow.command,
        durationMs: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
        exitCode: null,
        passed: false,
        signal: null,
      };

      results.push(failureResult);
      log(`Command result: ${formatWorkflowResult(failureResult)}`);
    }
  }

  const passed = results.every((result) => result.passed);

  log('');
  log('Summary:');
  results.forEach((result) => {
    log(`- ${formatWorkflowResult(result)}`);
  });
  log(`Overall result: ${passed ? 'success' : 'failure'}`);

  return {
    helpShown: false,
    passed,
    results,
  };
}

export async function main(argv: string[] = process.argv.slice(2)) {
  const result = await runAllTeamSmokeTests(argv);

  if (!result.helpShown && !result.passed) {
    throw new Error('Teams data workflow suite failed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
