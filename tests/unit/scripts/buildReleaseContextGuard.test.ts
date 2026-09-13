import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(__dirname, '../../..');

// The release admission guard lives inline in the actual build.yml "Resolve release
// target" step. These tests extract that exact `run:` block from the workflow file and
// execute it with fixture git remotes, so the real workflow bytes are proven — not a
// mirrored reimplementation. GitHub's canonical repository is rewritten to a local
// bare remote through git's insteadOf mapping, exactly like a single-origin clone
// pointing at the verified canonical remote.
const CANONICAL_URL = 'https://github.com/tiangong-lca/platform.git';
const CANONICAL_REPOSITORY = 'tiangong-lca/platform';
const CANONICAL_REPOSITORY_ID = '805297890';
const CANONICAL_REPOSITORY_OWNER_ID = '327771381';
const LEGACY_REPOSITORY = 'linancn/tiangong-lca-next';

function extractReleaseTargetBlock(): string {
  const workflow = readFileSync(path.join(REPO_ROOT, '.github/workflows/build.yml'), 'utf8');
  const stepMarker = '      - name: Resolve release target\n';
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThanOrEqual(0);
  const runMarker = '        run: |\n';
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);
  const blockStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf('\n      - name: ', blockStart);
  expect(nextStep).toBeGreaterThan(blockStart);
  return workflow.slice(blockStart, nextStep);
}

describe('build.yml release-context canonical admission (executed workflow guard)', () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'next-release-guard-'));
  const bareRemote = path.join(folder, 'origin.git');
  const work = path.join(folder, 'work');
  let baseSha = '';
  let headSha = '';
  let blockFile: string;
  let outputFile: string;
  let summaryFile: string;

  function gitEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith('GIT_')) env[key] = value as string;
    }
    env.GIT_CONFIG_NOSYSTEM = '1';
    env.GIT_CONFIG_GLOBAL = path.join(folder, 'empty.gitconfig');
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = `url.${pathToFileURL(bareRemote).href}.insteadOf`;
    env.GIT_CONFIG_VALUE_0 = CANONICAL_URL;
    return env;
  }

  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: work, env: gitEnv(), encoding: 'utf8' }).trim();

  function writeCommit(version: string, message: string): string {
    writeFileSync(
      path.join(work, 'package.json'),
      `${JSON.stringify({ name: 'tiangong-lca-next', version }, null, 2)}\n`,
    );
    git('add', 'package.json');
    git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  }

  function readIfExists(target: string): string {
    try {
      return readFileSync(target, 'utf8');
    } catch {
      return '';
    }
  }

  function runGuard(overrides: Record<string, string>): {
    status: number | null;
    stdout: string;
    stderr: string;
    outputs: Record<string, string>;
  } {
    rmSync(outputFile, { force: true });
    rmSync(summaryFile, { force: true });
    const result = spawnSync('bash', [blockFile], {
      cwd: work,
      encoding: 'utf8',
      env: {
        ...gitEnv(),
        GITHUB_ACTIONS: 'true',
        GITHUB_EVENT_NAME: 'push',
        GITHUB_REF: 'refs/heads/main',
        GITHUB_REF_NAME: 'main',
        GITHUB_SHA: headSha,
        PUSH_BEFORE_SHA: baseSha,
        REQUESTED_TAG_NAME: '',
        GITHUB_REPOSITORY: CANONICAL_REPOSITORY,
        GITHUB_REPOSITORY_ID: CANONICAL_REPOSITORY_ID,
        GITHUB_REPOSITORY_OWNER_ID: CANONICAL_REPOSITORY_OWNER_ID,
        GITHUB_OUTPUT: outputFile,
        GITHUB_STEP_SUMMARY: summaryFile,
        ...overrides,
      },
    });
    const outputs: Record<string, string> = {};
    for (const line of readIfExists(outputFile).split('\n')) {
      const match = /^([^=]+)=(.*)$/u.exec(line);
      if (match) outputs[match[1]] = match[2];
    }
    return { status: result.status, stdout: result.stdout, stderr: result.stderr, outputs };
  }

  beforeAll(() => {
    const gitconfig = path.join(folder, 'empty.gitconfig');
    writeFileSync(gitconfig, '');
    execFileSync('git', ['init', '--bare', '-q', '--initial-branch=main', bareRemote], {
      env: gitEnv(),
    });
    execFileSync('git', ['init', '-q', '-b', 'main', work], { env: gitEnv() });
    git('config', 'user.name', 'Release guard fixture');
    git('config', 'user.email', 'release-guard@example.invalid');
    git('remote', 'add', 'origin', CANONICAL_URL);
    baseSha = writeCommit('0.0.102', 'base 0.0.102');
    git('push', '-q', 'origin', 'main');
    headSha = writeCommit('0.0.103', 'release 0.0.103');
    // The workflow runs after GitHub accepted this main push, so origin/main already
    // contains the release head; the guard's ancestry check depends on it.
    git('push', '-q', 'origin', 'main');
    blockFile = path.join(folder, 'release-target.sh');
    writeFileSync(blockFile, extractReleaseTargetBlock());
    outputFile = path.join(folder, 'github-output.txt');
    summaryFile = path.join(folder, 'github-step-summary.txt');
  });

  afterAll(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('admits the canonical repository with matching numeric ids and a changed version', () => {
    const { status, outputs } = runGuard({});
    expect(status).toBe(0);
    expect(outputs.should_release).toBe('true');
    expect(outputs.tag_name).toBe('v0.0.103');
    expect(outputs.release_head).toBe(headSha);
    expect(outputs.release_base).toBe(baseSha);
  });

  it('denies the legacy repository name', () => {
    const { status, outputs } = runGuard({ GITHUB_REPOSITORY: LEGACY_REPOSITORY });
    expect(status).toBe(0);
    expect(outputs.should_release).toBe('false');
    expect(outputs.release_head).toBeUndefined();
  });

  it('denies an unrelated fork repository name', () => {
    const { status, outputs } = runGuard({ GITHUB_REPOSITORY: 'some-fork/tiangong-lca-next' });
    expect(status).toBe(0);
    expect(outputs.should_release).toBe('false');
    expect(outputs.release_head).toBeUndefined();
  });

  it('denies a name-matching repository with a wrong repository id', () => {
    const { status, outputs } = runGuard({ GITHUB_REPOSITORY_ID: '8052978900' });
    expect(status).toBe(0);
    expect(outputs.should_release).toBe('false');
    expect(outputs.release_head).toBeUndefined();
  });

  it('denies a name-matching repository with a wrong owner id', () => {
    const { status, outputs } = runGuard({ GITHUB_REPOSITORY_OWNER_ID: '199785309' });
    expect(status).toBe(0);
    expect(outputs.should_release).toBe('false');
    expect(outputs.release_head).toBeUndefined();
  });
});
