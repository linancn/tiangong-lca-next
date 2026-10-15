import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WORKFLOW = readFileSync(
  path.resolve(__dirname, '../../../.github/workflows/build.yml'),
  'utf8',
);
const PROJECT_ID = 'makers-dtpthotshhpt';
const PROJECT_NAME = 'atlas-lca-platform';
const SOURCE = 'a'.repeat(40);
const TAG = 'v0.0.133';

// Execute the publication scripts extracted from the real workflow. The fake SDK
// supplies only the public interface and records side effects in an isolated folder;
// it never imports a network client or reads an account credential.
function stepSource(name: string): string {
  const marker = `      - name: ${name}\n`;
  const start = WORKFLOW.indexOf(marker);
  if (start < 0) throw new Error(`Missing workflow step: ${name}`);
  const end = WORKFLOW.indexOf('\n      - name: ', start + marker.length);
  const step = WORKFLOW.slice(start, end < 0 ? undefined : end);
  const run = step.indexOf('        run: |\n');
  if (run < 0) throw new Error(`Missing executable block: ${name}`);
  return step
    .slice(run + '        run: |\n'.length)
    .split('\n')
    .map((line) => line.replace(/^ {10}/u, ''))
    .join('\n');
}

function jobSource(name: string): string {
  const start = WORKFLOW.indexOf(`\n  ${name}:\n`);
  if (start < 0) throw new Error(`Missing workflow job: ${name}`);
  const remaining = WORKFLOW.slice(start + 1);
  const nextJob = remaining.slice(1).search(/\n  [a-z][a-z-]*:\n/u);
  return nextJob < 0 ? remaining : remaining.slice(0, nextJob + 1);
}

const SDK_STUB = `
import fs from 'node:fs';
const config = () => JSON.parse(fs.readFileSync(process.env.SDK_CONFIG, 'utf8'));
const log = (method, input) => fs.appendFileSync(process.env.SDK_TRACE, JSON.stringify({ method, input }) + '\\n');
export class Makers {
  constructor() {
    this.region = 'global';
    this.projects = { get: async input => {
      log('get', input);
      return { projectId: '${PROJECT_ID}', name: '${PROJECT_NAME}', ...config().project };
    }};
    this.deployments = {
      deploy: async input => {
        log('deploy', input);
        return { deploymentId: 'deployment-fixture', projectId: '${PROJECT_ID}', env: 'Production', ...config().created };
      },
      wait: async input => {
        log('wait', input);
        if (config().waitThrows) throw new Error('Synthetic wait timeout');
        return { deploymentId: 'deployment-fixture', projectId: '${PROJECT_ID}', env: 'Production', status: 'Success', ...config().completed };
      },
    };
  }
}
`;

describe('Atlas publication (executed build.yml scripts)', () => {
  let folder: string;
  let proof: string;
  let env: NodeJS.ProcessEnv;

  const json = (filename: string) => JSON.parse(readFileSync(filename, 'utf8'));
  const writeJson = (filename: string, value: unknown) =>
    writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
  const calls = (): { method: string; input: Record<string, unknown> }[] => {
    const trace = path.join(folder, 'sdk-trace.jsonl');
    return existsSync(trace)
      ? readFileSync(trace, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [];
  };
  const run = (name: string, overrides: Record<string, string> = {}) =>
    spawnSync('bash', ['-euo', 'pipefail', '-c', stepSource(name)], {
      cwd: folder,
      encoding: 'utf8',
      env: { ...env, ...overrides },
      timeout: 10000,
    });
  const publish = (overrides: Record<string, string> = {}) =>
    run('Deploy and verify exact Atlas project', overrides);

  beforeEach(() => {
    folder = mkdtempSync(path.join(tmpdir(), 'atlas-publication-'));
    proof = path.join(folder, 'proof');
    const sdk = path.join(folder, 'sdk');
    const sdkPackage = path.join(sdk, 'node_modules/@edgeone/makers-sdk');
    mkdirSync(sdkPackage, { recursive: true });
    mkdirSync(proof);
    mkdirSync(path.join(folder, 'dist'));
    mkdirSync(path.join(folder, 'dist-edgeone/.edgeone/assets'), { recursive: true });
    writeJson(path.join(sdk, 'package.json'), {});
    writeJson(path.join(sdkPackage, 'package.json'), {
      name: '@edgeone/makers-sdk',
      type: 'module',
      exports: './index.mjs',
    });
    writeFileSync(path.join(sdkPackage, 'index.mjs'), SDK_STUB);
    writeJson(path.join(folder, 'sdk-config.json'), {});
    writeJson(path.join(folder, 'dist/manifest.json'), { name: 'ATLAS' });
    writeFileSync(path.join(folder, 'dist/index.html'), '<script src="/umi.abc123.js"></script>');
    writeFileSync(path.join(folder, 'dist/umi.abc123.js'), 'window.atlasFixture = true;\n');
    env = {
      PATH: process.env.PATH,
      APP_BRAND: 'atlas',
      ATLAS_PROJECT_ID: PROJECT_ID,
      ATLAS_PROJECT_NAME: PROJECT_NAME,
      ATLAS_SDK_DIR: sdk,
      ATLAS_PROOF_DIR: proof,
      ATLAS_ARCHIVE_PATH: path.join(folder, 'atlas-release.zip'),
      EDGEONE_OUTPUT_DIR: 'dist-edgeone',
      EDGEONE_API_TOKEN: 'synthetic-fixture-token',
      RELEASE_HEAD: SOURCE,
      TAG_NAME: TAG,
      GITHUB_SHA: 'b'.repeat(40),
      GITHUB_RUN_ID: '123',
      GITHUB_RUN_ATTEMPT: '2',
      GITHUB_STEP_SUMMARY: path.join(folder, 'summary.md'),
      SDK_CONFIG: path.join(folder, 'sdk-config.json'),
      SDK_TRACE: path.join(folder, 'sdk-trace.jsonl'),
    };
    const build = run('Record Atlas build provenance');
    if (build.status !== 0) throw new Error(`Fixture provenance failed: ${build.stderr}`);
    for (const file of ['manifest.json', 'index.html', 'umi.abc123.js', 'release-manifest.json'])
      copyFileSync(
        path.join(folder, 'dist', file),
        path.join(folder, 'dist-edgeone/.edgeone/assets', file),
      );
    writeJson(path.join(folder, 'dist-edgeone/.edgeone/routes.json'), { version: 3, routes: [] });
    writeJson(path.join(folder, 'dist-edgeone/edgeone.json'), { rewrites: [] });
    const archive = run('Archive exact Atlas bundle including hidden routes');
    if (archive.status !== 0) throw new Error(`Fixture archive failed: ${archive.stderr}`);
  });

  afterEach(() => rmSync(folder, { recursive: true, force: true }));

  it('verifies the exact destination before producing a destination receipt', () => {
    expect(run('Verify exact Atlas destination').status).toBe(0);
    expect(calls()).toEqual([{ method: 'get', input: { projectId: PROJECT_ID } }]);
    expect(json(path.join(proof, 'destination.json'))).toEqual({
      projectId: PROJECT_ID,
      projectName: PROJECT_NAME,
      region: 'global',
      sdkVersion: '0.1.0',
    });
  });

  it.each<[string, Record<string, string>]>([
    ['wrong project ID', { projectId: 'makers-another' }],
    ['wrong project name', { name: 'another-project' }],
  ])('rejects a destination response with %s before deployment', (_label, project) => {
    writeJson(path.join(folder, 'sdk-config.json'), { project });
    expect(run('Verify exact Atlas destination').status).not.toBe(0);
    expect(publish().status).not.toBe(0);
    expect(calls().some((call) => call.method === 'deploy')).toBe(false);
    expect(existsSync(path.join(proof, 'destination.json'))).toBe(false);
  });

  it.each<[string, Record<string, string>]>([
    ['brand', { APP_BRAND: 'tiangong' }],
    ['project ID', { ATLAS_PROJECT_ID: 'makers-another' }],
    ['project name', { ATLAS_PROJECT_NAME: 'another-project' }],
    ['source SHA', { RELEASE_HEAD: 'c'.repeat(40) }],
    ['tag', { TAG_NAME: 'v0.0.134' }],
    ['credential', { EDGEONE_API_TOKEN: '' }],
  ])('rejects mismatched %s before any SDK operation', (_label, overrides) => {
    expect(publish(overrides).status).not.toBe(0);
    expect(calls()).toEqual([]);
    expect(existsSync(path.join(proof, 'deployment.json'))).toBe(false);
  });

  it('rejects an archive modified after its receipt was recorded', () => {
    writeFileSync(env.ATLAS_ARCHIVE_PATH!, 'changed zip bytes');
    const result = publish();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Atlas archive changed after verification');
    expect(calls()).toEqual([]);
  });

  it('binds successful publication to the source, archive and destination', () => {
    const result = publish();
    expect(result.status).toBe(0);
    expect(calls().map((call) => call.method)).toEqual(['get', 'deploy', 'wait']);
    expect(calls()[1].input).toEqual({
      projectId: PROJECT_ID,
      artifact: { archive: env.ATLAS_ARCHIVE_PATH },
      env: 'Production',
      wait: false,
    });
    expect(calls()[2].input).toMatchObject({
      projectId: PROJECT_ID,
      deploymentId: 'deployment-fixture',
      timeout: 900,
      pollInterval: 5,
    });
    expect(json(path.join(proof, 'deployment.json'))).toMatchObject({
      brand: 'atlas',
      sourceCommit: SOURCE,
      tag: TAG,
      projectId: PROJECT_ID,
      projectName: PROJECT_NAME,
      deploymentId: 'deployment-fixture',
      env: 'Production',
      status: 'Success',
      archiveSha256: json(path.join(proof, 'archive.json')).sha256,
    });
  });

  it('preserves creation evidence when waiting throws, without creating again', () => {
    writeJson(path.join(folder, 'sdk-config.json'), { waitThrows: true });
    expect(publish().status).not.toBe(0);
    expect(calls().filter((call) => call.method === 'deploy')).toHaveLength(1);
    expect(json(path.join(proof, 'deployment.json'))).toMatchObject({
      sourceCommit: SOURCE,
      deploymentId: 'deployment-fixture',
      projectId: PROJECT_ID,
      status: 'Pending',
    });
  });

  it('records a failed deployment and fails publication', () => {
    writeJson(path.join(folder, 'sdk-config.json'), { completed: { status: 'Failed' } });
    const result = publish();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Atlas deployment ended with Failed');
    expect(json(path.join(proof, 'deployment.json')).status).toBe('Failed');
    expect(calls().filter((call) => call.method === 'deploy')).toHaveLength(1);
  });

  it('rejects completion for a different deployment before recording success', () => {
    writeJson(path.join(folder, 'sdk-config.json'), {
      completed: { deploymentId: 'another-deployment' },
    });
    expect(publish().status).not.toBe(0);
    expect(json(path.join(proof, 'deployment.json')).status).toBe('Pending');
  });

  it('records the entry hash and source in the shipped provenance file', () => {
    const built = json(path.join(folder, 'dist/release-manifest.json'));
    expect(built).toEqual(json(path.join(proof, 'build.json')));
    expect(built).toMatchObject({
      brand: 'atlas',
      sourceCommit: SOURCE,
      tag: TAG,
      entry: 'umi.abc123.js',
      entrySha256: createHash('sha256')
        .update(readFileSync(path.join(folder, 'dist/umi.abc123.js')))
        .digest('hex'),
    });
  });

  it('rejects a TianGong artifact when recording Atlas provenance', () => {
    writeJson(path.join(folder, 'dist/manifest.json'), { name: 'TianGong' });
    const result = run('Record Atlas build provenance');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Built artifact is not Atlas');
  });

  it('archives hidden routing and public provenance byte for byte', () => {
    const result = spawnSync(
      'python3',
      [
        '-c',
        [
          'import pathlib, sys, zipfile',
          'root = pathlib.Path(sys.argv[1])',
          'archive = zipfile.ZipFile(root / "atlas-release.zip")',
          'names = archive.namelist()',
          'assert "dist-edgeone/.edgeone/routes.json" in names',
          'assert "dist-edgeone/edgeone.json" in names',
          'assert "dist-edgeone/.edgeone/assets/release-manifest.json" in names',
          'assert all(archive.read(name) == (root / name).read_bytes() for name in names)',
        ].join('\n'),
        folder,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    const receipt = json(path.join(proof, 'archive.json'));
    expect(receipt.sha256).toBe(
      createHash('sha256').update(readFileSync(env.ATLAS_ARCHIVE_PATH!)).digest('hex'),
    );
  });

  it('rejects a symlink before replacing the verified ZIP', () => {
    symlinkSync(
      path.join(folder, 'dist/index.html'),
      path.join(folder, 'dist-edgeone/linked.html'),
    );
    const before = readFileSync(env.ATLAS_ARCHIVE_PATH!);
    const result = run('Archive exact Atlas bundle including hidden routes');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Symlink in deploy bundle');
    expect(readFileSync(env.ATLAS_ARCHIVE_PATH!)).toEqual(before);
  });
});

describe('Atlas release admission and publication boundaries', () => {
  it('deploys both brands from the same qualified and tagged release head', () => {
    for (const name of ['web-deploy', 'atlas-web-deploy']) {
      const job = jobSource(name);
      expect(job).toContain('      - release-qualified\n');
      expect(job).toContain('      - release-tag\n');
      expect(job).toContain("needs.release-qualified.result == 'success'");
      expect(job).toContain("needs.release-tag.result == 'success'");
      expect(job).toContain('ref: ${{ needs.release-context.outputs.release_head }}');
    }
    expect(jobSource('atlas-web-deploy')).toContain('      APP_BRAND: atlas\n');
    expect(jobSource('atlas-web-deploy')).toContain(`      ATLAS_PROJECT_ID: ${PROJECT_ID}\n`);
  });

  it('restricts TianGong and desktop publication to full scope while Atlas accepts backfill', () => {
    for (const name of ['web-deploy', 'release-draft', 'release', 'verify-release'])
      expect(jobSource(name)).toContain(
        "needs.release-context.outputs.publication_scope == 'full'",
      );
    expect(jobSource('atlas-web-deploy')).not.toContain("publication_scope == 'full'");
    expect(jobSource('release-gate')).toContain("gate_mode == 'full'");
    expect(
      stepSource('Require the dev candidate proof or an explicit recovery full gate'),
    ).toContain('[ "${GATE_MODE}" = "full" ] && [ "${FULL_GATE_RESULT}" = "success" ]');
    const resolve = stepSource('Resolve release target');
    expect(resolve).toContain('Atlas-only backfill requires an exact expected release SHA.');
    expect(resolve).toContain('Atlas-only backfill must target the current Main package version.');
    expect(jobSource('atlas-web-deploy')).toContain('        if: always()\n');
  });
});
