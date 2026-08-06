import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const workflow = require('../../../scripts/release/release-workflow.cjs') as {
  EXIT: Record<string, number>;
  SCHEMA_VERSION: string;
  parseArguments: (args: string[], command: string) => Record<string, unknown>;
  parseStableVersion: (value: string, label: string) => { text: string; parts: number[] };
  branchHasMainSemantics: (branch: string) => boolean;
  assertReleaseCandidateScope: (
    root: string,
    baseRef: string,
    targetVersion: string,
  ) => { changedPaths: string[]; reviewPaths: string[] };
  automaticDocpactReview: (
    root: string,
    options: { baseSha: string; targetVersion: string; reportFile: string },
  ) => {
    status: string;
    reviewed_paths: string[];
    evidence_paths: string[];
    rounds: number;
  };
  humanResult: (result: Record<string, any>) => string;
  versionsFromDocuments: (
    packageJson: Record<string, any>,
    packageLock: Record<string, any>,
    source: string,
  ) => { version: string };
};

type Fixture = {
  container: string;
  root: string;
  origin: string;
  fork: string;
  bin: string;
  mainSha: string;
  devSha: string;
  packageJson: Record<string, any>;
  packageLock: Record<string, any>;
};

const sourceRoot = process.cwd();
const releaseScript = path.join(sourceRoot, 'scripts/release/release-to-dev.cjs');
const promotionScript = path.join(sourceRoot, 'scripts/release/promote-dev-to-main.cjs');
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
] as const;

const isolatedEnvironment = (overrides: Record<string, string> = {}) => {
  const environment = { ...process.env, ...overrides };
  LOCAL_GIT_ENVIRONMENT_KEYS.forEach((key) => delete environment[key]);
  return environment;
};

const git = (cwd: string, args: string[]) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: isolatedEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const writeJson = (filePath: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const writeExecutable = (filePath: string, source: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source, { mode: 0o755 });
  fs.chmodSync(filePath, 0o755);
};

const versionDocuments = (version: string) => ({
  packageJson: { name: 'release-fixture', version, private: true },
  packageLock: {
    name: 'release-fixture',
    version,
    lockfileVersion: 3,
    requires: true,
    packages: { '': { name: 'release-fixture', version } },
  },
});

const installFakeCommands = (fixture: Fixture) => {
  writeExecutable(
    path.join(fixture.bin, 'gh'),
    `#!/usr/bin/env node
'use strict';
const args = process.argv.slice(2);
if (args[0] === 'pr' && args[1] === 'list') {
  process.stdout.write(process.env.FAKE_GH_PR_LIST || '[]');
} else if (args[0] === 'pr' && args[1] === 'view') {
  process.stdout.write(process.env.FAKE_GH_PR_VIEW || '{}');
} else if (args[0] === 'pr' && args[1] === 'create') {
  process.stdout.write((process.env.FAKE_GH_CREATED_URL || 'https://example.test/pull/1') + '\\n');
} else if (args[0] === 'api') {
  const endpoint = args[1] || '';
  const value = endpoint.includes('package-lock.json')
    ? process.env.FAKE_GH_PACKAGE_LOCK
    : process.env.FAKE_GH_PACKAGE_JSON;
  if (endpoint.includes('/git/blobs/')) {
    process.stdout.write(JSON.stringify({ encoding: 'base64', content: Buffer.from(process.env.FAKE_GH_PACKAGE_LOCK || '{}').toString('base64') }));
  } else if (endpoint.includes('package-lock.json') && process.env.FAKE_GH_PACKAGE_LOCK_ENCODING_NONE === '1') {
    process.stdout.write(JSON.stringify({ encoding: 'none', content: '', sha: 'b'.repeat(40) }));
  } else {
    process.stdout.write(JSON.stringify({ encoding: 'base64', content: Buffer.from(value || '{}').toString('base64') }));
  }
} else {
  process.stderr.write('unsupported fake gh invocation: ' + JSON.stringify(args));
  process.exitCode = 91;
}
`,
  );
  writeExecutable(
    path.join(fixture.bin, 'npm'),
    `#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (process.env.FAKE_NPM_LOG) fs.appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'run' && args[1] === 'push:checked') {
  const separator = args.indexOf('--');
  const remote = args[separator + 1];
  const ref = args[separator + 2];
  const result = spawnSync('git', ['push', '--no-verify', remote, ref], { cwd: process.cwd(), stdio: 'inherit' });
  process.exitCode = result.status || 0;
} else if (args[0] === 'run' && args[1] === 'push:retry') {
  process.exitCode = 92;
} else {
  process.stderr.write('unsupported fake npm invocation: ' + JSON.stringify(args));
  process.exitCode = 93;
}
`,
  );
  writeExecutable(
    path.join(fixture.bin, 'docpact'),
    `#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag) + 1];
const baseSha = process.env.FAKE_DOCPACT_BASE_SHA;
const mode = process.env.FAKE_DOCPACT_MODE || 'pass';
const reviewed = (filePath) => fs.readFileSync(filePath, 'utf8').includes('lastReviewedCommit: ' + baseSha);
if (args[0] === 'lint') {
  let diagnostics = [];
  if (mode === 'unsupported') {
    diagnostics = [{ diagnostic_id: 'd001', type: 'uncovered-change', path: 'package.json', failure_reason: 'unmatched_changed_path', finding_state: 'active' }];
  } else if (mode === 'review') {
    const target = !reviewed('AGENTS.md') ? 'AGENTS.md' : !reviewed('docs/gate.md') ? 'docs/gate.md' : null;
    if (target) diagnostics = [{ diagnostic_id: 'd001', type: 'missing-review', path: target, required_mode: 'review_or_update', failure_reason: 'required_doc_not_touched', finding_state: 'active' }];
  }
  const report = { schema_version: 'docpact.lint-report.v1', diagnostics, summary: { total_count: diagnostics.length } };
  const output = value('--output');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report));
  process.stdout.write(JSON.stringify(report));
  process.exitCode = diagnostics.length > 0 ? 1 : 0;
} else if (args[0] === 'review' && args[1] === 'mark') {
  const commit = value('--commit');
  const paths = [];
  args.forEach((argument, index) => { if (argument === '--path') paths.push(args[index + 1]); });
  paths.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8')
      .replace(/^lastReviewedAt:.*$/mu, 'lastReviewedAt: 2026-08-06')
      .replace(/^lastReviewedCommit:.*$/mu, 'lastReviewedCommit: ' + commit);
    fs.writeFileSync(filePath, source);
  });
  process.stdout.write(JSON.stringify({ paths, commit }));
} else {
  process.stderr.write('unsupported fake docpact invocation: ' + JSON.stringify(args));
  process.exitCode = 94;
}
`,
  );
};

const createFixture = (devVersion = '1.0.0'): Fixture => {
  const container = fs.mkdtempSync(path.join(os.tmpdir(), 'release-workflow-'));
  const root = path.join(container, 'repo');
  const origin = path.join(container, 'origin.git');
  const fork = path.join(container, 'fork.git');
  const bin = path.join(container, 'bin');
  fs.mkdirSync(root);
  fs.mkdirSync(bin);
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.name', 'Release Test']);
  git(root, ['config', 'user.email', 'release@example.test']);
  git(container, ['init', '--bare', origin]);
  git(container, ['init', '--bare', fork]);

  const mainDocuments = versionDocuments('1.0.0');
  writeJson(path.join(root, 'package.json'), mainDocuments.packageJson);
  writeJson(path.join(root, 'package-lock.json'), mainDocuments.packageLock);
  fs.writeFileSync(path.join(root, '.gitignore'), '.local/\n');
  fs.writeFileSync(
    path.join(root, 'AGENTS.md'),
    '---\nlastReviewedAt: 2026-01-01\nlastReviewedCommit: 0000000000000000000000000000000000000000\n---\n\n# Fixture contract\n',
  );
  fs.mkdirSync(path.join(root, 'docs'));
  fs.writeFileSync(
    path.join(root, 'docs/gate.md'),
    '---\nlastReviewedAt: 2026-01-01\nlastReviewedCommit: 0000000000000000000000000000000000000000\n---\n\n# Fixture gate\n',
  );
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'main baseline']);
  const mainSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['remote', 'add', 'origin', origin]);
  git(root, ['remote', 'add', 'fork', fork]);
  git(root, ['push', '--no-verify', 'origin', 'main']);
  git(root, ['push', '--no-verify', 'fork', 'main']);

  git(root, ['switch', '-c', 'dev']);
  if (devVersion !== '1.0.0') {
    const devDocuments = versionDocuments(devVersion);
    writeJson(path.join(root, 'package.json'), devDocuments.packageJson);
    writeJson(path.join(root, 'package-lock.json'), devDocuments.packageLock);
  }
  fs.writeFileSync(path.join(root, 'dev.txt'), 'dev\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'dev baseline']);
  const devSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['push', '--no-verify', 'origin', 'dev']);
  git(root, ['switch', 'main']);
  git(root, ['fetch', 'origin', 'main', 'dev']);

  const fixture = {
    container,
    root,
    origin,
    fork,
    bin,
    mainSha,
    devSha,
    packageJson: versionDocuments(devVersion).packageJson,
    packageLock: versionDocuments(devVersion).packageLock,
  };
  installFakeCommands(fixture);
  return fixture;
};

const runCli = (
  fixture: Fixture,
  script: string,
  args: string[],
  environment: Record<string, string> = {},
) =>
  spawnSync(process.execPath, [script, ...args], {
    cwd: fixture.root,
    encoding: 'utf8',
    env: isolatedEnvironment({
      PATH: `${fixture.bin}${path.delimiter}${process.env.PATH}`,
      FAKE_GH_PACKAGE_JSON: JSON.stringify(fixture.packageJson),
      FAKE_GH_PACKAGE_LOCK: JSON.stringify(fixture.packageLock),
      FAKE_DOCPACT_BASE_SHA: fixture.devSha,
      RELEASE_AUTOMATION_DOCPACT_BIN: path.join(fixture.bin, 'docpact'),
      ...environment,
    }),
  });

const promotionPr = (fixture: Fixture, mergeSha = fixture.devSha) =>
  JSON.stringify({
    number: 42,
    url: 'https://example.test/pull/42',
    state: 'MERGED',
    mergedAt: '2026-08-06T00:00:00Z',
    mergeCommit: { oid: mergeSha },
    baseRefName: 'dev',
    baseRefOid: fixture.mainSha,
    headRefName: 'codex/version',
    headRefOid: mergeSha,
    body: `<!-- tiangong-next-release-automation:v1 issue=778 version=1.0.1 base=${fixture.mainSha} candidate=${mergeSha} -->`,
    title: 'chore: prepare v1.0.1 on dev',
  });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('release automation public contracts', () => {
  it('parses stable versions and rejects ambiguous mutation modes', () => {
    expect(workflow.parseStableVersion('1.2.3', 'version')).toEqual({
      text: '1.2.3',
      parts: [1, 2, 3],
    });
    expect(() => workflow.parseStableVersion('v1.2.3', 'version')).toThrow(
      'must be a stable x.y.z version',
    );
    expect(() =>
      workflow.parseArguments(
        ['--version', '1.2.3', '--issue', '7', '--apply', '--dry-run'],
        'release-to-dev',
      ),
    ).toThrow('--apply and --dry-run cannot be combined');
    expect(workflow.branchHasMainSemantics('codex/promote-v1.2.3-dev-to-main')).toBe(true);
    expect(workflow.branchHasMainSemantics('codex/issue-7-version-v1.2.3')).toBe(false);
    expect(
      workflow.humanResult({
        command: 'release-to-dev',
        status: 'ready_for_review',
        version: '1.2.3',
        candidate_sha: 'a'.repeat(40),
        branch: 'codex/issue-7-version-v1.2.3',
        docpact_review: {
          status: 'completed',
          reviewed_paths: ['AGENTS.md'],
          evidence_paths: ['AGENTS.md'],
        },
        next_action: 'merge_release_pr',
      }),
    ).toContain('Docpact review: completed (1 evidence path)');
  });

  it('fails closed when package and lock versions disagree', () => {
    expect(() =>
      workflow.versionsFromDocuments(
        { version: '1.0.1' },
        { version: '1.0.0', packages: { '': { version: '1.0.0' } } },
        'fixture',
      ),
    ).toThrow('Version fields do not agree');
  });

  it('rejects a dev release branch name that would select the main gate', () => {
    const fixture = createFixture();
    const result = runCli(fixture, releaseScript, [
      '--version',
      '1.0.1',
      '--issue',
      '778',
      '--branch',
      'codex/promote-not-a-dev-release',
      '--head-owner',
      'fixture',
    ]);

    expect(result.status).toBe(workflow.EXIT.usage);
    expect(JSON.parse(result.stdout)).toMatchObject({
      complete: false,
      error: { code: 'release_branch_has_main_semantics' },
    });
  });

  it('returns a pure, non-mutating release plan by default', () => {
    const fixture = createFixture();
    const beforeBranch = git(fixture.root, ['branch', '--show-current']);
    const beforeHead = git(fixture.root, ['rev-parse', 'HEAD']);
    const result = runCli(fixture, releaseScript, [
      '--version',
      '1.0.1',
      '--issue',
      '778',
      '--head-owner',
      'fixture',
    ]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      schema_version: workflow.SCHEMA_VERSION,
      command: 'release-to-dev',
      mode: 'dry-run',
      status: 'planned',
      version: '1.0.1',
      base_sha: fixture.devSha,
      next_action: 'rerun_with_apply',
    });
    expect(git(fixture.root, ['branch', '--show-current'])).toBe(beforeBranch);
    expect(git(fixture.root, ['rev-parse', 'HEAD'])).toBe(beforeHead);
    expect(git(fixture.root, ['status', '--porcelain'])).toBe('');
  });

  it('reads a large lockfile through the Git blob fallback', () => {
    const fixture = createFixture();
    const result = runCli(
      fixture,
      releaseScript,
      ['--version', '1.0.1', '--issue', '778', '--head-owner', 'fixture'],
      { FAKE_GH_PACKAGE_LOCK_ENCODING_NONE: '1' },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'planned',
      current_version: '1.0.0',
    });
  });

  it('applies the release once, uses checked push, and creates the dev PR', () => {
    const fixture = createFixture();
    const npmLog = path.join(fixture.container, 'npm.log');
    const result = runCli(
      fixture,
      releaseScript,
      ['--version', '1.0.1', '--issue', '778', '--head-owner', 'fixture', '--apply'],
      {
        FAKE_NPM_LOG: npmLog,
        FAKE_GH_CREATED_URL: 'https://example.test/pull/51',
        FAKE_DOCPACT_MODE: 'review',
      },
    );

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      status: 'ready_for_review',
      reused: false,
      version: '1.0.1',
      pull_request: { url: 'https://example.test/pull/51' },
      docpact_review: {
        status: 'completed',
        reviewed_paths: ['AGENTS.md', 'docs/gate.md'],
        rounds: 3,
      },
      gate: { status: 'passed' },
    });
    expect(git(fixture.root, ['branch', '--show-current'])).toBe('codex/issue-778-version-v1.0.1');
    expect(git(fixture.root, ['show', 'HEAD:package.json'])).toContain('"version": "1.0.1"');
    expect(git(fixture.root, ['show', 'HEAD:AGENTS.md'])).toContain(
      `lastReviewedCommit: ${fixture.devSha}`,
    );
    expect(
      git(fixture.root, [
        'ls-remote',
        '--refs',
        'fork',
        'refs/heads/codex/issue-778-version-v1.0.1',
      ]),
    ).toContain(output.candidate_sha);
    expect(fs.readFileSync(npmLog, 'utf8')).toContain('push:checked');

    const previousBinary = process.env.RELEASE_AUTOMATION_DOCPACT_BIN;
    const previousMode = process.env.FAKE_DOCPACT_MODE;
    const previousBase = process.env.FAKE_DOCPACT_BASE_SHA;
    process.env.RELEASE_AUTOMATION_DOCPACT_BIN = path.join(fixture.bin, 'docpact');
    process.env.FAKE_DOCPACT_MODE = 'review';
    process.env.FAKE_DOCPACT_BASE_SHA = fixture.devSha;
    try {
      const repeated = workflow.automaticDocpactReview(fixture.root, {
        baseSha: fixture.devSha,
        targetVersion: '1.0.1',
        reportFile: path.join(fixture.root, '.local/repeated-docpact.json'),
      });
      expect(repeated).toMatchObject({
        status: 'previously_completed',
        reviewed_paths: [],
        evidence_paths: ['AGENTS.md', 'docs/gate.md'],
        rounds: 1,
      });
      expect(git(fixture.root, ['rev-parse', 'HEAD'])).toBe(output.candidate_sha);
    } finally {
      if (previousBinary === undefined) delete process.env.RELEASE_AUTOMATION_DOCPACT_BIN;
      else process.env.RELEASE_AUTOMATION_DOCPACT_BIN = previousBinary;
      if (previousMode === undefined) delete process.env.FAKE_DOCPACT_MODE;
      else process.env.FAKE_DOCPACT_MODE = previousMode;
      if (previousBase === undefined) delete process.env.FAKE_DOCPACT_BASE_SHA;
      else process.env.FAKE_DOCPACT_BASE_SHA = previousBase;
    }
  });

  it('refuses to auto-review a non-review Docpact finding', () => {
    const fixture = createFixture();
    const result = runCli(
      fixture,
      releaseScript,
      ['--version', '1.0.1', '--issue', '778', '--head-owner', 'fixture', '--apply'],
      { FAKE_DOCPACT_MODE: 'unsupported' },
    );

    expect(result.status).toBe(workflow.EXIT.gate);
    expect(JSON.parse(result.stdout)).toMatchObject({
      complete: false,
      error: { code: 'docpact_review_requires_manual_action' },
    });
    expect(
      git(fixture.root, [
        'ls-remote',
        '--refs',
        'fork',
        'refs/heads/codex/issue-778-version-v1.0.1',
      ]),
    ).toBe('');
  });

  it('rejects package semantics beyond the three version fields', () => {
    const fixture = createFixture();
    git(fixture.root, ['switch', 'dev']);
    const documents = versionDocuments('1.0.1');
    writeJson(path.join(fixture.root, 'package.json'), {
      ...documents.packageJson,
      description: 'not a release-only change',
    });
    writeJson(path.join(fixture.root, 'package-lock.json'), documents.packageLock);

    const previousIndex = process.env.GIT_INDEX_FILE;
    process.env.GIT_INDEX_FILE = path.join(fixture.container, 'unrelated-hook-index');
    try {
      expect(() =>
        workflow.assertReleaseCandidateScope(fixture.root, fixture.devSha, '1.0.1'),
      ).toThrow('beyond the three root version fields');
    } finally {
      if (previousIndex === undefined) delete process.env.GIT_INDEX_FILE;
      else process.env.GIT_INDEX_FILE = previousIndex;
    }
  });

  it('rejects a governed document body change disguised as review evidence', () => {
    const fixture = createFixture();
    git(fixture.root, ['switch', 'dev']);
    const documents = versionDocuments('1.0.1');
    writeJson(path.join(fixture.root, 'package.json'), documents.packageJson);
    writeJson(path.join(fixture.root, 'package-lock.json'), documents.packageLock);
    fs.writeFileSync(
      path.join(fixture.root, 'AGENTS.md'),
      `---\nlastReviewedAt: 2026-08-06\nlastReviewedCommit: ${fixture.devSha}\n---\n\n# Changed contract body\n`,
    );

    expect(() =>
      workflow.assertReleaseCandidateScope(fixture.root, fixture.devSha, '1.0.1'),
    ).toThrow('may update only lastReviewedAt and lastReviewedCommit');
  });

  it('reuses an existing exact release PR without mutating the repository', () => {
    const fixture = createFixture();
    const candidateSha = 'a'.repeat(40);
    const existing = [
      {
        number: 52,
        url: 'https://example.test/pull/52',
        state: 'OPEN',
        headRefOid: candidateSha,
        baseRefName: 'dev',
        headRefName: 'codex/issue-778-version-v1.0.1',
        body: `<!-- tiangong-next-release-automation:v1 issue=778 version=1.0.1 base=${fixture.devSha} candidate=${candidateSha} -->`,
      },
    ];
    const candidateDocuments = versionDocuments('1.0.1');
    const result = runCli(
      fixture,
      releaseScript,
      ['--version', '1.0.1', '--issue', '778', '--head-owner', 'fixture', '--apply'],
      {
        FAKE_GH_PR_LIST: JSON.stringify(existing),
        FAKE_GH_PACKAGE_JSON: JSON.stringify(candidateDocuments.packageJson),
        FAKE_GH_PACKAGE_LOCK: JSON.stringify(candidateDocuments.packageLock),
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'ready_for_review',
      reused: true,
      pull_request: { number: 52 },
    });
    expect(git(fixture.root, ['branch', '--show-current'])).toBe('main');
    expect(git(fixture.root, ['status', '--porcelain'])).toBe('');
  });

  it('creates an immutable promotion branch from the exact merged dev SHA', () => {
    const fixture = createFixture('1.0.1');
    const npmLog = path.join(fixture.container, 'npm.log');
    const result = runCli(
      fixture,
      promotionScript,
      ['--release-pr', '42', '--issue', '778', '--head-owner', 'fixture', '--apply'],
      {
        FAKE_GH_PR_VIEW: promotionPr(fixture),
        FAKE_GH_CREATED_URL: 'https://example.test/pull/53',
        FAKE_NPM_LOG: npmLog,
      },
    );

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      command: 'promote-dev-to-main',
      status: 'ready_for_review',
      version: '1.0.1',
      dev_merge_sha: fixture.devSha,
      candidate_sha: fixture.devSha,
      pull_request: { url: 'https://example.test/pull/53' },
      gate: { status: 'passed' },
    });
    expect(git(fixture.root, ['branch', '--show-current'])).toBe(
      'codex/promote-v1.0.1-dev-to-main-issue-778',
    );
    expect(git(fixture.root, ['rev-parse', 'HEAD'])).toBe(fixture.devSha);
    expect(fs.readFileSync(npmLog, 'utf8')).toContain('push:checked');
  });

  it('fails closed when dev advances after the merged Release PR', () => {
    const fixture = createFixture('1.0.1');
    const releaseSha = fixture.devSha;
    git(fixture.root, ['switch', 'dev']);
    fs.appendFileSync(path.join(fixture.root, 'dev.txt'), 'advanced\n');
    git(fixture.root, ['add', 'dev.txt']);
    git(fixture.root, ['commit', '-m', 'advance dev']);
    git(fixture.root, ['push', '--no-verify', 'origin', 'dev']);
    git(fixture.root, ['switch', 'main']);

    const result = runCli(
      fixture,
      promotionScript,
      ['--release-pr', '42', '--issue', '778', '--head-owner', 'fixture'],
      { FAKE_GH_PR_VIEW: promotionPr(fixture, releaseSha) },
    );

    expect(result.status).toBe(workflow.EXIT.drift);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      complete: false,
      status: 'failed',
      error: { code: 'dev_advanced_after_release' },
    });
  });

  it('rejects a merged dev PR without a release automation identity', () => {
    const fixture = createFixture('1.0.1');
    const pr = JSON.parse(promotionPr(fixture));
    pr.body = 'ordinary merged PR';
    const result = runCli(
      fixture,
      promotionScript,
      ['--release-pr', '42', '--issue', '778', '--head-owner', 'fixture'],
      { FAKE_GH_PR_VIEW: JSON.stringify(pr) },
    );

    expect(result.status).toBe(workflow.EXIT.drift);
    expect(JSON.parse(result.stdout)).toMatchObject({
      complete: false,
      error: { code: 'release_pr_identity_missing' },
    });
  });
});
