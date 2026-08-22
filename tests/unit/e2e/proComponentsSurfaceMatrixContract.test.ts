import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import ts from '../../../scripts/typescript-native-parser.mjs';
import {
  EXPECTED_PRO_COMPONENT_RUNTIME_COUNTS,
  PRO_COMPONENT_RUNTIME_TAGS,
  PRO_COMPONENT_SURFACE_FAMILIES,
  type ProComponentRuntimeTag,
} from '../../e2e/i18n/pro-components-surface-registry';

type RuntimeInstance = {
  file: string;
  line: number;
  tag: ProComponentRuntimeTag;
};

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const SOURCE_ROOT = path.join(REPOSITORY_ROOT, 'src');
const GENERATED_SOURCE_DIRECTORIES = new Set(['.umi', '.umi-production', '.umi-test']);
const runtimeTagSet = new Set<string>(PRO_COMPONENT_RUNTIME_TAGS);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return GENERATED_SOURCE_DIRECTORIES.has(entry.name)
        ? []
        : sourceFiles(path.join(directory, entry.name));
    }
    return entry.isFile() && entry.name.endsWith('.tsx') ? [path.join(directory, entry.name)] : [];
  });
}

function repositoryPath(absolutePath: string): string {
  return path.relative(REPOSITORY_ROOT, absolutePath).split(path.sep).join('/');
}

function discoverRuntimeInstances(): RuntimeInstance[] {
  const instances: RuntimeInstance[] = [];

  for (const absolutePath of sourceFiles(SOURCE_ROOT)) {
    const source = readFileSync(absolutePath, 'utf8');
    if (!source.includes('@ant-design/pro-components')) continue;

    const file = repositoryPath(absolutePath);
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const runtimeImports = new Map<string, ProComponentRuntimeTag>();

    const visit = (node: any): void => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteralLike(node.moduleSpecifier) &&
        node.moduleSpecifier.text === '@ant-design/pro-components' &&
        !node.importClause?.getText(sourceFile).trimStart().startsWith('type ') &&
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        for (const element of node.importClause.namedBindings.elements) {
          if (element.isTypeOnly) continue;
          const importedName = (element.propertyName ?? element.name).text;
          if (runtimeTagSet.has(importedName)) {
            runtimeImports.set(element.name.text, importedName as ProComponentRuntimeTag);
          }
        }
      }

      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const localName = node.tagName.getText(sourceFile);
        const tag = runtimeImports.get(localName);
        if (tag) {
          instances.push({
            file,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            tag,
          });
        }
      }

      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return instances.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.tag.localeCompare(right.tag),
  );
}

function propertyName(node: any, sourceFile: any): string | undefined {
  const text = node?.name?.getText?.(sourceFile);
  return typeof text === 'string' ? text.replace(/^['"]|['"]$/gu, '') : undefined;
}

function findToolbarPrefixOverrides(): string[] {
  const violations: string[] = [];

  for (const absolutePath of sourceFiles(SOURCE_ROOT)) {
    const source = readFileSync(absolutePath, 'utf8');
    if (!source.includes('toolbar') || !source.includes('prefixCls')) continue;

    const file = repositoryPath(absolutePath);
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const inspectToolbarObject = (node: any, initializer: any): void => {
      if (!initializer || !ts.isObjectLiteralExpression(initializer)) return;
      if (
        initializer.properties.some(
          (property: any) => propertyName(property, sourceFile) === 'prefixCls',
        )
      ) {
        violations.push(
          `${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`,
        );
      }
    };

    const visit = (node: any): void => {
      if (ts.isPropertyAssignment(node) && propertyName(node, sourceFile) === 'toolbar') {
        inspectToolbarObject(node, node.initializer);
      }
      if (ts.isJsxAttribute(node) && propertyName(node, sourceFile) === 'toolbar') {
        inspectToolbarObject(
          node,
          node.initializer && ts.isJsxExpression(node.initializer)
            ? node.initializer.expression
            : undefined,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return violations.sort();
}

describe('Pro Components surface matrix contract', () => {
  it('maps every runtime instance to exactly one explicit surface family', () => {
    const instances = discoverRuntimeInstances();
    const counts = Object.fromEntries(
      PRO_COMPONENT_RUNTIME_TAGS.map((tag) => [
        tag,
        instances.filter((instance) => instance.tag === tag).length,
      ]),
    );

    expect(counts).toEqual(EXPECTED_PRO_COMPONENT_RUNTIME_COUNTS);
    expect(instances).toHaveLength(
      Object.values(EXPECTED_PRO_COMPONENT_RUNTIME_COUNTS).reduce(
        (total, count) => total + count,
        0,
      ),
    );

    for (const instance of instances) {
      const families = PRO_COMPONENT_SURFACE_FAMILIES.filter((family) => {
        const componentTags: readonly ProComponentRuntimeTag[] = family.componentTags;
        const sourcePaths: readonly string[] = family.sourcePaths;
        return componentTags.includes(instance.tag) && sourcePaths.includes(instance.file);
      });
      expect({ instance, families: families.map(({ id }) => id) }).toEqual({
        instance,
        families: [expect.any(String)],
      });
    }
  });

  it('keeps every registered source and evidence path live', () => {
    const instances = discoverRuntimeInstances();

    for (const family of PRO_COMPONENT_SURFACE_FAMILIES) {
      expect(family.sourcePaths.length).toBeGreaterThan(0);
      expect(family.evidencePaths.length).toBeGreaterThan(0);
      expect(family.visualStates.length).toBeGreaterThan(0);

      for (const sourcePath of family.sourcePaths) {
        const componentTags: readonly ProComponentRuntimeTag[] = family.componentTags;
        expect(existsSync(path.join(REPOSITORY_ROOT, sourcePath))).toBe(true);
        expect(
          instances.some(
            (instance) => instance.file === sourcePath && componentTags.includes(instance.tag),
          ),
        ).toBe(true);
      }
      for (const evidencePath of family.evidencePaths) {
        expect(existsSync(path.join(REPOSITORY_ROOT, evidencePath))).toBe(true);
      }
    }
  });

  it('keeps ProTable toolbars on the native prefix namespace', () => {
    const responsiveDataListSource = readFileSync(
      path.join(REPOSITORY_ROOT, 'src/components/ResponsiveDataList/index.tsx'),
      'utf8',
    );

    expect(responsiveDataListSource).toContain("className: 'responsive-data-list-toolbar'");
    expect(findToolbarPrefixOverrides()).toEqual([]);
  });
});
