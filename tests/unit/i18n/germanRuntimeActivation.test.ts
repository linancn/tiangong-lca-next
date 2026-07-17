import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const PACKAGE_JSON = path.join(REPOSITORY_ROOT, 'package.json');
const ACTIVE_DELIVERY_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/locale-delivery.mjs');
const HISTORICAL_ACTIVATION_SCRIPT = path.join(
  REPOSITORY_ROOT,
  'scripts/i18n/german-runtime-activation.mjs',
);
const CORRECTION_LEDGER = path.join(REPOSITORY_ROOT, 'docs/plans/i18n/corrections.json');

describe('German frozen-history and active automated-correction boundary', () => {
  it('routes active German validation through the shared locale delivery gate', () => {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

    expect(packageJson.scripts['i18n:de:audit']).toBe(
      'node --import tsx scripts/i18n/locale-delivery.mjs activation --locale de-DE --check',
    );
    expect(packageJson.scripts['i18n:de:runtime:manifest:check']).toBe(
      'node --import tsx scripts/i18n/locale-delivery.mjs activation --locale de-DE --check',
    );
    expect(packageJson.scripts['i18n:de:history:runtime:manifest:check']).toContain(
      'german-runtime-activation.mjs',
    );

    const activeSources = [
      fs.readFileSync(ACTIVE_DELIVERY_SCRIPT, 'utf8'),
      packageJson.scripts['i18n:de:audit'],
      packageJson.scripts['i18n:de:runtime:manifest:check'],
    ].join('\n');
    expect(activeSources).not.toMatch(/\.local\/.+confirmation/iu);
    expect(fs.readFileSync(HISTORICAL_ACTIVATION_SCRIPT, 'utf8')).toMatch(/DELTA_CONFIRMATION/u);
  });

  it('pins the accepted German baseline and validates current corrections without local evidence', () => {
    const ledger = JSON.parse(fs.readFileSync(CORRECTION_LEDGER, 'utf8'));
    expect(ledger).toEqual(
      expect.objectContaining({
        schemaVersion: 'tiangong.i18n-corrections.v1',
        baselineSha: 'c26f306e82ac66f50a56aafe8f89ea96c0b0c67d',
        trackedLocales: ['zh-CN', 'de-DE'],
        correctionLedgerDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    );
    expect(ledger.baseline).toEqual(
      expect.objectContaining({
        messageCount: 2737,
        catalogManifestDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
        germanCatalogDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
        germanRuntimeManifestDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    );

    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', ACTIVE_DELIVERY_SCRIPT, 'corrections', '--check'],
      {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(
      expect.objectContaining({
        action: 'corrections',
        baselineSha: ledger.baselineSha,
        correctionCount: ledger.corrections.length,
        privateConfirmationDependencies: [],
      }),
    );
    expect(result.stdout).not.toContain('.local/');
    expect(result.stderr).not.toContain('.local/');
  });

  it('keeps private confirmation code reachable only through explicit historical commands', () => {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    const activeScripts = Object.entries(packageJson.scripts)
      .filter(
        ([name]) =>
          name.startsWith('i18n:locale:') ||
          name.startsWith('i18n:context:') ||
          name === 'i18n:corrections:check' ||
          name === 'i18n:de:audit' ||
          name === 'i18n:de:runtime:manifest:check',
      )
      .map(([, command]) => command)
      .join('\n');

    expect(activeScripts).not.toContain('german-runtime-delta-review.mjs');
    expect(activeScripts).not.toContain('german-runtime-activation.mjs');
    expect(activeScripts).not.toContain('german-frozen-review-check.mjs');
    expect(activeScripts).not.toMatch(/\.local\/.+confirmation/iu);
    expect(packageJson.scripts['i18n:de:delta:review:check']).toContain(
      'german-runtime-delta-review.mjs',
    );
    expect(packageJson.scripts['i18n:de:pilot']).toContain('german-frozen-review-check.mjs');
  });
});
