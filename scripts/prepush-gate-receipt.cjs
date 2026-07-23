#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RECEIPT_SCHEMA_VERSION = 2;
const RECEIPT_RELATIVE_PATH = '.local/prepush-gate/failed-transport-receipt.json';
const RECEIPT_TTL_MS = 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const ZERO_SHA = '0'.repeat(40);
const BASE_GATE_COMMANDS = ['npm run docpact:gate', 'npm run prepush:gate'];
const RELEASE_PREFLIGHT_COMMAND = 'npm run release:preflight';
const ACTIVE_RECEIPT_KIND = 'tiangong-bounded-failed-transport-receipt';
const PENDING_PAYLOAD_KIND = 'tiangong-prepush-gate-pending-payload';
const NO_UPDATE_PAYLOAD_KIND = 'tiangong-prepush-no-update-payload';
const SESSION_MANIFEST_KIND = 'tiangong-checked-push-session';
const SESSION_DIRECTORY_ENV = 'TIANGONG_CHECKED_PUSH_SESSION_DIR';
const SESSION_NONCE_ENV = 'TIANGONG_CHECKED_PUSH_SESSION_NONCE';
const SESSION_MANIFEST_FILE = 'session.json';
const SESSION_PAYLOAD_FILE = 'gate-payload.json';
const GATE_ENV_PATTERN =
  /^(?:APP_|BABEL_ENV$|CI$|COREPACK_|DOCPACT_|FAIL_ON_ACT_WARNING$|GIT_CONFIG_|HOME$|LANG$|LANGUAGE$|LC_|MOCK$|NODE_ENV$|NODE_OPTIONS$|NPM_CONFIG_|REACT_APP_|SHELL$|SUPABASE_|TZ$|UMI_|XDG_CONFIG_HOME$)/u;
const STABLE_NPM_CONFIG_KEYS = [
  'foreground-scripts',
  'if-present',
  'ignore-scripts',
  'include-workspace-root',
  'node-options',
  'script-shell',
  'shell',
  'workspace',
  'workspaces',
];

class IneligibleReceiptError extends Error {}
class RemoteVerificationUnavailableError extends Error {}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !options.allowFailure) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

function git(root, args, options = {}) {
  return run('git', args, { cwd: root, ...options });
}

function repositoryRoot(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']).stdout.trim();
}

function receiptPath(root) {
  return path.join(root, RECEIPT_RELATIVE_PATH);
}

function invalidateReceipt(root) {
  fs.rmSync(receiptPath(root), { recursive: true, force: true });
}

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new IneligibleReceiptError(`required state is missing: ${filePath}`);
  }
  return sha256(fs.readFileSync(filePath));
}

function bytewiseNameSort(left, right) {
  return Buffer.from(left.name).compare(Buffer.from(right.name));
}

function hashInstalledDependencies(nodeModulesRoot) {
  if (!fs.existsSync(nodeModulesRoot)) {
    throw new IneligibleReceiptError(`required dependency state is missing: ${nodeModulesRoot}`);
  }

  const digest = crypto.createHash('sha256');
  const walk = (directory, relativeDirectory = '') => {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort(bytewiseNameSort);
    for (const entry of entries) {
      if (entry.name === '.cache') continue;
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      const kind = entry.isDirectory() ? 'd' : entry.isSymbolicLink() ? 'l' : 'f';
      digest.update(`${kind}\0${relativePath}\0${stat.mode & 0o777}\0`);

      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isSymbolicLink()) {
        digest.update(fs.readlinkSync(absolutePath));
      } else if (entry.isFile()) {
        digest.update(fs.readFileSync(absolutePath));
      }
    }
  };

  walk(nodeModulesRoot);
  return digest.digest('hex');
}

function gateEnvironmentDigest() {
  const values = Object.keys(process.env)
    .filter(
      (key) =>
        GATE_ENV_PATTERN.test(key) && key !== 'DOCPACT_BASE_REF' && key !== 'DOCPACT_HEAD_REF',
    )
    .sort()
    .map((key) => [key, process.env[key] ?? null]);
  return sha256(JSON.stringify(values));
}

function parsePushUpdates(updatesFile) {
  const lines = fs
    .readFileSync(updatesFile, 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const fields = line.split(/\s+/u);
    if (fields.length !== 4) {
      throw new IneligibleReceiptError('Git supplied an unsupported pre-push update shape');
    }
    const [localRef, localSha, remoteRef, remoteSha] = fields;
    return { localRef, localSha, remoteRef, remoteSha };
  });
}

function hasMainSemantics(ref) {
  return (
    ref === 'refs/heads/main' ||
    ref === 'refs/heads/master' ||
    /^refs\/heads\/(?:codex\/)?(?:hotfix|promote|release)(?:\/|-)/u.test(ref)
  );
}

function requiresReleasePreflight(update, currentBranchRef) {
  if (update.remoteRef === 'refs/heads/main' || update.remoteRef === 'refs/heads/master') {
    return true;
  }
  if (update.remoteRef === 'refs/heads/dev') {
    return false;
  }
  return (
    hasMainSemantics(update.remoteRef) ||
    hasMainSemantics(update.localRef) ||
    hasMainSemantics(currentBranchRef)
  );
}

function baseForUpdate(update, currentBranchRef) {
  if (update.remoteRef === 'refs/heads/main' || update.remoteRef === 'refs/heads/master') {
    return 'origin/main';
  }
  if (update.remoteRef === 'refs/heads/dev') {
    return 'origin/dev';
  }
  if (hasMainSemantics(update.remoteRef) || hasMainSemantics(update.localRef)) {
    return 'origin/main';
  }
  return hasMainSemantics(currentBranchRef) ? 'origin/main' : 'origin/dev';
}

function selectDocpactBaseRef(root, updates, explicitOverride) {
  if (explicitOverride) return explicitOverride;

  const currentBranchRef = git(root, ['symbolic-ref', '--quiet', 'HEAD'], {
    allowFailure: true,
  }).stdout.trim();
  const bases = [...new Set(updates.map((update) => baseForUpdate(update, currentBranchRef)))];
  if (bases.length !== 1) {
    throw new IneligibleReceiptError(
      `the push spans incompatible Docpact baselines (${bases.join(', ')})`,
    );
  }
  return bases[0];
}

function stableNpmConfigDigest(root) {
  const effective = JSON.parse(run('npm', ['config', 'list', '--json'], { cwd: root }).stdout);
  const stable = Object.fromEntries(
    STABLE_NPM_CONFIG_KEYS.map((key) => [key, effective[key] ?? null]),
  );
  return sha256(JSON.stringify(stable));
}

function ignoredGateInputDigests(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() || entry.isSymbolicLink())
    .filter((entry) => entry.name === '.npmrc' || /^\.env(?:\.|$)/u.test(entry.name))
    .map((entry) => ({ path: entry.name, sha256: hashFile(path.join(root, entry.name)) }))
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

function docpactIdentity(root) {
  const wrapper = path.join(root, 'scripts/docpact');
  const configuredBinary = run(wrapper, ['--print-bin'], { cwd: root }).stdout.trim();
  const selectedBinary = path.isAbsolute(configuredBinary)
    ? configuredBinary
    : path.resolve(root, configuredBinary);
  const binary = fs.realpathSync(selectedBinary);
  const version = run(binary, ['--version'], { cwd: root }).stdout.trim();
  return {
    version,
    binaryDigest: hashFile(binary),
    selectionDigest: sha256(JSON.stringify({ binary, version })),
  };
}

function resolveDocpactState(root, docpactBaseRef) {
  const head = git(root, ['rev-parse', 'HEAD']).stdout.trim();
  const baseTip = git(root, ['rev-parse', '--verify', `${docpactBaseRef}^{commit}`]).stdout.trim();
  const mergeBase = git(root, ['merge-base', head, baseTip]).stdout.trim();
  return { docpactBaseRef, docpactBaseTip: baseTip, docpactMergeBase: mergeBase, head };
}

function collectCheckpoint(root, docpactBaseRef) {
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']).stdout.trim();
  if (status) {
    throw new IneligibleReceiptError('the repository worktree is not clean');
  }

  const docpact = resolveDocpactState(root, docpactBaseRef);
  const npmVersion = run('npm', ['--version'], { cwd: root }).stdout.trim();
  const npmExecutable = run('which', ['npm'], { cwd: root }).stdout.trim().split(/\r?\n/u)[0];
  const dependencyTree = run('npm', ['ls', '--all', '--json'], { cwd: root }).stdout;
  const gateInputs = git(root, [
    'ls-files',
    '-s',
    '--',
    '.docpact/config.yaml',
    '.husky/pre-push',
    'jest.config.cjs',
    'package.json',
    'package-lock.json',
    'scripts',
  ]).stdout;

  return {
    checkpointVersion: 2,
    head: docpact.head,
    tree: git(root, ['rev-parse', 'HEAD^{tree}']).stdout.trim(),
    branch: git(root, ['symbolic-ref', '--quiet', 'HEAD']).stdout.trim(),
    clean: true,
    platform: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    nodeExecutableDigest: hashFile(process.execPath),
    npmVersion,
    npmExecutableDigest: hashFile(npmExecutable),
    npmConfigDigest: stableNpmConfigDigest(root),
    packageLockDigest: hashFile(path.join(root, 'package-lock.json')),
    installedLockDigest: hashFile(path.join(root, 'node_modules/.package-lock.json')),
    installedDependencyTreeDigest: sha256(dependencyTree),
    installedDependencyContentDigest: hashInstalledDependencies(path.join(root, 'node_modules')),
    gateInputsDigest: sha256(gateInputs),
    gateEnvironmentDigest: gateEnvironmentDigest(),
    ignoredGateInputs: ignoredGateInputDigests(root),
    docpactIdentity: docpactIdentity(root),
    docpactBaseRef: docpact.docpactBaseRef,
    docpactBaseTip: docpact.docpactBaseTip,
    docpactMergeBase: docpact.docpactMergeBase,
  };
}

function differingCheckpointKeys(left, right) {
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .sort();
}

function readPushUpdate(root, updatesFile, checkpoint) {
  const updates = parsePushUpdates(updatesFile);
  if (updates.length !== 1) {
    throw new IneligibleReceiptError(
      'only a single branch update can receive a bounded transport-retry receipt',
    );
  }
  const [{ localRef, localSha, remoteRef, remoteSha }] = updates;
  if (
    !localRef.startsWith('refs/heads/') ||
    !remoteRef.startsWith('refs/heads/') ||
    localSha === ZERO_SHA ||
    localSha !== checkpoint.head ||
    localRef !== checkpoint.branch
  ) {
    throw new IneligibleReceiptError(
      'the push is not a single exact-HEAD update from the current local branch',
    );
  }

  if (remoteSha !== ZERO_SHA) {
    const ancestor = git(root, ['merge-base', '--is-ancestor', remoteSha, localSha], {
      allowFailure: true,
    });
    if (ancestor.status !== 0) {
      throw new IneligibleReceiptError('the original update is not a fast-forward branch push');
    }
  }

  return { localRef, localSha, remoteRef, remoteSha };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function writePrivateJson(target, value) {
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, target);
}

function readPrivateJson(target, description) {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
    throw new Error(`${description} has unsafe type or permissions`);
  }
  const value = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (!isPlainObject(value)) throw new Error(`${description} is not a JSON object`);
  return value;
}

function createCheckedPushSession() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-checked-push-'));
  fs.chmodSync(directory, 0o700);
  const nonce = crypto.randomUUID();
  const manifestPayload = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: SESSION_MANIFEST_KIND,
    nonce,
  };
  writePrivateJson(path.join(directory, SESSION_MANIFEST_FILE), {
    ...manifestPayload,
    manifestDigest: sha256(JSON.stringify(manifestPayload)),
  });
  return { directory, nonce };
}

function checkedPushSessionFromEnvironment() {
  const configuredDirectory = process.env[SESSION_DIRECTORY_ENV];
  const configuredNonce = process.env[SESSION_NONCE_ENV];
  if (!configuredDirectory && !configuredNonce) return null;
  if (!configuredDirectory || !configuredNonce) {
    throw new Error('the checked-push session environment is incomplete');
  }

  const directoryStat = fs.lstatSync(configuredDirectory);
  if (
    !directoryStat.isDirectory() ||
    directoryStat.isSymbolicLink() ||
    (directoryStat.mode & 0o077) !== 0
  ) {
    throw new Error('the checked-push session directory is unsafe');
  }
  const directory = fs.realpathSync(configuredDirectory);
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  if (!directory.startsWith(`${temporaryRoot}${path.sep}`)) {
    throw new Error('the checked-push session is outside the private temporary root');
  }

  const manifest = readPrivateJson(
    path.join(directory, SESSION_MANIFEST_FILE),
    'the checked-push session manifest',
  );
  const { manifestDigest, ...manifestPayload } = manifest;
  if (
    manifestPayload.schemaVersion !== RECEIPT_SCHEMA_VERSION ||
    manifestPayload.kind !== SESSION_MANIFEST_KIND ||
    manifestPayload.nonce !== configuredNonce ||
    manifestDigest !== sha256(JSON.stringify(manifestPayload))
  ) {
    throw new Error('the checked-push session manifest is invalid');
  }
  return { directory, nonce: configuredNonce };
}

function writePendingGatePayload(session, payload) {
  const pendingPayload = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: PENDING_PAYLOAD_KIND,
    sessionNonce: session.nonce,
    ...payload,
  };
  writePrivateJson(path.join(session.directory, SESSION_PAYLOAD_FILE), {
    ...pendingPayload,
    payloadDigest: sha256(JSON.stringify(pendingPayload)),
  });
}

function writeNoUpdatePayload(session) {
  const noUpdatePayload = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: NO_UPDATE_PAYLOAD_KIND,
    sessionNonce: session.nonce,
  };
  writePrivateJson(path.join(session.directory, SESSION_PAYLOAD_FILE), {
    ...noUpdatePayload,
    payloadDigest: sha256(JSON.stringify(noUpdatePayload)),
  });
}

function readPendingGatePayload(session) {
  const target = path.join(session.directory, SESSION_PAYLOAD_FILE);
  if (!fs.existsSync(target)) return null;
  const pending = readPrivateJson(target, 'the checked-push gate payload');
  const { payloadDigest, ...payload } = pending;
  if (
    payload.schemaVersion !== RECEIPT_SCHEMA_VERSION ||
    ![PENDING_PAYLOAD_KIND, NO_UPDATE_PAYLOAD_KIND].includes(payload.kind) ||
    payload.sessionNonce !== session.nonce ||
    payloadDigest !== sha256(JSON.stringify(payload))
  ) {
    throw new Error('the checked-push gate payload is invalid');
  }
  return payload;
}

function writeReceipt(root, payload) {
  const target = receiptPath(root);
  const ignored = git(root, ['check-ignore', '--quiet', '--', RECEIPT_RELATIVE_PATH], {
    allowFailure: true,
  });
  if (ignored.status !== 0) {
    throw new Error(`${RECEIPT_RELATIVE_PATH} must remain ignored by Git`);
  }

  invalidateReceipt(root);
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  const receipt = { ...payload, receiptDigest: sha256(JSON.stringify(payload)) };
  writePrivateJson(target, receipt);
}

function authoritativeGateEnvironment() {
  const environment = { ...process.env };
  delete environment[SESSION_DIRECTORY_ENV];
  delete environment[SESSION_NONCE_ENV];
  return environment;
}

function runAuthoritativeGates({ root, head, mergeBase, releasePreflight }) {
  const environment = authoritativeGateEnvironment();
  const commands = [...BASE_GATE_COMMANDS];
  process.stdout.write(`Running docpact gate against immutable ${mergeBase}..${head}.\n`);
  run('npm', ['run', 'docpact:gate', '--', '--base', mergeBase, '--head', head], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
  });
  if (releasePreflight) {
    process.stdout.write('Running main-candidate release preflight.\n');
    run('npm', ['run', 'release:preflight'], {
      cwd: root,
      env: environment,
      stdio: 'inherit',
    });
    commands.splice(1, 0, RELEASE_PREFLIGHT_COMMAND);
  }
  process.stdout.write('Running local test gate.\n');
  run('npm', ['run', 'prepush:gate'], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
  });
  return commands;
}

function runHookGates({ root, remoteName, remoteUrl, docpactBaseOverride, updatesFile }) {
  const session = checkedPushSessionFromEnvironment();
  const updates = parsePushUpdates(updatesFile);
  if (updates.length === 0) {
    if (session) writeNoUpdatePayload(session);
    process.stdout.write('No ref updates requested; skipped the checkpoint and gates.\n');
    return null;
  }

  invalidateReceipt(root);
  const docpactBaseRef = selectDocpactBaseRef(root, updates, docpactBaseOverride);
  const currentBranchRef = git(root, ['symbolic-ref', '--quiet', 'HEAD'], {
    allowFailure: true,
  }).stdout.trim();
  const releasePreflight = updates.some((update) =>
    requiresReleasePreflight(update, currentBranchRef),
  );
  let before;
  try {
    before = collectCheckpoint(root, docpactBaseRef);
  } catch (error) {
    invalidateReceipt(root);
    throw new Error(`cannot establish a clean immutable pre-push checkpoint: ${error.message}`, {
      cause: error,
    });
  }

  let update = null;
  let remote = null;
  let ineligibleReason = null;

  try {
    update = readPushUpdate(root, updatesFile, before);
    const currentPushUrl = git(root, ['remote', 'get-url', '--push', remoteName]).stdout.trim();
    if (!remoteName || !currentPushUrl || currentPushUrl !== remoteUrl) {
      throw new IneligibleReceiptError('the named Git push remote cannot be bound exactly');
    }
    remote = { name: remoteName, urlDigest: sha256(currentPushUrl) };
  } catch (error) {
    update = null;
    remote = null;
    ineligibleReason = error instanceof Error ? error.message : String(error);
  }

  let gateCommands;
  try {
    gateCommands = runAuthoritativeGates({
      root,
      head: before.head,
      mergeBase: before.docpactMergeBase,
      releasePreflight,
    });
  } catch (error) {
    invalidateReceipt(root);
    throw error;
  }

  let after;
  try {
    after = collectCheckpoint(root, docpactBaseRef);
  } catch (error) {
    invalidateReceipt(root);
    throw new Error(
      `controlled repository state changed while the pre-push gates ran: ${error.message}`,
      { cause: error },
    );
  }
  if (
    JSON.stringify(before) !== JSON.stringify(after) ||
    (update !== null && (after.head !== update.localSha || after.branch !== update.localRef))
  ) {
    invalidateReceipt(root);
    const changed = differingCheckpointKeys(before, after);
    const changedSuffix = changed.length > 0 ? ` (${changed.join(', ')})` : '';
    throw new Error(
      `controlled repository state changed while the pre-push gates ran${changedSuffix}; push again to validate the new checkpoint`,
    );
  }

  if (!update || !remote) {
    if (session) {
      throw new Error(
        `checked push requires one eligible exact-HEAD branch update (${ineligibleReason})`,
      );
    }
    process.stderr.write(
      `No transport-retry receipt was created (${ineligibleReason}). A failed push must rerun the normal hook.\n`,
    );
    return null;
  }

  if (!session) return null;
  writePendingGatePayload(session, {
    remote,
    update,
    checkpoint: after,
    gates: gateCommands,
  });
  return path.join(session.directory, SESSION_PAYLOAD_FILE);
}

function activateFailedTransportReceipt(root, pending, originalPushExitCode) {
  const payload = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: ACTIVE_RECEIPT_KIND,
    activation: 'managed-git-push-nonzero',
    createdAt: new Date().toISOString(),
    expiresAfterMs: RECEIPT_TTL_MS,
    nonce: crypto.randomUUID(),
    originalPushExitCode,
    remote: pending.remote,
    update: pending.update,
    checkpoint: pending.checkpoint,
    gates: pending.gates,
  };
  writeReceipt(root, payload);
  return receiptPath(root);
}

function checkedPush(root, pushArgs) {
  if (
    pushArgs.some((argument) => argument === '--no-verify' || argument.startsWith('--no-verify='))
  ) {
    throw new Error('push:checked does not allow --no-verify');
  }

  invalidateReceipt(root);
  const session = createCheckedPushSession();
  let result;
  try {
    result = run('git', ['push', ...pushArgs], {
      cwd: root,
      allowFailure: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        HUSKY: '1',
        [SESSION_DIRECTORY_ENV]: session.directory,
        [SESSION_NONCE_ENV]: session.nonce,
      },
    });

    let pending = null;
    try {
      pending = readPendingGatePayload(session);
    } catch (error) {
      invalidateReceipt(root);
      if (result.status === 0) throw error;
      process.stderr.write(
        `No retry receipt was activated because the gate payload was invalid (${error.message}).\n`,
      );
    }

    if (result.status === 0) {
      invalidateReceipt(root);
      if (!pending) {
        throw new Error(
          'git push succeeded without a checked-push gate payload; no retry receipt exists',
        );
      }
      return 0;
    }

    const exitCode = typeof result.status === 'number' ? result.status : 1;
    if (pending?.kind === PENDING_PAYLOAD_KIND) {
      const target = activateFailedTransportReceipt(root, pending, exitCode);
      process.stderr.write(
        `Git transport failed after both gates passed. Bounded retry receipt activated at ${target}.\n`,
      );
    } else {
      invalidateReceipt(root);
      process.stderr.write(
        'Git push failed without a successful hook payload; no retry receipt was activated.\n',
      );
    }
    return exitCode;
  } finally {
    fs.rmSync(session.directory, { recursive: true, force: true });
  }
}

function invalidateAndThrow(root, message, cause) {
  invalidateReceipt(root);
  const error = new Error(message);
  if (cause) error.cause = cause;
  throw error;
}

function loadReceipt(root, now = Date.now()) {
  const target = receiptPath(root);
  let receipt;
  try {
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
      throw new Error('the local gate receipt has unsafe type or permissions');
    }
    receipt = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (!isPlainObject(receipt)) throw new Error('the local gate receipt is not a JSON object');
  } catch (error) {
    return invalidateAndThrow(root, 'the local gate receipt is missing or malformed', error);
  }

  const { receiptDigest, ...payload } = receipt;
  const createdAt = Date.parse(payload.createdAt);
  const age = now - createdAt;
  if (
    payload.schemaVersion !== RECEIPT_SCHEMA_VERSION ||
    payload.kind !== ACTIVE_RECEIPT_KIND ||
    payload.activation !== 'managed-git-push-nonzero' ||
    payload.expiresAfterMs !== RECEIPT_TTL_MS ||
    receiptDigest !== sha256(JSON.stringify(payload)) ||
    !Number.isFinite(createdAt) ||
    age < -MAX_CLOCK_SKEW_MS ||
    age > RECEIPT_TTL_MS
  ) {
    return invalidateAndThrow(
      root,
      'the local gate receipt is stale, malformed, or modified; it was invalidated',
    );
  }
  return payload;
}

function assertExactCheckpoint(root, receipt) {
  try {
    const current = collectCheckpoint(root, receipt.checkpoint.docpactBaseRef);
    if (JSON.stringify(current) !== JSON.stringify(receipt.checkpoint)) {
      const changed = differingCheckpointKeys(receipt.checkpoint, current);
      const changedSuffix = changed.length > 0 ? ` (${changed.join(', ')})` : '';
      return invalidateAndThrow(
        root,
        `HEAD, tree, branch, environment, dependencies, gate inputs, or Docpact state changed${changedSuffix}; the receipt was invalidated`,
      );
    }
    const currentPushUrl = git(root, [
      'remote',
      'get-url',
      '--push',
      receipt.remote.name,
    ]).stdout.trim();
    if (sha256(currentPushUrl) !== receipt.remote.urlDigest) {
      return invalidateAndThrow(root, 'the push remote changed; the receipt was invalidated');
    }
    return currentPushUrl;
  } catch (error) {
    if (!fs.existsSync(receiptPath(root))) throw error;
    return invalidateAndThrow(
      root,
      `the local gate receipt is no longer valid: ${error.message}`,
      error,
    );
  }
}

function readRemoteSha(root, remoteTarget, remoteRef) {
  const result = git(root, ['ls-remote', '--refs', '--', remoteTarget, remoteRef], {
    allowFailure: true,
  });
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new RemoteVerificationUnavailableError(
      `could not verify the remote ref${detail ? `: ${detail}` : ''}`,
    );
  }
  const line = result.stdout
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find(Boolean);
  return line ? line.split(/\s+/u)[0] : ZERO_SHA;
}

function retryTransport(root) {
  const receipt = loadReceipt(root);
  const immutablePushUrl = assertExactCheckpoint(root, receipt);

  const { localSha, remoteRef, remoteSha } = receipt.update;
  const currentRemoteSha = readRemoteSha(root, immutablePushUrl, remoteRef);
  if (currentRemoteSha === localSha) {
    invalidateReceipt(root);
    process.stdout.write(
      'The receipt-bound commit already reached the remote; cleared the receipt without another push.\n',
    );
    return;
  }
  if (currentRemoteSha !== remoteSha) {
    return invalidateAndThrow(
      root,
      'the remote ref changed after the gate succeeded; the receipt was invalidated',
    );
  }

  const lease = `--force-with-lease=${remoteRef}:${remoteSha}`;
  // Push the gate-bound object ID, not the movable local branch name. This keeps
  // the transport exact even if another process moves the branch after the
  // final checkpoint comparison but before Git reads the refspec.
  const refspec = `${localSha}:${remoteRef}`;
  const result = git(root, ['push', '--no-verify', lease, '--', immutablePushUrl, refspec], {
    allowFailure: true,
    stdio: 'inherit',
  });
  if (result.status === 0) {
    invalidateReceipt(root);
    return;
  }

  try {
    const afterFailureSha = readRemoteSha(root, immutablePushUrl, remoteRef);
    if (afterFailureSha === localSha) {
      invalidateReceipt(root);
      process.stdout.write(
        'The receipt-bound commit reached the remote despite the transport error; cleared the receipt.\n',
      );
      return;
    }
    if (afterFailureSha !== remoteSha) {
      invalidateReceipt(root);
    }
  } catch (error) {
    if (!(error instanceof RemoteVerificationUnavailableError)) {
      invalidateReceipt(root);
    }
  }
  throw new Error(
    'transport retry failed; an unchanged, unexpired receipt remains usable only when the remote ref is still unchanged',
  );
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) throw new Error(`missing required argument ${name}`);
  return args[index + 1];
}

function optionalArgumentValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? '' : (args[index + 1] ?? '');
}

function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  const root = repositoryRoot();

  if (command === 'hook-run') {
    const target = runHookGates({
      root,
      remoteName: argumentValue(args, '--remote-name'),
      remoteUrl: argumentValue(args, '--remote-url'),
      docpactBaseOverride: optionalArgumentValue(args, '--docpact-base-override'),
      updatesFile: argumentValue(args, '--updates-file'),
    });
    if (target)
      process.stdout.write('Checked-push gate payload returned to its private session.\n');
    return;
  }
  if (command === 'checked-push') {
    process.exitCode = checkedPush(root, args);
    return;
  }
  if (command === 'retry') {
    if (args.length !== 0) {
      throw new Error(
        'push:retry does not accept arguments; its remote, ref, and commit are receipt-bound',
      );
    }
    retryTransport(root);
    return;
  }
  throw new Error('usage: prepush-gate-receipt.cjs <hook-run|checked-push|retry> [options]');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  RECEIPT_RELATIVE_PATH,
  RECEIPT_TTL_MS,
  ZERO_SHA,
  collectCheckpoint,
  hashInstalledDependencies,
  invalidateReceipt,
  loadReceipt,
  main,
  readPushUpdate,
  retryTransport,
  selectDocpactBaseRef,
  sha256,
};
