#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { getImportReportContentAuditDescriptor } from '../../src/components/ImportTidasPackage/reportContent.ts';
import { TRANSLATION_SOURCE_CONTENT_LANGUAGE } from '../../src/services/general/contentLanguageRegistry.ts';
import { getLocaleCapability } from '../../src/services/general/localeCapabilities.ts';
import {
  CANONICAL_SOURCE_APP_LOCALE,
  getLocaleDefinition,
  getLocaleDefinitionByLanguage,
  SUPPORTED_APP_LOCALES,
} from '../../src/services/general/localeRegistry.ts';
import { REFERENCE_RESOURCE_MANIFEST as REFERENCE_RESOURCES } from '../../src/services/referenceResources/manifest.ts';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const ts = require('typescript');

const AUDIT_SCRIPT = 'scripts/i18n/audit-locales.mjs';
const CANONICAL_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const CORRECTION_LEDGER = 'docs/plans/i18n/corrections.json';
const DYNAMIC_FAMILIES = 'docs/plans/i18n-de-DE/dynamic-families.json';
const ROUTE_VIEW_COVERAGE = 'docs/plans/i18n/route-view-coverage.json';
const FALLBACK_CONTRACT = 'docs/plans/i18n/fallback-contract.json';
const IMPORT_REPORT_CONTENT_SOURCE = 'src/components/ImportTidasPackage/reportContent.ts';
const CONTENT_LANGUAGE_REGISTRY = 'src/services/general/contentLanguageRegistry.ts';
const LOCALE_CAPABILITY_MATRIX = 'src/services/general/localeCapabilities.ts';
const REFERENCE_RESOURCE_MANIFEST = 'src/services/referenceResources/manifest.ts';
const REFERENCE_RESOURCE_RESOLVER = 'src/services/referenceResources/resolver.ts';
const LANGUAGE_PLATFORM_AUDIT = 'scripts/i18n/audit-language-platform.mjs';
const LANGUAGE_HARDCODING_ALLOWLIST = 'scripts/i18n/language-hardcoding-allowlist.json';
const PRIVATE_CONFIRMATION_PATTERN = /\.local\/.+confirmation/iu;
const TRANSLATION_SOURCE_APP_LOCALE = getLocaleDefinitionByLanguage(
  TRANSLATION_SOURCE_CONTENT_LANGUAGE,
)?.canonicalLocale;
if (!TRANSLATION_SOURCE_APP_LOCALE) {
  throw new Error('Translation source content language has no registered app locale.');
}
const REQUIRED_FALLBACK_SURFACES = [
  'ui-locale',
  'documentation',
  'legal',
  'content-language',
  'service-query-language',
  'classification-reference-data',
  'location-reference-data',
  'service-errors',
  'TIDAS-import-report',
  'environment-branding',
];

const ACTIONS = new Set([
  'audit',
  'manifest',
  'context',
  'quality',
  'corrections',
  'activation',
  'artifacts',
  'all',
  'dossier',
]);

function usage() {
  return `Usage: node --import tsx scripts/i18n/locale-delivery.mjs <action> [options]

Actions:
  audit         run the shared exact locale audit and verify the requested locale
  manifest      write or check the shared canonical source manifest
  context       write or check the compact locale context manifest
  quality       write or check the compact automated quality manifest
  corrections   check the tracked existing-translation correction overlay
  activation    write or check the compact runtime activation manifest
  artifacts     write context, quality, and activation manifests in dependency order
  all           check context, quality, and activation for every registry locale
  dossier       print one reproducible full message dossier without writing it

Options:
  --locale <locale>  canonical locale from the typed registry
  --message <id>     exact message ID (required for dossier)
  --root <path>      repository root (default: current working directory)
  --write            write the selected deterministic artifact
  --check            check the selected deterministic artifact (default)
  --require-production-ready
                     fail when the checked activation manifest has unresolved blockers
  --help             show this help
`;
}

function parseArgs(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(usage());
    process.exit(0);
  }
  const action = argv[0];
  if (!ACTIONS.has(action)) throw new Error(`Unknown action: ${action ?? '(missing)'}`);

  const options = {
    action,
    root: process.cwd(),
    locale: undefined,
    message: undefined,
    write: false,
    check: false,
    requireProductionReady: false,
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') options.write = true;
    else if (argument === '--check') options.check = true;
    else if (argument === '--require-production-ready') options.requireProductionReady = true;
    else if (argument === '--locale' || argument === '--root' || argument === '--message') {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      options[argument === '--locale' ? 'locale' : argument === '--message' ? 'message' : 'root'] =
        value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.write && options.check) throw new Error('--write and --check cannot be combined');
  if (!options.write && !options.check) options.check = true;
  options.root = path.resolve(options.root);

  if (action !== 'corrections' && action !== 'all') {
    if (!options.locale) throw new Error('--locale is required for this action');
    const definition = getLocaleDefinition(options.locale);
    if (!definition || definition.canonicalLocale !== options.locale) {
      throw new Error(
        `--locale must be canonical; expected one of ${SUPPORTED_APP_LOCALES.join(', ')}`,
      );
    }
  }
  if (action === 'audit' && options.write) throw new Error('audit does not support --write');
  if (action === 'all' && options.write) throw new Error('all does not support --write');
  if (options.requireProductionReady && !['activation', 'all'].includes(action)) {
    throw new Error('--require-production-ready is supported only for activation and all');
  }
  if (action === 'dossier' && !options.message)
    throw new Error('--message is required for dossier');
  if (action === 'dossier' && options.write) throw new Error('dossier does not support --write');
  if (action === 'corrections' && options.write) {
    throw new Error('corrections are human-readable tracked dossiers and are never generated');
  }
  return options;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function digestJson(value) {
  return sha256(`${JSON.stringify(stable(value))}\n`);
}

function readText(root, relativeFile) {
  return fs.readFileSync(path.resolve(root, relativeFile), 'utf8');
}

function readJson(root, relativeFile) {
  return JSON.parse(readText(root, relativeFile));
}

function fileDigest(root, relativeFile) {
  return sha256(fs.readFileSync(path.resolve(root, relativeFile)));
}

function gitText(root, commit, relativeFile) {
  return execFileSync('git', ['show', `${commit}:${relativeFile}`], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitLocaleCatalogDigest(root, commit, locale) {
  const files = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', commit, `src/locales/${locale}`, `src/locales/${locale}.ts`],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
  const hash = createHash('sha256');
  for (const relativeFile of files) {
    hash.update(relativeFile);
    hash.update('\0');
    hash.update(
      execFileSync('git', ['show', `${commit}:${relativeFile}`], {
        cwd: root,
        encoding: null,
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
    hash.update('\0');
  }
  return hash.digest('hex');
}

function planDirectory(locale) {
  return `docs/plans/i18n-${locale}`;
}

function localePaths(locale) {
  const directory = planDirectory(locale);
  return {
    directory,
    glossary: `${directory}/glossary.json`,
    styleGuide: `${directory}/style-guide.md`,
    context: `${directory}/context-manifest.json`,
    quality: `${directory}/quality-manifest.json`,
    activation: `${directory}/locale-activation-manifest.json`,
    structuralValidation: `${directory}/structural-validation.json`,
  };
}

async function formattedJson(root, relativeFile, value) {
  return prettier.format(JSON.stringify(value), {
    ...(await prettier.resolveConfig(path.resolve(root, relativeFile))),
    filepath: path.resolve(root, relativeFile),
  });
}

async function writeOrCheckJson(root, relativeFile, value, options) {
  const absoluteFile = path.resolve(root, relativeFile);
  const rendered = await formattedJson(root, relativeFile, value);
  if (options.write) {
    fs.mkdirSync(path.dirname(absoluteFile), { recursive: true });
    fs.writeFileSync(absoluteFile, rendered);
    return { path: relativeFile, wrote: true, stale: false };
  }
  const stale = !fs.existsSync(absoluteFile) || fs.readFileSync(absoluteFile, 'utf8') !== rendered;
  return { path: relativeFile, wrote: false, stale };
}

function assertSharedManifest(manifest, locale) {
  if (manifest?.summary?.enforceable !== true || manifest?.summary?.violationCount !== 0) {
    throw new Error('The shared locale manifest contains enforceable findings.');
  }
  const topology = manifest?.localeTopology?.[locale];
  const sourceTopology = manifest?.localeTopology?.[CANONICAL_SOURCE_APP_LOCALE];
  if (!topology || !sourceTopology) throw new Error(`Manifest does not include ${locale}.`);
  if (JSON.stringify(topology.leafModules) !== JSON.stringify(sourceTopology.leafModules)) {
    throw new Error(`${locale} leaf-module topology differs from the canonical source locale.`);
  }
  if (topology.spreadOrderAligned !== true) {
    throw new Error(`${locale} top-level spread order is not aligned.`);
  }
  const expectedCount = manifest.summary.canonicalCandidateKeyCount;
  if (manifest.summary.localeUniqueKeyCounts?.[locale] !== expectedCount) {
    throw new Error(`${locale} does not have exact key parity with the canonical source locale.`);
  }
}

function runSharedAudit(root, mode) {
  const args = [
    '--import',
    'tsx',
    AUDIT_SCRIPT,
    '--mode',
    'enforce',
    mode === 'write' ? '--write' : '--check',
  ];
  if (mode === 'write') {
    const ledger = readJson(root, CORRECTION_LEDGER);
    args.push('--base-ref', ledger.baselineSha);
  }
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    throw new Error(`Shared locale audit failed with status ${result.status}.`);
  }
  return JSON.parse(result.stdout);
}

function runLanguagePlatformAudit(root) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', LANGUAGE_PLATFORM_AUDIT, '--scope', 'all', '--check'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    throw new Error(`Language-platform audit failed with status ${result.status}.`);
  }
}

function parseTypeScriptSource(root, relativeFile) {
  const source = readText(root, relativeFile);
  return {
    source,
    sourceFile: ts.createSourceFile(
      relativeFile,
      source,
      ts.ScriptTarget.Latest,
      true,
      relativeFile.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  };
}

function propertyNameText(property) {
  const name = property?.name;
  if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))) {
    return name.text;
  }
  return undefined;
}

function objectProperty(object, name) {
  return object?.properties?.find((property) => propertyNameText(property) === name);
}

function collectStringConstants(sourceFile) {
  const constants = new Map();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      constants.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return constants;
}

function expressionString(expression, constants, sourceFile) {
  if (!expression) return undefined;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) return constants.get(expression.text);
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      value +=
        expressionString(span.expression, constants, sourceFile) ??
        `\${${span.expression.getText(sourceFile)}}`;
      value += span.literal.text;
    }
    return value;
  }
  return undefined;
}

function collectRouteConfigEvidence(root, relativeFile) {
  const { sourceFile } = parseTypeScriptSource(root, relativeFile);
  const constants = collectStringConstants(sourceFile);
  const definitions = [];
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const pathProperty = objectProperty(node, 'path');
      const routePath = expressionString(pathProperty?.initializer, constants, sourceFile);
      if (routePath) {
        const redirectProperty = objectProperty(node, 'redirect');
        const componentProperty = objectProperty(node, 'component');
        const keepQueryProperty = objectProperty(node, 'keepQuery');
        definitions.push({
          path: routePath,
          redirect: expressionString(redirectProperty?.initializer, constants, sourceFile) ?? null,
          component:
            expressionString(componentProperty?.initializer, constants, sourceFile) ?? null,
          keepQuery: keepQueryProperty?.initializer?.kind === ts.SyntaxKind.TrueKeyword,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return {
    definitions,
    configuredPaths: [...new Set(definitions.map(({ path: routePath }) => routePath))].sort(),
    digest: digestJson(definitions),
  };
}

function collectAnonymousRoutePolicyEvidence(root) {
  const relativeFile = 'src/services/general/publicRoutePolicy.ts';
  const { source, sourceFile } = parseTypeScriptSource(root, relativeFile);
  const constants = collectStringConstants(sourceFile);
  let allowedPaths = [];
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'ANONYMOUS_ROUTE_PATHS' &&
      node.initializer
    ) {
      const initializer = ts.isAsExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      if (ts.isArrayLiteralExpression(initializer)) {
        allowedPaths = initializer.elements
          .map((element) => expressionString(element, constants, sourceFile))
          .filter(Boolean);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (allowedPaths.length === 0) {
    throw new Error('Anonymous-route policy must expose its explicit allowlist.');
  }
  if (!source.includes('anonymousRoutePaths.has(pathname)')) {
    throw new Error('Anonymous-route policy must fail closed through exact allowlist membership.');
  }
  return {
    allowedPaths,
    defaultAccess: 'authenticated-session-required',
    unknownPathAccess: 'authenticated-session-required',
    sourcePath: relativeFile,
  };
}

function semanticSignalsFromText(value) {
  const normalized = String(value)
    .replace(/([a-z])([A-Z])/gu, '$1-$2')
    .toLocaleLowerCase('en-US');
  const signals = [];
  if (/(?:loading|spinning|pending)/u.test(normalized)) signals.push('loading');
  if (/(?:error|failure|failed|invalid|wrong)/u.test(normalized)) signals.push('error');
  if (/(?:empty|no-data|no-results)/u.test(normalized)) signals.push('empty');
  if (/(?:success|complete|completed)/u.test(normalized)) signals.push('success');
  if (/(?:ready|loaded)/u.test(normalized)) signals.push('ready');
  if (/(?:unavailable|expired|missing|not-found)/u.test(normalized)) signals.push('unavailable');
  if (/(?:retry|reload|request-new)/u.test(normalized)) signals.push('retry');
  if (/(?:modal|drawer|dialog)/u.test(normalized)) signals.push('modal');
  if (/(?:dark-mode|is-dark)/u.test(normalized)) signals.push('dark');
  return signals;
}

function collectSourceDerivation(root, relativeFile, referencedMessages) {
  const extension = path.extname(relativeFile);
  const source = readText(root, relativeFile);
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
    return {
      sourcePath: relativeFile,
      sourceDigest: fileDigest(root, relativeFile),
      messageIds: [],
      navigationTargets: [],
      queryParameters: [],
      interactionKinds: [],
      stateSignals: [],
      acceptedTechnicalLiterals: [],
      unownedVisibleLiterals: [],
    };
  }
  const { sourceFile } = parseTypeScriptSource(root, relativeFile);
  const constants = collectStringConstants(sourceFile);
  const navigationTargets = new Set();
  const queryParameters = new Set();
  const interactionKinds = new Set();
  const stateSignals = new Set();
  const visibleLiterals = [];
  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/gu, ' ').trim();
      if (value && /[\p{L}\p{N}]/u.test(value)) visibleLiterals.push(value);
    }
    if (ts.isJsxAttribute(node)) {
      const attributeName = propertyNameText(node);
      if (
        ['alt', 'title', 'placeholder', 'aria-label'].includes(attributeName) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        visibleLiterals.push(node.initializer.text);
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile).split('.').at(-1);
      if (['Alert', 'Drawer', 'Modal', 'Spin', 'Tabs', 'Tooltip'].includes(tagName)) {
        interactionKinds.add(tagName.toLocaleLowerCase('en-US'));
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const callee = node.initializer.expression.getText(sourceFile);
      if (/(?:^|\.)useState$/u.test(callee) && ts.isIdentifier(node.name)) {
        for (const signal of semanticSignalsFromText(node.name.text)) stateSignals.add(signal);
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const receiver = node.expression.expression.getText(sourceFile);
      if (['push', 'replace'].includes(method)) {
        const target = expressionString(node.arguments[0], constants, sourceFile);
        if (target?.startsWith('/')) navigationTargets.add(target);
      }
      if (method === 'get' && /(?:searchParams|getHashSearchParams)/iu.test(receiver)) {
        const parameter = expressionString(node.arguments[0], constants, sourceFile);
        if (parameter) queryParameters.add(parameter);
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      /^set[A-Z]/u.test(node.expression.text)
    ) {
      const stateValue = expressionString(node.arguments[0], constants, sourceFile);
      for (const signal of semanticSignalsFromText(stateValue ?? node.expression.text)) {
        stateSignals.add(signal);
      }
    }
    if (ts.isJsxAttribute(node) && ['href', 'to'].includes(propertyNameText(node))) {
      const target =
        node.initializer && ts.isStringLiteral(node.initializer)
          ? node.initializer.text
          : node.initializer && ts.isJsxExpression(node.initializer)
            ? expressionString(node.initializer.expression, constants, sourceFile)
            : undefined;
      if (target?.startsWith('/')) navigationTargets.add(target);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  for (const message of referencedMessages) {
    for (const signal of semanticSignalsFromText(message.id)) stateSignals.add(signal);
  }
  const acceptedTechnicalLiterals = [...new Set(visibleLiterals.filter(isTechnicalOrProperName))];
  const unownedVisibleLiterals = [
    ...new Set(visibleLiterals.filter((value) => !isTechnicalOrProperName(value))),
  ];
  return {
    sourcePath: relativeFile,
    sourceDigest: sha256(source),
    messageIds: referencedMessages.map(({ id }) => id).sort(),
    navigationTargets: [...navigationTargets].sort(),
    queryParameters: [...queryParameters].sort(),
    interactionKinds: [...interactionKinds].sort(),
    stateSignals: [...stateSignals].sort(),
    acceptedTechnicalLiterals,
    unownedVisibleLiterals,
  };
}

function routeRowMatchesMessage(row, message) {
  const ids = row.copySources.localeMessageIds ?? [];
  const prefixes = row.copySources.localeMessageIdPrefixes ?? [];
  const sourcePaths = new Set(row.copySources.sourcePaths ?? []);
  return (
    ids.includes(message.id) ||
    prefixes.some((prefix) => message.id.startsWith(prefix)) ||
    message.references.some((reference) => sourcePaths.has(reference.path))
  );
}

function stateSignalCovered(signal, visibleStates) {
  const normalized = visibleStates.join(' ').toLocaleLowerCase('en-US');
  const aliases = {
    loading: ['loading', 'spinning', 'pending'],
    error: ['error', 'failure', 'invalid'],
    empty: ['empty', 'no-data', 'no-results'],
    success: ['success', 'complete', 'ready'],
    ready: ['ready', 'form', 'overview', 'success'],
    unavailable: ['unavailable', 'expired', 'fallback', 'error'],
    retry: ['retry', 'reload', 'recovery', 'action'],
    modal: ['modal', 'drawer', 'dialog'],
    dark: ['dark', 'theme'],
  };
  return aliases[signal].some((alias) => normalized.includes(alias));
}

function validateTypedContentSources(locale) {
  const descriptor = getImportReportContentAuditDescriptor();
  const expectedAdapters = SUPPORTED_APP_LOCALES.map(
    (appLocale) => getLocaleDefinition(appLocale).adapters.report,
  );
  if (JSON.stringify(descriptor.reportAdapterKeys) !== JSON.stringify(expectedAdapters)) {
    throw new Error('TIDAS import-report content topology differs from the typed locale registry.');
  }
  if (
    JSON.stringify(descriptor.entries.map(({ canonicalLocale }) => canonicalLocale)) !==
    JSON.stringify(SUPPORTED_APP_LOCALES)
  ) {
    throw new Error('TIDAS import-report canonical locale topology is incomplete.');
  }
  for (const entry of descriptor.entries) {
    if (!entry.humanSummaryTemplate.trim() || !entry.readmeMarkdown.trim()) {
      throw new Error(`TIDAS import-report content is empty for ${entry.canonicalLocale}.`);
    }
    for (const token of descriptor.humanSummaryTokens) {
      if (!entry.humanSummaryTemplate.includes(`{${token}}`)) {
        throw new Error(`TIDAS import-report ${entry.canonicalLocale} is missing {${token}}.`);
      }
    }
  }
  const target = descriptor.entries.find(({ canonicalLocale }) => canonicalLocale === locale);
  const source = descriptor.entries.find(
    ({ canonicalLocale }) => canonicalLocale === CANONICAL_SOURCE_APP_LOCALE,
  );
  const dossiers = descriptor.contentKinds.map((kind) => ({
    contentId: `${descriptor.sourceId}.${kind}`,
    translations: Object.fromEntries(
      descriptor.entries.map((entry) => [
        entry.canonicalLocale,
        kind === 'human_summary' ? entry.humanSummaryTemplate : entry.readmeMarkdown,
      ]),
    ),
    callsite: 'src/components/ImportTidasPackage/index.tsx report download action',
    route: 'authenticated TIDAS package import modal',
    uiRole: kind === 'human_summary' ? 'downloaded report summary' : 'downloaded report guide',
    stateTransition: 'import result -> report download -> offline diagnosis',
    userConsequence: 'explains validation failures, conflicts, and skipped open data',
    terminologyEvidence: 'locale glossary, TIDAS schema tokens, and canonical report contract',
    syntax:
      kind === 'human_summary'
        ? { placeholders: descriptor.humanSummaryTokens, markdown: false }
        : { placeholders: [], markdown: true },
    targetCandidate: kind === 'human_summary' ? target.humanSummaryTemplate : target.readmeMarkdown,
    canonicalEnglish:
      kind === 'human_summary' ? source.humanSummaryTemplate : source.readmeMarkdown,
    rationale: 'registry-complete cross-locale content with report-schema tokens preserved',
    risk: 'high',
    validation: ['exact registry topology', 'token parity', 'pure descriptor unit test'],
  }));
  return {
    sourcePath: IMPORT_REPORT_CONTENT_SOURCE,
    sourceId: descriptor.sourceId,
    contentKinds: descriptor.contentKinds,
    registryLocaleCount: descriptor.entries.length,
    targetContentUnitCount: dossiers.length,
    targetContentDigest: digestJson(
      dossiers.map(({ contentId, targetCandidate }) => [contentId, targetCandidate]),
    ),
    dossierDigest: digestJson(dossiers),
    topologyDigest: digestJson(descriptor),
    blockedContextCount: 0,
  };
}

function validateRouteCoverage(root, manifest) {
  const coverage = readJson(root, ROUTE_VIEW_COVERAGE);
  if (coverage.sourceRouteConfig !== 'config/routes.ts') {
    throw new Error('Route-view coverage must identify config/routes.ts as its route source.');
  }
  const requiredPaths = new Set(['/', '/welcome', '/welcome?view=carbon-footprint']);
  const observedPaths = new Set(coverage.rows.map(({ route }) => route));
  for (const route of requiredPaths) {
    if (!observedPaths.has(route)) throw new Error(`Route-view coverage is missing ${route}.`);
  }
  if (JSON.stringify(coverage.supportedLocales) !== JSON.stringify(SUPPORTED_APP_LOCALES)) {
    throw new Error('Route-view coverage locale order differs from the typed registry.');
  }
  const routeKeys = coverage.rows.map(({ route, viewState }) => `${route}\0${viewState}`);
  if (new Set(routeKeys).size !== routeKeys.length) {
    throw new Error('Route-view coverage contains duplicate route/view-state rows.');
  }
  const routeConfig = collectRouteConfigEvidence(root, coverage.sourceRouteConfig);
  const anonymousRoutePolicy = collectAnonymousRoutePolicyEvidence(root);
  const configuredPaths = new Set(routeConfig.configuredPaths);
  const messageIds = new Set(manifest.messages.map(({ id }) => id));
  const messagesBySource = new Map();
  for (const message of manifest.messages) {
    for (const reference of message.references) {
      const messages = messagesBySource.get(reference.path) ?? [];
      messages.push(message);
      messagesBySource.set(reference.path, messages);
    }
  }
  const derivationsBySource = new Map();
  for (const sourcePath of new Set(coverage.rows.flatMap((row) => row.copySources.sourcePaths))) {
    if (!fs.existsSync(path.resolve(root, sourcePath))) {
      throw new Error(`Route-view coverage references missing source ${sourcePath}.`);
    }
    derivationsBySource.set(
      sourcePath,
      collectSourceDerivation(root, sourcePath, messagesBySource.get(sourcePath) ?? []),
    );
  }
  const rootDefinition = routeConfig.definitions.find(({ path: routePath }) => routePath === '/');
  if (rootDefinition?.redirect !== '/welcome' || rootDefinition.keepQuery !== true) {
    throw new Error('The root route must derive a query-preserving redirect to /welcome.');
  }
  const rowEvidence = [];
  for (const row of coverage.rows) {
    if (
      !row.route ||
      !row.viewState ||
      !row.trigger ||
      !row.component ||
      !row.accessContext ||
      !Array.isArray(row.visibleStates) ||
      row.visibleStates.length === 0
    ) {
      throw new Error(
        'Every route-view row must identify a route, view state, trigger, component, access context, and visible states.',
      );
    }
    const copySources = row.copySources;
    if (
      !copySources ||
      !Array.isArray(copySources.sourcePaths) ||
      copySources.sourcePaths.length === 0
    ) {
      throw new Error(`${row.route}/${row.viewState} has no copy-source ownership.`);
    }
    if (!row.targetCoverage || !row.proof) {
      throw new Error(`${row.route}/${row.viewState} has no target coverage or proof contract.`);
    }
    if (
      JSON.stringify(row.targetCoverage.locales) !== JSON.stringify(SUPPORTED_APP_LOCALES) ||
      row.targetCoverage.missingContent !== 0 ||
      !Array.isArray(row.proof.focusedTests) ||
      row.proof.focusedTests.length === 0 ||
      !Array.isArray(row.proof.browserAssertions) ||
      row.proof.browserAssertions.length === 0
    ) {
      throw new Error(`${row.route}/${row.viewState} has incomplete target or proof coverage.`);
    }
    const routePath = row.route.split(/[?#]/u)[0];
    if (
      routePath !== '*' &&
      !configuredPaths.has(routePath) &&
      !fs.existsSync(path.resolve(root, `public${routePath}`))
    ) {
      throw new Error(`${row.route}/${row.viewState} is not derived from routes or public files.`);
    }
    for (const testPath of row.proof.focusedTests) {
      if (!fs.existsSync(path.resolve(root, testPath))) {
        throw new Error(`${row.route}/${row.viewState} references missing test ${testPath}.`);
      }
    }
    for (const messageId of copySources.localeMessageIds ?? []) {
      if (!messageIds.has(messageId)) {
        throw new Error(`${row.route}/${row.viewState} references unknown message ${messageId}.`);
      }
    }
    for (const prefix of copySources.localeMessageIdPrefixes ?? []) {
      if (![...messageIds].some((messageId) => messageId.startsWith(prefix))) {
        throw new Error(
          `${row.route}/${row.viewState} references an empty message prefix ${prefix}.`,
        );
      }
    }
    if (row.unownedStaticContent !== 0 || row.blockedContext !== 0) {
      throw new Error(
        `${row.route}/${row.viewState} still has unowned content or blocked context.`,
      );
    }
    const sourceEvidence = copySources.sourcePaths.map((sourcePath) =>
      derivationsBySource.get(sourcePath),
    );
    const unownedVisibleLiterals = sourceEvidence.flatMap(
      (evidence) => evidence.unownedVisibleLiterals,
    );
    if (unownedVisibleLiterals.length > 0) {
      throw new Error(
        `${row.route}/${row.viewState} has unowned visible literals: ${unownedVisibleLiterals.slice(0, 3).join(', ')}.`,
      );
    }
    const derivedMessages = manifest.messages.filter((message) =>
      routeRowMatchesMessage(row, message),
    );
    rowEvidence.push({
      route: row.route,
      viewState: row.viewState,
      sourceDigest: digestJson(sourceEvidence),
      focusedTestDigest: digestJson(
        row.proof.focusedTests.map((testPath) => [testPath, fileDigest(root, testPath)]),
      ),
      derivedMessageCount: derivedMessages.length,
      derivedMessageDigest: digestJson(derivedMessages.map(({ id }) => id)),
      stateSignals: [
        ...new Set(sourceEvidence.flatMap((evidence) => evidence.stateSignals)),
      ].sort(),
      queryParameters: [
        ...new Set(sourceEvidence.flatMap((evidence) => evidence.queryParameters)),
      ].sort(),
      navigationTargets: [
        ...new Set(sourceEvidence.flatMap((evidence) => evidence.navigationTargets)),
      ].sort(),
      interactionKinds: [
        ...new Set(sourceEvidence.flatMap((evidence) => evidence.interactionKinds)),
      ].sort(),
      acceptedTechnicalLiteralCount: sourceEvidence.reduce(
        (sum, evidence) => sum + evidence.acceptedTechnicalLiterals.length,
        0,
      ),
      unownedVisibleLiteralCount: 0,
    });
  }
  for (const [sourcePath, derivation] of derivationsBySource) {
    const relatedRows = coverage.rows.filter((row) =>
      row.copySources.sourcePaths.includes(sourcePath),
    );
    const visibleStates = relatedRows.flatMap((row) => row.visibleStates);
    for (const signal of derivation.stateSignals) {
      if (!stateSignalCovered(signal, visibleStates)) {
        throw new Error(
          `${sourcePath} derives visible state ${signal}, but its route-view rows do not cover it.`,
        );
      }
    }
    for (const parameter of derivation.queryParameters) {
      if (parameter === 'redirect') continue;
      const routeDeclaresParameter = relatedRows.some((row) => row.route.includes(`${parameter}=`));
      const statesDeclareParameter = visibleStates.some((state) =>
        state.toLocaleLowerCase('en-US').includes(parameter.toLocaleLowerCase('en-US')),
      );
      const dashboardScreenClosure =
        parameter === 'screen' &&
        ['overview', 'map-status', 'outcome-metrics', 'connectivity', 'flow-topology'].every(
          (state) => visibleStates.includes(state),
        );
      if (!routeDeclaresParameter && !statesDeclareParameter && !dashboardScreenClosure) {
        throw new Error(
          `${sourcePath} derives URL state parameter ${parameter}, but no route/view state covers it.`,
        );
      }
    }
  }
  const derivedEvidence = {
    schemaVersion: 'tiangong.i18n-route-view-derived-evidence.v2',
    sourceRouteConfig: coverage.sourceRouteConfig,
    routeConfigDigest: routeConfig.digest,
    configuredRouteCount: routeConfig.configuredPaths.length,
    anonymousRoutePolicy,
    sourceFileCount: derivationsBySource.size,
    sourceEvidenceDigest: digestJson([...derivationsBySource.values()]),
    rowEvidence,
    rowEvidenceDigest: digestJson(rowEvidence),
    blockedDerivedStateCount: 0,
    unownedVisibleLiteralCount: 0,
  };
  return { ...coverage, derivedEvidence };
}

function deriveUiRole(message) {
  const id = message.id.toLocaleLowerCase('en-US');
  if (/(?:error|failure|failed|invalid|required|wrong)/u.test(id)) return 'error-or-validation';
  if (/(?:success|complete)/u.test(id)) return 'success-notification';
  if (/(?:placeholder|hint)/u.test(id)) return 'field-guidance';
  if (/(?:tooltip|help|description|subtitle|intro)/u.test(id)) return 'explanatory-copy';
  if (/(?:title|header|heading)/u.test(id)) return 'title-or-heading';
  if (/(?:button|submit|confirm|cancel|save|delete|add|edit|back|retry|reload|action)/u.test(id)) {
    return 'user-action';
  }
  if (/(?:menu|tab|navigation|breadcrumb)/u.test(id)) return 'navigation-or-tab';
  if (/(?:loading|empty|status|state)/u.test(id)) return 'status-or-empty-state';
  return message.category === 'reserved' ? 'reserved-catalog-copy' : 'label-or-body-copy';
}

function deriveBehavior(uiRole, message) {
  const id = message.id.toLocaleLowerCase('en-US');
  if (uiRole === 'error-or-validation') {
    return {
      currentState: 'failure-or-invalid-input',
      transition: 'user action or service response -> failure -> correction or retry',
      userConsequence: 'the user must understand the problem and the safe next action',
    };
  }
  if (uiRole === 'success-notification') {
    return {
      currentState: 'successful-completion',
      transition: 'user action -> accepted result -> next screen or confirmed state',
      userConsequence: 'the user receives confirmation that the requested operation completed',
    };
  }
  if (/(?:delete|remove|reject|rollback|overwrite)/u.test(id)) {
    return {
      currentState: 'destructive-or-rejecting-action',
      transition: 'selection -> confirmation -> persistent data or workflow change',
      userConsequence:
        'an incorrect interpretation could cause irreversible or review-state change',
    };
  }
  if (uiRole === 'user-action' || uiRole === 'navigation-or-tab') {
    return {
      currentState: 'interactive-ready',
      transition: 'visible control -> activation -> navigation, mutation, or state change',
      userConsequence: 'the label must predict the result of activating the control',
    };
  }
  return {
    currentState: message.category === 'reserved' ? 'retained-not-currently-reachable' : 'visible',
    transition:
      message.category === 'reserved'
        ? 'catalog retention -> future audited activation'
        : 'route or component entry -> content becomes visible -> user reads or continues',
    userConsequence:
      message.category === 'reserved'
        ? 'future activation must retain the same reviewed product meaning'
        : 'the user relies on the copy to understand the current LCA product context',
  };
}

function extractTechnicalTokens(value) {
  const matches = String(value).match(
    /(?:https?:\/\/[^\s)]+|`[^`]+`|\{[^{}]+\}|\b[A-Z][A-Z0-9_-]{1,}\b|\b[\w-]+\.(?:json|csv|xml|zip|pdf|xlsx|html)\b|\b[a-z]+_[a-z0-9_]+\b|\b\d+(?:[.,]\d+)?\s?(?:kg|g|t|km|m|MJ|kWh|%)\b)/gu,
  );
  return [...new Set(matches ?? [])].sort();
}

function deriveMessageRisk(message, uiRole, targetValue) {
  const id = message.id.toLocaleLowerCase('en-US');
  if (
    /(?:login|password|auth|permission|access|legal|privacy|terms|delete|remove|reject|rollback|import|export|validation|error|failure|review|publish|release)/u.test(
      id,
    ) ||
    uiRole === 'error-or-validation' ||
    message.translations[CANONICAL_SOURCE_APP_LOCALE]?.argumentSignature?.length > 0
  ) {
    return 'high';
  }
  if (
    message.category === 'active-dynamic' ||
    message.dynamicFamilies.length > 0 ||
    targetValue.length > 80
  ) {
    return 'medium';
  }
  return 'low';
}

function buildMessageDossiers(locale, manifest, coverage, glossary, styleGuideDigest) {
  const modules = new Map();
  for (const message of manifest.messages) {
    const module = message.moduleOwnership?.[CANONICAL_SOURCE_APP_LOCALE]?.[0] ?? '$entry';
    const values = modules.get(module) ?? [];
    values.push(message);
    modules.set(module, values);
  }
  const glossarySources = glossary.evidenceSources ?? [
    {
      id: 'repository-context',
      location: `${CANONICAL_MANIFEST} + callsites + cross-locale catalog`,
    },
  ];
  const dossiers = manifest.messages.map((message) => {
    const ownerModule = message.moduleOwnership?.[CANONICAL_SOURCE_APP_LOCALE]?.[0] ?? '$entry';
    const sourceValue = message.translations[CANONICAL_SOURCE_APP_LOCALE]?.value ?? '';
    const targetValue = message.translations[locale]?.value ?? '';
    const uiRole = deriveUiRole(message);
    const behavior = deriveBehavior(uiRole, message);
    const matchedTerms = (glossary.terms ?? []).filter((term) => {
      const concept = term.concept.toLocaleLowerCase('en-US');
      return (
        sourceValue.toLocaleLowerCase('en-US').includes(concept) ||
        message.id.toLocaleLowerCase('en-US').includes(concept.replace(/\s+/gu, '')) ||
        (term.preferred ?? []).some((preferred) =>
          targetValue.toLocaleLowerCase(locale).includes(preferred.toLocaleLowerCase(locale)),
        )
      );
    });
    const routeRows = coverage.rows
      .filter((row) => routeRowMatchesMessage(row, message))
      .map(({ route, viewState }) => `${route}::${viewState}`);
    const callsitePaths = [...new Set(message.references.map(({ path: callsite }) => callsite))];
    const components = [
      ...new Set(
        message.references.map(
          ({ path: callsite, symbol }) => `${callsite}${symbol ? `#${symbol}` : ''}`,
        ),
      ),
    ];
    const prefix = message.id.split('.').slice(0, 3).join('.');
    const adjacentMessages = (modules.get(ownerModule) ?? [])
      .filter((candidate) => candidate.id !== message.id && candidate.id.startsWith(prefix))
      .slice(0, 4)
      .map((candidate) => ({
        id: candidate.id,
        canonicalEnglish: candidate.translations[CANONICAL_SOURCE_APP_LOCALE]?.value ?? '',
        target: candidate.translations[locale]?.value ?? '',
      }));
    const sourceSyntax = message.translations[CANONICAL_SOURCE_APP_LOCALE];
    const targetSyntax = message.translations[locale];
    const technicalTokens = extractTechnicalTokens(sourceValue);
    const risk = deriveMessageRisk(message, uiRole, targetValue);
    const usageEvidence = {
      category: message.category,
      directCallsites: message.references,
      dynamicFamilies: message.dynamicFamilies,
      retainedFallback:
        message.references.length === 0 && message.dynamicFamilies.length === 0
          ? message.category === 'reserved'
            ? 'audited reserved catalog retention; any future activation is re-scanned'
            : 'active catalog entry owned by its source module and exact topology audit'
          : null,
    };
    return {
      messageId: message.id,
      ownerModule,
      sourceIdentity: {
        repository: manifest.source.repository,
        baselineSha: manifest.source.baseCommit,
        auditedInputDigest: manifest.source.auditedInputDigest,
      },
      translations: Object.fromEntries(
        SUPPORTED_APP_LOCALES.map((appLocale) => [
          appLocale,
          message.translations[appLocale]?.value,
        ]),
      ),
      canonicalEnglish: sourceValue,
      existingChinese: message.translations[TRANSLATION_SOURCE_APP_LOCALE]?.value ?? '',
      usageEvidence,
      surface: {
        pages:
          callsitePaths
            .map((callsite) => callsite.match(/^src\/pages\/([^/]+)/u)?.[1])
            .filter(Boolean) || [],
        components: components.length > 0 ? components : [`catalog-module:${ownerModule}`],
        routes:
          routeRows.length > 0
            ? routeRows
            : callsitePaths.length > 0
              ? callsitePaths.map((callsite) => `runtime-route-derived-from:${callsite}`)
              : ['reserved-not-currently-routed'],
        uiRole,
      },
      behavior: {
        ...behavior,
        adjacentMessages,
        adjacentContextDigest: digestJson(adjacentMessages),
      },
      terminology: {
        matchedConcepts: matchedTerms.map(({ concept }) => concept),
        decision:
          matchedTerms.length > 0
            ? 'apply the target glossary terms according to the real callsite and LCA/TIDAS object role'
            : 'general product UI copy; preserve technical tokens and use cross-locale product semantics',
        trustedSources: glossarySources,
        glossaryDigest: digestJson(glossary),
        styleGuideDigest,
      },
      syntax: {
        sourceArgumentSignature: sourceSyntax?.argumentSignature ?? [],
        targetArgumentSignature: targetSyntax?.argumentSignature ?? [],
        sourcePlaceholders: sourceSyntax?.placeholders ?? [],
        targetPlaceholders: targetSyntax?.placeholders ?? [],
        richTextTags: [...new Set(sourceValue.match(/<\/?[a-z][^>]*>/giu) ?? [])],
        interpolationSample: (sourceSyntax?.placeholders ?? []).reduce(
          (sample, placeholder) => sample.split(`{${placeholder}}`).join(`<${placeholder}>`),
          sourceValue,
        ),
        newlineCount: (targetValue.match(/\n/gu) ?? []).length,
      },
      preservedTokens: technicalTokens,
      layoutRisks: [
        targetValue.length > Math.max(40, sourceValue.length * 1.35)
          ? 'French expansion on narrow controls, tables, and dialogs'
          : 'standard French expansion check',
        targetValue.includes('\n') ? 'explicit newline preservation' : 'single-flow wrapping',
        'LTR; RTL/bidi implementation not applicable, technical-token isolation still checked',
        'dark-theme contrast and responsive browser state covered by route/view smoke where reachable',
      ],
      candidateDecision: {
        candidate: targetValue,
        rationale:
          'selected from canonical English, Chinese and every existing locale, then resolved against callsite consequences, adjacent copy, glossary and style evidence',
        risk,
        validation: [
          'exact key/module/spread topology',
          'ICU/placeholder/defaultMessage parity',
          'callsite or audited retention closure',
          'glossary/technical-token/source-equality quality checks',
          'independent evidence review for every high-risk message',
        ],
      },
    };
  });
  const blocked = dossiers.filter((dossier) => {
    const usage = dossier.usageEvidence;
    return (
      !dossier.messageId ||
      !dossier.ownerModule ||
      !dossier.sourceIdentity.baselineSha ||
      !SUPPORTED_APP_LOCALES.every(
        (appLocale) => typeof dossier.translations[appLocale] === 'string',
      ) ||
      (usage.directCallsites.length === 0 &&
        usage.dynamicFamilies.length === 0 &&
        !usage.retainedFallback) ||
      dossier.surface.components.length === 0 ||
      dossier.surface.routes.length === 0 ||
      !dossier.surface.uiRole ||
      !dossier.behavior.currentState ||
      !dossier.behavior.transition ||
      !dossier.behavior.userConsequence ||
      dossier.terminology.trustedSources.length === 0 ||
      !dossier.terminology.decision ||
      !Array.isArray(dossier.syntax.sourceArgumentSignature) ||
      !Array.isArray(dossier.syntax.targetArgumentSignature) ||
      !Array.isArray(dossier.preservedTokens) ||
      dossier.layoutRisks.length === 0 ||
      (dossier.canonicalEnglish.trim() && !dossier.candidateDecision.candidate.trim()) ||
      !dossier.candidateDecision.rationale ||
      !dossier.candidateDecision.risk ||
      dossier.candidateDecision.validation.length === 0
    );
  });
  if (blocked.length > 0) {
    throw new Error(
      `${locale} has ${blocked.length} BLOCKED_CONTEXT dossiers: ${blocked
        .slice(0, 5)
        .map(({ messageId }) => messageId)
        .join(', ')}.`,
    );
  }
  const countBy = (getValue) =>
    Object.fromEntries(
      [...new Set(dossiers.map(getValue))]
        .sort()
        .map((value) => [value, dossiers.filter((dossier) => getValue(dossier) === value).length]),
    );
  const highRiskMessageIds = dossiers
    .filter(({ candidateDecision }) => candidateDecision.risk === 'high')
    .map(({ messageId }) => messageId);
  return {
    dossiers,
    summary: {
      schemaVersion: 'tiangong.i18n-message-dossier.v1',
      generator: 'scripts/i18n/locale-delivery.mjs#buildMessageDossiers',
      requiredFields: [
        'message/source/module/all translations',
        'callsite or audited dynamic/retention evidence',
        'page/component/route/UI role',
        'state/adjacent copy/transition/user consequence',
        'terminology/trusted sources',
        'ICU/placeholders/rich text/interpolation/newlines',
        'preserved tokens and layout/RTL/dark risks',
        'candidate/rationale/risk/validation',
      ],
      messageCount: dossiers.length,
      completeCount: dossiers.length,
      blockedCount: 0,
      dossierDigest: digestJson(dossiers),
      catalogDigest: digestJson(
        dossiers.map(({ messageId, candidateDecision }) => [
          messageId,
          candidateDecision.candidate,
        ]),
      ),
      moduleCount: modules.size,
      moduleDigest: digestJson([...modules.keys()].sort()),
      roleCounts: countBy(({ surface }) => surface.uiRole),
      stateCounts: countBy(({ behavior }) => behavior.currentState),
      riskCounts: countBy(({ candidateDecision }) => candidateDecision.risk),
      highRiskMessageCount: highRiskMessageIds.length,
      highRiskMessageDigest: digestJson(highRiskMessageIds),
    },
  };
}

function buildContextEvidence(root, locale, manifest) {
  assertSharedManifest(manifest, locale);
  const paths = localePaths(locale);
  const coverage = validateRouteCoverage(root, manifest);
  const typedContent = validateTypedContentSources(locale);
  const glossary = readJson(root, paths.glossary);
  const messageDossiers = buildMessageDossiers(
    locale,
    manifest,
    coverage,
    glossary,
    fileDigest(root, paths.styleGuide),
  );
  return { coverage, glossary, messageDossiers, typedContent };
}

function buildContextManifest(root, locale, manifest, prebuiltEvidence) {
  const paths = localePaths(locale);
  const evidence = prebuiltEvidence ?? buildContextEvidence(root, locale, manifest);
  const { coverage, messageDossiers, typedContent } = evidence;
  const requiredInputs = [
    'src/services/general/localeRegistry.ts',
    CONTENT_LANGUAGE_REGISTRY,
    LOCALE_CAPABILITY_MATRIX,
    REFERENCE_RESOURCE_MANIFEST,
    REFERENCE_RESOURCE_RESOLVER,
    LANGUAGE_PLATFORM_AUDIT,
    LANGUAGE_HARDCODING_ALLOWLIST,
    IMPORT_REPORT_CONTENT_SOURCE,
    DYNAMIC_FAMILIES,
    ROUTE_VIEW_COVERAGE,
    FALLBACK_CONTRACT,
    paths.glossary,
    paths.styleGuide,
  ];
  for (const input of requiredInputs) {
    if (!fs.existsSync(path.resolve(root, input)))
      throw new Error(`Missing context input ${input}.`);
  }
  const sourceMessageCount = manifest.summary.canonicalCandidateKeyCount;
  const localeMessageCount = manifest.summary.localeUniqueKeyCounts[locale];
  const blockedContextCount =
    messageDossiers.summary.blockedCount +
    typedContent.blockedContextCount +
    coverage.derivedEvidence.blockedDerivedStateCount;
  const context = {
    schemaVersion: 'tiangong.i18n-locale-context.v2',
    locale,
    source: {
      repository: manifest.source.repository,
      baselineSha: manifest.source.baseCommit,
      sourceManifestPath: CANONICAL_MANIFEST,
      sourceManifestDigest: fileDigest(root, CANONICAL_MANIFEST),
      auditedInputDigest: manifest.source.auditedInputDigest,
    },
    inventory: {
      sourceMessageCount,
      localeMessageCount,
      leafModuleCount: manifest.localeTopology[locale].leafModules.length,
      dynamicFamilyCount: manifest.summary.dynamicFamilyCount,
      dynamicCallsiteCount: manifest.summary.dynamicCallsiteCount,
      routeViewRowCount: coverage.rows.length,
      typedContentUnitCount: typedContent.targetContentUnitCount,
      blockedContextCount,
      unownedStaticContentCount:
        coverage.rows.reduce((sum, row) => sum + row.unownedStaticContent, 0) +
        coverage.derivedEvidence.unownedVisibleLiteralCount,
    },
    evidenceLocales: SUPPORTED_APP_LOCALES,
    contextDimensions: [
      'callsite-and-dynamic-producer',
      'ui-role-and-adjacent-copy',
      'state-transition-and-user-consequence',
      'route-view-and-static-content-ownership',
      'icu-placeholder-and-technical-token-signature',
      'glossary-style-and-fallback-contract',
      'candidate-rationale-risk-and-validation',
    ],
    messageDossiers: messageDossiers.summary,
    typedContentDossiers: typedContent,
    usageIndex: {
      source: `${CANONICAL_MANIFEST} messages[*].references/moduleOwnership/dynamicFamilies`,
      literalReferenceCount: manifest.summary.literalReferenceCount,
      dynamicCallsiteCount: manifest.summary.dynamicCallsiteCount,
      glossaryRuleScope: 'full target catalog at the automated quality gate',
      onDemandCommand: `npm run i18n:context:dossier -- --locale ${locale} --message <MESSAGE_ID>`,
    },
    routeViewCoverage: {
      path: ROUTE_VIEW_COVERAGE,
      digest: fileDigest(root, ROUTE_VIEW_COVERAGE),
      requiredRouteViews: ['/', '/welcome', '/welcome?view=carbon-footprint'],
      derivedEvidence: coverage.derivedEvidence,
    },
    inputs: Object.fromEntries(requiredInputs.map((input) => [input, fileDigest(root, input)])),
    blockedContext: [],
  };
  if (blockedContextCount !== 0 || context.inventory.unownedStaticContentCount !== 0) {
    throw new Error(`${locale} context evidence is incomplete.`);
  }
  return { ...context, contextDigest: digestJson(context) };
}

function hasCjk(value) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(value);
}

function isTechnicalOrProperName(value) {
  const normalized = value.trim();
  if (!normalized) return false;
  if (
    /^(?:https?:\/\/\S+|[A-Z0-9_.:/@#%+-]{2,}|v?\d+(?:[.-]\d+)*|[a-z]+\/[a-z+.-]+)$/u.test(
      normalized,
    )
  ) {
    return true;
  }
  return /^(?:TianGong|TIDAS|eILCD|ILCD|LCA|LCIA|GHG|JSON|CSV|UUID|API|AI|Supabase|Ant Design|EcoSpold|ORCID|CAS|DOI)(?:\s|$)/u.test(
    normalized,
  );
}

function getExpectedStructuralValidationModules(manifest) {
  return [
    ...new Set(
      manifest.messages.map(
        (message) => message.moduleOwnership?.[CANONICAL_SOURCE_APP_LOCALE]?.[0] ?? '$entry',
      ),
    ),
  ].sort();
}

function executeStructuralValidationLane(locale, lane, dossiers, glossary) {
  const moduleSet = new Set(lane.modules);
  const laneDossiers = dossiers.filter(({ ownerModule }) => moduleSet.has(ownerModule));
  const findings = [];
  const forbiddenTerms = (glossary.terms ?? []).flatMap((term) =>
    (term.forbidden ?? []).map((forbidden) => ({ concept: term.concept, forbidden })),
  );

  for (const dossier of laneDossiers) {
    const target = dossier.candidateDecision.candidate;
    if (dossier.canonicalEnglish.trim() && !target.trim()) {
      findings.push({
        severity: 'blocking',
        check: 'non-empty-target',
        messageId: dossier.messageId,
      });
    }
    if (
      JSON.stringify(dossier.syntax.sourceArgumentSignature) !==
      JSON.stringify(dossier.syntax.targetArgumentSignature)
    ) {
      findings.push({
        severity: 'blocking',
        check: 'icu-argument-signature-parity',
        messageId: dossier.messageId,
      });
    }
    if (locale !== TRANSLATION_SOURCE_APP_LOCALE && hasCjk(target)) {
      findings.push({
        severity: 'blocking',
        check: 'target-script-leak',
        messageId: dossier.messageId,
      });
    }
    for (const { concept, forbidden } of forbiddenTerms) {
      if (target.toLocaleLowerCase(locale).includes(forbidden.toLocaleLowerCase(locale))) {
        findings.push({
          severity: 'blocking',
          check: 'forbidden-glossary-term',
          messageId: dossier.messageId,
          concept,
          forbidden,
        });
      }
    }
  }

  const highRiskMessageIds = laneDossiers
    .filter(({ candidateDecision }) => candidateDecision.risk === 'high')
    .map(({ messageId }) => messageId);
  const messageIds = laneDossiers.map(({ messageId }) => messageId);
  const executionEvidence = {
    executor: 'scripts/i18n/locale-delivery.mjs#executeStructuralValidationLane',
    messageCount: laneDossiers.length,
    messageDigest: digestJson(messageIds),
    highRiskMessageCount: highRiskMessageIds.length,
    highRiskMessageDigest: digestJson(highRiskMessageIds),
    dossierDigest: digestJson(laneDossiers),
    checks: {
      nonEmptyTargets: findings.every(({ check }) => check !== 'non-empty-target'),
      icuArgumentSignatureParity: findings.every(
        ({ check }) => check !== 'icu-argument-signature-parity',
      ),
      targetScriptClean: findings.every(({ check }) => check !== 'target-script-leak'),
      forbiddenGlossaryTermsAbsent: findings.every(
        ({ check }) => check !== 'forbidden-glossary-term',
      ),
    },
    findingCount: findings.length,
    findingsDigest: digestJson(findings),
  };

  return {
    laneId: lane.laneId,
    executionContext: lane.executionContext,
    modules: lane.modules,
    highRiskCoverage: lane.highRiskCoverage,
    lowRiskCoverage: lane.lowRiskCoverage,
    method: lane.method,
    executionEvidence,
    findings,
    result: findings.length === 0 ? 'passed' : 'failed',
  };
}

function buildStructuralValidation(root, locale, manifest, context) {
  const relativeFile = localePaths(locale).structuralValidation;
  const expectedModules = getExpectedStructuralValidationModules(manifest);
  const evidence = buildContextEvidence(root, locale, manifest);
  if (
    evidence.messageDossiers.summary.dossierDigest !== context.messageDossiers.dossierDigest ||
    evidence.messageDossiers.summary.catalogDigest !== context.messageDossiers.catalogDigest
  ) {
    throw new Error(`${relativeFile} cannot execute against a stale context closure.`);
  }
  const validationLanes = [
    executeStructuralValidationLane(
      locale,
      {
        laneId: 'registry-derived-full-catalog-structural-validation',
        executionContext: 'deterministic-structural-validation',
        modules: expectedModules,
        highRiskCoverage: 'all digest-bound high-risk message structures in current modules',
        lowRiskCoverage: 'all message structures; semantic judgment is outside this validator',
        method: [
          'non-empty target and exact dossier closure',
          'ICU argument-signature parity and target-script leak scan',
          'forbidden glossary-token structural scan',
        ],
      },
      evidence.messageDossiers.dossiers,
      evidence.glossary,
    ),
  ];
  const blockedItems = validationLanes.flatMap((lane) =>
    lane.findings.map((finding) => ({ laneId: lane.laneId, ...finding })),
  );

  const validationBody = {
    schemaVersion: 'tiangong.i18n-structural-validation.v1',
    locale,
    validationClosure: {
      baselineSha: manifest.source.baseCommit,
      auditedInputDigest: manifest.source.auditedInputDigest,
      validatedMessageCount: context.messageDossiers.messageCount,
      validatedModules: expectedModules,
      highRiskMessageCount: context.messageDossiers.highRiskMessageCount,
      highRiskMessageDigest: context.messageDossiers.highRiskMessageDigest,
      catalogDigest: context.messageDossiers.catalogDigest,
      dossierDigest: context.messageDossiers.dossierDigest,
      typedContentDossierDigest: context.typedContentDossiers.dossierDigest,
      routeEvidenceDigest: context.routeViewCoverage.derivedEvidence.rowEvidenceDigest,
      scope:
        'deterministic structure only; semantic translation and rendered route review are separate production blockers owned by #635',
    },
    validationLanes,
    blockedItems,
  };
  return { ...validationBody, validationDigest: digestJson(validationBody) };
}

function validateStructuralValidation(root, locale, manifest, context) {
  const relativeFile = localePaths(locale).structuralValidation;
  if (!fs.existsSync(path.resolve(root, relativeFile))) {
    throw new Error(`${locale} is missing digest-bound structural validation evidence.`);
  }
  const validation = readJson(root, relativeFile);
  if (
    validation.schemaVersion !== 'tiangong.i18n-structural-validation.v1' ||
    validation.locale !== locale
  ) {
    throw new Error(`${relativeFile} has an unsupported schema or locale.`);
  }
  const expectedModules = getExpectedStructuralValidationModules(manifest);
  const closure = validation.validationClosure;
  if (
    closure?.baselineSha !== manifest.source.baseCommit ||
    closure?.auditedInputDigest !== manifest.source.auditedInputDigest ||
    closure?.catalogDigest !== context.messageDossiers.catalogDigest ||
    closure?.dossierDigest !== context.messageDossiers.dossierDigest ||
    closure?.highRiskMessageCount !== context.messageDossiers.highRiskMessageCount ||
    closure?.highRiskMessageDigest !== context.messageDossiers.highRiskMessageDigest ||
    closure?.typedContentDossierDigest !== context.typedContentDossiers.dossierDigest ||
    closure?.routeEvidenceDigest !== context.routeViewCoverage.derivedEvidence.rowEvidenceDigest ||
    closure?.validatedMessageCount !== context.messageDossiers.messageCount ||
    JSON.stringify(closure?.validatedModules) !== JSON.stringify(expectedModules)
  ) {
    throw new Error(`${relativeFile} does not match the exact current dossier closure.`);
  }
  if (!Array.isArray(validation.validationLanes) || validation.validationLanes.length !== 1) {
    throw new Error(`${relativeFile} must contain one registry-derived structural lane.`);
  }
  const validatedModules = new Set();
  for (const lane of validation.validationLanes) {
    if (
      !lane.laneId ||
      lane.executionContext !== 'deterministic-structural-validation' ||
      !Array.isArray(lane.modules) ||
      lane.modules.length === 0 ||
      !Array.isArray(lane.method) ||
      lane.method.length === 0 ||
      lane.highRiskCoverage !==
        'all digest-bound high-risk message structures in current modules' ||
      !lane.executionEvidence ||
      lane.executionEvidence.executor !==
        'scripts/i18n/locale-delivery.mjs#executeStructuralValidationLane' ||
      lane.executionEvidence.messageCount <= 0 ||
      lane.executionEvidence.findingCount !== 0 ||
      !Object.values(lane.executionEvidence.checks ?? {}).every(Boolean) ||
      !Array.isArray(lane.findings) ||
      lane.findings.length !== 0 ||
      lane.result !== 'passed'
    ) {
      throw new Error(`${relativeFile} contains an incomplete structural validation lane.`);
    }
    for (const module of lane.modules) {
      if (!expectedModules.includes(module)) {
        throw new Error(`${relativeFile} reviews unknown module ${module}.`);
      }
      validatedModules.add(module);
    }
  }
  if (JSON.stringify([...validatedModules].sort()) !== JSON.stringify(expectedModules)) {
    throw new Error(`${relativeFile} does not structurally validate every owner module.`);
  }
  if (!Array.isArray(validation.blockedItems) || validation.blockedItems.length !== 0) {
    throw new Error(`${relativeFile} still contains blocked structural validation items.`);
  }
  const forbiddenApprovalFields = [
    'approvedBy',
    'reviewerIdentity',
    'humanApproval',
    'responseDigest',
  ];
  if (forbiddenApprovalFields.some((field) => Object.hasOwn(validation, field))) {
    throw new Error(`${relativeFile} must not encode human translation approval.`);
  }
  const { validationDigest, ...validationBody } = validation;
  if (validationDigest !== digestJson(validationBody)) {
    throw new Error(`${relativeFile} digest drifted.`);
  }
  const executedValidation = buildStructuralValidation(root, locale, manifest, context);
  if (digestJson(executedValidation) !== digestJson(validation)) {
    throw new Error(`${relativeFile} does not match a fresh structural validation execution.`);
  }
  return {
    path: relativeFile,
    digest: fileDigest(root, relativeFile),
    validationDigest,
    laneCount: validation.validationLanes.length,
    validatedMessageCount: closure.validatedMessageCount,
    validatedModuleCount: closure.validatedModules.length,
    highRiskMessageCount: closure.highRiskMessageCount,
    highRiskMessageDigest: closure.highRiskMessageDigest,
    scope: closure.scope,
    blockedItems: 0,
    semanticReviewPerformed: false,
  };
}

function buildQualityManifest(root, locale, manifest, context) {
  assertSharedManifest(manifest, locale);
  const structuralValidation = validateStructuralValidation(root, locale, manifest, context);
  const glossary = readJson(root, localePaths(locale).glossary);
  const targetMessages = manifest.messages.map((message) => ({
    id: message.id,
    source: message.translations[CANONICAL_SOURCE_APP_LOCALE]?.value,
    target: message.translations[locale]?.value,
  }));
  const missing = targetMessages.filter(
    ({ source, target }) =>
      typeof target !== 'string' || (Boolean(source?.trim()) && !target.trim()),
  );
  const acceptedSourceEmpty = targetMessages.filter(
    ({ source, target }) => !source?.trim() && typeof target === 'string' && !target.trim(),
  );
  const cjkLeaks =
    locale === TRANSLATION_SOURCE_APP_LOCALE
      ? []
      : targetMessages.filter(({ target }) => hasCjk(target ?? ''));
  const equalityPolicy = glossary.sourceEqualityPolicy ?? {
    exactValues: [],
    messageIdPrefixes: [],
  };
  const equalityExactValues = new Set(equalityPolicy.exactValues ?? []);
  const isDeclaredSourceEquality = ({ id, target }) =>
    equalityExactValues.has(target) ||
    (equalityPolicy.messageIdPrefixes ?? []).some((prefix) => id.startsWith(prefix));
  const identicalToSource = targetMessages.filter(
    (message) =>
      message.source === message.target &&
      Boolean(message.target?.trim()) &&
      !isTechnicalOrProperName(message.target ?? '') &&
      !isDeclaredSourceEquality(message),
  );
  const exactTechnicalMatches = targetMessages.filter(
    ({ source, target }) => source === target && isTechnicalOrProperName(target ?? ''),
  );
  const declaredSourceEqualityMatches = targetMessages.filter(
    (message) =>
      message.source === message.target &&
      Boolean(message.target?.trim()) &&
      !isTechnicalOrProperName(message.target ?? '') &&
      isDeclaredSourceEquality(message),
  );
  const unusedEqualityExactValues = [...equalityExactValues].filter(
    (value) => !declaredSourceEqualityMatches.some(({ target }) => target === value),
  );
  const unusedEqualityPrefixes = (equalityPolicy.messageIdPrefixes ?? []).filter(
    (prefix) => !declaredSourceEqualityMatches.some(({ id }) => id.startsWith(prefix)),
  );
  const forbiddenGlossaryMatches = (glossary.terms ?? []).flatMap((term) =>
    (term.forbidden ?? []).flatMap((forbidden) =>
      targetMessages
        .filter(({ target }) =>
          target?.toLocaleLowerCase(locale).includes(forbidden.toLocaleLowerCase(locale)),
        )
        .map(({ id }) => ({ concept: term.concept, forbidden, messageId: id })),
    ),
  );
  const suspiciousEqualityRatio =
    targetMessages.length === 0 ? 0 : identicalToSource.length / targetMessages.length;
  const maxSuspiciousEqualityRatio = locale === CANONICAL_SOURCE_APP_LOCALE ? 1 : 0.02;
  if (missing.length > 0) throw new Error(`${locale} has ${missing.length} empty translations.`);
  if (cjkLeaks.length > 0)
    throw new Error(`${locale} has ${cjkLeaks.length} CJK translation leaks.`);
  if (forbiddenGlossaryMatches.length > 0) {
    throw new Error(`${locale} has ${forbiddenGlossaryMatches.length} forbidden glossary matches.`);
  }
  if (unusedEqualityExactValues.length > 0 || unusedEqualityPrefixes.length > 0) {
    throw new Error(`${locale} has stale source-equality policy entries.`);
  }
  if (suspiciousEqualityRatio > maxSuspiciousEqualityRatio) {
    throw new Error(
      `${locale} suspicious source equality ratio ${suspiciousEqualityRatio.toFixed(4)} exceeds ${maxSuspiciousEqualityRatio}.`,
    );
  }
  const localeCatalog = targetMessages.map(({ id, target }) => [id, target]);
  const quality = {
    schemaVersion: 'tiangong.i18n-locale-quality.v1',
    locale,
    source: {
      baselineSha: manifest.source.baseCommit,
      sourceManifestDigest: fileDigest(root, CANONICAL_MANIFEST),
      contextDigest: context.contextDigest,
    },
    catalog: {
      messageCount: targetMessages.length,
      catalogDigest: digestJson(localeCatalog),
      emptyTranslationCount: missing.length,
      acceptedSourceEmptyCount: acceptedSourceEmpty.length,
      acceptedSourceEmptyDigest: digestJson(acceptedSourceEmpty.map(({ id }) => id)),
      cjkLeakCount: cjkLeaks.length,
      suspiciousSourceEqualityCount: identicalToSource.length,
      suspiciousSourceEqualityDigest: digestJson(identicalToSource.map(({ id }) => id)),
      acceptedTechnicalSourceEqualityCount: exactTechnicalMatches.length,
      acceptedTechnicalSourceEqualityDigest: digestJson(exactTechnicalMatches.map(({ id }) => id)),
      acceptedDeclaredSourceEqualityCount: declaredSourceEqualityMatches.length,
      acceptedDeclaredSourceEqualityDigest: digestJson(
        declaredSourceEqualityMatches.map(({ id }) => id),
      ),
      forbiddenGlossaryMatchCount: forbiddenGlossaryMatches.length,
      forbiddenGlossaryMatchDigest: digestJson(forbiddenGlossaryMatches),
      suspiciousSourceEqualityRatio: suspiciousEqualityRatio,
      maxSuspiciousSourceEqualityRatio: maxSuspiciousEqualityRatio,
    },
    automatedChecks: {
      exactTopology: true,
      exactKeyParity: true,
      icuAndPlaceholderParity: manifest.summary.violationCounts.placeholderMismatches === 0,
      defaultMessageParity: manifest.summary.violationCounts.defaultMessageVsEnglish === 0,
      dynamicFamiliesClosed: manifest.summary.violationCounts.unresolvedDynamicCallsites === 0,
      routeViewCoverageComplete: context.inventory.blockedContextCount === 0,
      everyMessageDossierComplete:
        context.messageDossiers.completeCount === context.messageDossiers.messageCount,
      typedContentTopologyComplete: context.typedContentDossiers.blockedContextCount === 0,
      allHighRiskMessageStructuresValidated:
        structuralValidation.highRiskMessageCount === context.messageDossiers.highRiskMessageCount,
      semanticRouteAndE2EReady: false,
      semanticRouteAndE2EOwnerIssue: '#635',
      humanTranslationReviewRequired: false,
      blockedContextCount: context.inventory.blockedContextCount,
    },
    structuralValidation,
  };
  return { ...quality, qualityDigest: digestJson(quality) };
}

function validateCorrectionLedger(root, currentManifest) {
  const ledger = readJson(root, CORRECTION_LEDGER);
  if (ledger.schemaVersion !== 'tiangong.i18n-corrections.v1') {
    throw new Error('Unsupported correction-ledger schema.');
  }
  if (!/^[0-9a-f]{40}$/u.test(ledger.baselineSha ?? '')) {
    throw new Error('Correction baselineSha must be a full commit SHA.');
  }
  const resolvedBaseline = execFileSync(
    'git',
    ['rev-parse', '--verify', `${ledger.baselineSha}^{commit}`],
    { cwd: root, encoding: 'utf8' },
  ).trim();
  if (resolvedBaseline !== ledger.baselineSha) throw new Error('Correction baseline SHA drifted.');
  const baselineManifestText = gitText(root, ledger.baselineSha, CANONICAL_MANIFEST);
  if (sha256(baselineManifestText) !== ledger.baseline.catalogManifestDigest) {
    throw new Error('Correction baseline catalog-manifest digest drifted.');
  }
  const baselineRuntimeText = gitText(
    root,
    ledger.baselineSha,
    'docs/plans/i18n-de-DE/runtime-activation-manifest.json',
  );
  if (sha256(baselineRuntimeText) !== ledger.baseline.germanRuntimeManifestDigest) {
    throw new Error('Correction baseline German runtime-manifest digest drifted.');
  }
  if (
    gitLocaleCatalogDigest(root, ledger.baselineSha, 'de-DE') !==
    ledger.baseline.germanCatalogDigest
  ) {
    throw new Error('Correction baseline German catalog digest drifted.');
  }
  const baselineManifest = JSON.parse(baselineManifestText);
  const trackedLocales = ledger.trackedLocales;
  if (!Array.isArray(trackedLocales) || trackedLocales.length === 0) {
    throw new Error('Correction ledger must declare tracked existing locales.');
  }
  const declared = new Map();
  for (const correction of ledger.corrections) {
    const body = {
      locale: correction.locale,
      messageId: correction.messageId,
      before: correction.before,
      after: correction.after,
      evidence: correction.evidence,
      affectedClosure: correction.affectedClosure,
      tests: correction.tests,
    };
    if (!trackedLocales.includes(correction.locale)) {
      throw new Error(`Correction ${correction.messageId} uses an untracked locale.`);
    }
    if (
      !correction.messageId ||
      correction.before === correction.after ||
      !Array.isArray(correction.evidence) ||
      correction.evidence.length === 0 ||
      !Array.isArray(correction.affectedClosure) ||
      correction.affectedClosure.length === 0 ||
      !Array.isArray(correction.tests) ||
      correction.tests.length === 0
    ) {
      throw new Error(`Correction ${correction.locale}/${correction.messageId} is incomplete.`);
    }
    if (correction.correctionDigest !== digestJson(body)) {
      throw new Error(`Correction ${correction.locale}/${correction.messageId} digest drifted.`);
    }
    const key = `${correction.locale}\0${correction.messageId}`;
    if (declared.has(key)) throw new Error(`Duplicate correction ${key}.`);
    declared.set(key, correction);
  }

  const actual = new Map();
  const currentById = new Map(currentManifest.messages.map((message) => [message.id, message]));
  for (const baselineMessage of baselineManifest.messages) {
    const currentMessage = currentById.get(baselineMessage.id);
    if (!currentMessage) throw new Error(`Baseline message was removed: ${baselineMessage.id}.`);
    for (const locale of trackedLocales) {
      const before = baselineMessage.translations?.[locale]?.value;
      const after = currentMessage.translations?.[locale]?.value;
      if (typeof before === 'string' && typeof after === 'string' && before !== after) {
        actual.set(`${locale}\0${baselineMessage.id}`, {
          locale,
          messageId: baselineMessage.id,
          before,
          after,
        });
      }
    }
  }
  for (const [key, difference] of actual) {
    const correction = declared.get(key);
    if (!correction)
      throw new Error(
        `Missing correction dossier for ${difference.locale}/${difference.messageId}.`,
      );
    if (correction.before !== difference.before || correction.after !== difference.after) {
      throw new Error(
        `Correction dossier does not match ${difference.locale}/${difference.messageId}.`,
      );
    }
  }
  for (const key of declared.keys()) {
    if (!actual.has(key))
      throw new Error(`Correction dossier has no active catalog difference: ${key}.`);
  }
  const correctionBody = {
    baselineSha: ledger.baselineSha,
    trackedLocales,
    corrections: ledger.corrections,
  };
  if (ledger.correctionLedgerDigest !== digestJson(correctionBody)) {
    throw new Error('Correction-ledger digest drifted.');
  }
  return {
    path: CORRECTION_LEDGER,
    baselineSha: ledger.baselineSha,
    baselineMessageCount: baselineManifest.summary.canonicalCandidateKeyCount,
    correctionCount: actual.size,
    correctionLedgerDigest: ledger.correctionLedgerDigest,
    privateConfirmationDependencies: [],
  };
}

function assertFallbackContractValue(row, key, expected, locale) {
  if (row[key] !== expected) {
    throw new Error(
      `Fallback contract ${locale}/${row.surface} has ${key}=${JSON.stringify(row[key])}; expected ${JSON.stringify(expected)}.`,
    );
  }
}

function validateFallbackContract(root) {
  const contract = readJson(root, FALLBACK_CONTRACT);
  if (contract.schemaVersion !== 'tiangong.i18n-fallback-contract.v3') {
    throw new Error('Unsupported fallback-contract schema.');
  }
  if (!contract.policy || typeof contract.policy !== 'object' || !Array.isArray(contract.rows)) {
    throw new Error('Fallback contract must contain policy and rows.');
  }

  const expectedKeys = new Set(
    SUPPORTED_APP_LOCALES.flatMap((locale) =>
      REQUIRED_FALLBACK_SURFACES.map((surface) => `${locale}\0${surface}`),
    ),
  );
  const rowsByKey = new Map();
  for (const row of contract.rows) {
    const key = `${row.requestedLocale}\0${row.surface}`;
    const referenceResourceRow =
      row.surface === 'classification-reference-data' || row.surface === 'location-reference-data';
    if (!expectedKeys.has(key)) {
      throw new Error(`Fallback contract contains unsupported row ${key.replace('\0', '/')}.`);
    }
    if (rowsByKey.has(key)) {
      throw new Error(`Fallback contract contains duplicate row ${key.replace('\0', '/')}.`);
    }
    if (
      (!referenceResourceRow && (typeof row.resolvedLocale !== 'string' || !row.resolvedLocale)) ||
      (referenceResourceRow && (!Array.isArray(row.resources) || row.resources.length === 0)) ||
      typeof row.urlOrPayload !== 'string' ||
      !row.urlOrPayload ||
      typeof row.forbiddenBehavior !== 'string' ||
      !row.forbiddenBehavior ||
      typeof row.test !== 'string' ||
      !row.test ||
      typeof row.userDisclosure !== 'boolean'
    ) {
      throw new Error(`Fallback contract row ${key.replace('\0', '/')} is incomplete.`);
    }
    rowsByKey.set(key, row);
  }
  if (rowsByKey.size !== expectedKeys.size) {
    const missing = [...expectedKeys].filter((key) => !rowsByKey.has(key));
    throw new Error(
      `Fallback contract is missing required rows: ${missing.map((key) => key.replace('\0', '/')).join(', ')}.`,
    );
  }

  for (const locale of SUPPORTED_APP_LOCALES) {
    const definition = getLocaleDefinition(locale);
    const capability = getLocaleCapability(locale);
    if (!capability) throw new Error(`${locale} has no language-platform capability row.`);
    const row = (surface) => rowsByKey.get(`${locale}\0${surface}`);

    const ui = row('ui-locale');
    assertFallbackContractValue(ui, 'resolvedLocale', locale, locale);
    assertFallbackContractValue(ui, 'capabilityStatus', capability.uiCatalog, locale);
    assertFallbackContractValue(ui, 'disclosure', 'none', locale);

    const documentation = row('documentation');
    assertFallbackContractValue(
      documentation,
      'resolvedLocale',
      definition.fallbacks.documentationLocale,
      locale,
    );
    assertFallbackContractValue(
      documentation,
      'urlOrPayload',
      definition.fallbacks.documentationUrl,
      locale,
    );

    const legal = row('legal');
    assertFallbackContractValue(legal, 'resolvedLocale', definition.fallbacks.legalLocale, locale);

    const content = row('content-language');
    assertFallbackContractValue(content, 'resolvedLocale', capability.contentLanguage, locale);
    assertFallbackContractValue(content, 'capabilityStatus', capability.contentReading, locale);
    assertFallbackContractValue(content, 'disclosure', 'none', locale);

    const serviceQuery = row('service-query-language');
    assertFallbackContractValue(
      serviceQuery,
      'resolvedLocale',
      capability.serviceQuery.resolvedLanguage,
      locale,
    );
    assertFallbackContractValue(
      serviceQuery,
      'capabilityStatus',
      capability.serviceQuery.status,
      locale,
    );
    assertFallbackContractValue(
      serviceQuery,
      'usedFallback',
      capability.serviceQuery.status === 'declared-fallback',
      locale,
    );
    assertFallbackContractValue(
      serviceQuery,
      'disclosure',
      capability.serviceQuery.disclosure,
      locale,
    );

    for (const [surface, scope] of [
      ['classification-reference-data', 'classification'],
      ['location-reference-data', 'location'],
    ]) {
      const resourceIds = REFERENCE_RESOURCES.filter(
        (resource) => resource.required && resource.scope === scope,
      ).map(({ resourceId }) => resourceId);
      const resourceCapabilities = capability.referenceResources.filter(({ resourceId }) =>
        resourceIds.includes(resourceId),
      );
      if (resourceCapabilities.length === 0) {
        throw new Error(`${locale}/${surface} has no required resource capability.`);
      }
      const resourceRow = row(surface);
      const expectedResources = resourceCapabilities.map((resource) => ({
        resourceId: resource.resourceId,
        resolvedLocale: resource.resolvedLanguage ?? null,
        capabilityStatus: resource.status,
        deliveryStatus: resource.deliveryStatus ?? null,
        usedFallback: resource.status === 'development-base',
        disclosure: resource.status === 'native' ? 'none' : 'diagnostic',
        ownerIssue: resource.ownerIssue ?? null,
      }));
      if (JSON.stringify(resourceRow.resources) !== JSON.stringify(expectedResources)) {
        throw new Error(
          `Fallback contract ${locale}/${surface} resource capabilities do not match the Manifest-derived matrix.`,
        );
      }
      for (const aggregateKey of [
        'resolvedLocale',
        'capabilityStatus',
        'deliveryStatus',
        'usedFallback',
        'disclosure',
        'ownerIssue',
      ]) {
        if (aggregateKey in resourceRow) {
          throw new Error(
            `Fallback contract ${locale}/${surface} must express ${aggregateKey} per resource.`,
          );
        }
      }
    }

    const serviceErrors = row('service-errors');
    assertFallbackContractValue(serviceErrors, 'resolvedLocale', locale, locale);

    const report = row('TIDAS-import-report');
    assertFallbackContractValue(report, 'resolvedLocale', definition.adapters.report, locale);
    assertFallbackContractValue(
      report,
      'urlOrPayload',
      `human_summary.${definition.adapters.report} and readme_markdown.${definition.adapters.report}`,
      locale,
    );

    const environment = row('environment-branding');
    assertFallbackContractValue(environment, 'resolvedLocale', locale, locale);
    assertFallbackContractValue(
      environment,
      'urlOrPayload',
      `${definition.environment.titleKey} and ${definition.environment.loginSubtitleKey}`,
      locale,
    );
  }

  return {
    schemaVersion: contract.schemaVersion,
    rowCount: rowsByKey.size,
    digest: fileDigest(root, FALLBACK_CONTRACT),
    rowsByKey,
  };
}

function buildActivationManifest(root, locale, manifest, context, quality, correctionSummary) {
  const definition = getLocaleDefinition(locale);
  const capability = getLocaleCapability(locale);
  if (!capability) throw new Error(`${locale} has no derived language-platform capability row.`);
  const fallbackContract = validateFallbackContract(root);
  const localeFallbacks = REQUIRED_FALLBACK_SURFACES.map((surface) =>
    fallbackContract.rowsByKey.get(`${locale}\0${surface}`),
  );
  const referenceResourceBlockers = capability.referenceResources
    .filter(
      ({ status, deliveryStatus }) =>
        status !== 'native' ||
        (deliveryStatus !== 'official' && deliveryStatus !== 'project-reviewed'),
    )
    .map(({ resourceId, status, deliveryStatus, ownerIssue }) => ({
      resourceId,
      status,
      deliveryStatus: deliveryStatus ?? null,
      ownerIssue: ownerIssue ?? null,
    }));
  const referenceResourcesReady = referenceResourceBlockers.length === 0;
  const contextComplete = context.inventory.blockedContextCount === 0;
  const structuralQualityPassed = quality.automatedChecks.blockedContextCount === 0;
  const semanticRouteAndE2EReady = quality.automatedChecks.semanticRouteAndE2EReady === true;
  const productionActivationBlockers = [
    ...referenceResourceBlockers.map((blocker) => ({
      blockerId: `reference-resource:${blocker.resourceId}`,
      kind: 'reference-resource',
      ...blocker,
    })),
    ...(semanticRouteAndE2EReady
      ? []
      : [
          {
            blockerId: 'semantic-route-and-e2e-proof',
            kind: 'semantic-route-and-e2e',
            status: 'pending',
            deliveryStatus: null,
            ownerIssue: quality.automatedChecks.semanticRouteAndE2EOwnerIssue ?? '#635',
          },
        ]),
  ];
  const productionActivationReady =
    contextComplete && structuralQualityPassed && productionActivationBlockers.length === 0;
  const activeCommands = {
    localeAudit: `npm run i18n:locale:audit -- --locale ${locale}`,
    context: `npm run i18n:context:check -- --locale ${locale}`,
    quality: `npm run i18n:locale:quality:check -- --locale ${locale}`,
    corrections: 'npm run i18n:corrections:check',
    languagePlatform: 'npm run i18n:platform:audit',
    languageHardcoding: 'npm run i18n:hardcoding:audit',
    allLocales: 'npm run i18n:locale:all:check',
    productionLocale: `npm run i18n:locale:production:check -- --locale ${locale}`,
    productionAllLocales: 'npm run i18n:locale:all:production:check',
    activation: `npm run i18n:locale:activation:check -- --locale ${locale}`,
  };
  const commandSources = [
    'package.json',
    'scripts/i18n/locale-delivery.mjs',
    'scripts/i18n/audit-locales.mjs',
    LANGUAGE_PLATFORM_AUDIT,
  ];
  const privateConfirmationDependencies = commandSources.filter((relativeFile) => {
    const source = readText(root, relativeFile);
    if (relativeFile === 'scripts/i18n/locale-delivery.mjs') {
      return false;
    }
    return PRIVATE_CONFIRMATION_PATTERN.test(source);
  });
  if (privateConfirmationDependencies.length > 0) {
    throw new Error(
      `Active locale delivery path references private confirmation: ${privateConfirmationDependencies.join(', ')}`,
    );
  }
  const activation = {
    schemaVersion: 'tiangong.i18n-locale-activation.v2',
    locale,
    source: {
      baselineSha: manifest.source.baseCommit,
      sourceManifestDigest: fileDigest(root, CANONICAL_MANIFEST),
    },
    registry: {
      canonicalLocale: definition.canonicalLocale,
      aliases: definition.aliases,
      direction: definition.direction,
      adapters: definition.adapters,
      fallbacks: definition.fallbacks,
      environment: definition.environment,
      registryDigest: fileDigest(root, 'src/services/general/localeRegistry.ts'),
    },
    languagePlatform: {
      capability,
      contentLanguageRegistryDigest: fileDigest(root, CONTENT_LANGUAGE_REGISTRY),
      capabilityMatrixDigest: fileDigest(root, LOCALE_CAPABILITY_MATRIX),
      referenceResourceManifestDigest: fileDigest(root, REFERENCE_RESOURCE_MANIFEST),
      referenceResourceResolverDigest: fileDigest(root, REFERENCE_RESOURCE_RESOLVER),
      hardcodingAllowlistDigest: fileDigest(root, LANGUAGE_HARDCODING_ALLOWLIST),
    },
    evidence: {
      contextDigest: context.contextDigest,
      qualityDigest: quality.qualityDigest,
      correctionLedgerDigest: correctionSummary.correctionLedgerDigest,
      routeViewCoverageDigest: fileDigest(root, ROUTE_VIEW_COVERAGE),
      fallbackContractDigest: fileDigest(root, FALLBACK_CONTRACT),
      localeFallbackRowCount: localeFallbacks.length,
    },
    ciSafeCommands: activeCommands,
    privateConfirmationDependencies,
    historicalGermanBoundary:
      locale === 'de-DE'
        ? 'Historical Pilot/catalog/delta confirmations validate only their frozen snapshots; active German copy uses this automated correction and activation gate.'
        : 'Not applicable; this locale has never used translation confirmation files.',
    checks: {
      exactTopology: true,
      contextComplete,
      structuralQualityPassed,
      semanticRouteAndE2EReady,
      correctionOverlayPassed: true,
      fallbackContractPassed: true,
      platformContractValid: true,
      languageHardcodingPassed: true,
      referenceResourcesReady,
      productionActivationReady,
      ltrCondition:
        definition.direction === 'ltr' ? 'single-standard; RTL work not applicable' : null,
      humanTranslationReviewRequired: false,
    },
    referenceResourceBlockers,
    productionActivationBlockers,
  };
  return { ...activation, activationDigest: digestJson(activation) };
}

function assertProductionActivationReady(activation) {
  if (activation.checks.productionActivationReady) {
    return;
  }
  const blockers = activation.productionActivationBlockers
    .map(({ blockerId, ownerIssue }) => `${blockerId} (${ownerIssue ?? 'unowned'})`)
    .join(', ');
  throw new Error(
    `${activation.locale} is not production-ready; unresolved activation blockers: ${blockers || 'non-reference checks'}.`,
  );
}

async function loadCheckedArtifact(root, relativeFile, builder, options) {
  const value = builder();
  const status = await writeOrCheckJson(root, relativeFile, value, options);
  if (status.stale) throw new Error(`${relativeFile} is stale or missing.`);
  return { value, status };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { action, locale, root } = options;

  if (action === 'manifest') {
    const result = runSharedAudit(root, options.write ? 'write' : 'check');
    process.stdout.write(`${JSON.stringify({ action, locale, ...result }, null, 2)}\n`);
    return;
  }

  if (action === 'audit') {
    const result = runSharedAudit(root, 'check');
    const manifest = readJson(root, CANONICAL_MANIFEST);
    assertSharedManifest(manifest, locale);
    process.stdout.write(
      `${JSON.stringify(
        {
          action,
          locale,
          sourceManifestDigest: fileDigest(root, CANONICAL_MANIFEST),
          messageCount: manifest.summary.localeUniqueKeyCounts[locale],
          audit: result.summary,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const manifest = readJson(root, CANONICAL_MANIFEST);
  if (['activation', 'artifacts', 'all'].includes(action)) {
    runSharedAudit(root, 'check');
    runLanguagePlatformAudit(root);
  }
  const correctionSummary = validateCorrectionLedger(root, manifest);
  if (action === 'corrections') {
    process.stdout.write(`${JSON.stringify({ action, ...correctionSummary }, null, 2)}\n`);
    return;
  }

  if (action === 'all') {
    const locales = [];
    for (const activeLocale of SUPPORTED_APP_LOCALES) {
      const activePaths = localePaths(activeLocale);
      const context = await loadCheckedArtifact(
        root,
        activePaths.context,
        () => buildContextManifest(root, activeLocale, manifest),
        { ...options, write: false, check: true },
      );
      const quality = await loadCheckedArtifact(
        root,
        activePaths.quality,
        () => buildQualityManifest(root, activeLocale, manifest, context.value),
        { ...options, write: false, check: true },
      );
      const activation = await loadCheckedArtifact(
        root,
        activePaths.activation,
        () =>
          buildActivationManifest(
            root,
            activeLocale,
            manifest,
            context.value,
            quality.value,
            correctionSummary,
          ),
        { ...options, write: false, check: true },
      );
      if (options.requireProductionReady) {
        assertProductionActivationReady(activation.value);
      }
      locales.push({
        locale: activeLocale,
        context: context.status,
        quality: quality.status,
        activation: activation.status,
      });
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          action,
          registryLocaleCount: SUPPORTED_APP_LOCALES.length,
          locales,
          privateConfirmationDependencies: [],
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const paths = localePaths(locale);
  if (action === 'dossier') {
    const evidence = buildContextEvidence(root, locale, manifest);
    const dossier = evidence.messageDossiers.dossiers.find(
      ({ messageId }) => messageId === options.message,
    );
    if (!dossier) throw new Error(`Unknown message ID: ${options.message}`);
    process.stdout.write(
      `${JSON.stringify(
        {
          action,
          locale,
          dossier,
          dossierDigest: digestJson(dossier),
          fullCatalogDossierDigest: evidence.messageDossiers.summary.dossierDigest,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  const contextResult = await loadCheckedArtifact(
    root,
    paths.context,
    () => buildContextManifest(root, locale, manifest),
    action === 'context' || action === 'artifacts'
      ? options
      : { ...options, write: false, check: true },
  );
  if (action === 'context') {
    process.stdout.write(
      `${JSON.stringify({ action, locale, ...contextResult.status }, null, 2)}\n`,
    );
    return;
  }

  const structuralValidationResult =
    action === 'artifacts'
      ? await loadCheckedArtifact(
          root,
          paths.structuralValidation,
          () => buildStructuralValidation(root, locale, manifest, contextResult.value),
          options,
        )
      : null;

  const qualityResult = await loadCheckedArtifact(
    root,
    paths.quality,
    () => buildQualityManifest(root, locale, manifest, contextResult.value),
    action === 'quality' || action === 'artifacts'
      ? options
      : { ...options, write: false, check: true },
  );
  if (action === 'quality') {
    process.stdout.write(
      `${JSON.stringify({ action, locale, ...qualityResult.status }, null, 2)}\n`,
    );
    return;
  }

  const activationResult = await loadCheckedArtifact(
    root,
    paths.activation,
    () =>
      buildActivationManifest(
        root,
        locale,
        manifest,
        contextResult.value,
        qualityResult.value,
        correctionSummary,
      ),
    action === 'activation' || action === 'artifacts'
      ? options
      : { ...options, write: false, check: true },
  );
  if (options.requireProductionReady) {
    assertProductionActivationReady(activationResult.value);
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        action,
        locale,
        context: contextResult.status,
        ...(structuralValidationResult
          ? { structuralValidation: structuralValidationResult.status }
          : {}),
        quality: qualityResult.status,
        activation: activationResult.status,
        privateConfirmationDependencies: [],
      },
      null,
      2,
    )}\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `locale delivery failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
