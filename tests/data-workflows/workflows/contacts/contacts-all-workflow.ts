import { spawn, type SpawnOptions } from 'node:child_process';
import path from 'node:path';

import { buildDataWorkflowHelpText } from '../workflow-shared';

export const CONTACT_DATA_WORKFLOWS = [
  {
    command: 'test:contacts:create',
    scriptPath: 'tests/data-workflows/workflows/contacts/contacts-create-workflow.ts',
  },
  {
    command: 'test:contacts:check-data',
    scriptPath: 'tests/data-workflows/workflows/contacts/contacts-check-data-workflow.ts',
  },
  {
    command: 'test:contacts:full-text-search',
    scriptPath: 'tests/data-workflows/workflows/contacts/contacts-full-text-search-workflow.ts',
  },
  {
    command: 'test:contacts:edit',
    scriptPath: 'tests/data-workflows/workflows/contacts/contacts-edit-workflow.ts',
  },
  {
    command: 'test:contacts:create-view-copy',
    scriptPath: 'tests/data-workflows/workflows/contacts/contacts-create-view-copy-workflow.ts',
  },
  {
    command: 'test:contacts:create-version-update-reference',
    scriptPath:
      'tests/data-workflows/workflows/contacts/contacts-create-version-update-reference-workflow.ts',
  },
  {
    command: 'test:contacts:create-contribute-team',
    scriptPath:
      'tests/data-workflows/workflows/contacts/contacts-create-contribute-team-workflow.ts',
  },
] as const;

export const CONTACT_ALL_DATA_WORKFLOW_HELP = `Contacts data workflow suite

Usage:
  npm run test:workflows -- --contacts:all --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co --supabase-publishable-key <key>
  npm run test:workflows -- --contacts:all --detail-result --no-keep-data

Behavior:
  - Runs all current contact data workflows sequentially
  - Forwards the same CLI arguments to every workflow
  - Continues after failures and prints a per-command summary at the end

Workflows:
  1. test:contacts:create
  2. test:contacts:check-data
  3. test:contacts:full-text-search
  4. test:contacts:edit
  5. test:contacts:create-view-copy
  6. test:contacts:create-version-update-reference
  7. test:contacts:create-contribute-team

Notes:
  - Prefer shared flags such as frontend/supabase/auth/output-control arguments.
  - Workflow-specific flags may not be supported by every command in this suite.
  - --help shows this suite help instead of running the workflows.
`;

type ContactDataWorkflow = (typeof CONTACT_DATA_WORKFLOWS)[number];

export type ContactDataWorkflowResult = {
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
  workflow: ContactDataWorkflow,
  argv: string[],
) => Promise<ContactDataWorkflowResult>;

type RunContactDataWorkflowDependencies = {
  now?: () => number;
  spawnImpl?: (
    command: string,
    args: readonly string[],
    options: SpawnOptions,
  ) => SpawnedProcessLike;
};

type RunAllContactSmokeTestsDependencies = {
  log?: (message: string) => void;
  runWorkflow?: WorkflowRunner;
};

export type ContactSmokeSuiteResult = {
  helpShown: boolean;
  passed: boolean;
  results: ContactDataWorkflowResult[];
};

function formatDuration(durationMs: number) {
  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  }

  return `${durationMs}ms`;
}

export function formatWorkflowResult(result: ContactDataWorkflowResult) {
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

export async function runContactDataWorkflow(
  workflow: ContactDataWorkflow,
  argv: string[],
  dependencies: RunContactDataWorkflowDependencies = {},
): Promise<ContactDataWorkflowResult> {
  const now = dependencies.now ?? Date.now;
  const spawnImpl =
    dependencies.spawnImpl ??
    ((command: string, args: readonly string[], options: SpawnOptions) =>
      spawn(command, args, options) as unknown as SpawnedProcessLike);
  const startedAt = now();
  const scriptPath = path.resolve(process.cwd(), workflow.scriptPath);
  const childArgs = ['--import', 'tsx', scriptPath, ...argv];

  return new Promise<ContactDataWorkflowResult>((resolve) => {
    let settled = false;

    const finalize = (result: Omit<ContactDataWorkflowResult, 'command' | 'durationMs'>) => {
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

export async function runAllContactSmokeTests(
  argv: string[] = process.argv.slice(2),
  dependencies: RunAllContactSmokeTestsDependencies = {},
): Promise<ContactSmokeSuiteResult> {
  const log = dependencies.log ?? console.log;
  const runWorkflow =
    dependencies.runWorkflow ??
    ((workflow, forwardedArgv) => runContactDataWorkflow(workflow, forwardedArgv));

  if (argv.includes('--help')) {
    log(buildDataWorkflowHelpText(CONTACT_ALL_DATA_WORKFLOW_HELP));
    return {
      helpShown: true,
      passed: true,
      results: [],
    };
  }

  const results: ContactDataWorkflowResult[] = [];

  log('Contacts data workflow suite');

  for (let index = 0; index < CONTACT_DATA_WORKFLOWS.length; index += 1) {
    const workflow = CONTACT_DATA_WORKFLOWS[index];

    if (index > 0) {
      log('');
    }

    log(`[${index + 1}/${CONTACT_DATA_WORKFLOWS.length}] ${workflow.command}`);

    try {
      const result = await runWorkflow(workflow, argv);
      results.push(result);
      log(`Command result: ${formatWorkflowResult(result)}`);
    } catch (error) {
      const failureResult: ContactDataWorkflowResult = {
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
  const result = await runAllContactSmokeTests(argv);

  if (!result.helpShown && !result.passed) {
    throw new Error('Contacts data workflow suite failed.');
  }
}

if (require.main === module) {
  void main().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
