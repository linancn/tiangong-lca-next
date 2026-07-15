import { execFileSync } from 'child_process';
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

const writeFixtureFile = (root: string, relativePath: string, content: string) => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const initializeAuditFixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-audit-'));

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
  fs.mkdirSync(path.join(root, 'src/locales/en-US'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/locales/zh-CN'), { recursive: true });
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
        sourceLocales: ['en-US', 'zh-CN'],
        messageHelpers: [],
        families: {},
        callsites: [],
      },
      null,
      2,
    )}\n`,
  );

  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
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
    { cwd: root },
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
});
