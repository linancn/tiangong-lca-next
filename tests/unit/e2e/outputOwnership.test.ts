import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const { handoffOutputOwnership } = require('../../../scripts/e2e/output-ownership.cjs') as {
  handoffOutputOwnership: (output: string, recoveryLedger?: string) => void;
};
const { readContainerResult } = require('../../../scripts/e2e/release-e2e.cjs') as {
  readContainerResult: (output: string) => unknown;
};

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-output-ownership-'));
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

it('uses the mounted directory owner, preserves private modes, and never follows output links', () => {
  const output = path.join(root, 'output');
  const nested = path.join(output, 'nested');
  const result = path.join(nested, 'run-result.json');
  const outside = path.join(root, 'outside.json');
  const link = path.join(output, 'outside-link');
  fs.mkdirSync(nested, { recursive: true, mode: 0o700 });
  fs.writeFileSync(result, '{"status":"passed"}', { mode: 0o600 });
  fs.writeFileSync(outside, 'private sentinel', { mode: 0o600 });
  fs.symlinkSync(outside, link);
  const owner = fs.lstatSync(output);
  const lstat = fs.lstatSync.bind(fs);
  const foreign = new Set([nested, result, link]);
  jest.spyOn(fs, 'lstatSync').mockImplementation(((entry: fs.PathLike) => {
    const value = lstat(entry);
    if (foreign.has(String(entry))) {
      Object.assign(value, { uid: owner.uid + 1, gid: owner.gid + 1 });
    }
    return value;
  }) as typeof fs.lstatSync);
  const chown = jest.spyOn(fs, 'lchownSync').mockImplementation(() => undefined);

  handoffOutputOwnership(output);

  expect(chown.mock.calls).toEqual([
    [result, owner.uid, owner.gid],
    [nested, owner.uid, owner.gid],
    [link, owner.uid, owner.gid],
  ]);
  expect(chown).not.toHaveBeenCalledWith(outside, expect.anything(), expect.anything());
  expect(fs.statSync(nested).mode & 0o777).toBe(0o700);
  expect(fs.statSync(result).mode & 0o777).toBe(0o600);
  expect(fs.statSync(outside).mode & 0o777).toBe(0o600);
});

it('transfers only the exact recovery ledger to its own mounted parent owner', () => {
  const output = path.join(root, 'output');
  const recovery = path.join(root, 'recovery');
  const ledger = path.join(recovery, 'ledger.json');
  const unrelated = path.join(recovery, 'unrelated.json');
  fs.mkdirSync(output, { mode: 0o700 });
  fs.mkdirSync(recovery, { mode: 0o700 });
  fs.writeFileSync(ledger, '{}', { mode: 0o600 });
  fs.writeFileSync(unrelated, '{}', { mode: 0o600 });
  const lstat = fs.lstatSync.bind(fs);
  jest.spyOn(fs, 'lstatSync').mockImplementation(((entry: fs.PathLike) => {
    const value = lstat(entry);
    if (String(entry) === recovery) Object.assign(value, { uid: 1234, gid: 4321 });
    return value;
  }) as typeof fs.lstatSync);
  const chown = jest.spyOn(fs, 'lchownSync').mockImplementation(() => undefined);

  handoffOutputOwnership(output, ledger);

  expect(chown.mock.calls).toEqual([[ledger, 1234, 4321]]);
  expect(fs.statSync(ledger).mode & 0o777).toBe(0o600);
  expect(fs.statSync(recovery).mode & 0o777).toBe(0o700);
});

it('supports direct invocation and absent ledgers without any host UID API', () => {
  const chown = jest.spyOn(fs, 'lchownSync');
  handoffOutputOwnership(root, path.join(root, 'absent-ledger.json'));
  expect(chown).not.toHaveBeenCalled();
});

it('rejects a symlink artifact mount before changing any owner', () => {
  const link = path.join(root, 'link');
  fs.symlinkSync(root, link);
  const chown = jest.spyOn(fs, 'lchownSync');
  expect(() => handoffOutputOwnership(link)).toThrow('not a link');
  expect(chown).not.toHaveBeenCalled();
});

it('propagates ownership failure without widening report permissions', () => {
  const result = path.join(root, 'run-result.json');
  fs.writeFileSync(result, '{}', { mode: 0o600 });
  const lstat = fs.lstatSync.bind(fs);
  jest.spyOn(fs, 'lstatSync').mockImplementation(((entry: fs.PathLike) => {
    const value = lstat(entry);
    if (String(entry) === result) Object.assign(value, { uid: value.uid + 1 });
    return value;
  }) as typeof fs.lstatSync);
  jest.spyOn(fs, 'lchownSync').mockImplementation(() => {
    throw Object.assign(new Error('operation denied'), { code: 'EPERM' });
  });
  expect(() => handoffOutputOwnership(root)).toThrow('operation denied');
  expect(fs.statSync(result).mode & 0o777).toBe(0o600);
});

it('classifies unreadable results and preserves errno without exposing report contents', () => {
  expect(readContainerResult(root)).toBeUndefined();
  const result = path.join(root, 'run-result.json');
  fs.writeFileSync(result, '{"status":"passed"}', { mode: 0o600 });
  expect(readContainerResult(root)).toEqual({ status: 'passed' });
  jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
    throw Object.assign(new Error('private report contents'), { code: 'EACCES' });
  });
  let error: any;
  try {
    readContainerResult(root);
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({
    exitCode: 50,
    failureCode: 'E2E_CONTAINER_RESULT_UNREADABLE',
    phase: 'artifact-handoff',
    details: { containerResult: result, errorCode: 'EACCES' },
    cause: { message: 'EACCES' },
  });
  expect(error.message).not.toContain('private report contents');
});

it('refuses malformed result JSON without including its sensitive payload in the error chain', () => {
  fs.writeFileSync(path.join(root, 'run-result.json'), 'private-payload-not-json');
  let error: any;
  try {
    readContainerResult(root);
  } catch (caught) {
    error = caught;
  }
  expect(error.details.errorCode).toBe('INVALID_JSON');
  expect(error.cause.message).toBe('INVALID_JSON');
  expect(error.message).not.toContain('private-payload');
});
