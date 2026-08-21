import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath: string) => JSON.parse(read(relativePath)) as Record<string, any>;

const firstPartyJavaScriptFiles = () => {
  const result = spawnSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      '*.js',
      '*.jsx',
      '*.ts',
      '*.tsx',
      '*.mjs',
      '*.cjs',
      '*.mts',
      '*.cts',
    ],
    { cwd: root, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr || 'git ls-files failed');
  return result.stdout
    .trim()
    .split(/\r?\n/u)
    .filter((relativeFile) => relativeFile && fs.existsSync(path.join(root, relativeFile)));
};

describe('single-track TypeScript 7 and Oxlint command contract', () => {
  const packageJson = readJson('package.json');
  const scripts = packageJson.scripts as Record<string, string>;
  const dependencies = {
    ...(packageJson.dependencies as Record<string, string>),
    ...(packageJson.devDependencies as Record<string, string>),
  };

  it('keeps every compiler and linter command on the repository-owned single track', () => {
    expect(scripts.lint).toBe('npm run lint:js && npm run lint:prettier && npm run tsc');
    expect(scripts['lint-staged:js']).toBe('oxlint --format=stylish');
    expect(scripts['lint:fix']).toBe('oxlint --fix --format=stylish ./src ./tests');
    expect(scripts['lint:js']).toBe('oxlint --format=stylish ./src ./tests');
    expect(scripts.tsc).toBe('node ./node_modules/typescript/bin/tsc --noEmit');
    expect(scripts['tsc:electron']).toBe(
      'node ./node_modules/typescript/bin/tsc --project tsconfig.electron.json',
    );
    expect(scripts.dist).toBe(
      'npm run build && npm run tsc:electron && electron-builder --config electron-builder.json',
    );
    expect(scripts.electron).toBe('npm run tsc:electron && electron dist-electron/main.js');
    expect(scripts).not.toHaveProperty('lint:deprecated');
    expect(scripts).not.toHaveProperty('tsc:compat');
  });

  it('installs only TypeScript 7 and removes the legacy lint and organize-import tools', () => {
    expect(packageJson.devDependencies.typescript).toBe('^7.0.2');
    expect(packageJson.devDependencies.oxlint).toBe('^1.79.0');
    expect(packageJson.devDependencies['oxlint-tsgolint']).toBe('^7.0.2001');
    expect(packageJson.devDependencies['@types/node']).toBe('^24.13.3');
    for (const removed of [
      '@typescript/native',
      '@typescript/typescript6',
      '@umijs/lint',
      'eslint',
      'prettier-plugin-organize-imports',
    ]) {
      expect(dependencies).not.toHaveProperty(removed);
    }
  });

  it('keeps native API volatility inside one source-analysis adapter', () => {
    const consumers = [
      'scripts/i18n/audit-german-candidate.mjs',
      'scripts/i18n/audit-language-platform.mjs',
      'scripts/i18n/audit-locales.mjs',
      'scripts/i18n/german-runtime-policy.mjs',
      'scripts/i18n/locale-delivery.mjs',
      'tests/helpers/i18n/localeAudit.ts',
    ];
    for (const consumer of consumers) {
      expect(read(consumer)).not.toMatch(/(?:from\s+|require\()['"]typescript['"]/u);
    }

    const adapter = read('scripts/typescript-native-parser.mjs');
    const compilerPackageName = ['type', 'script'].join('');
    expect(adapter).toContain(`from '${compilerPackageName}/unstable/sync'`);
    expect(adapter).toContain(`from '${compilerPackageName}/unstable/ast'`);
    expect(adapter).toContain(`from '${compilerPackageName}/unstable/fs'`);

    const allowedUnstableImports = new Set([
      'scripts/typescript-native-parser.d.mts',
      'scripts/typescript-native-parser.mjs',
    ]);
    const directImportPattern = new RegExp(
      String.raw`(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]${compilerPackageName}(?:\/unstable\/[^'"]+)?['"]`,
      'u',
    );
    const bypasses = firstPartyJavaScriptFiles().filter(
      (relativeFile) =>
        !allowedUnstableImports.has(relativeFile) && directImportPattern.test(read(relativeFile)),
    );
    expect(bypasses).toEqual([]);
  });

  it('preserves the legacy invalid-this guard through an Oxlint-local rule', () => {
    const oxlint = readJson('.oxlintrc.json');
    expect(oxlint.jsPlugins).toContain('./scripts/oxlint-plugin-tiangong.mjs');
    expect(oxlint.rules['tiangong/no-invalid-this']).toBe('error');

    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-invalid-this-'));
    const invalid = path.join(fixtureRoot, 'invalid.ts');
    const valid = path.join(fixtureRoot, 'valid.ts');
    fs.writeFileSync(invalid, 'export {};\nthis;\n');
    fs.writeFileSync(valid, 'export class Valid { method() { return this; } }\n');
    try {
      const result = spawnSync(
        process.execPath,
        [
          path.join(root, 'node_modules/oxlint/bin/oxlint'),
          '--config',
          path.join(root, '.oxlintrc.json'),
          '--no-ignore',
          invalid,
          valid,
        ],
        { cwd: root, encoding: 'utf8' },
      );
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status).not.toBe(0);
      expect(output).toContain("Unexpected 'this'.");
      expect(output).toContain(invalid);
      expect(output).not.toContain(valid);
    } finally {
      fs.rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it('keeps formatting and build automation free of removed compiler API entrypoints', () => {
    expect(read('.prettierrc.js')).not.toContain('prettier-plugin-organize-imports');
    const oxlint = readJson('.oxlintrc.json');
    expect(oxlint.rules).not.toHaveProperty('sort-imports');

    const buildWorkflow = read('.github/workflows/build.yml');
    expect(buildWorkflow).toContain('npm run tsc:electron');
    expect(buildWorkflow).not.toContain('npx tsc');

    const umiConfigSource = firstPartyJavaScriptFiles()
      .filter((relativeFile) => relativeFile.startsWith('config/'))
      .map(read)
      .join('\n');
    expect(umiConfigSource).not.toMatch(/\bforkTSChecker\b|\bmako\s*:/u);
  });
});
