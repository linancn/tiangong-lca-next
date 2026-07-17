#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateContextAnnotation } from './german-context-proposal.mjs';
import {
  DEFAULT_CATALOG_CONFIRMATION,
  DEFAULT_PILOT_CONFIRMATION,
  readCatalogOfflineConfirmation,
} from './german-offline-review.mjs';
import { normalizeProducerActor, producerActorKey } from './review-producer.mjs';

export { validateContextAnnotation } from './german-context-proposal.mjs';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const ts = require('typescript');
const { analyzeIcuMessage } = require('./icu-message-parser.cjs');

const SCHEMA_VERSION = 'tiangong.i18n-german-candidate-audit.v6';
const LEDGER_SCHEMA_VERSION = 'tiangong.i18n-german-context-ledger.v5';
const REVIEW_LOG_SCHEMA_VERSION = 'tiangong.i18n-de-review-provenance.v5';
const GLOSSARY_SCHEMA_VERSION = 'tiangong.i18n-de-glossary.v1';
const GLOSSARY_RISK_LEVELS = new Set(['critical', 'high']);
const GLOSSARY_DECISION_STATUSES = new Set(['proposed', 'blocked-term']);
const DEFAULT_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const DEFAULT_LEDGER = 'docs/plans/i18n-de-DE/context-ledger.json';
const DEFAULT_ENTRY_TRANSLATIONS = 'docs/plans/i18n-de-DE/activation-entry-translations.json';
const DEFAULT_ALLOWLIST = 'docs/plans/i18n-de-DE/source-allowlist.json';
const DEFAULT_CONTEXT_ANNOTATIONS = 'docs/plans/i18n-de-DE/context-annotations.json';
const DEFAULT_DYNAMIC_FAMILIES = 'docs/plans/i18n-de-DE/dynamic-families.json';
const DEFAULT_TRANSLATION_BATCHES = 'docs/plans/i18n-de-DE/translation-batches.json';
const DEFAULT_REVIEW_LOG = 'docs/plans/i18n-de-DE/review-log.yaml';
const DEFAULT_GLOSSARY = 'docs/plans/i18n-de-DE/glossary.yaml';
const DEFAULT_STYLE_GUIDE = 'docs/plans/i18n-de-DE/style-guide.md';
const DEFAULT_EVIDENCE_SOURCES = 'docs/plans/i18n-de-DE/evidence-sources.yaml';
const CANONICAL_AUDIT = 'scripts/i18n/audit-locales.mjs';
const PILOT_AUDIT = 'scripts/i18n/audit-german-pilot.mjs';
const REVIEW_GATE_POLICY_SOURCES = [
  CANONICAL_AUDIT,
  'scripts/i18n/audit-german-candidate.mjs',
  PILOT_AUDIT,
  'scripts/i18n/german-offline-review.mjs',
  'scripts/i18n/german-context-proposal.mjs',
  'scripts/i18n/review-producer.mjs',
  'scripts/i18n/icu-message-parser.cjs',
];
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
  --review-log <path>           tracked non-personal candidate provenance
  --pilot-confirmation <path>   local untracked pilot confirmation
  --catalog-confirmation <path> local untracked full-catalog confirmation
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
    reviewLog: DEFAULT_REVIEW_LOG,
    pilotConfirmation:
      process.env.TIANGONG_I18N_DE_PILOT_CONFIRMATION ?? DEFAULT_PILOT_CONFIRMATION,
    catalogConfirmation:
      process.env.TIANGONG_I18N_DE_CATALOG_CONFIRMATION ?? DEFAULT_CATALOG_CONFIRMATION,
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
        '--review-log',
        '--pilot-confirmation',
        '--catalog-confirmation',
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
        '--review-log': 'reviewLog',
        '--pilot-confirmation': 'pilotConfirmation',
        '--catalog-confirmation': 'catalogConfirmation',
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

  if (
    sourceFile.statements.length !== 1 ||
    !ts.isExportAssignment(sourceFile.statements[0]) ||
    sourceFile.statements[0].isExportEquals
  ) {
    findings.invalidModules.push({
      module: moduleName,
      path: relativePath(root, absolutePath),
      reason:
        'German leaf modules must contain exactly one side-effect-free default export and no imports, declarations, or executable statements.',
    });
    return [];
  }

  const assignment = sourceFile.statements[0];
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
    const analyzed = analyzeIcuMessage(value);
    return {
      ...analyzed,
      structure: icuStructure(analyzed.ast),
      error: null,
    };
  } catch (error) {
    return {
      argumentSignature: [],
      placeholders: [],
      structure: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function icuStructure(nodes) {
  const structuralNodes = nodes
    .filter((node) => node.type !== 'text')
    .map((node) => {
      if (node.type === 'pound') return { type: 'pound' };
      if (node.argumentType === 'simple') {
        return { type: 'argument', argumentType: 'simple', name: node.name };
      }
      if (node.argumentType === 'number') {
        return {
          type: 'argument',
          argumentType: 'number',
          name: node.name,
          style: node.style,
        };
      }
      return {
        type: 'argument',
        argumentType: node.argumentType,
        name: node.name,
        offset: node.offset,
        options: Object.fromEntries(
          Object.entries(node.options)
            .sort(([left], [right]) => left.localeCompare(right, 'en'))
            .map(([selector, optionNodes]) => [selector, icuStructure(optionNodes)]),
        ),
      };
    });
  return {
    hasVisibleText: nodes.some(
      (node) => node.type === 'text' && node.value.normalize('NFC').trim() !== '',
    ),
    nodes: structuralNodes.sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'),
    ),
  };
}

function serializeIcuStructure(structure) {
  return JSON.stringify(structure);
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

const DOMAIN_MODULES = new Set([
  'component_tidasPackage',
  'pages_flow',
  'pages_flowproperty',
  'pages_general',
  'pages_model',
  'pages_process',
  'pages_product',
  'pages_review',
  'pages_source',
  'pages_unitgroup',
]);

export function parseGlossaryPolicy(root) {
  const relativeFile = DEFAULT_GLOSSARY;
  const absolutePath = path.resolve(root, relativeFile);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing required file: ${relativeFile}`);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const schemaVersion = source.match(/^schemaVersion: '([^']+)'$/mu)?.[1] ?? null;
  const starts = [...source.matchAll(/^  - termId:/gmu)].map(({ index }) => index);
  const termBlocks = starts.map((start, index) => source.slice(start, starts[index + 1]));
  const scalar = (block, field) => {
    const prefix = field === 'termId' ? '  - ' : '    ';
    const match = block.match(new RegExp(`^${prefix}${field}: '((?:[^']|'')*)'$`, 'mu'));
    return match ? match[1].replaceAll("''", "'") : null;
  };
  const terms = termBlocks.map((block) => ({
    termId: scalar(block, 'termId'),
    sourceEnglish: scalar(block, 'sourceEnglish'),
    risk: scalar(block, 'risk'),
    decisionStatus: scalar(block, 'decisionStatus'),
  }));
  const invalidTerms = terms.filter(
    ({ termId, sourceEnglish, risk, decisionStatus }) =>
      !termId ||
      !sourceEnglish ||
      !GLOSSARY_RISK_LEVELS.has(risk) ||
      !GLOSSARY_DECISION_STATUSES.has(decisionStatus),
  );
  const duplicateTermCount = terms.length - new Set(terms.map(({ termId }) => termId)).size;
  if (
    schemaVersion !== GLOSSARY_SCHEMA_VERSION ||
    termBlocks.length === 0 ||
    invalidTerms.length > 0 ||
    duplicateTermCount > 0
  ) {
    throw new Error(
      `Glossary policy must use ${GLOSSARY_SCHEMA_VERSION} with unique terms, risk critical|high, and decisionStatus proposed|blocked-term (${termBlocks.length} terms, ${invalidTerms.length} invalid, ${duplicateTermCount} duplicate).`,
    );
  }
  return {
    relativeFile,
    terms,
    blockedTerms: terms.filter(({ decisionStatus }) => decisionStatus === 'blocked-term'),
    highRiskTerms: terms.filter(({ risk }) => ['critical', 'high'].includes(risk)),
  };
}

function domainReviewDecision(message, glossaryPolicy) {
  const evidence = [
    message.id,
    message.translations?.['en-US']?.value ?? '',
    message.translations?.['zh-CN']?.value ?? '',
  ].join(' ');
  const normalizedEvidence = evidence.normalize('NFC').toLocaleLowerCase('en');
  const reasons = [];
  const module = message.moduleOwnership?.['en-US']?.[0];
  if (DOMAIN_MODULES.has(module)) reasons.push(`domain-module:${module}`);
  if (
    /\b(?:lca|lcia|life[- ]?cycle|process|flow|exchange|impact|unit[- ]?group|quantitative|reference|compliance|review|audit|validation|dataset|data set|tidas)\b/i.test(
      evidence,
    )
  ) {
    reasons.push('domain-keyword-policy');
  }
  glossaryPolicy.highRiskTerms.forEach(({ termId, sourceEnglish }) => {
    const normalizedTerm = sourceEnglish.normalize('NFC').toLocaleLowerCase('en');
    const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    if (
      new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapedTerm}(?:$|[^\\p{L}\\p{N}])`, 'u').test(
        normalizedEvidence,
      )
    ) {
      reasons.push(`glossary:${termId}`);
    }
  });
  if (reasons.length === 0) {
    reasons.push('conservative-full-catalog-domain-review');
  }
  return { required: reasons.length > 0, reasons: [...new Set(reasons)].sort() };
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

function sourceContextHashForMessage(message, dynamicRegistry, reviewPolicyDigest) {
  const normalizeLocation = ({ path: sourcePath, kind, symbol, defaultMessage }) => ({
    path: sourcePath,
    kind,
    symbol: symbol ?? null,
    defaultMessage: defaultMessage ?? null,
  });
  return hashJson({
    schemaVersion: 'tiangong.i18n-de-source-context.v2',
    reviewPolicyDigest,
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

function contextHashForMessage({
  message,
  sourceContextHash,
  resolvedContext,
  domainReview,
  reviewPolicyDigest,
}) {
  return hashJson({
    schemaVersion: 'tiangong.i18n-de-review-context.v2',
    reviewPolicyDigest,
    sourceContextHash,
    id: message.id,
    resolvedContext,
    reviewRequirements: {
      independentNativeGerman: true,
      lcaTidasDomain: domainReview.required,
      domainReasons: domainReview.reasons,
    },
  });
}

function translationHashForMessage(messageId, module, german, contextHash) {
  return hashJson({ id: messageId, module, german, contextHash });
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

function walkFiles(root, relativeDirectory) {
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativeEntry = toPosix(path.join(relativeDirectory, entry.name));
    if (entry.isDirectory()) return walkFiles(root, relativeEntry);
    return entry.isFile() ? [relativeEntry] : [];
  });
}

async function buildAudit(options) {
  const manifest = readJson(options.root, options.manifest);
  const entryArtifact = readJson(options.root, options.entryTranslations);
  const allowlist = readJson(options.root, options.allowlist);
  const contextAnnotations = readJson(options.root, options.contextAnnotations);
  const dynamicRegistry = readJson(options.root, options.dynamicFamilies);
  const translationBatches = readJson(options.root, DEFAULT_TRANSLATION_BATCHES);
  const reviewLog = readJson(options.root, options.reviewLog);
  if (
    reviewLog.schemaVersion !== REVIEW_LOG_SCHEMA_VERSION ||
    reviewLog.locale !== CANDIDATE_LOCALE
  ) {
    throw new Error(
      `German review provenance must use ${REVIEW_LOG_SCHEMA_VERSION} and locale ${CANDIDATE_LOCALE}.`,
    );
  }
  const glossaryPolicy = parseGlossaryPolicy(options.root);
  const reviewPolicyDigest = buildInputDigest(options.root, [
    DEFAULT_GLOSSARY,
    DEFAULT_STYLE_GUIDE,
    DEFAULT_EVIDENCE_SOURCES,
    ...REVIEW_GATE_POLICY_SOURCES,
    options.allowlist,
    options.dynamicFamilies,
  ]);
  const findings = {
    topLevelActivated: [],
    localePolicyViolations: [],
    invalidEntryArtifactState: [],
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
    icuStructureMismatches: [],
    chineseCharacters: [],
    unapprovedEnglishCopies: [],
    blockedContexts: [],
    invalidContextProposals: [],
    duplicateContextAnnotations: [],
    unexpectedContextAnnotations: [],
    missingGovernanceArtifacts: [],
    invalidSourceAllowlist: [],
    unapprovedTechnicalTokens: [],
    mappedTokenViolations: [],
    translationBatchMismatches: [],
    blockedGlossaryTerms: [],
    invalidTranslationProducers: [],
    duplicateTranslationProducers: [],
    missingTranslationProducers: [],
    staleTranslationProducers: [],
    catalogOfflineReviewConfirmation: [],
    staleCanonicalManifest: [],
    pilotGateFailures: [],
  };

  const canonicalAudit = spawnSync(
    process.execPath,
    [
      path.resolve(options.root, CANONICAL_AUDIT),
      '--mode',
      'enforce',
      '--check',
      '--root',
      options.root,
      '--manifest',
      options.manifest,
      '--dynamic-registry',
      options.dynamicFamilies,
    ],
    { cwd: options.root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (canonicalAudit.status !== 0) {
    findings.staleCanonicalManifest.push({
      status: canonicalAudit.status,
      stderr: canonicalAudit.stderr.trim(),
      reason:
        'The canonical English/Chinese manifest and production-callsite audit must pass before German hashes are trusted.',
    });
  }

  if (options.mode === 'enforce') {
    const pilotAudit = spawnSync(
      process.execPath,
      [
        path.resolve(options.root, PILOT_AUDIT),
        '--mode',
        'enforce',
        '--check',
        '--root',
        options.root,
        '--manifest',
        options.manifest,
        '--ledger',
        options.ledger,
        '--review-log',
        options.reviewLog,
        '--confirmation',
        options.pilotConfirmation,
      ],
      { cwd: options.root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    );
    if (pilotAudit.status !== 0) {
      findings.pilotGateFailures.push({
        status: pilotAudit.status,
        stderr: pilotAudit.stderr.trim(),
        reason: 'The approved pilot is a mandatory prerequisite for final candidate enforcement.',
      });
    }
  }

  glossaryPolicy.blockedTerms.forEach((term) => {
    findings.blockedGlossaryTerms.push(structuredClone(term));
  });
  [
    [options.entryTranslations, entryArtifact],
    [options.allowlist, allowlist],
    [options.contextAnnotations, contextAnnotations],
    [DEFAULT_TRANSLATION_BATCHES, translationBatches],
    [options.reviewLog, reviewLog],
  ].forEach(([artifact, value]) => {
    if (value.locale !== CANDIDATE_LOCALE) {
      findings.localePolicyViolations.push({
        artifact,
        locale: value.locale ?? null,
        requiredLocale: CANDIDATE_LOCALE,
      });
    }
  });
  if (entryArtifact.status !== 'reviewed-ready-for-activation') {
    findings.invalidEntryArtifactState.push({
      status: entryArtifact.status ?? null,
      requiredStatus: 'reviewed-ready-for-activation',
      reason: 'Staged entry messages remain research candidates until full human review passes.',
    });
  }

  REQUIRED_GOVERNANCE_ARTIFACTS.forEach((relativeFile) => {
    if (!fs.existsSync(path.resolve(options.root, relativeFile))) {
      findings.missingGovernanceArtifacts.push({ path: relativeFile });
    }
  });

  const localesRoot = path.join(options.root, 'src', 'locales');
  fs.readdirSync(localesRoot, { withFileTypes: true })
    .filter((entry) => /^de(?:[-_]|$)/iu.test(entry.name))
    .filter((entry) => !(entry.isDirectory() && entry.name === CANDIDATE_LOCALE))
    .forEach((entry) => {
      findings.topLevelActivated.push({
        path: relativePath(options.root, path.join(localesRoot, entry.name)),
        reason:
          'Issue #601 permits only the de-DE leaf staging directory; no de/de-* entry file or regional bundle is allowed.',
      });
    });
  const quotedGermanLocale = /(['"])de(?:[-_][A-Za-z0-9]+)*\1/gu;
  [...walkFiles(options.root, 'config'), ...walkFiles(options.root, 'src')]
    .filter((relativeFile) => /\.(?:c|m)?[jt]sx?$/u.test(relativeFile))
    .filter((relativeFile) => !relativeFile.startsWith('src/.umi'))
    .filter((relativeFile) => !relativeFile.startsWith(`src/locales/${CANDIDATE_LOCALE}/`))
    .forEach((relativeFile) => {
      const source = fs.readFileSync(path.resolve(options.root, relativeFile), 'utf8');
      const matches = [...source.matchAll(quotedGermanLocale)].map((match) => match[0]);
      if (matches.length > 0) {
        findings.topLevelActivated.push({
          path: relativeFile,
          localeLiterals: [...new Set(matches)].sort(),
          reason: 'German runtime locale literals belong to activation Issue #602.',
        });
      }
    });

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
  const germanRootEntries = fs.existsSync(germanRoot)
    ? fs.readdirSync(germanRoot, { withFileTypes: true })
    : [];
  germanRootEntries
    .filter((entry) => !entry.isFile() || !entry.name.endsWith('.ts'))
    .forEach((entry) => {
      findings.invalidModules.push({
        path: relativePath(options.root, path.join(germanRoot, entry.name)),
        reason:
          'The de-DE staging directory may contain only first-level static .ts leaf modules; nested directories, links, and other code/data files are forbidden.',
      });
    });
  const actualModuleFiles = germanRootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
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
  const exactEnglishEntries = allowlist.exactEnglishMessages ?? [];
  const exactEnglishMessageIds = new Set(
    exactEnglishEntries
      .filter(
        (entry) =>
          entry &&
          typeof entry.messageId === 'string' &&
          typeof entry.reason === 'string' &&
          entry.reason.trim() !== '' &&
          entry.decision === 'preserve-exact-english',
      )
      .map(({ messageId }) => messageId),
  );
  const preservedTokenEntries = allowlist.preservedTokens ?? [];
  const sourcePatternTokenEntries = allowlist.sourcePatternTokens ?? [];
  const mappedTokenEntries = allowlist.mappedTokens ?? [];
  const approvedTechnicalTokens = new Set(
    [...preservedTokenEntries, ...sourcePatternTokenEntries].map(({ token }) => token),
  );
  const tokenEntryCounts = new Map();
  exactEnglishEntries.forEach((entry) => {
    if (!exactEnglishMessageIds.has(entry?.messageId)) {
      findings.invalidSourceAllowlist.push({
        entry,
        reason:
          'Exact-English exceptions require messageId, reason, and decision=preserve-exact-english; the local catalog confirmation approves the current scope.',
      });
    }
  });
  if (Object.hasOwn(allowlist, 'exactEnglishMessageIds')) {
    findings.invalidSourceAllowlist.push({
      reason: 'Use reviewed exactEnglishMessages records, not bare exactEnglishMessageIds.',
    });
  }
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
  const contextAnnotationCounts = new Map();
  (contextAnnotations.messages ?? []).forEach(({ messageId }) => {
    contextAnnotationCounts.set(messageId, (contextAnnotationCounts.get(messageId) ?? 0) + 1);
  });
  [...contextAnnotationCounts]
    .filter(([, count]) => count > 1)
    .forEach(([messageId, count]) => {
      findings.duplicateContextAnnotations.push({ messageId, count });
    });
  const contextAnnotationsById = new Map(
    (contextAnnotations.messages ?? [])
      .filter(({ messageId }) => contextAnnotationCounts.get(messageId) === 1)
      .map((annotation) => [annotation.messageId, annotation]),
  );

  (contextAnnotations.messages ?? []).forEach((annotation) => {
    if (!manifestById.has(annotation.messageId)) {
      findings.unexpectedContextAnnotations.push({ messageId: annotation.messageId });
    }
  });

  const contextById = new Map();
  const sourceContextHashesById = new Map();
  const domainReviewById = new Map();
  manifest.messages.forEach((message) => {
    const sourceContextHash = sourceContextHashForMessage(
      message,
      dynamicRegistry,
      reviewPolicyDigest,
    );
    sourceContextHashesById.set(message.id, sourceContextHash);
    const domainReview = domainReviewDecision(message, glossaryPolicy);
    domainReviewById.set(message.id, domainReview);
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
        reviewPolicy: {
          domainReviewRequired: domainReview.required,
          domainReasons: domainReview.reasons,
        },
      });
      return;
    }

    const annotation = contextAnnotationsById.get(message.id);
    const proposalErrors = validateContextAnnotation(message, annotation, sourceContextHash);
    if (proposalErrors.length > 0) {
      findings.invalidContextProposals.push({
        messageId: message.id,
        errors: proposalErrors,
      });
    } else {
      findings.blockedContexts.push({
        messageId: message.id,
        errors: ['The complete reserved-context proposal awaits local full-catalog confirmation.'],
      });
    }
    contextById.set(message.id, {
      status: 'BLOCKED_CONTEXT',
      source: 'reserved-key-without-runtime-evidence',
      concept: annotation?.concept ?? null,
      uiRole: annotation?.uiRole ?? inferredUiRole,
      uiRoleSource: annotation?.uiRole ? 'context-proposal' : 'unreviewed heuristic',
      consequence: annotation?.consequence ?? consequenceForRole(inferredUiRole),
      productionReferences: [],
      defaultMessages: message.defaultMessages,
      dynamicFamilies: [],
      reviewedAnnotation: annotation ?? null,
      reviewPolicy: {
        domainReviewRequired: domainReview.required,
        domainReasons: domainReview.reasons,
      },
    });
    return;
  });

  const contextHashesById = new Map(
    manifest.messages.map((message) => [
      message.id,
      contextHashForMessage({
        message,
        sourceContextHash: sourceContextHashesById.get(message.id),
        resolvedContext: contextById.get(message.id),
        domainReview: domainReviewById.get(message.id),
        reviewPolicyDigest,
      }),
    ]),
  );

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
    const normalizedGerman = german.value.normalize('NFC').trim();
    if (normalizedGerman.length === 0 && !emptyMessageIds.has(message.id)) {
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
    const englishIcu = inspectIcu(message.translations?.['en-US']?.value ?? '');
    if (
      !germanIcu.error &&
      !englishIcu.error &&
      serializeIcuStructure(germanIcu.structure) !== serializeIcuStructure(englishIcu.structure)
    ) {
      findings.icuStructureMismatches.push({
        messageId: message.id,
        reason: 'ICU selector, offset, nesting, or per-branch placeholder structure differs.',
        englishStructure: englishIcu.structure,
        germanStructure: germanIcu.structure,
      });
    }
    if (/\p{Script=Han}/u.test(german.value)) {
      findings.chineseCharacters.push({ messageId: message.id, value: german.value });
    }
    const english = message.translations?.['en-US']?.value;
    if (
      normalizedGerman.length > 0 &&
      normalizedGerman === (english ?? '').normalize('NFC').trim() &&
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

  const laneByModule = new Map(batchModules.map(({ name, laneId }) => [name, laneId]));
  const expectedReviewById = new Map();
  manifest.messages.forEach((message) => {
    const german = germanById.get(message.id);
    if (!german || typeof german.value !== 'string') return;
    const contextHash = contextHashesById.get(message.id);
    expectedReviewById.set(message.id, {
      batchId:
        german.module === '$activation-entry'
          ? '$activation-entry'
          : laneByModule.get(german.module),
      producer: null,
      contextHash,
      translationHash: translationHashForMessage(
        message.id,
        german.module,
        german.value,
        contextHash,
      ),
      domainReview: domainReviewById.get(message.id),
      producerKey: '',
    });
  });

  const producerRecords = reviewLog.translations?.producers ?? [];
  const producerGroups = new Map();
  producerRecords.forEach((record, index) => {
    if (!producerGroups.has(record?.messageId)) producerGroups.set(record?.messageId, []);
    producerGroups.get(record?.messageId).push({ record, index });
  });
  producerGroups.forEach((records, messageId) => {
    if (records.length > 1) {
      findings.duplicateTranslationProducers.push({ messageId, count: records.length });
    }
  });
  expectedReviewById.forEach((expected, messageId) => {
    const records = producerGroups.get(messageId) ?? [];
    if (records.length !== 1) {
      findings.missingTranslationProducers.push({ messageId });
      return;
    }
    const { record, index } = records[0];
    const producer = normalizeProducerActor(record.producer);
    if (
      !producer ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.producedAt ?? '') ||
      record.batchId !== expected.batchId
    ) {
      findings.invalidTranslationProducers.push({ index, record });
      findings.missingTranslationProducers.push({ messageId });
      return;
    }
    if (
      record.contextHash !== expected.contextHash ||
      record.translationHash !== expected.translationHash
    ) {
      findings.staleTranslationProducers.push({ messageId, producer: record.producer });
      findings.missingTranslationProducers.push({ messageId });
      return;
    }
    expected.producer = producer;
    expected.producerKey = producerActorKey(producer);
  });
  producerRecords
    .filter(({ messageId }) => !expectedReviewById.has(messageId))
    .forEach((record) => {
      findings.invalidTranslationProducers.push({
        record,
        reason: 'Producer record does not identify a current German translation.',
      });
    });

  const ledgerMessages = manifest.messages.map((message) => {
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
        sourceContext: sourceContextHashesById.get(message.id),
        context: contextHash,
        translation:
          german === null
            ? null
            : translationHashForMessage(message.id, german.module, german.value, contextHash),
      },
      context,
      reviewRequirements: {
        independentNativeGerman: true,
        lcaTidasDomain: domainReviewById.get(message.id).required,
        domainReasons: domainReviewById.get(message.id).reasons,
      },
    };
  });
  const reviewIndependentFindings = structuredClone(findings);
  const catalogReview = readCatalogOfflineConfirmation(options.root, options.catalogConfirmation, {
    locale: CANDIDATE_LOCALE,
    source: {
      manifestDigest: manifest.source.auditedInputDigest,
      reviewPolicyDigest,
    },
    messages: ledgerMessages,
    findings: {
      blockedGlossaryTerms: findings.blockedGlossaryTerms,
    },
  });
  if (catalogReview.approved) {
    findings.blockedContexts.length = 0;
    findings.blockedGlossaryTerms.length = 0;
  } else {
    findings.catalogOfflineReviewConfirmation.push({ reasons: catalogReview.reasons });
  }
  const locallyReviewCompleteCandidateCount =
    catalogReview.approved && findings.invalidContextProposals.length === 0
      ? [...expectedReviewById.values()].filter(({ producer }) => producer !== null).length
      : 0;
  const offlineHumanReviewApprovedCandidateCount = locallyReviewCompleteCandidateCount;

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
    options.reviewLog,
    ...REQUIRED_GOVERNANCE_ARTIFACTS,
    ...actualModuleFiles.map((fileName) =>
      toPosix(path.join('src', 'locales', CANDIDATE_LOCALE, fileName)),
    ),
  ];
  const ledgerFindings = {
    ...reviewIndependentFindings,
    unexpectedTranslations: findings.unexpectedTranslations,
    pilotGateFailures: [],
    catalogOfflineReviewConfirmation: [],
  };
  const ledgerFindingCounts = Object.fromEntries(
    Object.entries(ledgerFindings).map(([name, values]) => [name, values.length]),
  );
  const ledgerFindingCount = Object.values(ledgerFindingCounts).reduce(
    (total, count) => total + count,
    0,
  );
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
      contextInputs: [...new Set(inputPaths)].sort(),
      reviewPolicyDigest,
      humanConfirmationPolicy: {
        storage: 'local-untracked-markdown',
        githubEvidenceRequired: false,
        sameReviewerMayConfirmAllDimensions: true,
        pilotDefaultPath: DEFAULT_PILOT_CONFIRMATION,
        catalogDefaultPath: DEFAULT_CATALOG_CONFIRMATION,
      },
    },
    summary: {
      canonicalMessageCount: manifest.messages.length,
      candidateMessageCount: manifest.messages.filter(({ id }) => germanById.has(id)).length,
      leafModuleCount: actualModules.filter((module) => expectedModules.includes(module)).length,
      expectedLeafModuleCount: expectedModules.length,
      entryCandidateCount: Object.keys(entryMessages).length,
      locallyReviewCompleteCandidateCount,
      runtimeEvidencedContextCount: manifest.messages.filter(
        (message) => message.references.length > 0 || message.dynamicFamilies.length > 0,
      ).length,
      reservedCompatibilityContextCount: manifest.messages.filter(
        (message) => message.references.length === 0 && message.dynamicFamilies.length === 0,
      ).length,
      blockedContextCount: [...contextById.values()].filter(
        ({ status }) => status === 'BLOCKED_CONTEXT',
      ).length,
      pendingContextApprovalCount: reviewIndependentFindings.blockedContexts.length,
      invalidContextProposalCount: reviewIndependentFindings.invalidContextProposals.length,
      domainReviewRequiredCount: [...domainReviewById.values()].filter(({ required }) => required)
        .length,
      findingCount: ledgerFindingCount,
      findingCounts: ledgerFindingCounts,
    },
    contextPolicy: {
      sourceEvidence:
        'Every record retains canonical English, Chinese, all production references/defaultMessages, placeholders, module ownership, dynamic-family ownership, and the user-visible consequence of its UI role.',
      reservedEvidence:
        'Reserved compatibility copy has no current production callsite and is BLOCKED_CONTEXT by default. Missing, invalid, or stale proposals are structural findings that human confirmation cannot clear; a complete proposal records concept, UI role, consequence, rationale, evidence, and sourceContextHash and remains pending until the separate local catalog confirmation approves it.',
      reviewBoundary:
        'This tracked ledger proves context and structural coverage only. Human product-context, native-German, and LCA/TIDAS confirmation remains in an ignored local Markdown file and is never written into this artifact.',
    },
    messages: ledgerMessages,
    findings: ledgerFindings,
  };

  return {
    ledger,
    findingCount,
    findingCounts,
    catalogReview: {
      approved: catalogReview.approved,
      reasons: catalogReview.reasons,
      scopeDigest: catalogReview.scopeDigest,
      counts: catalogReview.counts,
    },
    offlineHumanReviewApprovedCandidateCount,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const {
    ledger,
    findingCount,
    findingCounts,
    catalogReview,
    offlineHumanReviewApprovedCandidateCount,
  } = await buildAudit(options);
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
    summary: {
      ...ledger.summary,
      offlineHumanReviewApprovedCandidateCount,
      findingCount,
      findingCounts,
    },
    findingCount,
    findingCounts,
    catalogReview,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (staleLedger || (options.mode === 'enforce' && findingCount > 0)) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `German candidate audit failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}
