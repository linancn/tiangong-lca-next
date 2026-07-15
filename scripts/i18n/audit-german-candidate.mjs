#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const ts = require('typescript');
const { analyzeIcuMessage } = require('./icu-message-parser.cjs');

const SCHEMA_VERSION = 'tiangong.i18n-german-candidate-audit.v1';
const LEDGER_SCHEMA_VERSION = 'tiangong.i18n-german-context-ledger.v1';
const DEFAULT_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const DEFAULT_LEDGER = 'docs/plans/i18n-de-DE/context-ledger.json';
const DEFAULT_ENTRY_TRANSLATIONS = 'docs/plans/i18n-de-DE/activation-entry-translations.json';
const DEFAULT_ALLOWLIST = 'docs/plans/i18n-de-DE/source-allowlist.json';
const DEFAULT_CONTEXT_ANNOTATIONS = 'docs/plans/i18n-de-DE/context-annotations.json';
const DEFAULT_DYNAMIC_FAMILIES = 'docs/plans/i18n-de-DE/dynamic-families.json';
const DEFAULT_TRANSLATION_BATCHES = 'docs/plans/i18n-de-DE/translation-batches.json';
const CANDIDATE_LOCALE = 'de-DE';
const REQUIRED_GOVERNANCE_ARTIFACTS = [
  'docs/plans/i18n-de-DE/README.md',
  'docs/plans/i18n-de-DE/glossary.yaml',
  'docs/plans/i18n-de-DE/style-guide.md',
  'docs/plans/i18n-de-DE/evidence-sources.yaml',
  'docs/plans/i18n-de-DE/pilot.json',
  'docs/plans/i18n-de-DE/translation-batches.json',
  'docs/plans/i18n-de-DE/review-log.yaml',
];

function usage() {
  return `Usage: node scripts/i18n/audit-german-candidate.mjs [options]

Options:
  --mode <report|enforce>       report exits zero with findings; enforce exits nonzero (default: enforce)
  --write                       write the deterministic context ledger
  --check                       fail if the checked-in context ledger is stale
  --root <path>                 repository root (default: current working directory)
  --manifest <path>             canonical manifest relative to root
  --ledger <path>               generated context ledger relative to root
  --entry-translations <path>   staged translations for top-level activation messages
  --allowlist <path>            reviewed source-copy allowlist relative to root
  --context-annotations <path>  human-reviewed context decisions for non-runtime keys
  --dynamic-families <path>     reviewed computed-message registry relative to root
  --help                        show this help
`;
}

function parseArgs(argv) {
  const options = {
    mode: 'enforce',
    write: false,
    check: false,
    root: process.cwd(),
    manifest: DEFAULT_MANIFEST,
    ledger: DEFAULT_LEDGER,
    entryTranslations: DEFAULT_ENTRY_TRANSLATIONS,
    allowlist: DEFAULT_ALLOWLIST,
    contextAnnotations: DEFAULT_CONTEXT_ANNOTATIONS,
    dynamicFamilies: DEFAULT_DYNAMIC_FAMILIES,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (argument === '--write') options.write = true;
    else if (argument === '--check') options.check = true;
    else if (
      [
        '--mode',
        '--root',
        '--manifest',
        '--ledger',
        '--entry-translations',
        '--allowlist',
        '--context-annotations',
        '--dynamic-families',
      ].includes(argument)
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      index += 1;
      const key = {
        '--mode': 'mode',
        '--root': 'root',
        '--manifest': 'manifest',
        '--ledger': 'ledger',
        '--entry-translations': 'entryTranslations',
        '--allowlist': 'allowlist',
        '--context-annotations': 'contextAnnotations',
        '--dynamic-families': 'dynamicFamilies',
      }[argument];
      options[key] = value;
    } else if (argument !== '--write') {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!['report', 'enforce'].includes(options.mode)) {
    throw new Error(`Invalid --mode: ${options.mode}`);
  }
  if (options.write && options.check) throw new Error('--write and --check cannot be combined');
  options.root = path.resolve(options.root);
  return options;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function relativePath(root, absolutePath) {
  return toPosix(path.relative(root, absolutePath));
}

function readJson(root, relativeFile) {
  const absolutePath = path.resolve(root, relativeFile);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing required file: ${relativeFile}`);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
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
  ) {
    current = current.expression;
  }
  return current;
}

function staticPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function staticString(node) {
  const expression = unwrapExpression(node);
  if (ts.isStringLiteralLike(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  return null;
}

function parseGermanModule(root, absolutePath, moduleName, findings) {
  const sourceText = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absolutePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const parseErrors = sourceFile.parseDiagnostics ?? [];
  parseErrors.forEach((diagnostic) => {
    const position = diagnostic.start ?? 0;
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
    findings.invalidModules.push({
      module: moduleName,
      path: relativePath(root, absolutePath),
      line: line + 1,
      column: character + 1,
      reason: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    });
  });

  const assignment = sourceFile.statements.find(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  const objectLiteral = assignment ? unwrapExpression(assignment.expression) : null;
  if (!objectLiteral || !ts.isObjectLiteralExpression(objectLiteral)) {
    findings.invalidModules.push({
      module: moduleName,
      path: relativePath(root, absolutePath),
      reason: 'German leaf modules must default-export one static object literal.',
    });
    return [];
  }

  const declarations = [];
  objectLiteral.properties.forEach((property) => {
    if (!ts.isPropertyAssignment(property)) {
      findings.invalidModules.push({
        module: moduleName,
        path: relativePath(root, absolutePath),
        reason: 'German leaf modules may contain only static property assignments.',
        expression: property.getText(sourceFile),
      });
      return;
    }
    const id = staticPropertyName(property.name);
    const value = staticString(property.initializer);
    if (id === null || value === null) {
      findings.invalidModules.push({
        module: moduleName,
        path: relativePath(root, absolutePath),
        reason: 'German message ids and values must be static strings.',
        expression: property.getText(sourceFile),
      });
      return;
    }
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      property.getStart(sourceFile),
    );
    declarations.push({
      id,
      value,
      module: moduleName,
      source: {
        path: relativePath(root, absolutePath),
        line: line + 1,
        column: character + 1,
      },
    });
  });
  return declarations;
}

function inspectIcu(value) {
  try {
    return { ...analyzeIcuMessage(value), error: null };
  } catch (error) {
    return {
      argumentSignature: [],
      placeholders: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function serializeSignature(signature) {
  return signature.map(({ name, type }) => `${name}:${type}`).join(', ');
}

function technicalTokens(value) {
  return new Set(value.match(/\b(?:[A-ZÄÖÜ]{2,}|[A-ZÄÖÜ][A-Z0-9]*(?:-[A-Z0-9]+)+)\b/gu) ?? []);
}

function inferUiRole(message) {
  const id = message.id.toLowerCase();
  if (id.includes('validator') || id.includes('validation')) return 'validation-feedback';
  if (id.includes('placeholder')) return 'input-placeholder';
  if (id.includes('tooltip') || id.includes('description') || id.includes('.desc')) {
    return 'explanatory-help';
  }
  if (id.includes('.error') || id.includes('.failure') || id.includes('.failed')) {
    return 'error-feedback';
  }
  if (id.includes('.success')) return 'success-feedback';
  if (id.includes('.confirm')) return 'confirmation-copy';
  if (id.includes('.title') || id.includes('drawer')) return 'title-or-heading';
  if (id.includes('.button') || id.includes('.action')) return 'action-label';
  if (id.includes('menu')) return 'navigation-label';
  return 'field-label-or-display-copy';
}

function consequenceForRole(role) {
  const consequences = {
    'validation-feedback':
      'Must describe the actual validation rule and the corrective action without weakening the constraint.',
    'input-placeholder':
      'Must remain concise, fit the input control, and preserve the requested data type or format.',
    'explanatory-help':
      'Must preserve scope, prerequisites, warnings, and domain distinctions used to make a decision.',
    'error-feedback':
      'Must preserve the failed action, recovery path, and any identifier placeholders needed for support.',
    'success-feedback':
      'Must name the completed action and must not imply a different persisted result.',
    'confirmation-copy':
      'Must make the pending action and destructive consequence unambiguous before confirmation.',
    'title-or-heading':
      'Must identify the current object, workflow step, or drawer without changing scope.',
    'action-label': 'Must use a concise German action that matches the control behavior.',
    'navigation-label':
      'Must identify the destination consistently with the destination page title.',
    'field-label-or-display-copy':
      'Must preserve the source field or displayed concept and distinguish adjacent ILCD/TIDAS concepts.',
  };
  return consequences[role];
}

function domainReviewRequired(message) {
  const evidence = [
    message.id,
    message.translations?.['en-US']?.value ?? '',
    message.translations?.['zh-CN']?.value ?? '',
  ].join(' ');
  return /(?:lca|lcia|life.?cycle|process|flow|exchange|impact|unit.?group|quantitative|reference|compliance|review|audit|validation|dataset|data set|tidas)/i.test(
    evidence,
  );
}

function validateContextAnnotation(message, annotation) {
  if (!annotation) return ['No reviewed context annotation exists.'];
  const errors = [];
  if (annotation.status !== 'READY') errors.push('status must be READY');
  if (typeof annotation.concept !== 'string' || annotation.concept.trim().length === 0) {
    errors.push('concept is required');
  }
  if (typeof annotation.uiRole !== 'string' || annotation.uiRole.trim().length === 0) {
    errors.push('uiRole is required');
  }
  if (typeof annotation.consequence !== 'string' || annotation.consequence.trim().length === 0) {
    errors.push('consequence is required');
  }
  if (!Array.isArray(annotation.evidence) || annotation.evidence.length === 0) {
    errors.push('at least one evidence record is required');
  } else {
    annotation.evidence.forEach((evidence, index) => {
      if (!evidence || typeof evidence !== 'object') {
        errors.push(`evidence[${index}] must be an object`);
        return;
      }
      if (typeof evidence.kind !== 'string' || evidence.kind.trim().length === 0) {
        errors.push(`evidence[${index}].kind is required`);
      }
      if (typeof evidence.reference !== 'string' || evidence.reference.trim().length === 0) {
        errors.push(`evidence[${index}].reference is required`);
      }
      if (typeof evidence.rationale !== 'string' || evidence.rationale.trim().length === 0) {
        errors.push(`evidence[${index}].rationale is required`);
      }
    });
  }
  if (typeof annotation.reviewedBy !== 'string' || annotation.reviewedBy.trim().length === 0) {
    errors.push('reviewedBy is required');
  }
  if (
    typeof annotation.reviewedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(annotation.reviewedAt)
  ) {
    errors.push('reviewedAt must be an ISO date (YYYY-MM-DD)');
  }
  if (typeof annotation.rationale !== 'string' || annotation.rationale.trim().length === 0) {
    errors.push('rationale is required');
  }
  if (annotation.messageId !== message.id) {
    errors.push(`messageId must equal ${message.id}`);
  }
  return errors;
}

function buildInputDigest(root, paths) {
  const hash = createHash('sha256');
  [...new Set(paths)].sort().forEach((relativeFile) => {
    const absolutePath = path.resolve(root, relativeFile);
    hash.update(relativeFile);
    hash.update('\0');
    if (fs.existsSync(absolutePath)) hash.update(fs.readFileSync(absolutePath));
    hash.update('\0');
  });
  return hash.digest('hex');
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, nested]) => [key, sortJsonValue(nested)]),
    );
  }
  return value;
}

function hashJson(value) {
  return createHash('sha256')
    .update(JSON.stringify(sortJsonValue(value)))
    .digest('hex');
}

function contextHashForMessage(message, dynamicRegistry) {
  const normalizeLocation = ({ path: sourcePath, kind, symbol, defaultMessage }) => ({
    path: sourcePath,
    kind,
    symbol: symbol ?? null,
    defaultMessage: defaultMessage ?? null,
  });
  return hashJson({
    id: message.id,
    category: message.category,
    moduleOwnership: message.moduleOwnership,
    english: {
      value: message.translations['en-US'].value,
      argumentSignature: message.translations['en-US'].argumentSignature,
      placeholders: message.translations['en-US'].placeholders,
    },
    chinese: {
      value: message.translations['zh-CN'].value,
      argumentSignature: message.translations['zh-CN'].argumentSignature,
      placeholders: message.translations['zh-CN'].placeholders,
    },
    references: message.references.map(normalizeLocation),
    defaultMessages: message.defaultMessages.map(({ value, argumentSignature, placeholders }) => ({
      value,
      argumentSignature,
      placeholders,
    })),
    dynamicFamilies: message.dynamicFamilies.map((family) => ({
      family,
      proof: dynamicRegistry.families?.[family]?.proof ?? null,
      unknownHandling: dynamicRegistry.families?.[family]?.unknownHandling ?? null,
      callsites: (dynamicRegistry.callsites ?? [])
        .filter((callsite) => callsite.family === family)
        .map(({ file, api, expression, count }) => ({ file, api, expression, count })),
    })),
  });
}

function dynamicContextForMessage(message, dynamicRegistry) {
  return message.dynamicFamilies.map((family) => ({
    family,
    proof: dynamicRegistry.families?.[family]?.proof ?? null,
    unknownHandling: dynamicRegistry.families?.[family]?.unknownHandling ?? null,
    callsites: (dynamicRegistry.callsites ?? [])
      .filter((callsite) => callsite.family === family)
      .map(({ file, api, expression, count }) => ({ file, api, expression, count })),
  }));
}

function sortFindings(findings) {
  Object.values(findings).forEach((items) => {
    items.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'));
  });
}

function buildAudit(options) {
  const manifest = readJson(options.root, options.manifest);
  const entryArtifact = readJson(options.root, options.entryTranslations);
  const allowlist = readJson(options.root, options.allowlist);
  const contextAnnotations = readJson(options.root, options.contextAnnotations);
  const dynamicRegistry = readJson(options.root, options.dynamicFamilies);
  const translationBatches = readJson(options.root, DEFAULT_TRANSLATION_BATCHES);
  const findings = {
    topLevelActivated: [],
    missingModules: [],
    unexpectedModules: [],
    invalidModules: [],
    moduleKeyMismatches: [],
    duplicateGermanKeys: [],
    missingTranslations: [],
    unexpectedTranslations: [],
    invalidValues: [],
    invalidIcuMessages: [],
    placeholderMismatches: [],
    chineseCharacters: [],
    unapprovedEnglishCopies: [],
    blockedContexts: [],
    unexpectedContextAnnotations: [],
    missingGovernanceArtifacts: [],
    invalidSourceAllowlist: [],
    unapprovedTechnicalTokens: [],
    mappedTokenViolations: [],
    translationBatchMismatches: [],
  };

  REQUIRED_GOVERNANCE_ARTIFACTS.forEach((relativeFile) => {
    if (!fs.existsSync(path.resolve(options.root, relativeFile))) {
      findings.missingGovernanceArtifacts.push({ path: relativeFile });
    }
  });

  const germanEntryPath = path.join(options.root, 'src', 'locales', `${CANDIDATE_LOCALE}.ts`);
  if (fs.existsSync(germanEntryPath)) {
    findings.topLevelActivated.push({
      path: relativePath(options.root, germanEntryPath),
      reason: 'Issue #601 may add reviewed leaf translations but must not activate de-DE.',
    });
  }

  const expectedModules = manifest.localeTopology['en-US'].leafModules;
  const expectedByModule = new Map(expectedModules.map((module) => [module, new Set()]));
  const expectedEntryIds = new Set();
  const manifestById = new Map();
  manifest.messages.forEach((message) => {
    manifestById.set(message.id, message);
    const owners = message.moduleOwnership?.['en-US'] ?? [];
    owners.forEach((owner) => {
      if (owner === '$entry') expectedEntryIds.add(message.id);
      else if (expectedByModule.has(owner)) expectedByModule.get(owner).add(message.id);
    });
  });

  const batchModules = (translationBatches.lanes ?? []).flatMap((lane) =>
    (lane.modules ?? []).map((module) => ({ ...module, laneId: lane.laneId })),
  );
  const batchModuleCounts = new Map();
  batchModules.forEach(({ name }) => {
    batchModuleCounts.set(name, (batchModuleCounts.get(name) ?? 0) + 1);
  });
  [...batchModuleCounts]
    .filter(([, count]) => count > 1)
    .forEach(([module, count]) => {
      findings.translationBatchMismatches.push({
        module,
        count,
        reason: 'Leaf module appears in more than one owner lane.',
      });
    });
  expectedModules
    .filter((module) => !batchModuleCounts.has(module))
    .forEach((module) => {
      findings.translationBatchMismatches.push({
        module,
        reason: 'Canonical leaf module is missing from the owner lanes.',
      });
    });
  batchModules
    .filter(({ name }) => !expectedByModule.has(name))
    .forEach(({ name, laneId }) => {
      findings.translationBatchMismatches.push({
        module: name,
        laneId,
        reason: 'Owner lane contains a non-canonical leaf module.',
      });
    });
  batchModules.forEach(({ name, keyCount, laneId }) => {
    const canonicalCount = expectedByModule.get(name)?.size;
    if (canonicalCount !== undefined && keyCount !== canonicalCount) {
      findings.translationBatchMismatches.push({
        module: name,
        laneId,
        declaredKeyCount: keyCount,
        canonicalKeyCount: canonicalCount,
      });
    }
  });
  (translationBatches.lanes ?? []).forEach((lane) => {
    const moduleKeyCount = (lane.modules ?? []).reduce(
      (total, module) => total + module.keyCount,
      0,
    );
    if (lane.keyCount !== moduleKeyCount) {
      findings.translationBatchMismatches.push({
        laneId: lane.laneId,
        declaredKeyCount: lane.keyCount,
        moduleKeyCount,
      });
    }
  });
  const canonicalLeafKeyCount = manifest.messages.filter(
    (message) => !message.moduleOwnership['en-US'].includes('$entry'),
  ).length;
  const declaredBatchKeyCount = (translationBatches.lanes ?? []).reduce(
    (total, lane) => total + lane.keyCount,
    0,
  );
  if (declaredBatchKeyCount !== canonicalLeafKeyCount) {
    findings.translationBatchMismatches.push({
      declaredBatchKeyCount,
      canonicalLeafKeyCount,
      reason: 'Owner lanes must cover every leaf key exactly once.',
    });
  }

  const germanRoot = path.join(options.root, 'src', 'locales', CANDIDATE_LOCALE);
  const actualModuleFiles = fs.existsSync(germanRoot)
    ? fs
        .readdirSync(germanRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
        .map((entry) => entry.name)
        .sort()
    : [];
  const actualModules = actualModuleFiles.map((fileName) => fileName.replace(/\.ts$/, ''));

  expectedModules
    .filter((module) => !actualModules.includes(module))
    .forEach((module) => findings.missingModules.push({ module }));
  actualModules
    .filter((module) => !expectedModules.includes(module))
    .forEach((module) => findings.unexpectedModules.push({ module }));

  const germanDeclarations = [];
  actualModuleFiles.forEach((fileName) => {
    const moduleName = fileName.replace(/\.ts$/, '');
    germanDeclarations.push(
      ...parseGermanModule(options.root, path.join(germanRoot, fileName), moduleName, findings),
    );
  });

  const declarationsById = new Map();
  germanDeclarations.forEach((declaration) => {
    if (!declarationsById.has(declaration.id)) declarationsById.set(declaration.id, []);
    declarationsById.get(declaration.id).push(declaration);
  });
  [...declarationsById]
    .filter(([, declarations]) => declarations.length > 1)
    .forEach(([id, declarations]) => {
      findings.duplicateGermanKeys.push({
        messageId: id,
        owners: declarations.map(({ module }) => module),
      });
    });

  expectedModules.forEach((module) => {
    const expected = expectedByModule.get(module) ?? new Set();
    const actual = new Set(
      germanDeclarations.filter((declaration) => declaration.module === module).map(({ id }) => id),
    );
    const missing = [...expected].filter((id) => !actual.has(id)).sort();
    const unexpected = [...actual].filter((id) => !expected.has(id)).sort();
    if (missing.length > 0 || unexpected.length > 0) {
      findings.moduleKeyMismatches.push({ module, missing, unexpected });
    }
  });

  const entryMessages = entryArtifact.messages ?? {};
  const actualEntryIds = new Set(Object.keys(entryMessages));
  const missingEntryIds = [...expectedEntryIds].filter((id) => !actualEntryIds.has(id)).sort();
  const unexpectedEntryIds = [...actualEntryIds].filter((id) => !expectedEntryIds.has(id)).sort();
  if (missingEntryIds.length > 0 || unexpectedEntryIds.length > 0) {
    findings.moduleKeyMismatches.push({
      module: '$activation-entry',
      missing: missingEntryIds,
      unexpected: unexpectedEntryIds,
    });
  }

  const germanById = new Map(
    [...declarationsById]
      .filter(([, declarations]) => declarations.length === 1)
      .map(([id, declarations]) => [id, declarations[0]]),
  );
  Object.entries(entryMessages).forEach(([id, value]) => {
    germanById.set(id, {
      id,
      value,
      module: '$activation-entry',
      source: { path: options.entryTranslations, line: null, column: null },
    });
  });

  const emptyMessageIds = new Set(allowlist.emptyMessageIds ?? []);
  const exactEnglishMessageIds = new Set(allowlist.exactEnglishMessageIds ?? []);
  const preservedTokenEntries = allowlist.preservedTokens ?? [];
  const sourcePatternTokenEntries = allowlist.sourcePatternTokens ?? [];
  const mappedTokenEntries = allowlist.mappedTokens ?? [];
  const approvedTechnicalTokens = new Set(
    [...preservedTokenEntries, ...sourcePatternTokenEntries].map(({ token }) => token),
  );
  const tokenEntryCounts = new Map();
  [...preservedTokenEntries, ...sourcePatternTokenEntries].forEach((entry) => {
    if (
      !entry ||
      typeof entry.token !== 'string' ||
      entry.token.length === 0 ||
      typeof entry.reason !== 'string' ||
      entry.reason.length === 0
    ) {
      findings.invalidSourceAllowlist.push({ entry, reason: 'Invalid token allowlist entry.' });
      return;
    }
    tokenEntryCounts.set(entry.token, (tokenEntryCounts.get(entry.token) ?? 0) + 1);
  });
  [...tokenEntryCounts]
    .filter(([, count]) => count > 1)
    .forEach(([token, count]) => {
      findings.invalidSourceAllowlist.push({ token, count, reason: 'Duplicate token rule.' });
    });
  [...emptyMessageIds, ...exactEnglishMessageIds]
    .filter((id) => !manifestById.has(id))
    .forEach((messageId) => {
      findings.invalidSourceAllowlist.push({
        messageId,
        reason: 'Message id does not exist in the canonical manifest.',
      });
    });
  mappedTokenEntries.forEach((entry) => {
    if (
      !entry ||
      typeof entry.source !== 'string' ||
      entry.source.length === 0 ||
      typeof entry.target !== 'string' ||
      entry.target.length === 0 ||
      typeof entry.reason !== 'string' ||
      entry.reason.length === 0 ||
      !Array.isArray(entry.messageIdExceptions)
    ) {
      findings.invalidSourceAllowlist.push({ entry, reason: 'Invalid mapped-token rule.' });
    }
  });
  const contextAnnotationsById = new Map(
    (contextAnnotations.messages ?? []).map((annotation) => [annotation.messageId, annotation]),
  );

  (contextAnnotations.messages ?? []).forEach((annotation) => {
    if (!manifestById.has(annotation.messageId)) {
      findings.unexpectedContextAnnotations.push({ messageId: annotation.messageId });
    }
  });

  const contextById = new Map();
  const contextHashesById = new Map();
  manifest.messages.forEach((message) => {
    contextHashesById.set(message.id, contextHashForMessage(message, dynamicRegistry));
    const hasRuntimeEvidence = message.references.length > 0 || message.dynamicFamilies.length > 0;
    const inferredUiRole = inferUiRole(message);
    if (hasRuntimeEvidence) {
      contextById.set(message.id, {
        status: 'RUNTIME_EVIDENCED',
        source: 'canonical-manifest',
        concept: null,
        uiRole: inferredUiRole,
        uiRoleSource: 'message-id heuristic; confirm during translation review',
        consequence: consequenceForRole(inferredUiRole),
        productionReferences: message.references,
        defaultMessages: message.defaultMessages,
        dynamicFamilies: dynamicContextForMessage(message, dynamicRegistry),
        reviewedAnnotation: null,
      });
      return;
    }

    const annotation = contextAnnotationsById.get(message.id);
    const errors = validateContextAnnotation(message, annotation);
    if (errors.length > 0) {
      findings.blockedContexts.push({ messageId: message.id, errors });
      contextById.set(message.id, {
        status: 'BLOCKED_CONTEXT',
        source: 'reserved-key-without-runtime-evidence',
        concept: annotation?.concept ?? null,
        uiRole: annotation?.uiRole ?? inferredUiRole,
        uiRoleSource: annotation?.uiRole ? 'reviewed-annotation' : 'unreviewed heuristic',
        consequence: annotation?.consequence ?? consequenceForRole(inferredUiRole),
        productionReferences: [],
        defaultMessages: message.defaultMessages,
        dynamicFamilies: [],
        reviewedAnnotation: annotation ?? null,
      });
      return;
    }

    contextById.set(message.id, {
      status: 'REVIEWED_RESERVED_CONTEXT',
      source: 'human-reviewed-context-annotation',
      concept: annotation.concept,
      uiRole: annotation.uiRole,
      uiRoleSource: 'reviewed-annotation',
      consequence: annotation.consequence,
      productionReferences: [],
      defaultMessages: message.defaultMessages,
      dynamicFamilies: [],
      reviewedAnnotation: annotation,
    });
  });

  manifest.messages.forEach((message) => {
    const german = germanById.get(message.id);
    if (!german) {
      findings.missingTranslations.push({ messageId: message.id });
      return;
    }
    if (typeof german.value !== 'string') {
      findings.invalidValues.push({
        messageId: message.id,
        receivedType: typeof german.value,
      });
      return;
    }
    if (german.value.length === 0 && !emptyMessageIds.has(message.id)) {
      findings.invalidValues.push({ messageId: message.id, reason: 'Unexpected empty value.' });
    }
    const germanIcu = inspectIcu(german.value);
    if (germanIcu.error) {
      findings.invalidIcuMessages.push({
        messageId: message.id,
        value: german.value,
        reason: germanIcu.error,
      });
    }
    const englishSignature = message.translations?.['en-US']?.argumentSignature ?? [];
    if (serializeSignature(germanIcu.argumentSignature) !== serializeSignature(englishSignature)) {
      findings.placeholderMismatches.push({
        messageId: message.id,
        english: englishSignature,
        german: germanIcu.argumentSignature,
      });
    }
    if (/\p{Script=Han}/u.test(german.value)) {
      findings.chineseCharacters.push({ messageId: message.id, value: german.value });
    }
    const english = message.translations?.['en-US']?.value;
    if (
      german.value.length > 0 &&
      german.value === english &&
      !exactEnglishMessageIds.has(message.id)
    ) {
      findings.unapprovedEnglishCopies.push({ messageId: message.id, value: german.value });
    }
    const englishTechnicalTokens = technicalTokens(english ?? '');
    const germanTechnicalTokens = technicalTokens(german.value);
    [...germanTechnicalTokens]
      .filter((token) => englishTechnicalTokens.has(token) && !approvedTechnicalTokens.has(token))
      .forEach((token) => {
        findings.unapprovedTechnicalTokens.push({ messageId: message.id, token });
      });
    mappedTokenEntries.forEach((rule) => {
      if (
        englishTechnicalTokens.has(rule.source) &&
        germanTechnicalTokens.has(rule.source) &&
        !rule.messageIdExceptions.includes(message.id)
      ) {
        findings.mappedTokenViolations.push({
          messageId: message.id,
          source: rule.source,
          expectedTarget: rule.target,
        });
      }
    });
  });

  [...germanById.keys()]
    .filter((id) => !manifestById.has(id))
    .forEach((id) => findings.unexpectedTranslations.push({ messageId: id }));

  sortFindings(findings);
  const findingCounts = Object.fromEntries(
    Object.entries(findings).map(([name, values]) => [name, values.length]),
  );
  const findingCount = Object.values(findingCounts).reduce((total, count) => total + count, 0);

  const inputPaths = [
    options.manifest,
    options.entryTranslations,
    options.allowlist,
    options.contextAnnotations,
    options.dynamicFamilies,
    ...REQUIRED_GOVERNANCE_ARTIFACTS,
    ...actualModuleFiles.map((fileName) =>
      toPosix(path.join('src', 'locales', CANDIDATE_LOCALE, fileName)),
    ),
  ];
  const ledger = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    issue: 'https://github.com/linancn/tiangong-lca-next/issues/601',
    locale: CANDIDATE_LOCALE,
    activationPolicy: {
      canonicalLocale: CANDIDATE_LOCALE,
      regionalVariants: false,
      topLevelBundleAllowedInThisIssue: false,
      entryTranslationArtifact: options.entryTranslations,
    },
    source: {
      manifest: options.manifest,
      manifestDigest: manifest.source.auditedInputDigest,
      contextInputDigest: buildInputDigest(options.root, inputPaths),
      contextInputDigestAlgorithm: 'sha256(path\\0content\\0)',
    },
    summary: {
      canonicalMessageCount: manifest.messages.length,
      translatedMessageCount: manifest.messages.filter(({ id }) => germanById.has(id)).length,
      leafModuleCount: actualModules.filter((module) => expectedModules.includes(module)).length,
      expectedLeafModuleCount: expectedModules.length,
      entryTranslationCount: Object.keys(entryMessages).length,
      runtimeEvidencedContextCount: manifest.messages.filter(
        (message) => message.references.length > 0 || message.dynamicFamilies.length > 0,
      ).length,
      reservedCompatibilityContextCount: manifest.messages.filter(
        (message) => message.references.length === 0 && message.dynamicFamilies.length === 0,
      ).length,
      blockedContextCount: [...contextById.values()].filter(
        ({ status }) => status === 'BLOCKED_CONTEXT',
      ).length,
      domainReviewRequiredCount: manifest.messages.filter(domainReviewRequired).length,
      findingCount,
      findingCounts,
    },
    contextPolicy: {
      sourceEvidence:
        'Every record retains canonical English, Chinese, all production references/defaultMessages, placeholders, module ownership, dynamic-family ownership, and the user-visible consequence of its UI role.',
      reservedEvidence:
        'Reserved compatibility copy has no current production callsite and is BLOCKED_CONTEXT by default. It becomes translatable only after a named reviewer records concept, UI role, consequence, rationale, and concrete evidence in context-annotations.json.',
      reviewBoundary:
        'This ledger proves context and structural translation coverage only. Native German and LCA/TIDAS domain approval remain human review evidence in review-log.yaml.',
    },
    messages: manifest.messages.map((message) => {
      const german = germanById.get(message.id) ?? null;
      const context = contextById.get(message.id);
      const contextHash = contextHashesById.get(message.id);
      return {
        id: message.id,
        category: message.category,
        module: message.moduleOwnership['en-US'][0],
        english: message.translations['en-US'],
        chinese: message.translations['zh-CN'],
        german:
          german === null
            ? null
            : {
                value: german.value,
                argumentSignature: inspectIcu(german.value).argumentSignature,
                source: german.source,
              },
        hashes: {
          context: contextHash,
          translation:
            german === null
              ? null
              : hashJson({
                  id: message.id,
                  module: german.module,
                  german: german.value,
                  contextHash,
                }),
        },
        context,
        reviewRequirements: {
          independentNativeGerman: true,
          lcaTidasDomain: domainReviewRequired(message),
        },
      };
    }),
    findings,
  };

  return { ledger, findingCount, findingCounts };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { ledger, findingCount, findingCounts } = buildAudit(options);
  const ledgerPath = path.resolve(options.root, options.ledger);
  const ledgerText = await prettier.format(JSON.stringify(ledger), {
    ...(await prettier.resolveConfig(ledgerPath)),
    filepath: ledgerPath,
  });
  let staleLedger = false;

  if (options.write) {
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, ledgerText);
  }
  if (options.check) {
    staleLedger = !fs.existsSync(ledgerPath) || fs.readFileSync(ledgerPath, 'utf8') !== ledgerText;
  }

  const result = {
    schemaVersion: SCHEMA_VERSION,
    locale: CANDIDATE_LOCALE,
    mode: options.mode,
    wroteLedger: options.write,
    checkedLedger: options.check,
    staleLedger,
    ledgerPath: relativePath(options.root, ledgerPath),
    summary: ledger.summary,
    findingCount,
    findingCounts,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (staleLedger || (options.mode === 'enforce' && findingCount > 0)) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `German candidate audit failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}
