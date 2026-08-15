#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');

const SCHEMA_VERSION = 'tiangong.next.release-automation.v1';
const DEFAULT_REPOSITORY = 'linancn/tiangong-lca-next';
const DEFAULT_CANONICAL_REMOTE = 'origin';
const DEFAULT_PUSH_REMOTE = 'fork';
const DEFAULT_LOG_DIRECTORY = '.local/release-automation';
const TRANSPORT_RECEIPT_PATH = '.local/prepush-gate/failed-transport-receipt.json';
const RELEASE_MARKER_PREFIX = 'tiangong-next-release-automation:v2';
const MAX_CAPTURE_BYTES = 64 * 1024 * 1024;
const MAIN_SEMANTIC_BRANCH_PATTERN = /^(?:codex\/)?(?:hotfix|promote|release)(?:\/|-)/u;
const PROMOTION_BRANCH_PATTERN = /^(?:codex\/)?promote(?:\/|-)/u;
const MAX_DOCPACT_REVIEW_ROUNDS = 5;
const LOCAL_GIT_ENVIRONMENT_KEYS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
];

const EXIT = Object.freeze({
  usage: 2,
  precondition: 10,
  drift: 20,
  gate: 30,
  external: 40,
});

class ReleaseAutomationError extends Error {
  constructor(
    code,
    message,
    { exitCode = EXIT.precondition, details = {}, nextAction = null } = {},
  ) {
    super(message);
    this.name = 'ReleaseAutomationError';
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
    this.nextAction = nextAction;
  }
}

function truncate(value, maximum = 2000) {
  const text = String(value ?? '').trim();
  return text.length <= maximum ? text : `${text.slice(0, maximum)}…`;
}

function run(command, args, { cwd, allowFailure = false, env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: MAX_CAPTURE_BYTES,
    env,
  });
  if (result.error) {
    throw new ReleaseAutomationError('command_unavailable', `${command} could not be executed.`, {
      exitCode: EXIT.external,
      details: { command, reason: result.error.message },
      nextAction: `Install or repair ${command}, then rerun the same command.`,
    });
  }
  if (result.status !== 0 && !allowFailure) {
    throw new ReleaseAutomationError('command_failed', `${command} ${args.join(' ')} failed.`, {
      exitCode: EXIT.external,
      details: {
        command: [command, ...args],
        exit_code: result.status,
        stderr: truncate(result.stderr || result.stdout),
      },
    });
  }
  return result;
}

function appendLogHeader(logFile, command, args) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] ${[command, ...args].join(' ')}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(logFile, 0o600);
}

function runLogged(command, args, { cwd, logFile }) {
  appendLogHeader(logFile, command, args);
  const descriptor = fs.openSync(logFile, 'a', 0o600);
  try {
    const result = spawnSync(command, args, {
      cwd,
      stdio: ['ignore', descriptor, descriptor],
      env: process.env,
    });
    if (result.error) {
      throw new ReleaseAutomationError('command_unavailable', `${command} could not be executed.`, {
        exitCode: EXIT.external,
        details: { command, reason: result.error.message, log_path: logFile },
      });
    }
    return result;
  } finally {
    fs.closeSync(descriptor);
  }
}

function git(root, args, options = {}) {
  const environment = { ...process.env };
  LOCAL_GIT_ENVIRONMENT_KEYS.forEach((key) => delete environment[key]);
  return run('git', args, { cwd: root, env: environment, ...options });
}

function gh(root, args, options = {}) {
  return run('gh', args, { cwd: root, ...options });
}

function parseJsonOutput(result, description) {
  try {
    return JSON.parse(result.stdout || 'null');
  } catch (error) {
    throw new ReleaseAutomationError(
      'invalid_external_json',
      `${description} returned invalid JSON.`,
      {
        exitCode: EXIT.external,
        details: { reason: error.message, output: truncate(result.stdout) },
      },
    );
  }
}

function repositoryRoot(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']).stdout.trim();
}

function assertClean(root) {
  const status = worktreeStatus(root);
  if (status) {
    throw new ReleaseAutomationError(
      'worktree_not_clean',
      'The repository worktree is not clean.',
      {
        details: { changed_paths: status.split(/\r?\n/u).slice(0, 20) },
        nextAction: 'Commit, stash, or remove the listed changes, then rerun the command.',
      },
    );
  }
}

function worktreeStatus(root) {
  return git(root, ['status', '--porcelain=v1', '--untracked-files=all']).stdout.replace(
    /\r?\n$/u,
    '',
  );
}

function branchHasMainSemantics(branch) {
  return MAIN_SEMANTIC_BRANCH_PATTERN.test(branch);
}

function validateBranch(root, branch, command) {
  const validation = git(root, ['check-ref-format', '--branch', branch], { allowFailure: true });
  if (validation.status !== 0) {
    throw new ReleaseAutomationError('invalid_branch', '--branch is not a valid Git branch name.', {
      exitCode: EXIT.usage,
      details: { branch },
    });
  }
  if (command === 'release-to-dev' && branchHasMainSemantics(branch)) {
    throw new ReleaseAutomationError(
      'release_branch_has_main_semantics',
      'The release-to-dev branch name would select the main release gate.',
      {
        exitCode: EXIT.usage,
        details: { branch },
        nextAction: 'Use the deterministic default branch or another non-release-semantic branch.',
      },
    );
  }
  if (command === 'promote-dev-to-main' && !PROMOTION_BRANCH_PATTERN.test(branch)) {
    throw new ReleaseAutomationError(
      'promotion_branch_lacks_main_semantics',
      'The promotion branch name would not select the main release gate.',
      {
        exitCode: EXIT.usage,
        details: { branch },
        nextAction: 'Use the deterministic default branch or a promote/... branch.',
      },
    );
  }
}

function resolveLogFile(root, configuredDirectory, fileName) {
  const directory = path.resolve(root, configuredDirectory);
  const relativeDirectory = path.relative(root, directory);
  if (
    !relativeDirectory ||
    relativeDirectory === '..' ||
    relativeDirectory.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeDirectory)
  ) {
    throw new ReleaseAutomationError(
      'invalid_log_directory',
      '--log-dir must resolve to a directory inside the repository.',
      {
        exitCode: EXIT.usage,
        details: { log_directory: configuredDirectory },
      },
    );
  }
  return path.join(directory, fileName);
}

function parseStableVersion(value, label) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(String(value ?? ''));
  if (!match) {
    throw new ReleaseAutomationError(
      'invalid_version',
      `${label} must be a stable x.y.z version.`,
      {
        exitCode: EXIT.usage,
        details: { value },
        nextAction: 'Pass a stable version such as --version 0.0.67.',
      },
    );
  }
  return { text: match[0], parts: match.slice(1).map(Number) };
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.parts[index] !== right.parts[index]) return left.parts[index] - right.parts[index];
  }
  return 0;
}

function parsePositiveInteger(value, label) {
  if (!/^[1-9]\d*$/u.test(String(value ?? ''))) {
    throw new ReleaseAutomationError('invalid_identifier', `${label} must be a positive integer.`, {
      exitCode: EXIT.usage,
      details: { value },
    });
  }
  return Number(value);
}

function parseArguments(argv, command) {
  const options = {
    apply: false,
    format: 'json',
    repository: DEFAULT_REPOSITORY,
    remote: DEFAULT_CANONICAL_REMOTE,
    pushRemote: DEFAULT_PUSH_REMOTE,
    logDirectory: DEFAULT_LOG_DIRECTORY,
    help: false,
  };
  let mutationModeSeen = null;
  const valueFlags = new Map([
    ['--repo', 'repository'],
    ['--remote', 'remote'],
    ['--push-remote', 'pushRemote'],
    ['--head-owner', 'headOwner'],
    ['--branch', 'branch'],
    ['--format', 'format'],
    ['--log-dir', 'logDirectory'],
    ['--issue', 'issue'],
    ['--version', 'version'],
    ['--release-pr', 'releasePr'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--apply' || argument === '--dry-run') {
      if (mutationModeSeen && mutationModeSeen !== argument) {
        throw new ReleaseAutomationError(
          'conflicting_modes',
          '--apply and --dry-run cannot be combined.',
          {
            exitCode: EXIT.usage,
          },
        );
      }
      mutationModeSeen = argument;
      options.apply = argument === '--apply';
      continue;
    }
    const key = valueFlags.get(argument);
    if (!key) {
      throw new ReleaseAutomationError('unknown_argument', `Unsupported argument: ${argument}`, {
        exitCode: EXIT.usage,
        nextAction: 'Run the command with --help to inspect supported arguments.',
      });
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new ReleaseAutomationError('missing_argument_value', `${argument} requires a value.`, {
        exitCode: EXIT.usage,
      });
    }
    options[key] = value;
    index += 1;
  }

  if (!['json', 'human'].includes(options.format)) {
    throw new ReleaseAutomationError('invalid_format', '--format must be json or human.', {
      exitCode: EXIT.usage,
    });
  }
  if (!options.help) {
    options.issue = parsePositiveInteger(options.issue, '--issue');
    if (command === 'release-to-dev') {
      if (options.releasePr !== undefined) {
        throw new ReleaseAutomationError(
          'irrelevant_argument',
          '--release-pr is only valid for promote-dev-to-main.',
          { exitCode: EXIT.usage },
        );
      }
      options.version = parseStableVersion(options.version, '--version').text;
    } else {
      if (options.version !== undefined) {
        throw new ReleaseAutomationError(
          'irrelevant_argument',
          '--version is only valid for release-to-dev.',
          { exitCode: EXIT.usage },
        );
      }
      options.releasePr = parsePositiveInteger(options.releasePr, '--release-pr');
    }
  }
  return options;
}

function readJson(filePath, description) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new ReleaseAutomationError(
      'invalid_repository_file',
      `${description} is missing or invalid.`,
      {
        details: { path: filePath, reason: error.message },
      },
    );
  }
}

function versionsFromDocuments(packageJson, packageLock, source) {
  const values = {
    package_json: packageJson.version,
    package_lock: packageLock.version,
    package_lock_root: packageLock.packages?.['']?.version,
  };
  if (!values.package_json || new Set(Object.values(values)).size !== 1) {
    throw new ReleaseAutomationError(
      'version_fields_mismatch',
      `Version fields do not agree in ${source}.`,
      {
        details: { source, versions: values },
        nextAction:
          'Repair package.json and both package-lock.json root version fields before continuing.',
      },
    );
  }
  parseStableVersion(values.package_json, `${source} version`);
  return { version: values.package_json, fields: values };
}

function readVersionsAtRef(root, ref) {
  const packageJson = JSON.parse(git(root, ['show', `${ref}:package.json`]).stdout);
  const packageLock = JSON.parse(git(root, ['show', `${ref}:package-lock.json`]).stdout);
  return versionsFromDocuments(packageJson, packageLock, ref);
}

function readGithubJsonFile(root, repository, ref, filePath) {
  const endpoint = `repos/${repository}/contents/${filePath}?ref=${encodeURIComponent(ref)}`;
  let payload = parseJsonOutput(gh(root, ['api', endpoint]), `GitHub ${filePath}`);
  if (payload.encoding === 'none' && /^[0-9a-f]{40}$/u.test(payload.sha || '')) {
    payload = parseJsonOutput(
      gh(root, ['api', `repos/${repository}/git/blobs/${payload.sha}`]),
      `GitHub ${filePath} blob`,
    );
  }
  if (payload.encoding !== 'base64' || typeof payload.content !== 'string') {
    throw new ReleaseAutomationError(
      'unsupported_github_content',
      `GitHub returned unsupported ${filePath} content.`,
      {
        exitCode: EXIT.external,
        details: { file: filePath, encoding: payload.encoding ?? null },
      },
    );
  }
  try {
    return JSON.parse(Buffer.from(payload.content.replace(/\s/gu, ''), 'base64').toString('utf8'));
  } catch (error) {
    throw new ReleaseAutomationError(
      'invalid_github_content',
      `GitHub ${filePath} is invalid JSON.`,
      {
        exitCode: EXIT.external,
        details: { file: filePath, reason: error.message },
      },
    );
  }
}

function readGithubVersions(root, repository, ref) {
  return versionsFromDocuments(
    readGithubJsonFile(root, repository, ref, 'package.json'),
    readGithubJsonFile(root, repository, ref, 'package-lock.json'),
    `${repository}@${ref}`,
  );
}

function writeVersionFiles(root, version) {
  const packagePath = path.join(root, 'package.json');
  const lockPath = path.join(root, 'package-lock.json');
  const packageJson = readJson(packagePath, 'package.json');
  const packageLock = readJson(lockPath, 'package-lock.json');
  packageJson.version = version;
  packageLock.version = version;
  if (!packageLock.packages || !packageLock.packages['']) {
    throw new ReleaseAutomationError(
      'package_lock_root_missing',
      'package-lock.json has no root package entry.',
    );
  }
  packageLock.packages[''].version = version;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  fs.writeFileSync(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

function jsonAtRef(root, ref, filePath) {
  try {
    return JSON.parse(git(root, ['show', `${ref}:${filePath}`]).stdout);
  } catch (error) {
    throw new ReleaseAutomationError(
      'invalid_release_base_file',
      `${filePath} is missing or invalid at the release base.`,
      {
        exitCode: EXIT.drift,
        details: { ref, file: filePath, reason: error.message },
      },
    );
  }
}

function changedPathsSince(root, baseRef) {
  const tracked = git(root, ['diff', '--name-only', '--diff-filter=ACMRTUXB', baseRef, '--'])
    .stdout.trim()
    .split(/\r?\n/u)
    .filter(Boolean);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard'])
    .stdout.trim()
    .split(/\r?\n/u)
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked])];
}

function changedPathsBetween(root, baseRef, headRef) {
  return git(root, ['diff', '--name-only', '--diff-filter=ACMRTUXB', baseRef, headRef, '--'])
    .stdout.trim()
    .split(/\r?\n/u)
    .filter(Boolean);
}

function withoutReviewMetadata(source) {
  return String(source)
    .split(/\r?\n/u)
    .filter((line) => !/^lastReviewed(?:At|Commit):/u.test(line))
    .join('\n');
}

function reviewCommitFromDocument(source) {
  const match = /^lastReviewedCommit:\s*['"]?([0-9a-f]{40})['"]?\s*$/mu.exec(source);
  return match?.[1] ?? null;
}

function assertReleaseCandidateScope(root, baseRef, targetVersion) {
  const changedPaths = changedPathsSince(root, baseRef);
  const requiredVersionPaths = ['package.json', 'package-lock.json'];
  if (
    changedPaths.length < requiredVersionPaths.length ||
    requiredVersionPaths.some((filePath) => !changedPaths.includes(filePath))
  ) {
    throw new ReleaseAutomationError(
      'release_candidate_not_version_only',
      'The release candidate must change both package version files.',
      {
        exitCode: EXIT.drift,
        details: { base_ref: baseRef, changed_paths: changedPaths },
      },
    );
  }

  const basePackage = jsonAtRef(root, baseRef, 'package.json');
  const baseLock = jsonAtRef(root, baseRef, 'package-lock.json');
  const candidatePackage = readJson(path.join(root, 'package.json'), 'package.json');
  const candidateLock = readJson(path.join(root, 'package-lock.json'), 'package-lock.json');
  const candidateVersions = versionsFromDocuments(
    candidatePackage,
    candidateLock,
    'release candidate',
  );
  if (candidateVersions.version !== targetVersion) {
    throw new ReleaseAutomationError(
      'release_candidate_version_mismatch',
      'The release candidate version does not match the requested version.',
      {
        exitCode: EXIT.drift,
        details: { expected: targetVersion, actual: candidateVersions.version },
      },
    );
  }

  const normalizedPackage = JSON.parse(JSON.stringify(candidatePackage));
  const normalizedLock = JSON.parse(JSON.stringify(candidateLock));
  normalizedPackage.version = basePackage.version;
  normalizedLock.version = baseLock.version;
  if (!normalizedLock.packages?.[''] || !baseLock.packages?.['']) {
    throw new ReleaseAutomationError(
      'package_lock_root_missing',
      'package-lock.json has no root package entry.',
    );
  }
  normalizedLock.packages[''].version = baseLock.packages[''].version;
  if (
    !isDeepStrictEqual(normalizedPackage, basePackage) ||
    !isDeepStrictEqual(normalizedLock, baseLock)
  ) {
    throw new ReleaseAutomationError(
      'release_candidate_contains_semantic_changes',
      'The release candidate changes package content beyond the three root version fields.',
      {
        exitCode: EXIT.drift,
        details: { base_ref: baseRef },
        nextAction:
          'Move dependency or package metadata changes to a separately reviewed feature PR.',
      },
    );
  }

  const reviewPaths = changedPaths.filter((filePath) => !requiredVersionPaths.includes(filePath));
  for (const filePath of reviewPaths) {
    if (!/\.(?:md|ya?ml)$/u.test(filePath)) {
      throw new ReleaseAutomationError(
        'release_candidate_contains_non_review_changes',
        'The release candidate contains a non-document change outside the version files.',
        {
          exitCode: EXIT.drift,
          details: { path: filePath, changed_paths: changedPaths },
        },
      );
    }
    const baseDocument = git(root, ['show', `${baseRef}:${filePath}`], {
      allowFailure: true,
    });
    if (baseDocument.status !== 0 || !fs.existsSync(path.join(root, filePath))) {
      throw new ReleaseAutomationError(
        'release_review_document_missing',
        'Automatic review cannot create, remove, or rename governed documents.',
        {
          exitCode: EXIT.drift,
          details: { path: filePath },
        },
      );
    }
    const candidateDocument = fs.readFileSync(path.join(root, filePath), 'utf8');
    if (
      withoutReviewMetadata(candidateDocument) !== withoutReviewMetadata(baseDocument.stdout) ||
      reviewCommitFromDocument(candidateDocument) !== baseRef
    ) {
      throw new ReleaseAutomationError(
        'release_review_document_changed',
        'Automatic review may update only lastReviewedAt and lastReviewedCommit.',
        {
          exitCode: EXIT.drift,
          details: { path: filePath, expected_review_commit: baseRef },
        },
      );
    }
  }

  return { changedPaths, reviewPaths };
}

function releaseStaticPreflight(root, logFile) {
  const result = runLogged('npm', ['run', 'release:static-preflight'], { cwd: root, logFile });
  if (result.status !== 0) {
    throw new ReleaseAutomationError(
      'release_preflight_failed',
      'The composed Release PR candidate failed static release preflight.',
      {
        exitCode: EXIT.gate,
        details: { log_path: relativeLogPath(root, logFile) },
        nextAction: `Inspect ${relativeLogPath(root, logFile)} and fix the first release preflight failure.`,
      },
    );
  }
  return 'passed';
}

function docpactExecutable(root) {
  const repositoryWrapper = path.join(root, 'scripts', 'docpact');
  if (fs.existsSync(repositoryWrapper)) return repositoryWrapper;
  if (process.env.RELEASE_AUTOMATION_DOCPACT_BIN) {
    return process.env.RELEASE_AUTOMATION_DOCPACT_BIN;
  }
  throw new ReleaseAutomationError(
    'docpact_unavailable',
    'The repository Docpact wrapper is unavailable.',
    {
      exitCode: EXIT.external,
      nextAction: 'Restore scripts/docpact or set RELEASE_AUTOMATION_DOCPACT_BIN.',
    },
  );
}

function assertAutomaticReviewTarget(root, baseSha, filePath) {
  const resolved = path.resolve(root, filePath);
  const relative = path.relative(root, resolved);
  if (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative) ||
    !/\.(?:md|ya?ml)$/u.test(relative)
  ) {
    throw new ReleaseAutomationError(
      'docpact_review_target_unsafe',
      'Docpact returned a review path outside the supported repository document boundary.',
      {
        exitCode: EXIT.gate,
        details: { path: filePath },
      },
    );
  }
  const metadata = fs.lstatSync(resolved, { throwIfNoEntry: false });
  const baseDocument = git(root, ['show', `${baseSha}:${relative}`], { allowFailure: true });
  if (!metadata?.isFile() || metadata.isSymbolicLink() || baseDocument.status !== 0) {
    throw new ReleaseAutomationError(
      'docpact_review_target_unsafe',
      'Automatic review requires an existing tracked regular Markdown or YAML document.',
      {
        exitCode: EXIT.gate,
        details: { path: filePath },
      },
    );
  }
  return relative.split(path.sep).join('/');
}

function automaticDocpactReview(
  root,
  { baseSha, targetVersion, reportFile, additionalLintPaths = [] },
) {
  const executable = docpactExecutable(root);
  const reviewedPaths = new Set();
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });

  for (let round = 1; round <= MAX_DOCPACT_REVIEW_ROUNDS; round += 1) {
    const scope = assertReleaseCandidateScope(root, baseSha, targetVersion);
    const candidatePaths = [...scope.changedPaths].sort();
    const cumulativePaths = [...new Set([...additionalLintPaths, ...candidatePaths])].sort();
    const lintScopes = [candidatePaths];
    if (!isDeepStrictEqual(cumulativePaths, candidatePaths)) lintScopes.push(cumulativePaths);

    let lint;
    let active = [];
    for (const lintPaths of lintScopes) {
      lint = run(
        executable,
        [
          'lint',
          '--root',
          root,
          '--files',
          lintPaths.join(','),
          '--mode',
          'enforce',
          '--fail-on-uncovered-change',
          '--fail-on-stale-docs',
          '--format',
          'json',
          '--output',
          reportFile,
        ],
        { cwd: root, allowFailure: true },
      );
      if (!fs.existsSync(reportFile)) {
        throw new ReleaseAutomationError(
          'docpact_report_missing',
          'Docpact did not write the requested diagnostics report.',
          {
            exitCode: EXIT.external,
            details: { report_path: relativeLogPath(root, reportFile) },
          },
        );
      }
      const report = readJson(reportFile, 'Docpact diagnostics report');
      active = Array.isArray(report.diagnostics)
        ? report.diagnostics.filter((diagnostic) => diagnostic.finding_state === 'active')
        : [];
      if (active.length > 0) break;
      if (lint.status !== 0) {
        throw new ReleaseAutomationError(
          'docpact_lint_failed_without_diagnostics',
          'Docpact failed without an active diagnostic that can be handled safely.',
          {
            exitCode: EXIT.gate,
            details: {
              exit_code: lint.status,
              report_path: relativeLogPath(root, reportFile),
              stderr: truncate(lint.stderr),
            },
          },
        );
      }
    }

    if (active.length === 0) {
      const finalScope = assertReleaseCandidateScope(root, baseSha, targetVersion);
      return {
        status:
          reviewedPaths.size > 0
            ? 'completed'
            : finalScope.reviewPaths.length > 0
              ? 'previously_completed'
              : 'not_required',
        reviewed_paths: [...reviewedPaths].sort(),
        evidence_paths: finalScope.reviewPaths.sort(),
        rounds: round,
        report_path: relativeLogPath(root, reportFile),
      };
    }

    const unsupported = active.filter(
      (diagnostic) =>
        diagnostic.type !== 'missing-review' ||
        diagnostic.required_mode !== 'review_or_update' ||
        !['required_doc_not_touched', 'review_metadata_not_refreshed'].includes(
          diagnostic.failure_reason,
        ) ||
        !/\.(?:md|ya?ml)$/u.test(diagnostic.path || ''),
    );
    if (unsupported.length > 0) {
      throw new ReleaseAutomationError(
        'docpact_review_requires_manual_action',
        'Docpact reported a finding that a version-only release must not repair automatically.',
        {
          exitCode: EXIT.gate,
          details: {
            report_path: relativeLogPath(root, reportFile),
            diagnostics: unsupported.slice(0, 10).map((diagnostic) => ({
              id: diagnostic.diagnostic_id,
              type: diagnostic.type,
              path: diagnostic.path,
              reason: diagnostic.failure_reason,
            })),
          },
          nextAction: 'Resolve the reported governance finding in a separately reviewed change.',
        },
      );
    }

    const paths = [
      ...new Set(
        active.map((diagnostic) => assertAutomaticReviewTarget(root, baseSha, diagnostic.path)),
      ),
    ].sort();
    const newPaths = paths.filter((filePath) => !reviewedPaths.has(filePath));
    if (newPaths.length === 0) {
      throw new ReleaseAutomationError(
        'docpact_review_no_progress',
        'Docpact repeated the same review findings after review evidence was recorded.',
        {
          exitCode: EXIT.gate,
          details: { report_path: relativeLogPath(root, reportFile), paths },
        },
      );
    }
    const mark = run(
      executable,
      [
        'review',
        'mark',
        '--root',
        root,
        ...newPaths.flatMap((filePath) => ['--path', filePath]),
        '--commit',
        baseSha,
        '--format',
        'json',
      ],
      { cwd: root, allowFailure: true },
    );
    if (mark.status !== 0) {
      throw new ReleaseAutomationError(
        'docpact_review_mark_failed',
        'Docpact could not record the verified release review.',
        {
          exitCode: EXIT.gate,
          details: { paths: newPaths, stderr: truncate(mark.stderr || mark.stdout) },
        },
      );
    }
    newPaths.forEach((filePath) => reviewedPaths.add(filePath));
    assertReleaseCandidateScope(root, baseSha, targetVersion);
  }

  throw new ReleaseAutomationError(
    'docpact_review_round_limit',
    'Docpact review did not reach a fixed point within the bounded round limit.',
    {
      exitCode: EXIT.gate,
      details: {
        rounds: MAX_DOCPACT_REVIEW_ROUNDS,
        report_path: relativeLogPath(root, reportFile),
      },
    },
  );
}

function remoteBranchSha(root, remote, branch) {
  const result = git(root, ['ls-remote', '--refs', remote, `refs/heads/${branch}`]);
  const line = result.stdout.trim();
  if (!line) {
    throw new ReleaseAutomationError(
      'remote_branch_missing',
      `${remote}/${branch} does not exist.`,
      {
        exitCode: EXIT.external,
        details: { remote, branch },
      },
    );
  }
  return line.split(/\s+/u)[0];
}

function optionalRemoteBranchSha(root, remote, branch) {
  const result = git(root, ['ls-remote', '--refs', remote, `refs/heads/${branch}`], {
    allowFailure: true,
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return result.stdout.trim().split(/\s+/u)[0];
}

function remoteOwner(root, remote) {
  const url = git(root, ['remote', 'get-url', remote]).stdout.trim();
  const match = /github\.com(?::|\/)([^/]+)\/[^/]+?(?:\.git)?$/u.exec(url);
  if (!match) {
    throw new ReleaseAutomationError(
      'unsupported_push_remote',
      `Cannot derive a GitHub owner from remote ${remote}.`,
      {
        details: { remote, url },
        nextAction: 'Pass --head-owner <github-login> explicitly.',
      },
    );
  }
  return match[1];
}

function localBranchExists(root, branch) {
  return (
    git(root, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], {
      allowFailure: true,
    }).status === 0
  );
}

function currentBranch(root) {
  const result = git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new ReleaseAutomationError(
      'detached_head',
      'The release command requires a named local branch.',
      {
        nextAction: 'Switch to a clean named branch and rerun the command.',
      },
    );
  }
  return result.stdout.trim();
}

function switchToBranch(root, branch, startRef) {
  if (currentBranch(root) === branch) return;
  if (localBranchExists(root, branch)) {
    git(root, ['switch', branch]);
  } else {
    git(root, ['switch', '-c', branch, startRef]);
  }
}

function isAncestor(root, ancestor, descendant) {
  return (
    git(root, ['merge-base', '--is-ancestor', ancestor, descendant], {
      allowFailure: true,
    }).status === 0
  );
}

function releaseLineAlignment(root, mainRef, devRef) {
  const mainSha = git(root, ['rev-parse', `${mainRef}^{commit}`]).stdout.trim();
  const devSha = git(root, ['rev-parse', `${devRef}^{commit}`]).stdout.trim();
  if (isAncestor(root, mainSha, devSha)) {
    return {
      aligned: true,
      mode: 'direct_ancestry',
      main_sha: mainSha,
      dev_sha: devSha,
    };
  }

  const commitAndParents = git(root, ['rev-list', '--parents', '-n', '1', mainSha])
    .stdout.trim()
    .split(/\s+/u);
  const parents = commitAndParents.slice(1);
  if (parents.length !== 2) {
    return {
      aligned: false,
      reason: 'main_is_not_an_exact_two_parent_promotion',
      main_sha: mainSha,
      dev_sha: devSha,
      main_parent_count: parents.length,
    };
  }

  const promotionCandidateSha = parents[1];
  if (!isAncestor(root, promotionCandidateSha, devSha)) {
    return {
      aligned: false,
      reason: 'promotion_candidate_is_not_in_dev_history',
      main_sha: mainSha,
      dev_sha: devSha,
      promotion_candidate_sha: promotionCandidateSha,
    };
  }

  const mainTree = git(root, ['rev-parse', `${mainSha}^{tree}`]).stdout.trim();
  const promotionCandidateTree = git(root, [
    'rev-parse',
    `${promotionCandidateSha}^{tree}`,
  ]).stdout.trim();
  if (mainTree !== promotionCandidateTree) {
    return {
      aligned: false,
      reason: 'promotion_merge_changed_the_candidate_tree',
      main_sha: mainSha,
      dev_sha: devSha,
      promotion_candidate_sha: promotionCandidateSha,
      main_tree: mainTree,
      promotion_candidate_tree: promotionCandidateTree,
    };
  }

  return {
    aligned: true,
    mode: 'exact_two_parent_promotion',
    main_sha: mainSha,
    dev_sha: devSha,
    promotion_candidate_sha: promotionCandidateSha,
    tree_sha: mainTree,
  };
}

function findOpenPr(root, { repository, base, owner, branch }) {
  const payload = parseJsonOutput(
    gh(root, [
      'pr',
      'list',
      '--repo',
      repository,
      '--state',
      'open',
      '--base',
      base,
      '--head',
      `${owner}:${branch}`,
      '--json',
      'number,url,state,headRefOid,baseRefName,headRefName,body',
    ]),
    'gh pr list',
  );
  if (!Array.isArray(payload)) {
    throw new ReleaseAutomationError('invalid_pr_list', 'gh pr list returned a non-array result.', {
      exitCode: EXIT.external,
    });
  }
  if (payload.length > 1) {
    throw new ReleaseAutomationError(
      'ambiguous_pull_requests',
      'Multiple open pull requests match the release identity.',
      {
        exitCode: EXIT.drift,
        details: { pull_requests: payload.map(({ number, url }) => ({ number, url })) },
      },
    );
  }
  return payload[0] ?? null;
}

function viewPullRequest(root, repository, number) {
  return parseJsonOutput(
    gh(root, [
      'pr',
      'view',
      String(number),
      '--repo',
      repository,
      '--json',
      'number,url,state,mergedAt,mergeCommit,baseRefName,baseRefOid,headRefName,headRefOid,body,title',
    ]),
    'gh pr view',
  );
}

function createPullRequest(root, { repository, base, owner, branch, title, body }) {
  const result = gh(root, [
    'pr',
    'create',
    '--repo',
    repository,
    '--base',
    base,
    '--head',
    `${owner}:${branch}`,
    '--title',
    title,
    '--body',
    body,
  ]);
  const url = result.stdout
    .trim()
    .split(/\r?\n/u)
    .find((line) => /^https:\/\//u.test(line));
  if (!url) {
    throw new ReleaseAutomationError(
      'pull_request_url_missing',
      'gh pr create did not return a PR URL.',
      {
        exitCode: EXIT.external,
        details: { output: truncate(result.stdout) },
      },
    );
  }
  const numberMatch = /\/pull\/(\d+)(?:\/)?$/u.exec(url);
  return { url, number: numberMatch ? Number(numberMatch[1]) : null };
}

function relativeLogPath(root, logFile) {
  return path.relative(root, logFile).split(path.sep).join('/');
}

function checkedPush(root, { pushRemote, branch, logFile, gateProfile }) {
  const args = [
    'run',
    'push:checked',
    '--',
    '--gate-profile',
    gateProfile,
    pushRemote,
    `${branch}:refs/heads/${branch}`,
  ];
  const receiptFile = path.join(root, TRANSPORT_RECEIPT_PATH);
  const receiptBefore = fs.existsSync(receiptFile) ? fs.readFileSync(receiptFile) : null;
  let result = runLogged('npm', args, { cwd: root, logFile });
  let retried = false;
  const receiptAfter = fs.existsSync(receiptFile) ? fs.readFileSync(receiptFile) : null;
  const newReceipt =
    receiptAfter !== null && (receiptBefore === null || !receiptBefore.equals(receiptAfter));
  if (result.status !== 0 && newReceipt) {
    retried = true;
    result = runLogged('npm', ['run', 'push:retry'], { cwd: root, logFile });
  }
  if (result.status !== 0) {
    throw new ReleaseAutomationError(
      'managed_push_failed',
      'The repository-managed push did not complete.',
      {
        exitCode: EXIT.gate,
        details: { log_path: relativeLogPath(root, logFile), transport_retry_attempted: retried },
        nextAction: `Inspect ${relativeLogPath(root, logFile)} and fix the first failing gate or transport error.`,
      },
    );
  }
  return { status: 'passed', transport_retry_attempted: retried };
}

function baseResult(command, options) {
  return {
    schema_version: SCHEMA_VERSION,
    command,
    mode: options.apply ? 'apply' : 'dry-run',
    complete: true,
    repository: options.repository,
    issue: options.issue,
    warnings: [],
  };
}

function releaseHelp() {
  return `Prepare or reuse a version-bump pull request targeting dev.\n\nUsage:\n  node scripts/release/release-to-dev.cjs --version 0.0.67 --issue 778 [--apply]\n\nOptions:\n  --version <x.y.z>       Required stable version greater than the current dev version.\n  --issue <number>        Required owning Next Issue.\n  --apply                 Review Docpact, run static preflight, push, and create the PR.\n  --dry-run               Inspect and return the plan without Git or GitHub writes (default).\n  --repo <owner/repo>     Canonical repository (default: ${DEFAULT_REPOSITORY}).\n  --remote <name>         Canonical read remote (default: ${DEFAULT_CANONICAL_REMOTE}).\n  --push-remote <name>    Writable fork remote (default: ${DEFAULT_PUSH_REMOTE}).\n  --head-owner <login>    GitHub owner for the PR head; derived from --push-remote by default.\n  --branch <name>         Override the deterministic branch name.\n  --log-dir <path>        Directory for gate logs and Docpact reports (default: ${DEFAULT_LOG_DIRECTORY}).\n  --format json|human     Output mode (default: json).\n\nMutation boundary:\n  The command proves that only package.json.version, package-lock.json.version,\n  package-lock.json packages[""].version, and bounded Docpact review metadata\n  changed. Its push runs only Docpact and static preflight; the exact Release PR\n  targeting dev owns one non-browser full release gate and external proof. Browser\n  E2E is an operator-selected manual qualification to run on the open business PR\n  before release-to-dev when its change risk warrants it.\n\nRelease-line boundary:\n  main must be an ancestor of dev, or an exact two-parent promotion whose second\n  parent remains in dev history and has the same tree as main. Other divergence\n  requires governed reconciliation.\n\nExamples:\n  node scripts/release/release-to-dev.cjs --version 0.0.67 --issue 778\n  node scripts/release/release-to-dev.cjs --version 0.0.67 --issue 778 --apply\n\nNext:\n  Merge the returned dev PR only after its Release Candidate release proof succeeds, then run promote-dev-to-main with its PR number.`;
}

function promotionHelp() {
  return `Prepare or reuse an immutable dev-to-main promotion pull request.\n\nUsage:\n  node scripts/release/promote-dev-to-main.cjs --release-pr 801 --issue 778 [--apply]\n\nOptions:\n  --release-pr <number>   Required merged version-bump PR targeting dev.\n  --issue <number>        Required owning Next Issue closed by the main promotion.\n  --apply                 Pin the proved dev merge SHA, run structural/static gates, and create the PR.\n  --dry-run               Inspect and return the plan without Git or GitHub writes (default).\n  --repo <owner/repo>     Canonical repository (default: ${DEFAULT_REPOSITORY}).\n  --remote <name>         Canonical read remote (default: ${DEFAULT_CANONICAL_REMOTE}).\n  --push-remote <name>    Writable fork remote (default: ${DEFAULT_PUSH_REMOTE}).\n  --head-owner <login>    GitHub owner for the PR head; derived from --push-remote by default.\n  --branch <name>         Override the deterministic immutable promotion branch.\n  --log-dir <path>        Directory for gate logs (default: ${DEFAULT_LOG_DIRECTORY}).\n  --format json|human     Output mode (default: json).\n\nRelease-line boundary:\n  main must be an ancestor of dev, or an exact two-parent promotion whose second\n  parent remains in dev history and has the same tree as main. Other divergence\n  requires governed reconciliation.\n\nExamples:\n  node scripts/release/promote-dev-to-main.cjs --release-pr 801 --issue 778\n  node scripts/release/promote-dev-to-main.cjs --release-pr 801 --issue 778 --apply\n\nNext:\n  Merge the returned main PR after its fast proof-identity check passes.`;
}

function releasePrBody({
  issue,
  version,
  baseSha,
  mainSha,
  candidateSha,
  docpactReview,
  qualification,
}) {
  const reviewedPaths = [
    ...new Set([...(docpactReview.reviewed_paths || []), ...(docpactReview.evidence_paths || [])]),
  ];
  const reviewSummary =
    reviewedPaths.length > 0
      ? reviewedPaths.map((filePath) => `  - \`${filePath}\``).join('\n')
      : '  - none required';
  return `<!-- ${RELEASE_MARKER_PREFIX} issue=${issue} version=${version} dev-base=${baseSha} main-base=${mainSha} candidate=${candidateSha} -->\n\n## Branch Contract\n\n- base branch: \`dev\`\n- validated environment: exact dev Release PR non-browser gate\n- back-merge required after merge: No\n- root workspace integration expected: after later dev-to-main promotion\n\n## Linked Issue\n\nRefs #${issue}\n\n## Change Facts\n\n- Prepare version \`${version}\` from exact dev base \`${baseSha}\`.\n- Keep package.json and both package-lock root version fields aligned.\n- Keep release proof external to Git and bind it to the exact main/dev bases, candidate SHA/tree, version, workflow run, and artifact.\n- Record Docpact review evidence only after the command proves the candidate has no other semantic change.\n- Reviewed paths:\n${reviewSummary}\n\n## Validation Facts\n\n- Candidate: \`${candidateSha}\`\n- Main baseline: \`${mainSha}\`\n- Release gate: \`${qualification.status}\`; static preflight: \`${qualification.preflight_status}\`\n- Docpact automatic-review status: \`${docpactReview.status}\`\n- Docpact checked the complete main-to-candidate promotion range before the dev PR was created.\n- The managed candidate push ran only structural/static checks; this PR owns one non-browser full release gate and its exact proof.\n- Browser E2E is not evaluated or required by this PR. Run the manual hermetic workflow on the open business PR before release-to-dev when the change risk warrants browser evidence.\n\n## Risks And Follow-Up\n\n- Merge only after the exact Release Candidate release proof succeeds, then run the deterministic dev-to-main promotion command with this PR number.\n`;
}

function releaseMarker(body) {
  const pattern = new RegExp(
    `<!-- ${RELEASE_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')} issue=(\\d+) version=(\\d+\\.\\d+\\.\\d+) dev-base=([0-9a-f]{40}) main-base=([0-9a-f]{40}) candidate=([0-9a-f]{40}) -->`,
    'u',
  );
  const match = pattern.exec(String(body || ''));
  if (!match) {
    throw new ReleaseAutomationError(
      'release_pr_identity_missing',
      'The merged PR was not created by release-to-dev or its identity marker is invalid.',
      {
        exitCode: EXIT.drift,
        nextAction:
          'Pass the merged PR returned by release-to-dev; do not use a feature or back-merge PR.',
      },
    );
  }
  return {
    issue: Number(match[1]),
    version: match[2],
    baseSha: match[3],
    mainSha: match[4],
    candidateSha: match[5],
  };
}

function promotionPrBody({ issue, version, releasePr, devSha, mainSha }) {
  return `## Promotion Contract\n\n- base branch: \`main\`\n- source identity: exact dev commit \`${devSha}\` from Release PR #${releasePr}\n- back-merge required after merge: No; this is the normal dev-to-main path\n- root workspace integration expected: Yes, after promotion\n\n## Linked Issue\n\nCloses #${issue}\n\n## Promotion Facts\n\n- Promote version \`${version}\` from immutable dev candidate \`${devSha}\`.\n- Main baseline bound by the dev Release PR proof: \`${mainSha}\`.\n\n## Validation Facts\n\n- The promotion branch points exactly at the merged dev candidate.\n- The managed promotion push ran only structural/static checks.\n- The main PR check verifies the exact dev Release PR proof and tree identity; it does not rerun the full gate or browser E2E.\n\n## Integration And Follow-Up\n\n- After merge, the canonical main release workflow verifies the same proof before tag/publication without repeating candidate acceptance.\n`;
}

function executeReleaseToDev(options, cwd = process.cwd()) {
  const root = repositoryRoot(cwd);
  const initialStatus = worktreeStatus(root);
  if (options.apply) assertClean(root);
  const target = parseStableVersion(options.version, '--version');
  const branch = options.branch || `codex/issue-${options.issue}-version-v${target.text}`;
  validateBranch(root, branch, 'release-to-dev');
  const owner = options.headOwner || remoteOwner(root, options.pushRemote);
  const remoteDevSha = remoteBranchSha(root, options.remote, 'dev');
  const remoteMainSha = remoteBranchSha(root, options.remote, 'main');
  const existing = findOpenPr(root, {
    repository: options.repository,
    base: 'dev',
    owner,
    branch,
  });
  if (existing) {
    const marker = releaseMarker(existing.body);
    const existingVersions = readGithubVersions(root, options.repository, existing.headRefOid);
    if (
      marker.issue !== options.issue ||
      marker.version !== target.text ||
      marker.baseSha !== remoteDevSha ||
      marker.mainSha !== remoteMainSha ||
      marker.candidateSha !== existing.headRefOid ||
      existingVersions.version !== target.text
    ) {
      throw new ReleaseAutomationError(
        'release_pr_identity_mismatch',
        'The existing Release PR does not match the requested Issue, version, dev base, or candidate.',
        {
          exitCode: EXIT.drift,
          details: {
            expected_issue: options.issue,
            expected_version: target.text,
            current_dev_sha: remoteDevSha,
            marker,
            pr_head_sha: existing.headRefOid,
            candidate_version: existingVersions.version,
          },
          nextAction:
            'Review the existing PR and dev drift; use a new version/candidate only after resolving the mismatch.',
        },
      );
    }
    return {
      ...baseResult('release-to-dev', options),
      status: 'ready_for_review',
      reused: true,
      version: target.text,
      base_branch: 'dev',
      branch,
      candidate_sha: existing.headRefOid,
      pull_request: { number: existing.number, url: existing.url },
      docpact_review: { status: 'previously_completed', report_path: null },
      qualification: {
        status: 'required_by_dev_release_candidate_gate',
        action: 'reuse_existing_release_pr',
        preflight_status: 'previously_completed',
      },
      gate: { status: 'previously_completed', log_path: null },
      next_action: 'merge_release_pr',
    };
  }

  const baseVersions = readGithubVersions(root, options.repository, remoteDevSha);
  const localRemoteDev = git(
    root,
    ['rev-parse', '--verify', `refs/remotes/${options.remote}/dev`],
    {
      allowFailure: true,
    },
  );
  const current = parseStableVersion(baseVersions.version, 'current dev version');
  if (compareVersions(target, current) <= 0) {
    throw new ReleaseAutomationError(
      'version_not_incremented',
      'The target version must be greater than the current dev version.',
      {
        details: { current_version: current.text, target_version: target.text },
      },
    );
  }

  const plannedLog = resolveLogFile(
    root,
    options.logDirectory,
    `release-to-dev-v${target.text}.log`,
  );
  const docpactReport = resolveLogFile(
    root,
    options.logDirectory,
    `release-to-dev-v${target.text}-docpact.json`,
  );
  const plannedQualification = {
    status: 'required_by_dev_release_candidate_gate',
    action: 'no_tracked_proof_mutation',
    preflight_status: 'planned',
  };
  if (!options.apply) {
    return {
      ...baseResult('release-to-dev', options),
      status: 'planned',
      reused: false,
      version: target.text,
      current_version: baseVersions?.version ?? null,
      base_branch: 'dev',
      base_sha: remoteDevSha,
      main_sha: remoteMainSha,
      branch,
      pull_request: null,
      docpact_review: {
        status: 'planned',
        automatic_scope:
          'review_or_update_for_verified_version_only_candidate_and_complete_main_to_dev_range',
        report_path: relativeLogPath(root, docpactReport),
      },
      qualification: plannedQualification,
      gate: { status: 'not_run', log_path: relativeLogPath(root, plannedLog) },
      next_action: `rerun_with_apply`,
      warnings: [
        ...(localRemoteDev.stdout?.trim() !== remoteDevSha
          ? [
              `${options.remote}/dev is stale locally; --apply will fetch and revalidate the exact remote SHA.`,
            ]
          : []),
        ...(initialStatus
          ? ['The worktree is dirty; --apply will fail until local changes are resolved.']
          : []),
      ],
    };
  }

  git(root, ['fetch', options.remote, 'dev', 'main']);
  const fetchedDevSha = git(root, ['rev-parse', `${options.remote}/dev^{commit}`]).stdout.trim();
  const fetchedMainSha = git(root, ['rev-parse', `${options.remote}/main^{commit}`]).stdout.trim();
  if (fetchedDevSha !== remoteDevSha || fetchedMainSha !== remoteMainSha) {
    throw new ReleaseAutomationError(
      'release_refs_changed_during_release',
      'main or dev changed while the release command was preparing.',
      {
        exitCode: EXIT.drift,
        details: {
          main_observed_before: remoteMainSha,
          main_observed_after: fetchedMainSha,
          dev_observed_before: remoteDevSha,
          dev_observed_after: fetchedDevSha,
        },
        nextAction:
          'Rerun the dry-run against the new main/dev heads and choose the intended release candidate.',
      },
    );
  }
  const releaseLine = releaseLineAlignment(root, fetchedMainSha, fetchedDevSha);
  if (!releaseLine.aligned) {
    throw new ReleaseAutomationError(
      'release_main_not_ancestor_of_dev',
      'The current main and dev heads do not form a safe release line.',
      {
        exitCode: EXIT.drift,
        details: releaseLine,
        nextAction:
          'Inspect the reported promotion identity, then complete a governed main-to-dev reconciliation before preparing another version PR.',
      },
    );
  }
  const promotionRangePaths = changedPathsBetween(root, fetchedMainSha, fetchedDevSha);
  const fetchedCurrent = parseStableVersion(
    readVersionsAtRef(root, `${options.remote}/dev`).version,
    'dev version',
  );
  if (compareVersions(target, fetchedCurrent) <= 0) {
    throw new ReleaseAutomationError(
      'version_not_incremented',
      'The target version must be greater than the current dev version.',
      {
        details: { current_version: fetchedCurrent.text, target_version: target.text },
      },
    );
  }

  const pushRemoteSha = optionalRemoteBranchSha(root, options.pushRemote, branch);
  if (!localBranchExists(root, branch) && pushRemoteSha) {
    git(root, ['fetch', options.pushRemote, `${branch}:refs/heads/${branch}`]);
  }
  switchToBranch(root, branch, `${options.remote}/dev`);
  assertClean(root);
  let qualification = {
    status: 'required_by_dev_release_candidate_gate',
    action: 'no_tracked_proof_mutation',
  };
  let candidateSha = git(root, ['rev-parse', 'HEAD^{commit}']).stdout.trim();
  let docpactReview;
  if (candidateSha === fetchedDevSha) {
    writeVersionFiles(root, target.text);
    assertReleaseCandidateScope(root, fetchedDevSha, target.text);
    docpactReview = automaticDocpactReview(root, {
      baseSha: fetchedDevSha,
      targetVersion: target.text,
      reportFile: docpactReport,
      additionalLintPaths: promotionRangePaths,
    });
    const finalScope = assertReleaseCandidateScope(root, fetchedDevSha, target.text);
    git(root, ['add', '--', ...finalScope.changedPaths]);
    git(root, ['commit', '-m', `chore: prepare v${target.text} (#${options.issue})`]);
    candidateSha = git(root, ['rev-parse', 'HEAD^{commit}']).stdout.trim();
  } else {
    if (!isAncestor(root, fetchedDevSha, candidateSha)) {
      throw new ReleaseAutomationError(
        'release_branch_diverged',
        'The existing release branch is not based on the selected dev SHA.',
        {
          exitCode: EXIT.drift,
          details: { branch, dev_sha: fetchedDevSha, branch_sha: candidateSha },
        },
      );
    }
    const branchVersion = readVersionsAtRef(root, 'HEAD').version;
    if (branchVersion !== target.text) {
      throw new ReleaseAutomationError(
        'release_branch_version_mismatch',
        'The existing release branch has a different version.',
        {
          exitCode: EXIT.drift,
          details: { branch, expected: target.text, actual: branchVersion },
        },
      );
    }
    assertReleaseCandidateScope(root, fetchedDevSha, target.text);
    docpactReview = automaticDocpactReview(root, {
      baseSha: fetchedDevSha,
      targetVersion: target.text,
      reportFile: docpactReport,
      additionalLintPaths: promotionRangePaths,
    });
    if (docpactReview.reviewed_paths.length > 0) {
      const finalScope = assertReleaseCandidateScope(root, fetchedDevSha, target.text);
      const allowedReviewPaths = new Set([
        ...docpactReview.reviewed_paths,
        ...docpactReview.evidence_paths,
      ]);
      if (!finalScope.reviewPaths.every((filePath) => allowedReviewPaths.has(filePath))) {
        throw new ReleaseAutomationError(
          'unexpected_release_review_path',
          'The release branch contains review evidence not recognized by Docpact.',
          {
            exitCode: EXIT.drift,
            details: { review_paths: finalScope.reviewPaths },
          },
        );
      }
      const evidenceToCommit = [
        ...new Set([...docpactReview.reviewed_paths, ...docpactReview.evidence_paths]),
      ];
      git(root, ['add', '--', ...evidenceToCommit]);
      git(root, [
        'commit',
        '-m',
        `chore: complete v${target.text} release evidence (#${options.issue})`,
      ]);
      candidateSha = git(root, ['rev-parse', 'HEAD^{commit}']).stdout.trim();
    }
  }

  qualification = {
    ...qualification,
    preflight_status: releaseStaticPreflight(root, plannedLog),
  };

  let gate = { status: 'previously_completed', transport_retry_attempted: false };
  if (optionalRemoteBranchSha(root, options.pushRemote, branch) !== candidateSha) {
    gate = checkedPush(root, {
      pushRemote: options.pushRemote,
      branch,
      logFile: plannedLog,
      gateProfile: 'release-candidate',
    });
  }
  const verifiedRemoteSha = remoteBranchSha(root, options.pushRemote, branch);
  if (verifiedRemoteSha !== candidateSha) {
    throw new ReleaseAutomationError(
      'remote_candidate_mismatch',
      'The pushed release branch does not match the local candidate.',
      {
        exitCode: EXIT.drift,
        details: { local_sha: candidateSha, remote_sha: verifiedRemoteSha },
      },
    );
  }
  const pullRequest = createPullRequest(root, {
    repository: options.repository,
    base: 'dev',
    owner,
    branch,
    title: `chore: prepare v${target.text} on dev`,
    body: releasePrBody({
      issue: options.issue,
      version: target.text,
      baseSha: fetchedDevSha,
      mainSha: fetchedMainSha,
      candidateSha,
      docpactReview,
      qualification,
    }),
  });
  return {
    ...baseResult('release-to-dev', options),
    status: 'ready_for_review',
    reused: false,
    version: target.text,
    base_branch: 'dev',
    base_sha: fetchedDevSha,
    main_sha: fetchedMainSha,
    release_line_alignment: releaseLine,
    branch,
    candidate_sha: candidateSha,
    pull_request: pullRequest,
    docpact_review: docpactReview,
    qualification,
    gate: { ...gate, log_path: relativeLogPath(root, plannedLog) },
    next_action: 'merge_release_pr',
  };
}

function executePromoteDevToMain(options, cwd = process.cwd()) {
  const root = repositoryRoot(cwd);
  const initialStatus = worktreeStatus(root);
  if (options.apply) assertClean(root);
  const releasePr = viewPullRequest(root, options.repository, options.releasePr);
  if (releasePr.state !== 'MERGED' || !releasePr.mergedAt || !releasePr.mergeCommit?.oid) {
    throw new ReleaseAutomationError(
      'release_pr_not_merged',
      `Release PR #${options.releasePr} is not merged.`,
      {
        details: { state: releasePr.state, merged_at: releasePr.mergedAt ?? null },
        nextAction: `Merge ${releasePr.url || `Release PR #${options.releasePr}`} into dev before promotion.`,
      },
    );
  }
  if (releasePr.baseRefName !== 'dev') {
    throw new ReleaseAutomationError(
      'release_pr_wrong_base',
      `Release PR #${options.releasePr} did not target dev.`,
      {
        exitCode: EXIT.drift,
        details: { base_branch: releasePr.baseRefName },
      },
    );
  }
  const devMergeSha = releasePr.mergeCommit.oid;
  const versions = readGithubVersions(root, options.repository, devMergeSha);
  const version = parseStableVersion(versions.version, 'merged release version').text;
  const marker = releaseMarker(releasePr.body);
  if (
    marker.issue !== options.issue ||
    marker.version !== version ||
    marker.baseSha !== releasePr.baseRefOid ||
    marker.candidateSha !== releasePr.headRefOid
  ) {
    throw new ReleaseAutomationError(
      'release_pr_identity_mismatch',
      'The merged Release PR marker does not match its Issue, version, or head SHA.',
      {
        exitCode: EXIT.drift,
        details: {
          expected_issue: options.issue,
          marker,
          merged_version: version,
          pr_base_sha: releasePr.baseRefOid,
          pr_head_sha: releasePr.headRefOid,
        },
      },
    );
  }
  const remoteMainSha = remoteBranchSha(root, options.remote, 'main');
  if (marker.mainSha !== remoteMainSha) {
    throw new ReleaseAutomationError(
      'release_base_changed_after_candidate_gate',
      'main changed after the dev Release PR candidate was composed.',
      {
        exitCode: EXIT.drift,
        details: { qualified_main_sha: marker.mainSha, current_main_sha: remoteMainSha },
        nextAction: 'Prepare a new patch Release PR against the current main/dev release line.',
      },
    );
  }
  const branch = options.branch || `codex/promote-v${version}-dev-to-main-issue-${options.issue}`;
  validateBranch(root, branch, 'promote-dev-to-main');
  const owner = options.headOwner || remoteOwner(root, options.pushRemote);
  const existing = findOpenPr(root, {
    repository: options.repository,
    base: 'main',
    owner,
    branch,
  });
  if (existing) {
    if (existing.headRefOid !== devMergeSha) {
      throw new ReleaseAutomationError(
        'promotion_pr_candidate_mismatch',
        'The existing promotion PR points at a different candidate.',
        {
          exitCode: EXIT.drift,
          details: {
            expected_sha: devMergeSha,
            actual_sha: existing.headRefOid,
            url: existing.url,
          },
        },
      );
    }
    return {
      ...baseResult('promote-dev-to-main', options),
      status: 'ready_for_review',
      reused: true,
      version,
      release_pr: { number: releasePr.number, url: releasePr.url },
      dev_merge_sha: devMergeSha,
      branch,
      candidate_sha: existing.headRefOid,
      pull_request: { number: existing.number, url: existing.url },
      docpact_review: {
        status: 'not_applicable',
        reason: 'promotion_preserves_the_exact_merged_dev_candidate',
      },
      qualification: {
        status: 'proved_by_dev_release_candidate_gate',
        proof_storage: 'github_actions_artifact',
      },
      gate: { status: 'previously_completed', log_path: null },
      next_action: 'merge_promotion_pr',
    };
  }

  const remoteDevSha = remoteBranchSha(root, options.remote, 'dev');
  if (remoteDevSha !== devMergeSha) {
    throw new ReleaseAutomationError(
      'dev_advanced_after_release',
      'dev no longer points at the merged Release PR candidate.',
      {
        exitCode: EXIT.drift,
        details: { release_merge_sha: devMergeSha, current_dev_sha: remoteDevSha },
        nextAction:
          'Choose whether the newer dev commits belong in this release; then prepare a new Release PR/candidate.',
      },
    );
  }
  const plannedLog = resolveLogFile(
    root,
    options.logDirectory,
    `promote-v${version}-dev-to-main.log`,
  );
  if (!options.apply) {
    return {
      ...baseResult('promote-dev-to-main', options),
      status: 'planned',
      reused: false,
      version,
      release_pr: { number: releasePr.number, url: releasePr.url },
      dev_merge_sha: devMergeSha,
      main_sha: remoteMainSha,
      branch,
      pull_request: null,
      docpact_review: {
        status: 'not_applicable',
        reason: 'promotion_preserves_the_exact_merged_dev_candidate',
      },
      qualification: {
        status: 'planned_proof_reuse',
        proof_storage: 'github_actions_artifact',
      },
      gate: { status: 'not_run', log_path: relativeLogPath(root, plannedLog) },
      warnings: initialStatus
        ? ['The worktree is dirty; --apply will fail until local changes are resolved.']
        : [],
      next_action: 'rerun_with_apply',
    };
  }

  git(root, ['fetch', options.remote, 'dev', 'main']);
  const fetchedDevSha = git(root, ['rev-parse', `${options.remote}/dev^{commit}`]).stdout.trim();
  const fetchedMainSha = git(root, ['rev-parse', `${options.remote}/main^{commit}`]).stdout.trim();
  if (fetchedDevSha !== devMergeSha || fetchedMainSha !== remoteMainSha) {
    throw new ReleaseAutomationError(
      'promotion_refs_changed',
      'dev or main changed while promotion was preparing.',
      {
        exitCode: EXIT.drift,
        details: {
          expected_dev_sha: devMergeSha,
          actual_dev_sha: fetchedDevSha,
          expected_main_sha: remoteMainSha,
          actual_main_sha: fetchedMainSha,
        },
        nextAction: 'Rerun the dry-run and review the new dev/main identities.',
      },
    );
  }
  const releaseLine = releaseLineAlignment(root, `${options.remote}/main`, `${options.remote}/dev`);
  if (!releaseLine.aligned) {
    throw new ReleaseAutomationError(
      'main_not_ancestor_of_dev',
      'main and the release candidate on dev do not form a safe release line.',
      {
        exitCode: EXIT.drift,
        details: releaseLine,
        nextAction:
          'Inspect the reported promotion identity, then reconcile main into dev through the governed hotfix back-merge path before promotion.',
      },
    );
  }
  const fetchedVersions = readVersionsAtRef(root, `${options.remote}/dev`);
  if (fetchedVersions.version !== version) {
    throw new ReleaseAutomationError(
      'promotion_version_changed',
      'The fetched dev candidate version differs from the merged PR identity.',
      {
        exitCode: EXIT.drift,
        details: { expected: version, actual: fetchedVersions.version },
      },
    );
  }

  const remotePromotionSha = optionalRemoteBranchSha(root, options.pushRemote, branch);
  if (!localBranchExists(root, branch) && remotePromotionSha) {
    git(root, ['fetch', options.pushRemote, `${branch}:refs/heads/${branch}`]);
  }
  switchToBranch(root, branch, `${options.remote}/dev`);
  assertClean(root);
  const candidateSha = git(root, ['rev-parse', 'HEAD^{commit}']).stdout.trim();
  if (candidateSha !== devMergeSha) {
    throw new ReleaseAutomationError(
      'promotion_branch_candidate_mismatch',
      'The promotion branch does not point exactly at the dev merge candidate.',
      {
        exitCode: EXIT.drift,
        details: { branch, expected_sha: devMergeSha, actual_sha: candidateSha },
      },
    );
  }

  let gate = { status: 'previously_completed', transport_retry_attempted: false };
  if (optionalRemoteBranchSha(root, options.pushRemote, branch) !== candidateSha) {
    gate = checkedPush(root, {
      pushRemote: options.pushRemote,
      branch,
      logFile: plannedLog,
      gateProfile: 'immutable-promotion',
    });
  }
  const verifiedRemoteSha = remoteBranchSha(root, options.pushRemote, branch);
  if (verifiedRemoteSha !== candidateSha) {
    throw new ReleaseAutomationError(
      'remote_promotion_mismatch',
      'The pushed promotion branch does not match the dev candidate.',
      {
        exitCode: EXIT.drift,
        details: { local_sha: candidateSha, remote_sha: verifiedRemoteSha },
      },
    );
  }
  const pullRequest = createPullRequest(root, {
    repository: options.repository,
    base: 'main',
    owner,
    branch,
    title: `chore: promote v${version} dev to main`,
    body: promotionPrBody({
      issue: options.issue,
      version,
      releasePr: options.releasePr,
      devSha: devMergeSha,
      mainSha: fetchedMainSha,
    }),
  });
  return {
    ...baseResult('promote-dev-to-main', options),
    status: 'ready_for_review',
    reused: false,
    version,
    release_pr: { number: releasePr.number, url: releasePr.url },
    dev_merge_sha: devMergeSha,
    main_sha: fetchedMainSha,
    release_line_alignment: releaseLine,
    branch,
    candidate_sha: candidateSha,
    pull_request: pullRequest,
    docpact_review: {
      status: 'not_applicable',
      reason: 'promotion_preserves_the_exact_merged_dev_candidate',
    },
    qualification: {
      status: 'proved_by_dev_release_candidate_gate',
      proof_storage: 'github_actions_artifact',
    },
    gate: { ...gate, log_path: relativeLogPath(root, plannedLog) },
    next_action: 'merge_promotion_pr',
  };
}

function humanResult(result) {
  if (result.status === 'failed') {
    return `${result.command}: failed\n\nSummary:\n- ${result.error.code}: ${result.error.message}\n\nNext:\n- ${result.next_action || 'Fix the reported precondition and rerun the same command.'}\n`;
  }
  const target = result.pull_request?.url || result.branch || result.repository;
  const reviewedPathCount = new Set([
    ...(result.docpact_review?.reviewed_paths || []),
    ...(result.docpact_review?.evidence_paths || []),
  ]).size;
  return `${result.command}: ${result.status}\n\nSummary:\n- ${target}\n- version: ${result.version ?? 'not resolved'}\n- candidate: ${result.candidate_sha ?? result.dev_merge_sha ?? result.base_sha ?? 'not created'}\n- Docpact review: ${result.docpact_review?.status ?? 'not reported'} (${reviewedPathCount} evidence path${reviewedPathCount === 1 ? '' : 's'})\n\nNext:\n- ${result.next_action}\n`;
}

function emitResult(result, format = 'json') {
  process.stdout.write(
    format === 'human' ? humanResult(result) : `${JSON.stringify(result, null, 2)}\n`,
  );
}

function failureResult(command, options, error) {
  const normalized =
    error instanceof ReleaseAutomationError
      ? error
      : new ReleaseAutomationError('unexpected_error', error.message || String(error), {
          exitCode: EXIT.external,
        });
  return {
    result: {
      schema_version: SCHEMA_VERSION,
      command,
      mode: options?.apply ? 'apply' : 'dry-run',
      complete: false,
      status: 'failed',
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
      next_action: normalized.nextAction,
    },
    exitCode: normalized.exitCode,
  };
}

function runCli(command, argv, cwd = process.cwd()) {
  let options;
  try {
    options = parseArguments(argv, command);
    if (options.help) {
      process.stdout.write(`${command === 'release-to-dev' ? releaseHelp() : promotionHelp()}\n`);
      return 0;
    }
    const result =
      command === 'release-to-dev'
        ? executeReleaseToDev(options, cwd)
        : executePromoteDevToMain(options, cwd);
    emitResult(result, options.format);
    return 0;
  } catch (error) {
    const failure = failureResult(command, options, error);
    emitResult(failure.result, options?.format || 'json');
    return failure.exitCode;
  }
}

module.exports = {
  DEFAULT_CANONICAL_REMOTE,
  DEFAULT_LOG_DIRECTORY,
  DEFAULT_PUSH_REMOTE,
  DEFAULT_REPOSITORY,
  EXIT,
  ReleaseAutomationError,
  SCHEMA_VERSION,
  automaticDocpactReview,
  assertReleaseCandidateScope,
  branchHasMainSemantics,
  compareVersions,
  executePromoteDevToMain,
  executeReleaseToDev,
  failureResult,
  humanResult,
  parseArguments,
  parseStableVersion,
  promotionHelp,
  releaseLineAlignment,
  releaseHelp,
  runCli,
  versionsFromDocuments,
};
