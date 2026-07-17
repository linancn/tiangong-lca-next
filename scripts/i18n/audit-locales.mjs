#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const ts = require('typescript');
const { analyzeIcuMessage } = require('./icu-message-parser.cjs');

const SCHEMA_VERSION = 'tiangong.i18n-manifest.v1';
const DECISIONS_SCHEMA_VERSION = 'tiangong.i18n-decisions.v1';
const LOCALES = ['en-US', 'zh-CN', 'de-DE'];
const DEFAULT_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const DEFAULT_DECISIONS = 'docs/plans/i18n-de-DE/decisions.yaml';
const DEFAULT_DYNAMIC_REGISTRY = 'docs/plans/i18n-de-DE/dynamic-families.json';
const DYNAMIC_REGISTRY_SCHEMA_VERSION = 'tiangong.i18n-dynamic-families.v1';

const CATEGORY_DEFINITIONS = {
  'active-static':
    'A literal production message id referenced by formatMessage, FormattedMessage, or schema messageKey.',
  'active-dynamic':
    'A production callsite whose message id is computed and therefore requires an explicitly audited family.',
  compat:
    'A reviewed legacy key retained temporarily for compatibility; this classification requires an explicit decision.',
  reserved:
    'A locale key with no statically discovered production reference; it must be retained or reclassified deliberately.',
  dead: 'A reviewed key proven unused and scheduled for removal from every locale; this classification requires an explicit decision.',
};

const EXCLUSIONS = [
  {
    pattern: 'src/locales/**',
    reason: 'Scanned as locale definitions rather than production callsites.',
  },
  { pattern: 'src/.umi*/**', reason: 'Generated Umi artifacts are not source-of-truth callsites.' },
  { pattern: 'src/**/*.d.ts', reason: 'Type declarations do not execute.' },
  {
    pattern: 'src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    reason: 'Tests are not production callsites.',
  },
  { pattern: 'src/**/__tests__/**', reason: 'Tests are not production callsites.' },
];

function usage() {
  return `Usage: node scripts/i18n/audit-locales.mjs [options]

Options:
  --mode <report|enforce>  report exits zero with findings; enforce exits nonzero (default: enforce)
  --write                  write the deterministic manifest and create the decision register if absent
  --refresh-decisions      replace the generated decision register (requires --write)
  --check                  fail if the checked-in manifest differs from current output
  --root <path>            repository root (default: current working directory)
  --base-ref <ref>         commit/ref recorded as the audited baseline (default: origin/dev)
  --manifest <path>        manifest path relative to root
  --decisions <path>       decision-register path relative to root
  --dynamic-registry <path>
                           reviewed dynamic-family registry relative to root
  --help                   show this help
`;
}

function parseArgs(argv) {
  const options = {
    mode: 'enforce',
    write: false,
    refreshDecisions: false,
    check: false,
    root: process.cwd(),
    baseRef: 'origin/dev',
    manifest: DEFAULT_MANIFEST,
    decisions: DEFAULT_DECISIONS,
    dynamicRegistry: DEFAULT_DYNAMIC_REGISTRY,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    } else if (argument === '--write') options.write = true;
    else if (argument === '--refresh-decisions') options.refreshDecisions = true;
    else if (argument === '--check') options.check = true;
    else if (
      [
        '--mode',
        '--root',
        '--base-ref',
        '--manifest',
        '--decisions',
        '--dynamic-registry',
      ].includes(argument)
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      index += 1;
      const key = {
        '--mode': 'mode',
        '--root': 'root',
        '--base-ref': 'baseRef',
        '--manifest': 'manifest',
        '--decisions': 'decisions',
        '--dynamic-registry': 'dynamicRegistry',
      }[argument];
      options[key] = value;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!['report', 'enforce'].includes(options.mode))
    throw new Error(`Invalid --mode: ${options.mode}`);
  if (options.refreshDecisions && !options.write)
    throw new Error('--refresh-decisions requires --write');
  if (options.check && options.write) throw new Error('--check and --write cannot be combined');
  options.root = path.resolve(options.root);
  return options;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativePath(root, absolutePath) {
  return toPosix(path.relative(root, absolutePath));
}

function walkFiles(root, predicate) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const walk = (directory) => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolutePath);
      else if (entry.isFile() && predicate(absolutePath)) files.push(absolutePath);
    }
  };
  walk(root);
  return files;
}

function scriptKind(filePath) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  if (filePath.endsWith('.json')) return ts.ScriptKind.JSON;
  return ts.ScriptKind.TS;
}

function parseSource(root, absolutePath, scanErrors) {
  const text = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = absolutePath.endsWith('.json')
    ? ts.parseJsonText(absolutePath, text)
    : ts.createSourceFile(
        absolutePath,
        text,
        ts.ScriptTarget.Latest,
        true,
        scriptKind(absolutePath),
      );
  for (const diagnostic of sourceFile.parseDiagnostics ?? []) {
    const position = diagnostic.start ?? 0;
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
    scanErrors.push({
      findingId: `parse-error:${relativePath(root, absolutePath)}:${line + 1}:${character + 1}`,
      path: relativePath(root, absolutePath),
      line: line + 1,
      column: character + 1,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    });
  }
  return sourceFile;
}

function unwrapExpression(node) {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current)))
  )
    current = current.expression;
  return current;
}

function staticPropertyName(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name))
    return name.text;
  return null;
}

function staticString(node, stringBindings = new Map()) {
  const expression = unwrapExpression(node);
  if (!expression) return { static: false, value: null };
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { static: true, value: expression.text };
  }
  if (ts.isIdentifier(expression) && stringBindings.has(expression.text)) {
    return { static: true, value: stringBindings.get(expression.text) };
  }
  return { static: false, value: null };
}

function staticStrings(node, stringBindings = new Map()) {
  const expression = unwrapExpression(node);
  if (!expression) return { static: false, values: [] };
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return { static: true, values: [expression.text] };
  }
  if (ts.isIdentifier(expression) && stringBindings.has(expression.text)) {
    return { static: true, values: [stringBindings.get(expression.text)] };
  }
  if (ts.isConditionalExpression(expression)) {
    const whenTrue = staticStrings(expression.whenTrue, stringBindings);
    const whenFalse = staticStrings(expression.whenFalse, stringBindings);
    return whenTrue.static && whenFalse.static
      ? { static: true, values: [...new Set([...whenTrue.values, ...whenFalse.values])] }
      : { static: false, values: [] };
  }
  if (
    ts.isBinaryExpression(expression) &&
    (expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    const left = staticStrings(expression.left, stringBindings);
    const right = staticStrings(expression.right, stringBindings);
    return left.static && right.static
      ? { static: true, values: [...new Set([...left.values, ...right.values])] }
      : { static: false, values: [] };
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = staticStrings(expression.left, stringBindings);
    const right = staticStrings(expression.right, stringBindings);
    return left.static && right.static
      ? {
          static: true,
          values: [
            ...new Set(
              left.values.flatMap((prefix) => right.values.map((value) => prefix + value)),
            ),
          ],
        }
      : { static: false, values: [] };
  }
  if (ts.isTemplateExpression(expression)) {
    let values = [expression.head.text];
    for (const span of expression.templateSpans) {
      const part = staticStrings(span.expression, stringBindings);
      if (!part.static) return { static: false, values: [] };
      values = values.flatMap((prefix) =>
        part.values.map((value) => `${prefix}${value}${span.literal.text}`),
      );
    }
    return { static: true, values: [...new Set(values)] };
  }
  return { static: false, values: [] };
}

function expressionText(node, sourceFile) {
  if (!node) return null;
  return node.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function location(root, sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { path: relativePath(root, sourceFile.fileName), line: line + 1, column: character + 1 };
}

function enclosingSymbol(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isClassDeclaration(current) ||
      ts.isMethodDeclaration(current)
    ) {
      return current.name?.getText() ?? '<anonymous>';
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name))
      return current.name.text;
  }
  return '<module>';
}

function inspectIcuMessage(text) {
  try {
    return { ...analyzeIcuMessage(text), error: null };
  } catch (error) {
    return {
      argumentSignature: [],
      placeholders: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getObjectProperty(objectLiteral, propertyName) {
  for (const property of objectLiteral.properties) {
    if (ts.isPropertyAssignment(property) && staticPropertyName(property.name) === propertyName)
      return property.initializer;
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === propertyName)
      return property.name;
  }
  return null;
}

function collectBindings(sourceFile) {
  const strings = new Map();
  const objects = new Map();
  const ambiguous = new Set();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const name = node.name.text;
      if (strings.has(name) || objects.has(name)) ambiguous.add(name);
      const initializer = unwrapExpression(node.initializer);
      const literal = staticString(initializer);
      if (literal.static) strings.set(name, literal.value);
      else if (initializer && ts.isObjectLiteralExpression(initializer))
        objects.set(name, initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const name of ambiguous) {
    strings.delete(name);
    objects.delete(name);
  }
  return { strings, objects };
}

function resolveObject(node, objectBindings) {
  const expression = unwrapExpression(node);
  if (expression && ts.isObjectLiteralExpression(expression)) return expression;
  if (expression && ts.isIdentifier(expression)) return objectBindings.get(expression.text) ?? null;
  return null;
}

function sortByLocation(left, right) {
  return (
    left.path.localeCompare(right.path) || left.line - right.line || left.column - right.column
  );
}

function scanLocale(root, locale, scanErrors, unsupportedSyntax, invalidIcuMessages) {
  const localeRoot = path.join(root, 'src', 'locales', locale);
  const entryPath = path.join(root, 'src', 'locales', `${locale}.ts`);
  const leafPaths = walkFiles(localeRoot, (filePath) => filePath.endsWith('.ts'));
  const leafModules = leafPaths.map((filePath) =>
    relativePath(localeRoot, filePath).replace(/\.ts$/, ''),
  );
  const declarationsByModule = new Map();

  const parseLocaleObject = (absolutePath, module) => {
    const sourceFile = parseSource(root, absolutePath, scanErrors);
    const assignment = sourceFile.statements.find(
      (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
    );
    const objectLiteral = assignment ? unwrapExpression(assignment.expression) : null;
    if (!objectLiteral || !ts.isObjectLiteralExpression(objectLiteral)) {
      unsupportedSyntax.push({
        findingId: `locale-syntax:${relativePath(root, absolutePath)}:default-export`,
        path: relativePath(root, absolutePath),
        module,
        reason: 'Locale module must default-export an object literal.',
      });
      return { sourceFile, objectLiteral: null, declarations: [] };
    }
    const declarations = [];
    for (const property of objectLiteral.properties) {
      if (ts.isPropertyAssignment(property)) {
        const id = staticPropertyName(property.name);
        const value = staticString(property.initializer);
        if (id !== null && value.static) {
          const declarationLocation = location(root, sourceFile, property);
          const icu = inspectIcuMessage(value.value);
          if (icu.error) {
            invalidIcuMessages.push({
              findingId: `invalid-icu:${locale}:${id}:${declarationLocation.path}:${declarationLocation.line}:${declarationLocation.column}`,
              locale,
              messageId: id,
              value: value.value,
              ...declarationLocation,
              reason: icu.error,
            });
          }
          declarations.push({
            id,
            value: value.value,
            argumentSignature: icu.argumentSignature,
            placeholders: icu.placeholders,
            module,
            ...declarationLocation,
          });
          continue;
        }
      }
      if (module !== '$entry' || !ts.isSpreadAssignment(property)) {
        unsupportedSyntax.push({
          findingId: `locale-syntax:${relativePath(root, absolutePath)}:${property.getStart(sourceFile)}`,
          path: relativePath(root, absolutePath),
          module,
          reason:
            'Locale values and keys must be static strings; leaf spreads and computed properties are not auditable.',
          expression: expressionText(property, sourceFile),
        });
      }
    }
    return { sourceFile, objectLiteral, declarations };
  };

  for (let index = 0; index < leafPaths.length; index += 1) {
    const result = parseLocaleObject(leafPaths[index], leafModules[index]);
    declarationsByModule.set(leafModules[index], result.declarations);
  }

  const entry = parseLocaleObject(entryPath, '$entry');
  const imports = new Map();
  for (const statement of entry.sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.name &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      const target = path.resolve(path.dirname(entryPath), statement.moduleSpecifier.text);
      const module = relativePath(localeRoot, target).replace(/\.ts$/, '');
      imports.set(statement.importClause.name.text, module);
    }
  }
  const moduleOrder = [];
  if (entry.objectLiteral) {
    for (const property of entry.objectLiteral.properties) {
      if (!ts.isSpreadAssignment(property)) continue;
      const expression = unwrapExpression(property.expression);
      if (!expression || !ts.isIdentifier(expression) || !imports.has(expression.text)) {
        unsupportedSyntax.push({
          findingId: `locale-syntax:${relativePath(root, entryPath)}:${property.getStart(entry.sourceFile)}`,
          path: relativePath(root, entryPath),
          module: '$entry',
          reason: 'Top-level locale spreads must reference a default-imported leaf module.',
          expression: expressionText(property, entry.sourceFile),
        });
      } else moduleOrder.push(imports.get(expression.text));
    }
  }

  const topologyFindings = [];
  for (const module of leafModules.filter((name) => !moduleOrder.includes(name))) {
    topologyFindings.push({
      findingId: `locale-topology:${locale}:unimported:${module}`,
      locale,
      module,
      reason: 'Leaf module is not spread by the top-level locale entry.',
    });
  }
  for (const module of moduleOrder.filter((name) => !declarationsByModule.has(name))) {
    topologyFindings.push({
      findingId: `locale-topology:${locale}:missing:${module}`,
      locale,
      module,
      reason: 'Top-level locale entry imports a missing or unauditable leaf module.',
    });
  }

  const allDeclarations = [...entry.declarations];
  for (const module of leafModules)
    allDeclarations.push(...(declarationsByModule.get(module) ?? []));
  const bundleDeclarations = [...entry.declarations];
  for (const module of moduleOrder)
    bundleDeclarations.push(...(declarationsByModule.get(module) ?? []));
  const grouped = new Map();
  for (const declaration of allDeclarations) {
    if (!grouped.has(declaration.id)) grouped.set(declaration.id, []);
    grouped.get(declaration.id).push(declaration);
  }
  const effective = new Map();
  for (const declaration of bundleDeclarations) effective.set(declaration.id, declaration);

  return {
    locale,
    entry: relativePath(root, entryPath),
    leafModules,
    moduleOrder,
    declarationsById: grouped,
    effective,
    topologyFindings,
  };
}

function isProductionSource(root, filePath) {
  const relative = relativePath(root, filePath);
  if (!/\.(?:ts|tsx|js|jsx|json)$/.test(relative)) return false;
  if (relative.startsWith('src/locales/') || /^src\/\.umi[^/]*\//.test(relative)) return false;
  if (relative.endsWith('.d.ts') || /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(relative))
    return false;
  if (relative.includes('/__tests__/')) return false;
  return true;
}

function addLiteralReference(references, id, reference) {
  if (!references.has(id)) references.set(id, []);
  references.get(id).push(reference);
}

function loadDynamicRegistry(root, registryPath, registryErrors) {
  const absolutePath = path.resolve(root, registryPath);
  if (!fs.existsSync(absolutePath)) {
    registryErrors.push({
      findingId: 'dynamic-registry:missing',
      path: relativePath(root, absolutePath),
      reason: 'The reviewed dynamic-family registry does not exist.',
    });
    return {
      schemaVersion: null,
      sourceLocales: [],
      messageHelpers: [],
      families: {},
      callsites: [],
    };
  }
  try {
    const registry = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    return {
      schemaVersion: registry.schemaVersion ?? null,
      sourceLocales: Array.isArray(registry.sourceLocales) ? registry.sourceLocales : [],
      messageHelpers: Array.isArray(registry.messageHelpers) ? registry.messageHelpers : [],
      families:
        registry.families &&
        typeof registry.families === 'object' &&
        !Array.isArray(registry.families)
          ? registry.families
          : {},
      callsites: Array.isArray(registry.callsites) ? registry.callsites : [],
      policy: registry.policy ?? null,
      path: relativePath(root, absolutePath),
    };
  } catch (error) {
    registryErrors.push({
      findingId: 'dynamic-registry:invalid-json',
      path: relativePath(root, absolutePath),
      reason: error instanceof Error ? error.message : String(error),
    });
    return {
      schemaVersion: null,
      sourceLocales: [],
      messageHelpers: [],
      families: {},
      callsites: [],
    };
  }
}

function dynamicSummaryKey(callsite) {
  return JSON.stringify([callsite.api, callsite.count, callsite.file, callsite.expression]);
}

function summarizeDynamicCallsites(dynamicObligations) {
  const grouped = new Map();
  for (const obligation of dynamicObligations) {
    const key = JSON.stringify([obligation.kind, obligation.path, obligation.expression]);
    const current = grouped.get(key) ?? {
      api: obligation.kind,
      count: 0,
      file: obligation.path,
      expression: obligation.expression,
      locations: [],
    };
    current.count += 1;
    current.locations.push(`${obligation.line}:${obligation.column}`);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.api.localeCompare(right.api) ||
      left.expression.localeCompare(right.expression),
  );
}

function validateDynamicRegistry(registry, localeScans, registryErrors) {
  if (registry.schemaVersion !== DYNAMIC_REGISTRY_SCHEMA_VERSION) {
    registryErrors.push({
      findingId: 'dynamic-registry:schema-version',
      reason: `Expected ${DYNAMIC_REGISTRY_SCHEMA_VERSION}; received ${String(registry.schemaVersion)}.`,
    });
  }
  if (!arrayEquals(registry.sourceLocales, LOCALES)) {
    registryErrors.push({
      findingId: 'dynamic-registry:source-locales',
      reason: `Expected sourceLocales ${JSON.stringify(LOCALES)} in canonical order.`,
    });
  }

  const helperIdentities = new Set();
  for (const [index, helper] of registry.messageHelpers.entries()) {
    const identity = `${helper?.file ?? ''}:${helper?.name ?? ''}`;
    if (
      !helper ||
      typeof helper.file !== 'string' ||
      typeof helper.name !== 'string' ||
      (helper.idArgumentIndex !== undefined &&
        (!Number.isInteger(helper.idArgumentIndex) || helper.idArgumentIndex < 0)) ||
      (helper.defaultArgumentIndex !== undefined &&
        (!Number.isInteger(helper.defaultArgumentIndex) || helper.defaultArgumentIndex < 0)) ||
      (helper.prefix !== undefined && typeof helper.prefix !== 'string')
    ) {
      registryErrors.push({
        findingId: `dynamic-registry:message-helper:${index}`,
        reason:
          'Each message helper requires string file/name fields plus optional non-negative idArgumentIndex/defaultArgumentIndex and string prefix fields.',
      });
    } else if (helperIdentities.has(identity)) {
      registryErrors.push({
        findingId: `dynamic-registry:duplicate-message-helper:${identity}`,
        reason: 'Message helper identities must be unique.',
      });
    }
    helperIdentities.add(identity);
  }

  for (const [familyName, family] of Object.entries(registry.families).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const keys = Array.isArray(family?.keys) ? family.keys : [];
    const prefixes = Array.isArray(family?.prefixes) ? family.prefixes : [];
    const unknownHandling = family?.unknownHandling;
    if (typeof family?.proof !== 'string' || family.proof.length <= 20) {
      registryErrors.push({
        findingId: `dynamic-registry:family-proof:${familyName}`,
        reason: 'Every family requires a substantive finite-producer proof.',
      });
    }
    if (keys.length === 0 && prefixes.length === 0) {
      registryErrors.push({
        findingId: `dynamic-registry:family-boundary:${familyName}`,
        reason: 'Every family requires at least one exact key or bounded prefix.',
      });
    }
    if (keys.length === 0) {
      registryErrors.push({
        findingId: `dynamic-registry:family-exact-keys:${familyName}`,
        reason:
          'Every finite family must enumerate its recognized exact message keys; prefixes alone are not closure evidence.',
      });
    }
    if (
      keys.some((key) => typeof key !== 'string') ||
      !arrayEquals(keys, [...new Set(keys)].sort())
    ) {
      registryErrors.push({
        findingId: `dynamic-registry:family-key-order:${familyName}`,
        reason: 'Family keys must be unique strings in deterministic lexical order.',
      });
    }
    const closedWorldValid =
      unknownHandling?.kind === 'closedWorld' &&
      typeof unknownHandling.proof === 'string' &&
      unknownHandling.proof.length > 20;
    const localizedRuntimeFallbackValid =
      unknownHandling?.kind === 'localizedRuntimeFallback' &&
      ['implemented', 'reserved-for-followup'].includes(unknownHandling.status) &&
      typeof unknownHandling.strategy === 'string' &&
      Array.isArray(unknownHandling.keys) &&
      unknownHandling.keys.length > 0 &&
      typeof unknownHandling.proof === 'string' &&
      unknownHandling.proof.length > 20;
    if (!closedWorldValid && !localizedRuntimeFallbackValid) {
      registryErrors.push({
        findingId: `dynamic-registry:unknown-handling:${familyName}`,
        reason:
          'Every family requires either substantive closedWorld evidence or a documented localizedRuntimeFallback contract.',
      });
    }
    const unknownFallbackKeys =
      unknownHandling?.kind === 'localizedRuntimeFallback' && Array.isArray(unknownHandling.keys)
        ? unknownHandling.keys
        : [];
    for (const key of unknownFallbackKeys) {
      if (!keys.includes(key)) {
        registryErrors.push({
          findingId: `dynamic-registry:fallback-outside-family:${familyName}:${key}`,
          family: familyName,
          messageId: key,
          reason: 'A localized runtime fallback key must also be an exact member of its family.',
        });
      }
    }
    for (const key of [...keys, ...unknownFallbackKeys]) {
      for (const locale of LOCALES) {
        if (!localeScans[locale].effective.has(key)) {
          registryErrors.push({
            findingId: `dynamic-registry:missing-key:${familyName}:${locale}:${key}`,
            family: familyName,
            locale,
            messageId: key,
            reason: 'The reviewed family key is absent from a canonical source locale.',
          });
        }
      }
    }
    for (const prefix of prefixes) {
      for (const locale of LOCALES) {
        if (![...localeScans[locale].effective.keys()].some((key) => key.startsWith(prefix))) {
          registryErrors.push({
            findingId: `dynamic-registry:missing-prefix:${familyName}:${locale}:${prefix}`,
            family: familyName,
            locale,
            prefix,
            reason: 'The reviewed family prefix has no member in a canonical source locale.',
          });
        }
      }
    }
  }

  const callsiteIdentities = new Set();
  for (const [index, callsite] of registry.callsites.entries()) {
    const valid =
      callsite &&
      ['FormattedMessage', 'formatMessage', 'messageHelper', 'messageKey'].includes(callsite.api) &&
      Number.isInteger(callsite.count) &&
      callsite.count > 0 &&
      typeof callsite.file === 'string' &&
      typeof callsite.expression === 'string' &&
      typeof callsite.family === 'string' &&
      Object.hasOwn(registry.families, callsite.family);
    if (!valid) {
      registryErrors.push({
        findingId: `dynamic-registry:callsite:${index}`,
        reason: 'Each callsite requires a valid API, positive count, file, expression, and family.',
      });
      continue;
    }
    const identity = dynamicSummaryKey(callsite);
    if (callsiteIdentities.has(identity)) {
      registryErrors.push({
        findingId: `dynamic-registry:duplicate-callsite:${index}`,
        reason: 'Dynamic callsite identities must be unique.',
      });
    }
    callsiteIdentities.add(identity);
  }
}

function classifyDynamicCallsites(dynamicObligations, registry) {
  const actual = summarizeDynamicCallsites(dynamicObligations);
  const expectedByKey = new Map(
    registry.callsites.map((callsite) => [dynamicSummaryKey(callsite), callsite]),
  );
  const actualByKey = new Map(actual.map((callsite) => [dynamicSummaryKey(callsite), callsite]));
  const registered = actual
    .filter((callsite) => expectedByKey.has(dynamicSummaryKey(callsite)))
    .map((callsite) => ({
      ...callsite,
      category: 'active-dynamic',
      family: expectedByKey.get(dynamicSummaryKey(callsite)).family,
    }));
  const isReviewedFamily = (family) => {
    const handling = registry.families[family]?.unknownHandling;
    return (
      handling?.kind === 'closedWorld' ||
      (handling?.kind === 'localizedRuntimeFallback' && handling.status === 'implemented')
    );
  };
  const reviewed = registered
    .filter(({ family }) => isReviewedFamily(family))
    .map((callsite) => ({ ...callsite, reviewStatus: 'reviewed' }));
  const pendingFallback = registered
    .filter(({ family }) => !isReviewedFamily(family))
    .map((callsite) => ({ ...callsite, reviewStatus: 'fallback-pending' }));
  const unresolved = [];
  for (const callsite of actual) {
    if (!expectedByKey.has(dynamicSummaryKey(callsite))) {
      unresolved.push({
        findingId: `dynamic-callsite:unregistered:${callsite.api}:${callsite.file}:${callsite.expression}`,
        reason:
          'A computed message callsite is not registered exactly or its occurrence count drifted.',
        ...callsite,
      });
    }
  }
  for (const callsite of registry.callsites) {
    if (!actualByKey.has(dynamicSummaryKey(callsite))) {
      unresolved.push({
        findingId: `dynamic-callsite:missing:${callsite.api}:${callsite.file}:${callsite.expression}`,
        reason: 'A reviewed registry callsite disappeared or its occurrence count drifted.',
        ...callsite,
      });
    }
  }
  unresolved.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.api.localeCompare(right.api) ||
      left.expression.localeCompare(right.expression),
  );
  return { actual, registered, reviewed, pendingFallback, unresolved };
}

function scanProductionSources(root, scanErrors, dynamicRegistry) {
  const references = new Map();
  const dynamicObligations = [];
  const sourceFiles = walkFiles(path.join(root, 'src'), (filePath) =>
    isProductionSource(root, filePath),
  );

  const addDynamic = (kind, sourceFile, node, expression, extra = {}) => {
    const at = location(root, sourceFile, node);
    dynamicObligations.push({
      findingId: `dynamic-message-id:${at.path}:${at.line}:${at.column}:${kind}`,
      category: 'active-dynamic',
      kind,
      ...at,
      symbol: enclosingSymbol(node),
      expression,
      requiredAction:
        'Expand this callsite to an explicit finite message-id family or record a reviewed family mapping.',
      ...extra,
    });
  };

  for (const absolutePath of sourceFiles) {
    const sourceFile = parseSource(root, absolutePath, scanErrors);
    const { strings, objects } = collectBindings(sourceFile);
    const sourcePath = relativePath(root, absolutePath);
    const messageHelpers = dynamicRegistry.messageHelpers.filter(
      (helper) => helper.file === sourcePath,
    );
    const visit = (node, parentNode = null) => {
      if (ts.isCallExpression(node)) {
        const callee = unwrapExpression(node.expression);
        const isFormatMessage =
          (ts.isIdentifier(callee) && callee.text === 'formatMessage') ||
          (ts.isPropertyAccessExpression(callee) && callee.name.text === 'formatMessage');
        if (isFormatMessage) {
          const descriptorExpression = node.arguments[0];
          const descriptor = resolveObject(descriptorExpression, objects);
          const idExpression = descriptor ? getObjectProperty(descriptor, 'id') : null;
          const defaultExpression = descriptor
            ? getObjectProperty(descriptor, 'defaultMessage')
            : null;
          const ids = staticStrings(idExpression, strings);
          const defaultMessage = staticString(defaultExpression, strings);
          if (ids.static) {
            for (const id of ids.values)
              addLiteralReference(references, id, {
                kind: 'formatMessage',
                ...location(root, sourceFile, node),
                symbol: enclosingSymbol(node),
                defaultMessage: defaultMessage.static ? defaultMessage.value : null,
                defaultMessageExpression:
                  defaultExpression && !defaultMessage.static
                    ? expressionText(defaultExpression, sourceFile)
                    : null,
              });
          } else {
            addDynamic(
              'formatMessage',
              sourceFile,
              node,
              expressionText(idExpression ?? descriptorExpression, sourceFile),
              {
                descriptorExpression: expressionText(descriptorExpression, sourceFile),
                defaultMessage: defaultMessage.static ? defaultMessage.value : null,
              },
            );
          }
        }

        if (ts.isIdentifier(callee)) {
          const helper = messageHelpers.find((item) => item.name === callee.text);
          if (helper) {
            const argument = node.arguments[helper.idArgumentIndex ?? 0];
            const defaultExpression =
              helper.defaultArgumentIndex === undefined
                ? null
                : node.arguments[helper.defaultArgumentIndex];
            const defaultMessage = staticString(defaultExpression, strings);
            const ids = staticStrings(argument, strings);
            const prefix = helper.prefix ? `${helper.prefix}.` : '';
            if (ids.static) {
              for (const id of ids.values)
                addLiteralReference(references, `${prefix}${id}`, {
                  kind: 'messageHelper',
                  ...location(root, sourceFile, node),
                  symbol: enclosingSymbol(node),
                  defaultMessage: defaultMessage.static ? defaultMessage.value : null,
                  defaultMessageExpression:
                    defaultExpression && !defaultMessage.static
                      ? expressionText(defaultExpression, sourceFile)
                      : null,
                });
            } else {
              addDynamic('messageHelper', sourceFile, node, expressionText(argument, sourceFile), {
                helper: helper.name,
                prefix: helper.prefix ?? null,
                defaultMessage: defaultMessage.static ? defaultMessage.value : null,
              });
            }
          }
        }
      }

      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tagName = node.tagName.getText(sourceFile).split('.').at(-1);
        if (tagName === 'FormattedMessage') {
          const attribute = (name) =>
            node.attributes.properties.find(
              (property) =>
                ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name,
            );
          const valueExpression = (property) => {
            if (!property?.initializer) return null;
            if (ts.isStringLiteral(property.initializer)) return property.initializer;
            if (ts.isJsxExpression(property.initializer)) return property.initializer.expression;
            return null;
          };
          const idExpression = valueExpression(attribute('id'));
          const defaultExpression = valueExpression(attribute('defaultMessage'));
          const ids = staticStrings(idExpression, strings);
          const defaultMessage = staticString(defaultExpression, strings);
          if (ids.static) {
            for (const id of ids.values)
              addLiteralReference(references, id, {
                kind: 'FormattedMessage',
                ...location(root, sourceFile, node),
                symbol: enclosingSymbol(node),
                defaultMessage: defaultMessage.static ? defaultMessage.value : null,
                defaultMessageExpression:
                  defaultExpression && !defaultMessage.static
                    ? expressionText(defaultExpression, sourceFile)
                    : null,
              });
          } else
            addDynamic(
              'FormattedMessage',
              sourceFile,
              node,
              expressionText(idExpression, sourceFile),
              {
                defaultMessage: defaultMessage.static ? defaultMessage.value : null,
              },
            );
        }
      }

      if (ts.isPropertyAssignment(node) && staticPropertyName(node.name) === 'messageKey') {
        const isSchemaMessageKey = sourceFile.fileName.endsWith('.json');
        const schemaRule =
          isSchemaMessageKey && parentNode && ts.isObjectLiteralExpression(parentNode)
            ? parentNode
            : null;
        const defaultExpression = schemaRule
          ? getObjectProperty(schemaRule, 'defaultMessage')
          : null;
        const defaultMessage = staticString(defaultExpression, strings);
        const ids = staticStrings(node.initializer, strings);
        if (ids.static) {
          for (const id of ids.values)
            addLiteralReference(references, id, {
              kind: isSchemaMessageKey ? 'schema-messageKey' : 'messageKey',
              ...location(root, sourceFile, node),
              symbol: enclosingSymbol(node),
              defaultMessage: defaultMessage.static ? defaultMessage.value : null,
              defaultMessageExpression:
                defaultExpression && !defaultMessage.static
                  ? expressionText(defaultExpression, sourceFile)
                  : null,
            });
        } else
          addDynamic('messageKey', sourceFile, node, expressionText(node.initializer, sourceFile));
      }
      ts.forEachChild(node, (child) => visit(child, node));
    };
    visit(sourceFile);
  }

  for (const values of references.values()) values.sort(sortByLocation);
  dynamicObligations.sort(sortByLocation);
  return {
    references,
    dynamicObligations,
    sourceFiles: sourceFiles.map((filePath) => relativePath(root, filePath)),
  };
}

function arrayEquals(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function auditInputDigest(root, paths) {
  const hash = createHash('sha256');
  for (const file of [...new Set(paths)].sort()) {
    hash.update(file);
    hash.update('\0');
    hash.update(fs.readFileSync(path.resolve(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function buildManifest(root, baseRef, dynamicRegistryPath) {
  const scanErrors = [];
  const unsupportedSyntax = [];
  const invalidIcuMessages = [];
  const dynamicRegistryErrors = [];
  const dynamicRegistry = loadDynamicRegistry(root, dynamicRegistryPath, dynamicRegistryErrors);
  const localeScans = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      scanLocale(root, locale, scanErrors, unsupportedSyntax, invalidIcuMessages),
    ]),
  );
  validateDynamicRegistry(dynamicRegistry, localeScans, dynamicRegistryErrors);
  const runtime = scanProductionSources(root, scanErrors, dynamicRegistry);
  const dynamicClassification = classifyDynamicCallsites(
    runtime.dynamicObligations,
    dynamicRegistry,
  );
  const localeModuleDrift = [...LOCALES.flatMap((locale) => localeScans[locale].topologyFindings)];
  const canonicalLeafModules = localeScans[LOCALES[0]].leafModules;
  for (const locale of LOCALES.slice(1)) {
    if (!arrayEquals(canonicalLeafModules, localeScans[locale].leafModules)) {
      localeModuleDrift.push({
        findingId: `locale-topology:${locale}:leaf-module-set-drift`,
        reason: `The ${locale} leaf module set must match ${LOCALES[0]}.`,
        canonicalLocale: LOCALES[0],
        expectedLeafModules: canonicalLeafModules,
        actualLeafModules: localeScans[locale].leafModules,
      });
    }
  }
  const canonicalSpreadOrderLocale = LOCALES[0];
  const canonicalSpreadOrder = localeScans[canonicalSpreadOrderLocale].moduleOrder;
  const spreadOrderDrift = LOCALES.slice(1).filter(
    (locale) => !arrayEquals(canonicalSpreadOrder, localeScans[locale].moduleOrder),
  );
  const spreadOrderAligned = spreadOrderDrift.length === 0;
  for (const locale of spreadOrderDrift) {
    localeModuleDrift.push({
      findingId: `locale-topology:${locale}:spread-order-drift`,
      locale,
      canonicalLocale: canonicalSpreadOrderLocale,
      reason: `Top-level locale spread order must match ${canonicalSpreadOrderLocale}.`,
      expectedModuleOrder: canonicalSpreadOrder,
      actualModuleOrder: localeScans[locale].moduleOrder,
    });
  }

  const ids = new Set(runtime.references.keys());
  for (const locale of LOCALES) for (const id of localeScans[locale].effective.keys()) ids.add(id);
  const sortedIds = [...ids].sort();
  const dynamicFamiliesByMessageId = new Map();
  for (const [familyName, family] of Object.entries(dynamicRegistry.families)) {
    for (const messageId of family.keys ?? []) {
      const familyNames = dynamicFamiliesByMessageId.get(messageId) ?? [];
      familyNames.push(familyName);
      dynamicFamiliesByMessageId.set(messageId, familyNames);
    }
  }
  for (const familyNames of dynamicFamiliesByMessageId.values()) familyNames.sort();
  const messages = [];
  const duplicateLocaleKeys = [];
  const oneSidedKeys = [];
  const missingActiveIds = [];
  const multipleDefaultMessageConflicts = [];
  const defaultMessageVsEnglish = [];
  const placeholderMismatches = [];

  for (const locale of LOCALES) {
    for (const [id, declarations] of [...localeScans[locale].declarationsById].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (declarations.length > 1) {
        duplicateLocaleKeys.push({
          findingId: `duplicate-locale-key:${locale}:${id}`,
          locale,
          messageId: id,
          values: [...new Set(declarations.map((item) => item.value))].sort(),
          declarations: [...declarations].sort(sortByLocation),
        });
      }
    }
  }

  for (const id of sortedIds) {
    const references = runtime.references.get(id) ?? [];
    const dynamicFamilies = dynamicFamiliesByMessageId.get(id) ?? [];
    const translations = {};
    const moduleOwnership = {};
    const availableLocales = [];
    for (const locale of LOCALES) {
      const effective = localeScans[locale].effective.get(id) ?? null;
      const declarations = localeScans[locale].declarationsById.get(id) ?? [];
      moduleOwnership[locale] = [...new Set(declarations.map((item) => item.module))].sort();
      translations[locale] = effective
        ? {
            value: effective.value,
            argumentSignature: effective.argumentSignature,
            placeholders: effective.placeholders,
            source: {
              path: effective.path,
              line: effective.line,
              column: effective.column,
              module: effective.module,
            },
          }
        : null;
      if (effective) availableLocales.push(locale);
    }
    if (availableLocales.length > 0 && availableLocales.length < LOCALES.length) {
      oneSidedKeys.push({
        findingId: `one-sided-key:${id}`,
        messageId: id,
        presentIn: availableLocales,
        missingIn: LOCALES.filter((locale) => !availableLocales.includes(locale)),
      });
    }
    if (references.length > 0 && availableLocales.length < LOCALES.length) {
      missingActiveIds.push({
        findingId: `missing-active-id:${id}`,
        messageId: id,
        referencedAt: references,
        presentIn: availableLocales,
        missingIn: LOCALES.filter((locale) => !availableLocales.includes(locale)),
      });
    }
    const defaults = new Map();
    for (const reference of references) {
      if (reference.defaultMessage === null) continue;
      if (!defaults.has(reference.defaultMessage)) defaults.set(reference.defaultMessage, []);
      defaults.get(reference.defaultMessage).push({
        path: reference.path,
        line: reference.line,
        column: reference.column,
        kind: reference.kind,
      });
    }
    const defaultMessages = [...defaults]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, locations]) => {
        const sortedLocations = locations.sort(sortByLocation);
        const icu = inspectIcuMessage(value);
        if (icu.error) {
          const firstLocation = sortedLocations[0];
          invalidIcuMessages.push({
            findingId: `invalid-icu:default-message:${id}:${firstLocation.path}:${firstLocation.line}:${firstLocation.column}`,
            messageId: id,
            value,
            ...firstLocation,
            locations: sortedLocations,
            reason: icu.error,
          });
        }
        return {
          value,
          argumentSignature: icu.argumentSignature,
          placeholders: icu.placeholders,
          locations: sortedLocations,
        };
      });
    if (defaultMessages.length > 1) {
      multipleDefaultMessageConflicts.push({
        findingId: `multiple-default-messages:${id}`,
        messageId: id,
        defaultMessages,
      });
    }
    const canonicalEnglish = translations['en-US']?.value;
    if (canonicalEnglish !== undefined) {
      for (const reference of references) {
        if (reference.defaultMessage !== null && reference.defaultMessage !== canonicalEnglish) {
          defaultMessageVsEnglish.push({
            findingId: `default-message-vs-english:${id}:${reference.path}:${reference.line}:${reference.column}:${reference.kind}`,
            messageId: id,
            canonicalEnglish,
            defaultMessage: reference.defaultMessage,
            path: reference.path,
            line: reference.line,
            column: reference.column,
            kind: reference.kind,
          });
        }
      }
    }
    const placeholderSources = [];
    for (const locale of LOCALES) {
      if (translations[locale])
        placeholderSources.push({
          source: locale,
          argumentSignature: translations[locale].argumentSignature,
          placeholders: translations[locale].placeholders,
        });
    }
    for (const item of defaultMessages)
      placeholderSources.push({
        source: `defaultMessage:${item.value}`,
        argumentSignature: item.argumentSignature,
        placeholders: item.placeholders,
      });
    const signatures = [
      ...new Set(placeholderSources.map((item) => JSON.stringify(item.argumentSignature))),
    ];
    if (signatures.length > 1) {
      placeholderMismatches.push({
        findingId: `placeholder-mismatch:${id}`,
        messageId: id,
        sources: placeholderSources,
      });
    }

    messages.push({
      id,
      category:
        dynamicFamilies.length > 0
          ? 'active-dynamic'
          : references.length > 0
            ? 'active-static'
            : 'reserved',
      dynamicFamilies,
      moduleOwnership,
      translations,
      references,
      defaultMessages,
    });
  }

  const findings = {
    scanErrors: scanErrors.sort(sortByLocation),
    invalidIcuMessages: invalidIcuMessages.sort((a, b) => a.findingId.localeCompare(b.findingId)),
    dynamicRegistryErrors: dynamicRegistryErrors.sort((a, b) =>
      a.findingId.localeCompare(b.findingId),
    ),
    unsupportedSyntax: unsupportedSyntax.sort((a, b) => a.findingId.localeCompare(b.findingId)),
    localeModuleDrift: localeModuleDrift.sort((a, b) => a.findingId.localeCompare(b.findingId)),
    duplicateLocaleKeys: duplicateLocaleKeys.sort((a, b) => a.findingId.localeCompare(b.findingId)),
    oneSidedKeys: oneSidedKeys.sort((a, b) => a.messageId.localeCompare(b.messageId)),
    missingActiveIds: missingActiveIds.sort((a, b) => a.messageId.localeCompare(b.messageId)),
    multipleDefaultMessageConflicts: multipleDefaultMessageConflicts.sort((a, b) =>
      a.messageId.localeCompare(b.messageId),
    ),
    defaultMessageVsEnglish: defaultMessageVsEnglish.sort(
      (a, b) =>
        a.messageId.localeCompare(b.messageId) ||
        a.path.localeCompare(b.path) ||
        a.line - b.line ||
        a.column - b.column,
    ),
    placeholderMismatches: placeholderMismatches.sort((a, b) =>
      a.messageId.localeCompare(b.messageId),
    ),
    unresolvedDynamicCallsites: dynamicClassification.unresolved,
    reservedDynamicFallbacks: Object.entries(dynamicRegistry.families)
      .filter(
        ([, family]) =>
          family?.unknownHandling?.kind === 'localizedRuntimeFallback' &&
          family.unknownHandling.status === 'reserved-for-followup',
      )
      .map(([family, contract]) => ({
        findingId: `dynamic-fallback:reserved:${family}`,
        family,
        localizedRuntimeFallback: contract.unknownHandling,
        reason:
          'The localized unknown fallback is reserved but not implemented in the runtime boundary.',
      })),
  };
  const violationCounts = Object.fromEntries(
    Object.entries(findings).map(([key, values]) => [key, values.length]),
  );
  const violationCount = Object.values(violationCounts).reduce((sum, value) => sum + value, 0);
  const baseCommit = execFileSync('git', ['rev-parse', '--verify', `${baseRef}^{commit}`], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  const auditedInputPaths = [
    dynamicRegistry.path ?? dynamicRegistryPath,
    ...runtime.sourceFiles,
    ...LOCALES.flatMap((locale) => [
      localeScans[locale].entry,
      ...localeScans[locale].leafModules.map((module) => `src/locales/${locale}/${module}.ts`),
    ]),
  ];
  const unknownHandlingCounts = Object.values(dynamicRegistry.families).reduce((counts, family) => {
    const handling = family?.unknownHandling;
    const status =
      handling?.kind === 'closedWorld'
        ? 'closedWorld'
        : handling?.kind === 'localizedRuntimeFallback'
          ? `localizedRuntimeFallback:${handling.status}`
          : 'invalid';
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
  const messageCategoryCounts = messages.reduce(
    (counts, message) => {
      counts[message.category] += 1;
      return counts;
    },
    { 'active-static': 0, 'active-dynamic': 0, reserved: 0 },
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    source: {
      baseRef,
      baseCommit,
      auditedInputDigest: auditInputDigest(root, auditedInputPaths),
      auditedInputDigestAlgorithm: 'sha256(path\\0content\\0)',
      repository: 'linancn/tiangong-lca-next',
    },
    auditPolicy: {
      categories: CATEGORY_DEFINITIONS,
      included: [
        'src/locales/en-US.ts and src/locales/en-US/**/*.ts',
        'src/locales/zh-CN.ts and src/locales/zh-CN/**/*.ts',
        'src/locales/de-DE.ts and src/locales/de-DE/**/*.ts',
        'production src/**/*.{ts,tsx,js,jsx} formatMessage and FormattedMessage callsites',
        'production src/**/*.{ts,tsx,js,jsx,json} messageKey properties',
      ],
      exclusions: EXCLUSIONS,
      enforceableFindingTypes: Object.keys(findings),
      icuMessageArguments: {
        supportedTypes: ['simple', 'number', 'plural', 'select'],
        signatureRepresentation: 'sorted unique { name, type } pairs',
        requiredFallbacks: ['plural:other', 'select:other'],
      },
      scannerLimitations: [
        'The scanner resolves inline descriptors and uniquely named same-file string/object constants; it does not follow imported descriptor objects across modules.',
        'For JSON schema rules, a static defaultMessage is associated only when it is a sibling of messageKey in the same rule object.',
        'Computed ids are enforceable only when their exact normalized callsite summary matches the reviewed dynamic-family registry.',
        'The scanner recognizes APIs named formatMessage and JSX tags named FormattedMessage; aliases with different names require an explicit scanner update.',
      ],
      dynamicRegistry: dynamicRegistry.path ?? dynamicRegistryPath,
    },
    summary: {
      localeCount: LOCALES.length,
      localeLeafModuleCounts: Object.fromEntries(
        LOCALES.map((locale) => [locale, localeScans[locale].leafModules.length]),
      ),
      localeUniqueKeyCounts: Object.fromEntries(
        LOCALES.map((locale) => [locale, localeScans[locale].effective.size]),
      ),
      canonicalCandidateKeyCount: messages.length,
      activeStaticKeyCount: messageCategoryCounts['active-static'],
      activeDynamicKeyCount: messageCategoryCounts['active-dynamic'],
      reservedKeyCount: messageCategoryCounts.reserved,
      productionSourceFileCount: runtime.sourceFiles.length,
      literalReferenceCount: [...runtime.references.values()].reduce(
        (sum, values) => sum + values.length,
        0,
      ),
      dynamicCallsiteCount: runtime.dynamicObligations.length,
      dynamicCallsiteSummaryCount: dynamicClassification.actual.length,
      registeredDynamicCallsiteCount: dynamicClassification.registered.length,
      reviewedDynamicCallsiteCount: dynamicClassification.reviewed.length,
      dynamicFamilyCount: Object.keys(dynamicRegistry.families).length,
      unknownHandlingCounts,
      violationCount,
      violationCounts,
      enforceable: violationCount === 0,
    },
    localeTopology: Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        {
          entry: localeScans[locale].entry,
          leafModules: localeScans[locale].leafModules,
          moduleOrder: localeScans[locale].moduleOrder,
          spreadOrderAligned,
        },
      ]),
    ),
    messages,
    dynamicFamilyRegistry: {
      path: dynamicRegistry.path ?? dynamicRegistryPath,
      schemaVersion: dynamicRegistry.schemaVersion,
      families: Object.fromEntries(
        Object.entries(dynamicRegistry.families)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, family]) => [
            name,
            {
              unknownHandling: family.unknownHandling,
              proof: family.proof,
            },
          ]),
      ),
    },
    reviewedDynamicCallsites: dynamicClassification.reviewed,
    pendingDynamicFallbackCallsites: dynamicClassification.pendingFallback,
    dynamicAuditObligations: dynamicClassification.unresolved,
    findings,
  };
}

function buildDecisionRegister(manifest) {
  const actionByType = {
    scanErrors: 'Repair the source parse error before relying on the audit.',
    invalidIcuMessages:
      'Repair the ICU message syntax, use a supported argument type, and provide other for plural/select arguments.',
    dynamicRegistryErrors:
      'Repair the shared dynamic-family registry and its source-locale evidence.',
    unsupportedSyntax:
      'Replace or explicitly extend the deterministic locale scanner for this syntax.',
    localeModuleDrift: 'Align every active locale module topology and top-level spread order.',
    duplicateLocaleKeys:
      'Assign one module owner per key or document and implement an explicit compatibility migration.',
    oneSidedKeys: 'Add the missing source translation or remove/reclassify the key in all locales.',
    missingActiveIds:
      'Add the active id to every supported source locale after validating its runtime context.',
    multipleDefaultMessageConflicts:
      'Confirm whether the callsites share one concept; otherwise split the message id.',
    defaultMessageVsEnglish:
      'Align the callsite defaultMessage exactly with canonical en-US or add a human-reviewed exact exception.',
    placeholderMismatches:
      'Align placeholder names and types across source locales and runtime descriptors.',
    unresolvedDynamicCallsites:
      'Enumerate the finite message-id family and add an auditable mapping or replace the computed id.',
    reservedDynamicFallbacks:
      'Implement the localized unknown fallback at the runtime boundary before enforcement can pass.',
  };
  const decisions = [];
  for (const [findingType, findings] of Object.entries(manifest.findings)) {
    for (const finding of findings) {
      decisions.push({
        decisionId: finding.findingId,
        findingType,
        messageId: finding.messageId ?? null,
        path: finding.path ?? null,
        line: finding.line ?? null,
        status: 'pending',
        owner: null,
        resolution: null,
        requiredAction: actionByType[findingType],
      });
    }
  }
  decisions.sort((a, b) => a.decisionId.localeCompare(b.decisionId));
  return {
    schemaVersion: DECISIONS_SCHEMA_VERSION,
    source: manifest.source,
    manifest: DEFAULT_MANIFEST,
    statusValues: ['pending', 'approved', 'implemented', 'rejected'],
    categoryDefinitions: CATEGORY_DEFINITIONS,
    exclusions: EXCLUSIONS,
    policy: {
      defaultStatus: 'pending',
      approvalRule:
        'A finding is not resolved until the implementation changes and audit output prove the selected resolution.',
      dynamicFamilyRule:
        'Every computed message id must have a finite reviewed family and a localized unknown fallback.',
    },
    decisions,
  };
}

function yamlScalar(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function toYaml(value, indent = 0) {
  const prefix = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return `${prefix}[]`;
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const rendered = toYaml(item, indent + 2).split('\n');
          return `${prefix}- ${rendered[0].trimStart()}${rendered.length > 1 ? `\n${rendered.slice(1).join('\n')}` : ''}`;
        }
        return `${prefix}- ${yamlScalar(item)}`;
      })
      .join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return `${prefix}{}`;
    return entries
      .map(([key, item]) => {
        if (item !== null && typeof item === 'object')
          return `${prefix}${key}:\n${toYaml(item, indent + 2)}`;
        return `${prefix}${key}: ${yamlScalar(item)}`;
      })
      .join('\n');
  }
  return `${prefix}${yamlScalar(value)}`;
}

function writeFileEnsuringDirectory(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = buildManifest(options.root, options.baseRef, options.dynamicRegistry);
  const manifestPath = path.resolve(options.root, options.manifest);
  const manifestText = await prettier.format(JSON.stringify(manifest), {
    ...(await prettier.resolveConfig(manifestPath)),
    filepath: manifestPath,
  });
  const decisionsPath = path.resolve(options.root, options.decisions);
  let staleManifest = false;
  let wroteDecisionRegister = false;

  if (options.write) {
    writeFileEnsuringDirectory(manifestPath, manifestText);
    if (!fs.existsSync(decisionsPath) || options.refreshDecisions) {
      const decisions = buildDecisionRegister(manifest);
      writeFileEnsuringDirectory(decisionsPath, `${toYaml(decisions)}\n`);
      wroteDecisionRegister = true;
    }
  }
  if (options.check) {
    staleManifest =
      !fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== manifestText;
  }

  const result = {
    schemaVersion: manifest.schemaVersion,
    source: manifest.source,
    mode: options.mode,
    wroteManifest: options.write,
    wroteDecisionRegister,
    checkedManifest: options.check,
    staleManifest,
    summary: manifest.summary,
    manifestPath: relativePath(options.root, manifestPath),
    decisionsPath: relativePath(options.root, decisionsPath),
    dynamicRegistryPath: options.dynamicRegistry,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (staleManifest || (options.mode === 'enforce' && manifest.summary.violationCount > 0))
    process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `i18n audit failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}
