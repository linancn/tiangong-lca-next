import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  loadUsersConfig,
  pickCredentialByRole,
} from '../../data-workflows/workflows/workflow-shared';
import { readVerifiedProductionBackendTarget } from '../../e2e/i18n/production-backend-target';

const controller = require('../../../scripts/e2e/release-e2e.cjs') as {
  RECEIPT_SCHEMA_VERSION: number;
  acquireInvocationLock: (command: string, lockPath: string) => () => void;
  assertLocalOperatorHostEnvironment: (
    options: Record<string, any>,
    environment?: Record<string, string | undefined>,
  ) => void;
  commandHelp: () => string;
  createReceipt: (input: Record<string, any>, key: Buffer) => Record<string, any>;
  dockerRunArguments: (
    context: Record<string, any>,
    options: Record<string, any>,
    runDirectory: string,
    runtimeInputs: Record<string, any>,
  ) => string[];
  parseOptions: (command: string, args: string[]) => Record<string, any>;
  playwrightArguments: (options: Record<string, any>) => string[];
  redactString: (value: string, sensitiveValues?: string[]) => string;
  sanitize: (value: unknown, sensitiveValues?: string[]) => unknown;
  validateReceipt: (
    receipt: Record<string, unknown>,
    now: number,
    key: Buffer,
  ) => Record<string, unknown>;
  validateRunOptions: (options: Record<string, any>) => void;
};
const staticServer = require('../../../scripts/e2e/static-server.cjs') as {
  bundleDigest: (root: string) => string;
  safeAssetPath: (root: string, pathname: string) => string | undefined;
};
const buildVerifier = require('../../../scripts/e2e/verify-build-input.cjs') as {
  sha256File: (filePath: string) => string;
  verifyBuildInputs: (input: Record<string, string>) => void;
};

const controllerPath = path.resolve(process.cwd(), 'scripts/e2e/release-e2e.cjs');
const temporaryDirectories: string[] = [];

function makeTemporaryDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-e2e-runner-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop()!, { force: true, recursive: true });
  }
});

describe('release E2E controller contracts', () => {
  it('exposes one discoverable command surface with an argument-free exact resume', () => {
    const help = controller.commandHelp();
    expect(help).toContain('npm run e2e:env:install');
    expect(help).toContain('npm run e2e:env:doctor');
    expect(help).toContain('npm run e2e:release');
    expect(help).toContain('npm run e2e:release:resume');
    expect(help).toContain('npm run e2e:env:clean');
    expect(help).toContain('npm run e2e:dev');
    expect(() => controller.parseOptions('resume', ['--format=json'])).toThrow(
      'Resume accepts no arguments',
    );
    expect(() => controller.parseOptions('doctor', ['--authenticated'])).toThrow(
      'not valid for doctor',
    );
    expect(() => controller.parseOptions('run', ['--authenticated=false'])).toThrow(
      'does not accept a value',
    );
  });

  it('keeps the global login identity role-neutral while requiring explicit write authorization', () => {
    const authenticated = controller.parseOptions('run', [
      '--authenticated',
      '--role=data_product_manager',
      '--project=firefox',
      '--spec=tests/e2e/i18n/semantic-critical.spec.ts',
      '--grep=login',
    ]);
    expect(() => controller.validateRunOptions(authenticated)).not.toThrow();
    expect(controller.playwrightArguments(authenticated)).toEqual([
      'tests/e2e/i18n/semantic-critical.spec.ts',
      '--project=firefox',
      '--grep=login',
    ]);
    const repeatedDiagnostic = controller.parseOptions('run', [
      '--project=chromium',
      '--grep=locale race',
      '--repeat-each=5',
    ]);
    expect(() => controller.validateRunOptions(repeatedDiagnostic)).not.toThrow();
    expect(controller.playwrightArguments(repeatedDiagnostic)).toEqual([
      '--project=chromium',
      '--grep=locale race',
      '--repeat-each=5',
    ]);
    expect(() =>
      controller.validateRunOptions(controller.parseOptions('run', ['--repeat-each=3'])),
    ).toThrow('limited to a focused read-only diagnostic scope');

    const unauthorizedWrite = controller.parseOptions('run', ['--allow-production-data']);
    expect(() => controller.validateRunOptions(unauthorizedWrite)).toThrow(
      '--allow-production-data requires --authenticated.',
    );
    const focusedEvidence = controller.parseOptions('run', [
      '--authenticated',
      '--allow-production-data',
      '--write-verified-evidence',
      '--project=chromium',
    ]);
    expect(() => controller.validateRunOptions(focusedEvidence)).toThrow(
      'Focused diagnostic scopes cannot write verified release evidence.',
    );
  });

  it('keeps production writes local while clearing only image-inherited CI markers', () => {
    const readOnly = controller.parseOptions('run', []);
    expect(() =>
      controller.assertLocalOperatorHostEnvironment(readOnly, { CI: 'true' }),
    ).not.toThrow();

    const productionData = controller.parseOptions('run', [
      '--authenticated',
      '--allow-production-data',
    ]);
    expect(() =>
      controller.assertLocalOperatorHostEnvironment(productionData, { CI: 'true' }),
    ).toThrow('forbidden when the host is CI or GitHub Actions');
    expect(() =>
      controller.assertLocalOperatorHostEnvironment(productionData, { GITHUB_ACTIONS: 'true' }),
    ).toThrow('forbidden when the host is CI or GitHub Actions');
    expect(() => controller.assertLocalOperatorHostEnvironment(productionData, {})).not.toThrow();

    const productionArgs = controller.dockerRunArguments(
      { imageTag: 'candidate:test' },
      productionData,
      '/host/run',
      {
        recoveryLedger: '/host/recovery/ledger.json',
        trackedMainEnvironmentPath: '/host/input/main.env',
      },
    );
    expect(productionArgs).toContain('CI=');
    expect(productionArgs).toContain('GITHUB_ACTIONS=');

    const readOnlyArgs = controller.dockerRunArguments(
      { imageTag: 'candidate:test' },
      readOnly,
      '/host/run',
      {
        recoveryLedger: '/host/recovery/ledger.json',
        trackedMainEnvironmentPath: '/host/input/main.env',
      },
    );
    expect(readOnlyArgs).not.toContain('CI=');
    expect(readOnlyArgs).not.toContain('GITHUB_ACTIONS=');
  });

  it('emits parseable JSON-only stdout and a coarse input exit code on refusal', () => {
    const result = spawnSync(
      process.execPath,
      [controllerPath, 'run', '--format=json', '--allow-production-data'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      exitCode: 2,
      failureCode: 'E2E_PRODUCTION_DATA_REQUIRES_AUTH',
      phase: 'input',
      status: 'failed',
    });
  });

  it('refuses host CI production writes before checking Docker or credentials', () => {
    const result = spawnSync(
      process.execPath,
      [controllerPath, 'run', '--format=json', '--authenticated', '--allow-production-data'],
      { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, CI: 'true' } },
    );
    expect(result.status).toBe(30);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      exitCode: 30,
      failureCode: 'E2E_PRODUCTION_DATA_FORBIDDEN_IN_HOST_CI',
      phase: 'safety',
      status: 'failed',
    });
  });

  it('redacts credential-shaped fields and token values without hiding identity hashes', () => {
    expect(
      controller.sanitize(
        {
          message: 'request used Bearer secret-token and private-value',
          password: 'private-value',
          publishableKey: 'public-key-value',
          publishableKeySha256: 'identity-hash',
        },
        ['private-value'],
      ),
    ).toEqual({
      message: 'request used Bearer [REDACTED] and [REDACTED]',
      password: '[REDACTED]',
      publishableKey: '[REDACTED]',
      publishableKeySha256: 'identity-hash',
    });
  });

  it('accepts only the exact unexpired F4 continuation receipt envelope', () => {
    const key = Buffer.alloc(32, 7);
    const trackedMainEnvironmentPath = path.join(makeTemporaryDirectory(), 'tracked-main.env');
    fs.writeFileSync(trackedMainEnvironmentPath, 'SUPABASE_URL=https://example.test\n');
    const receipt = controller.createReceipt(
      {
        error: { failureCode: 'E2E_SERVER_FAILED', phase: 'candidate-server' },
        imageId: `sha256:${'1'.repeat(64)}`,
        imageTag: 'tiangong-lca-next-e2e:abc123-def456',
        manifest: {
          candidate: {
            commit: 'a'.repeat(40),
            packageLockSha256: 'b'.repeat(64),
            tree: 'c'.repeat(40),
          },
          environment: { contractSha256: 'd'.repeat(64) },
          sources: { e2eTree: 'e'.repeat(40) },
        },
        options: controller.parseOptions('run', []),
        runtimeInputs: { trackedMainEnvironmentPath },
      },
      key,
    );
    const now = Date.now();
    expect(controller.validateReceipt(receipt, now, key)).toBe(receipt);
    expect(() =>
      controller.validateReceipt(receipt, Date.parse(receipt.expiresAt) + 1, key),
    ).toThrow('continuation receipt has expired');
    expect(() =>
      controller.validateReceipt(
        { ...receipt, invocation: { ...receipt.invocation, offline: true } },
        now,
        key,
      ),
    ).toThrow('integrity check failed');
    expect(() => controller.validateReceipt({ ...receipt, schemaVersion: 3 }, now, key)).toThrow(
      'unsupported shape',
    );
    expect(() => controller.validateReceipt(receipt, now, Buffer.alloc(32, 8))).toThrow(
      'integrity check failed',
    );
    const refreshed = controller.createReceipt(
      {
        error: { failureCode: 'E2E_PREFLIGHT_FAILED', phase: 'preflight' },
        imageId: receipt.image.id,
        imageTag: receipt.image.tag,
        manifest: {
          candidate: receipt.candidate,
          environment: receipt.environment,
          sources: { e2eTree: 'e'.repeat(40) },
        },
        options: controller.parseOptions('run', []),
        previousReceipt: receipt,
        runtimeInputs: { trackedMainEnvironmentPath },
      },
      Buffer.alloc(32, 9),
    );
    expect(refreshed.activatedAt).toBe(receipt.activatedAt);
    expect(refreshed.expiresAt).toBe(receipt.expiresAt);
  });

  it('serializes mutating commands and safely replaces only a dead-owner lock', () => {
    const directory = makeTemporaryDirectory();
    const lockPath = path.join(directory, 'invocation.lock');
    const release = controller.acquireInvocationLock('run', lockPath);
    expect(() => controller.acquireInvocationLock('clean', lockPath)).toThrow('already active');
    release();
    expect(fs.existsSync(lockPath)).toBe(false);

    fs.mkdirSync(lockPath);
    fs.writeFileSync(
      path.join(lockPath, 'owner.json'),
      `${JSON.stringify({ command: 'run', pid: 2_147_483_647 })}\n`,
    );
    const releaseRecovered = controller.acquireInvocationLock('run', lockPath);
    releaseRecovered();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('preserves the exact custom recovery-ledger basename inside the container', () => {
    const args = controller.dockerRunArguments(
      { imageTag: 'candidate:test' },
      controller.parseOptions('run', []),
      '/host/run',
      {
        recoveryLedger: '/host/recovery/custom-ledger.json',
        trackedMainEnvironmentPath: '/host/input/main.env',
      },
    );
    expect(args).toContain('E2E_RECOVERY_LEDGER_PATH=/e2e-recovery/custom-ledger.json');
    expect(args).toContain('/host/recovery:/e2e-recovery');
  });

  it('pins the Playwright image digest and never mounts the parent workspace', () => {
    const environment = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'docker/e2e/environment.json'), 'utf8'),
    ) as { playwrightImage: string; playwrightVersion: string };
    const dockerfile = fs.readFileSync(
      path.resolve(process.cwd(), 'docker/e2e/Dockerfile'),
      'utf8',
    );
    const controllerSource = fs.readFileSync(controllerPath, 'utf8');
    expect(environment.playwrightVersion).toBe('1.61.1');
    expect(environment.playwrightImage).toMatch(
      /^mcr\.microsoft\.com\/playwright:v1\.61\.1-noble@sha256:[a-f0-9]{64}$/u,
    );
    expect(dockerfile).toContain(`ARG PLAYWRIGHT_IMAGE=${environment.playwrightImage}`);
    expect(dockerfile).toContain('npm ci --ignore-scripts');
    expect(dockerfile).toContain('node /tmp/verify-build-input.cjs');
    expect(controllerSource).toContain('org.tiangong.lca.next.package-json-sha256');
    expect(controllerSource).not.toContain('.git/modules');
    expect(controllerSource).not.toContain('lca-workspace');
    expect(controllerSource).toContain(`${'${runDirectory}'}:/e2e-output`);
    expect(controllerSource).toContain("E2E_RELEASE_MODE: 'true'");
    expect(fs.readFileSync(path.resolve(process.cwd(), 'playwright.config.ts'), 'utf8')).toContain(
      'retries: releaseRun ? 0',
    );
    expect(
      fs.readFileSync(
        path.resolve(process.cwd(), '.github/workflows/i18n-semantic-e2e.yml'),
        'utf8',
      ),
    ).toContain("E2E_RELEASE_MODE: 'true'");
    expect(
      fs.readFileSync(path.resolve(process.cwd(), 'tests/e2e/i18n/evidence-reporter.ts'), 'utf8'),
    ).toContain('E2E_CANDIDATE_MANIFEST_PATH');
  });
});

describe('release E2E isolated runtime inputs', () => {
  it('serves a deterministic bundle identity and refuses traversal outside dist', () => {
    const root = makeTemporaryDirectory();
    fs.writeFileSync(path.join(root, 'index.html'), '<main>candidate</main>\n');
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'assets/app.js'), 'console.log("candidate");\n');
    const firstDigest = staticServer.bundleDigest(root);
    expect(firstDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(staticServer.bundleDigest(root)).toBe(firstDigest);
    expect(staticServer.safeAssetPath(root, '/assets/app.js')).toBe(
      fs.realpathSync(path.join(root, 'assets/app.js')),
    );
    expect(staticServer.safeAssetPath(root, '/../outside.txt')).toBeUndefined();
    const outside = path.join(makeTemporaryDirectory(), 'secret.txt');
    fs.writeFileSync(outside, 'not part of the candidate\n');
    fs.symlinkSync(outside, path.join(root, 'assets/secret.txt'));
    expect(staticServer.safeAssetPath(root, '/assets/secret.txt')).toBeUndefined();
    expect(() => staticServer.bundleDigest(root)).toThrow('Unsupported static bundle entry');
  });

  it('verifies every candidate build input before extracting the archive', () => {
    const directory = makeTemporaryDirectory();
    const files = Object.fromEntries(
      ['archive', 'environment', 'packageJson', 'packageLock'].map((name) => {
        const filePath = path.join(directory, `${name}.input`);
        fs.writeFileSync(filePath, `${name}\n`);
        return [name, filePath];
      }),
    );
    const manifestPath = path.join(directory, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify({
        candidate: {
          archiveSha256: buildVerifier.sha256File(files.archive),
          packageJsonSha256: buildVerifier.sha256File(files.packageJson),
          packageLockSha256: buildVerifier.sha256File(files.packageLock),
        },
        environment: {
          contractSha256: buildVerifier.sha256File(files.environment),
        },
      })}\n`,
    );
    const input = {
      archivePath: files.archive,
      environmentPath: files.environment,
      manifestPath,
      packageJsonPath: files.packageJson,
      packageLockPath: files.packageLock,
    };
    expect(() => buildVerifier.verifyBuildInputs(input)).not.toThrow();
    fs.writeFileSync(files.archive, 'mutated\n');
    expect(() => buildVerifier.verifyBuildInputs(input)).toThrow(
      'Candidate build input digest mismatch',
    );
  });

  it('loads a runtime-only users env file without requiring a business role globally', async () => {
    const directory = makeTemporaryDirectory();
    const usersEnvPath = path.join(directory, 'users.env');
    fs.writeFileSync(
      usersEnvPath,
      'TEST_USER_EMAIL=e2e-user@example.test\nTEST_USER_PASSWORD=runtime-only-password\n',
      { mode: 0o600 },
    );
    const loaded = await loadUsersConfig(
      path.join(directory, 'missing-users.json'),
      {},
      {
        usersEnvFilePath: usersEnvPath,
      },
    );
    expect(pickCredentialByRole(loaded.users, 'user', loaded.sourceLabel)).toMatchObject({
      email: 'e2e-user@example.test',
      requestedRole: 'user',
      resolvedRole: 'user',
    });
    expect(
      fs.readFileSync(path.resolve(process.cwd(), 'tests/e2e/i18n/auth.ts'), 'utf8'),
    ).toContain('E2E_USERS_ENV_FILE');
  });

  it('uses the host-exported tracked-main environment without container Git metadata', () => {
    const directory = makeTemporaryDirectory();
    const trackedMainPath = path.join(directory, 'tracked-main.env');
    fs.copyFileSync(path.resolve(process.cwd(), '.env'), trackedMainPath);
    const originalPath = process.env.E2E_TRACKED_MAIN_ENV_PATH;
    process.env.E2E_TRACKED_MAIN_ENV_PATH = trackedMainPath;
    try {
      expect(readVerifiedProductionBackendTarget()).toMatchObject({
        origin: expect.stringMatching(/^https:\/\//u),
        candidateEnvironmentSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        trackedMainEnvironmentSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      });
    } finally {
      if (originalPath === undefined) delete process.env.E2E_TRACKED_MAIN_ENV_PATH;
      else process.env.E2E_TRACKED_MAIN_ENV_PATH = originalPath;
    }
  });
});
