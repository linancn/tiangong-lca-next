import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts, {
  nativeParserStats,
  type NativeParseDiagnostic,
} from '../../../scripts/typescript-native-parser.mjs';

const DIRECT_CONSUMERS = [
  'scripts/i18n/audit-german-candidate.mjs',
  'scripts/i18n/audit-language-platform.mjs',
  'scripts/i18n/audit-locales.mjs',
  'scripts/i18n/german-runtime-policy.mjs',
  'scripts/i18n/locale-delivery.mjs',
  'tests/helpers/i18n/localeAudit.ts',
];

describe('TypeScript 7 native parser adapter', () => {
  it('keeps one native API process while replacing source text without stale AST data', () => {
    const before = nativeParserStats();
    const first = ts.createSourceFile(
      '/workspace/first.ts',
      'export const value = "first" satisfies string;',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const second = ts.createSourceFile(
      '/workspace/second.ts',
      'export const value = "second" satisfies string;',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const after = nativeParserStats();

    expect(first.fileName).toBe('/workspace/first.ts');
    expect(first.statements[0].getText(first)).toContain('"first"');
    expect(second.fileName).toBe('/workspace/second.ts');
    expect(second.statements[0].getText(second)).toContain('"second"');
    expect(after.parseCount - before.parseCount).toBe(2);
    expect(after.apiStartCount - before.apiStartCount).toBeLessThanOrEqual(1);
    expect(after.apiStartCount).toBe(1);
  });

  it('preserves traversal, parent links, text ranges, aliases, and TSX node guards', () => {
    const sourceFile = ts.createSourceFile(
      'component.tsx',
      ['const render = (name: string) => (', '  <Panel title="Hello">{name}</Panel>', ');'].join(
        '\n',
      ),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visited: number[] = [];
    let parameter: Parameters<typeof ts.forEachChild>[0] | undefined;
    let title: Parameters<typeof ts.forEachChild>[0] | undefined;

    const visit = (node: Parameters<typeof ts.forEachChild>[0]) => {
      visited.push(node.kind);
      if (ts.isParameter(node)) parameter = node;
      if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === 'title') title = node;
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(visited).toContain(ts.SyntaxKind.ArrowFunction);
    expect(visited).toContain(ts.SyntaxKind.JsxElement);
    expect(parameter).toBeDefined();
    expect(title).toBeDefined();
    expect(title?.parent.getSourceFile()).toBe(sourceFile);
    expect(title?.getText(sourceFile)).toBe('title="Hello"');
    expect(sourceFile.getLineAndCharacterOfPosition(title?.getStart(sourceFile) ?? 0)).toEqual({
      line: 1,
      character: 9,
    });
  });

  it('normalizes native syntactic diagnostics for TypeScript and JSON callers', () => {
    const invalidTypeScript = ts.createSourceFile(
      'invalid.ts',
      'const value = ;',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const invalidJson = ts.parseJsonText('invalid.json', '{"value": }');

    const assertDiagnostic = (diagnostic: NativeParseDiagnostic | undefined) => {
      expect(diagnostic).toEqual(
        expect.objectContaining({
          code: expect.any(Number),
          length: expect.any(Number),
          start: expect.any(Number),
        }),
      );
      expect(ts.flattenDiagnosticMessageText(diagnostic?.messageText ?? '', '\n')).toEqual(
        expect.any(String),
      );
    };

    assertDiagnostic(invalidTypeScript.parseDiagnostics[0]);
    assertDiagnostic(invalidJson.parseDiagnostics[0]);
  });

  it('lets a clean CLI process exit after using the persistent native session', () => {
    const adapterUrl = pathToFileURL(
      path.join(process.cwd(), 'scripts/typescript-native-parser.mjs'),
    ).href;
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        [
          `import ts, { nativeParserStats } from ${JSON.stringify(adapterUrl)};`,
          'ts.createSourceFile("clean.ts", "export default 1", ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);',
          'process.stdout.write(JSON.stringify(nativeParserStats()));',
        ].join('\n'),
      ],
      { encoding: 'utf8', timeout: 10_000 },
    );

    expect(JSON.parse(output)).toEqual({ apiStartCount: 1, parseCount: 1 });
  });

  it('keeps unstable TypeScript imports isolated inside the repository adapter', () => {
    for (const relativeFile of DIRECT_CONSUMERS) {
      const source = fs.readFileSync(path.join(process.cwd(), relativeFile), 'utf8');
      expect(source).toContain('typescript-native-parser.mjs');
      expect(source).not.toMatch(/(?:from\s+|require\s*\(\s*)['"]typescript(?:['"/])/u);
    }
  });
});
