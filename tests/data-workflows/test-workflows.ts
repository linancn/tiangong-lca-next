import { spawn, type SpawnOptions } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const WORKFLOW_ROOT = path.join('tests', 'data-workflows', 'workflows');
const WORKFLOW_FILE_PATTERN = /^tests\/data-workflows\/workflows\/([^/]+)\/([^/]+)-workflow\.ts$/u;

export type WorkflowCommand = {
  command: string;
  scriptPath: string;
  selector: string;
};

export type WorkflowInvocation =
  | {
      kind: 'help';
    }
  | {
      kind: 'list';
    }
  | {
      command: WorkflowCommand;
      forwardedArgv: string[];
      kind: 'run';
    };

type SpawnedProcessLike = {
  once(event: 'error', listener: (error: Error) => void): void;
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
};

export type RunWorkflowCommandDependencies = {
  spawnImpl?: (
    command: string,
    args: readonly string[],
    options: SpawnOptions,
  ) => SpawnedProcessLike;
};

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join('/');
}

export function discoverWorkflowFilePaths(cwd = process.cwd(), relativeRoot = WORKFLOW_ROOT) {
  const absoluteRoot = path.resolve(cwd, relativeRoot);
  const workflowFilePaths: string[] = [];

  function walk(directoryPath: string) {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('-workflow.ts')) {
        workflowFilePaths.push(toPosixPath(path.relative(cwd, entryPath)));
      }
    }
  }

  walk(absoluteRoot);
  return workflowFilePaths.sort();
}

function workflowCommandFromPath(scriptPath: string) {
  const normalizedScriptPath = scriptPath.replace(/\\/gu, '/');
  const scriptMatch = normalizedScriptPath.match(WORKFLOW_FILE_PATTERN);

  if (!scriptMatch) {
    return undefined;
  }

  const [, scope, workflowName] = scriptMatch;
  const workflowPrefix = `${scope}-`;

  if (!workflowName.startsWith(workflowPrefix)) {
    return undefined;
  }

  const action = workflowName.slice(workflowPrefix.length);
  const selector = `${scope}:${action}`;

  return {
    command: `test:${selector}`,
    scriptPath: normalizedScriptPath,
    selector,
  };
}

export function buildWorkflowCommandRegistry(workflowFilePaths = discoverWorkflowFilePaths()) {
  const commands = workflowFilePaths
    .map(workflowCommandFromPath)
    .filter((command): command is WorkflowCommand => Boolean(command))
    .sort((left, right) => left.selector.localeCompare(right.selector));

  return new Map(commands.map((command) => [command.selector, command]));
}

function formatSelectorList(registry: Map<string, WorkflowCommand>) {
  return Array.from(registry.values())
    .map((command) => `  --${command.selector} (${command.scriptPath})`)
    .join('\n');
}

export function formatWorkflowRunnerHelp(registry: Map<string, WorkflowCommand>) {
  return `Data workflow test runner

Usage:
  npm run test:workflows -- --processes:create --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co --supabase-publishable-key <key>
  npm run test:workflows -- --processes:all --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co --supabase-publishable-key <key>
  npm run test:workflows -- --teams:all --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co --supabase-publishable-key <key>
  npm run test:workflows -- --list

Behavior:
  - Resolves --<workflow> to the matching workflow file
  - Forwards all remaining arguments to that workflow unchanged

Available workflow instructions:
${formatSelectorList(registry)}
`;
}

export function parseWorkflowInvocation(
  argv: string[],
  registry: Map<string, WorkflowCommand>,
): WorkflowInvocation {
  const selectorMatches = argv
    .map((arg, index) => {
      if (!arg.startsWith('--')) {
        return undefined;
      }

      const selector = arg.slice(2);
      const command = registry.get(selector);

      return command ? { command, index } : undefined;
    })
    .filter((match): match is { command: WorkflowCommand; index: number } => Boolean(match));

  if (selectorMatches.length > 1) {
    const selectors = selectorMatches.map((match) => `--${match.command.selector}`).join(', ');
    throw new Error(`Expected exactly one workflow instruction, received: ${selectors}`);
  }

  if (selectorMatches.length === 1) {
    const [selectorMatch] = selectorMatches;

    return {
      command: selectorMatch.command,
      forwardedArgv: argv.filter((_, index) => index !== selectorMatch.index),
      kind: 'run',
    };
  }

  if (argv.includes('--list')) {
    return {
      kind: 'list',
    };
  }

  if (argv.includes('--help') || argv.includes('-h')) {
    return {
      kind: 'help',
    };
  }

  const unknownWorkflowFlags = argv.filter(
    (arg) => arg.startsWith('--') && arg.slice(2).includes(':'),
  );

  if (unknownWorkflowFlags.length > 0) {
    throw new Error(`Unknown workflow instruction: ${unknownWorkflowFlags.join(', ')}`);
  }

  throw new Error('Missing workflow instruction. Pass one --<workflow> flag or use --list.');
}

export function runWorkflowCommand(
  command: WorkflowCommand,
  forwardedArgv: string[],
  dependencies: RunWorkflowCommandDependencies = {},
) {
  const spawnImpl =
    dependencies.spawnImpl ??
    ((childCommand: string, args: readonly string[], options: SpawnOptions) =>
      spawn(childCommand, args, options) as unknown as SpawnedProcessLike);
  const scriptPath = path.resolve(process.cwd(), command.scriptPath);

  return new Promise<number>((resolve, reject) => {
    const childProcess = spawnImpl(
      process.execPath,
      ['--import', 'tsx', scriptPath, ...forwardedArgv],
      {
        env: process.env,
        stdio: 'inherit',
      },
    );

    childProcess.once('error', reject);
    childProcess.once('exit', (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

export async function main(argv: string[] = process.argv.slice(2)) {
  const registry = buildWorkflowCommandRegistry();
  const invocation = parseWorkflowInvocation(argv, registry);

  if (invocation.kind === 'help') {
    console.log(formatWorkflowRunnerHelp(registry));
    return 0;
  }

  if (invocation.kind === 'list') {
    console.log(formatSelectorList(registry));
    return 0;
  }

  console.log(`Resolved --${invocation.command.selector} to ${invocation.command.scriptPath}`);
  return runWorkflowCommand(invocation.command, invocation.forwardedArgv);
}

if (require.main === module) {
  void main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
