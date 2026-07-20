import { SUPPORTED_APP_LOCALES } from '@/services/general/localeRegistry';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveLocaleArtifactSharedAuditMode,
  resolveLocaleArtifactTargets,
} from '../../../scripts/i18n/locale-artifact-targets';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const DELIVERY_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/locale-delivery.mjs');

describe('locale artifact command contract', () => {
  it('keeps the package entrypoint locale-agnostic and derives every target from the registry', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
    );

    expect(packageJson.scripts['i18n:locale:artifacts:write']).toBe(
      'node --import tsx scripts/i18n/locale-delivery.mjs artifacts --write',
    );
    expect(packageJson.scripts['i18n:locale:manifest:write']).toBe(
      'node --import tsx scripts/i18n/locale-delivery.mjs manifest --write',
    );
    expect(resolveLocaleArtifactTargets(undefined, SUPPORTED_APP_LOCALES)).toEqual(
      SUPPORTED_APP_LOCALES,
    );
  });

  it('preserves explicit single-locale mode without mutating the registry sequence', () => {
    const registrySnapshot = [...SUPPORTED_APP_LOCALES];

    expect(resolveLocaleArtifactTargets('de-DE', SUPPORTED_APP_LOCALES)).toEqual(['de-DE']);
    expect(SUPPORTED_APP_LOCALES).toEqual(registrySnapshot);
  });

  it('writes the shared manifest before artifact writes and checks it in check mode', () => {
    expect(resolveLocaleArtifactSharedAuditMode(true)).toBe('write');
    expect(resolveLocaleArtifactSharedAuditMode(false)).toBe('check');
  });

  it('accepts omitted --locale for artifacts while other per-locale actions still fail closed', () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-artifact-command-'));
    try {
      const artifacts = spawnSync(
        process.execPath,
        ['--import', 'tsx', DELIVERY_SCRIPT, 'artifacts', '--check', '--root', emptyRoot],
        {
          cwd: REPOSITORY_ROOT,
          encoding: 'utf8',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        },
      );
      const context = spawnSync(
        process.execPath,
        ['--import', 'tsx', DELIVERY_SCRIPT, 'context', '--check', '--root', emptyRoot],
        {
          cwd: REPOSITORY_ROOT,
          encoding: 'utf8',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        },
      );

      expect(artifacts.status).toBe(1);
      expect(artifacts.stderr).not.toContain('--locale is required');
      expect(artifacts.stderr).toContain('Shared locale audit failed');
      expect(context.status).toBe(1);
      expect(context.stderr).toContain('--locale is required for this action');
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it('runs the shared manifest write entrypoint without --locale and preserves an explicit locale', () => {
    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-manifest-command-'));
    const runManifestWrite = (locale?: string) =>
      spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          DELIVERY_SCRIPT,
          'manifest',
          '--write',
          '--root',
          emptyRoot,
          ...(locale ? ['--locale', locale] : []),
        ],
        {
          cwd: REPOSITORY_ROOT,
          encoding: 'utf8',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        },
      );

    try {
      const registryDerived = runManifestWrite();
      const explicitLocale = runManifestWrite('de-DE');

      expect(registryDerived.status).toBe(1);
      expect(registryDerived.stderr).not.toContain('--locale is required');
      expect(registryDerived.stderr).toContain('locale delivery failed:');
      expect(explicitLocale.status).toBe(1);
      expect(explicitLocale.stderr).not.toContain('--locale is required');
      expect(explicitLocale.stderr).toContain('locale delivery failed:');
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }
  });
});
