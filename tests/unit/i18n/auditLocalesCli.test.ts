import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

type AuditManifest = {
  findings: {
    defaultMessageVsEnglish: Array<{
      canonicalEnglish: string;
      defaultMessage: string;
      kind: string;
      messageId: string;
      path: string;
    }>;
    multipleDefaultMessageConflicts: Array<{
      defaultMessages: Array<{ value: string }>;
      messageId: string;
    }>;
  };
  messages: Array<{
    defaultMessages: Array<{ value: string }>;
    id: string;
    references: Array<{
      defaultMessage: string | null;
      kind: string;
      path: string;
    }>;
  }>;
  summary: {
    violationCounts: {
      defaultMessageVsEnglish: number;
      multipleDefaultMessageConflicts: number;
    };
  };
};

const AUDIT_SCRIPT = path.join(process.cwd(), 'scripts/i18n/audit-locales.mjs');

const createIsolatedGitEnvironment = () => {
  const environment = { ...process.env };
  const localVariableNames = execFileSync('git', ['rev-parse', '--local-env-vars'], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);

  localVariableNames.forEach((name) => delete environment[name]);
  return environment;
};

const writeFixtureFile = (root: string, relativePath: string, content: string) => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const initializeAuditFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-audit-'));
  const gitEnvironment = createIsolatedGitEnvironment();

  writeFixtureFile(
    root,
    'src/locales/en-US.ts',
    "export default { 'fixture.schema.required': 'Canonical schema fallback' };\n",
  );
  writeFixtureFile(
    root,
    'src/locales/zh-CN.ts',
    "export default { 'fixture.schema.required': '规范的校验提示' };\n",
  );
  writeFixtureFile(
    root,
    'src/locales/de-DE.ts',
    "export default { 'fixture.schema.required': 'Kanonischer Validierungshinweis' };\n",
  );
  writeFixtureFile(
    root,
    'src/locales/fr-FR.ts',
    "export default { 'fixture.schema.required': 'Message de validation canonique' };\n",
  );
  fs.mkdirSync(path.join(root, 'src/locales/en-US'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/locales/zh-CN'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/locales/de-DE'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/locales/fr-FR'), { recursive: true });
  writeFixtureFile(
    root,
    'src/fixture-schema.json',
    `${JSON.stringify(
      {
        rules: [
          {
            defaultMessage: 'Canonical schema fallback',
            messageKey: 'fixture.schema.required',
            required: true,
          },
          {
            defaultMessage: 'First drifting fallback',
            messageKey: 'fixture.schema.required',
            required: true,
          },
          {
            defaultMessage: 'Second drifting fallback',
            messageKey: 'fixture.schema.required',
            required: true,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFixtureFile(
    root,
    'docs/plans/i18n-de-DE/dynamic-families.json',
    `${JSON.stringify(
      {
        schemaVersion: 'tiangong.i18n-dynamic-families.v1',
        sourceLocales: ['en-US', 'zh-CN', 'de-DE', 'fr-FR'],
        messageHelpers: [],
        families: {},
        callsites: [],
      },
      null,
      2,
    )}\n`,
  );

  execFileSync('git', ['init', '--quiet'], { cwd: root, env: gitEnvironment });
  execFileSync('git', ['add', '.'], { cwd: root, env: gitEnvironment });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Locale Audit Test',
      '-c',
      'user.email=locale-audit@example.invalid',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
    { cwd: root, env: gitEnvironment },
  );

  return root;
};

describe('locale audit CLI schema defaults', () => {
  it('associates sibling JSON defaultMessage values with messageKey references', () => {
    const root = initializeAuditFixture();
    const manifestPath = path.join(root, 'manifest.json');

    try {
      execFileSync(
        process.execPath,
        [
          '--import',
          'tsx',
          AUDIT_SCRIPT,
          '--root',
          root,
          '--base-ref',
          'HEAD',
          '--mode',
          'report',
          '--write',
          '--manifest',
          manifestPath,
        ],
        { encoding: 'utf8' },
      );

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as AuditManifest;
      const message = manifest.messages.find(({ id }) => id === 'fixture.schema.required');

      expect(message?.references).toEqual([
        expect.objectContaining({
          defaultMessage: 'Canonical schema fallback',
          kind: 'schema-messageKey',
          path: 'src/fixture-schema.json',
        }),
        expect.objectContaining({
          defaultMessage: 'First drifting fallback',
          kind: 'schema-messageKey',
          path: 'src/fixture-schema.json',
        }),
        expect.objectContaining({
          defaultMessage: 'Second drifting fallback',
          kind: 'schema-messageKey',
          path: 'src/fixture-schema.json',
        }),
      ]);
      expect(message?.defaultMessages.map(({ value }) => value)).toEqual([
        'Canonical schema fallback',
        'First drifting fallback',
        'Second drifting fallback',
      ]);
      expect(manifest.summary.violationCounts.defaultMessageVsEnglish).toBe(2);
      expect(manifest.findings.defaultMessageVsEnglish).toEqual([
        expect.objectContaining({
          canonicalEnglish: 'Canonical schema fallback',
          defaultMessage: 'First drifting fallback',
          kind: 'schema-messageKey',
          messageId: 'fixture.schema.required',
          path: 'src/fixture-schema.json',
        }),
        expect.objectContaining({
          canonicalEnglish: 'Canonical schema fallback',
          defaultMessage: 'Second drifting fallback',
          kind: 'schema-messageKey',
          messageId: 'fixture.schema.required',
          path: 'src/fixture-schema.json',
        }),
      ]);
      expect(manifest.summary.violationCounts.multipleDefaultMessageConflicts).toBe(1);
      expect(manifest.findings.multipleDefaultMessageConflicts).toEqual([
        expect.objectContaining({
          messageId: 'fixture.schema.required',
          defaultMessages: expect.arrayContaining([
            expect.objectContaining({ value: 'Canonical schema fallback' }),
            expect.objectContaining({ value: 'First drifting fallback' }),
            expect.objectContaining({ value: 'Second drifting fallback' }),
          ]),
        }),
      ]);
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('keeps check provenance pinned when the ambient base branch moves', () => {
    const root = initializeAuditFixture();
    const manifestPath = path.join(root, 'manifest.json');
    const gitEnvironment = createIsolatedGitEnvironment();
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: root, encoding: 'utf8', env: gitEnvironment }).trim();
    const runAudit = (args: string[]) =>
      spawnSync(process.execPath, ['--import', 'tsx', AUDIT_SCRIPT, '--root', root, ...args], {
        encoding: 'utf8',
        env: gitEnvironment,
      });

    try {
      const originalBase = git(['rev-parse', 'HEAD']);
      git(['update-ref', 'refs/remotes/origin/dev', originalBase]);
      const written = runAudit([
        '--base-ref',
        'origin/dev',
        '--mode',
        'report',
        '--write',
        '--manifest',
        manifestPath,
      ]);
      expect(written.status).toBe(0);

      writeFixtureFile(root, 'unrelated.txt', 'unrelated checkpoint\n');
      git(['add', 'unrelated.txt']);
      git([
        '-c',
        'user.name=Locale Audit Test',
        '-c',
        'user.email=locale-audit@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'unrelated checkpoint',
      ]);
      const movedBase = git(['rev-parse', 'HEAD']);
      git(['update-ref', 'refs/remotes/origin/dev', movedBase]);

      const pinnedCheck = runAudit(['--mode', 'report', '--check', '--manifest', manifestPath]);
      expect(pinnedCheck.status).toBe(0);
      expect(JSON.parse(pinnedCheck.stdout)).toEqual(
        expect.objectContaining({
          staleManifest: false,
          source: expect.objectContaining({
            baseRef: 'origin/dev',
            baseCommit: originalBase,
          }),
        }),
      );

      const explicitMovingCheck = runAudit([
        '--base-ref',
        'origin/dev',
        '--mode',
        'report',
        '--check',
        '--manifest',
        manifestPath,
      ]);
      expect(explicitMovingCheck.status).toBe(1);
      expect(JSON.parse(explicitMovingCheck.stdout).staleManifest).toBe(true);

      writeFixtureFile(
        root,
        'src/locales/de-DE.ts',
        "export default { 'fixture.schema.required': 'Geänderter Validierungshinweis' };\n",
      );
      const auditedInputCheck = runAudit([
        '--mode',
        'report',
        '--check',
        '--manifest',
        manifestPath,
      ]);
      expect(auditedInputCheck.status).toBe(1);
      expect(JSON.parse(auditedInputCheck.stdout).staleManifest).toBe(true);
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });
});
