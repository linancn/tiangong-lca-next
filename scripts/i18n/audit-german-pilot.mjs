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
  buildPilotOfflineReviewScope,
  DEFAULT_PILOT_CONFIRMATION,
  readPilotOfflineConfirmation,
} from './german-offline-review.mjs';
import { normalizeProducerActor, producerActorKey } from './review-producer.mjs';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const { analyzeIcuMessage } = require('./icu-message-parser.cjs');

const SCHEMA_VERSION = 'tiangong.i18n-german-pilot-audit.v6';
const REVIEW_LOG_SCHEMA_VERSION = 'tiangong.i18n-de-review-provenance.v5';
const GLOSSARY_SCHEMA_VERSION = 'tiangong.i18n-de-glossary.v1';
const GLOSSARY_RISK_LEVELS = new Set(['critical', 'high']);
const GLOSSARY_DECISION_STATUSES = new Set(['proposed', 'blocked-term']);
const DEFAULT_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const DEFAULT_LEDGER = 'docs/plans/i18n-de-DE/context-ledger.json';
const DEFAULT_PILOT = 'docs/plans/i18n-de-DE/pilot.json';
const DEFAULT_REVIEW_LOG = 'docs/plans/i18n-de-DE/review-log.yaml';
const DEFAULT_REVIEW_PACK = 'docs/plans/i18n-de-DE/pilot-review-pack.json';
const DEFAULT_SOURCE_ALLOWLIST = 'docs/plans/i18n-de-DE/source-allowlist.json';
const DEFAULT_GLOSSARY = 'docs/plans/i18n-de-DE/glossary.yaml';
const DEFAULT_EVIDENCE_SOURCES = 'docs/plans/i18n-de-DE/evidence-sources.yaml';
const CANDIDATE_AUDIT = 'scripts/i18n/audit-german-candidate.mjs';
const MIN_PILOT_SIZE = 60;
const MAX_PILOT_SIZE = 100;

function parseArgs(argv) {
  const options = {
    mode: 'enforce',
    root: process.cwd(),
    manifest: DEFAULT_MANIFEST,
    ledger: DEFAULT_LEDGER,
    pilot: DEFAULT_PILOT,
    reviewLog: DEFAULT_REVIEW_LOG,
    reviewPack: DEFAULT_REVIEW_PACK,
    confirmation: process.env.TIANGONG_I18N_DE_PILOT_CONFIRMATION ?? DEFAULT_PILOT_CONFIRMATION,
    write: false,
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      process.stdout.write(
        'Usage: node scripts/i18n/audit-german-pilot.mjs [--mode report|enforce] [--write|--check] [--root path] [--confirmation path]\n',
      );
      process.exit(0);
    }
    if (argument === '--write') {
      options.write = true;
    } else if (argument === '--check') {
      options.check = true;
    } else if (
      [
        '--mode',
        '--root',
        '--manifest',
        '--ledger',
        '--pilot',
        '--review-log',
        '--review-pack',
        '--confirmation',
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
        '--pilot': 'pilot',
        '--review-log': 'reviewLog',
        '--review-pack': 'reviewPack',
        '--confirmation': 'confirmation',
      }[argument];
      options[key] = value;
    } else {
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

function readJson(root, relativeFile) {
  const absolutePath = path.resolve(root, relativeFile);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing required file: ${relativeFile}`);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function yamlScalar(block, field) {
  const match = block.match(new RegExp(`^\\s+(?:-\\s+)?${field}: '((?:[^']|'')*)'$`, 'mu'));
  return match ? match[1].replaceAll("''", "'") : null;
}

function yamlInlineList(block, field) {
  const match = block.match(new RegExp(`^\\s+(?:-\\s+)?${field}: \\[(.*)\\]$`, 'mu'));
  if (!match) return [];
  return [...match[1].matchAll(/'((?:[^']|'')*)'/gu)].map((item) => item[1].replaceAll("''", "'"));
}

function yamlList(block, field) {
  const lines = block.split(/\r?\n/u);
  const fieldPattern = new RegExp(`^(\\s+)(?:-\\s+)?${field}:\\s*(.*)$`, 'u');
  const fieldIndex = lines.findIndex((line) => fieldPattern.test(line));
  if (fieldIndex < 0) return [];
  const [, indentation, remainder] = lines[fieldIndex].match(fieldPattern);
  if (/^\[.*\]$/u.test(remainder)) {
    return [...remainder.matchAll(/'((?:[^']|'')*)'/gu)].map((item) =>
      item[1].replaceAll("''", "'"),
    );
  }
  if (remainder !== '') return [];
  const fieldIndent = indentation.length;
  const values = [];
  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') continue;
    const lineIndent = line.match(/^\s*/u)[0].length;
    if (lineIndent <= fieldIndent) break;
    const item = line.match(/^\s+- '((?:[^']|'')*)'$/u);
    if (!item) break;
    values.push(item[1].replaceAll("''", "'"));
  }
  return values;
}

function yamlObjectBlocks(source, idField) {
  const starts = [...source.matchAll(new RegExp(`^  - ${idField}:`, 'gmu'))].map(
    ({ index }) => index,
  );
  return starts.map((start, index) => source.slice(start, starts[index + 1]));
}

export function parseReviewerGlossary(root) {
  const source = fs.readFileSync(path.resolve(root, DEFAULT_GLOSSARY), 'utf8');
  const schemaVersion = source.match(/^schemaVersion: '([^']+)'$/mu)?.[1] ?? null;
  const terms = yamlObjectBlocks(source, 'termId').map((block) => {
    const term = {
      termId: yamlScalar(block, 'termId'),
      sourceEnglish: yamlScalar(block, 'sourceEnglish'),
      sourceChinese: yamlInlineList(block, 'sourceChinese'),
      germanPreferred: yamlScalar(block, 'germanPreferred'),
      abbreviation: yamlScalar(block, 'abbreviation'),
      alternatives: [
        ...yamlList(block, 'alternatives'),
        ...yamlList(block, 'uiAlternatives'),
        ...[yamlScalar(block, 'compactVariant')].filter(Boolean),
      ],
      includeContexts: yamlList(block, 'includeContexts'),
      excludeContexts: yamlList(block, 'excludeContexts'),
      forbidden: yamlList(block, 'forbidden'),
      evidenceRefs: yamlList(block, 'evidenceRefs'),
      risk: yamlScalar(block, 'risk'),
      decisionStatus: yamlScalar(block, 'decisionStatus'),
    };
    return term;
  });
  const termIds = terms.map(({ termId }) => termId);
  if (
    terms.length === 0 ||
    terms.some(
      ({
        termId,
        sourceEnglish,
        sourceChinese,
        germanPreferred,
        evidenceRefs,
        risk,
        decisionStatus,
      }) =>
        !termId ||
        !sourceEnglish ||
        sourceChinese.length === 0 ||
        !germanPreferred ||
        evidenceRefs.length === 0 ||
        !GLOSSARY_RISK_LEVELS.has(risk) ||
        !GLOSSARY_DECISION_STATUSES.has(decisionStatus),
    ) ||
    new Set(termIds).size !== termIds.length ||
    schemaVersion !== GLOSSARY_SCHEMA_VERSION
  ) {
    throw new Error(
      `German reviewer glossary must use ${GLOSSARY_SCHEMA_VERSION} with unique terms, risk critical|high, decisionStatus proposed|blocked-term, and every required field.`,
    );
  }
  return new Map(terms.map((term) => [term.termId, term]));
}

function parseReviewerEvidenceSources(root) {
  const source = fs.readFileSync(path.resolve(root, DEFAULT_EVIDENCE_SOURCES), 'utf8');
  const sources = yamlObjectBlocks(source, 'sourceId').map((block) => {
    const evidence = {
      sourceId: yamlScalar(block, 'sourceId'),
      authority: yamlScalar(block, 'authority'),
      title: yamlScalar(block, 'title'),
      url: yamlScalar(block, 'url'),
      repository: yamlScalar(block, 'repository'),
      reviewedCommit: yamlScalar(block, 'reviewedCommit'),
      localRefs: yamlList(block, 'localRefs'),
      allowedUse: yamlList(block, 'allowedUse'),
      caution: yamlScalar(block, 'caution'),
      accessNote: yamlScalar(block, 'accessNote'),
    };
    return evidence;
  });
  const sourceIds = sources.map(({ sourceId }) => sourceId);
  if (
    sources.length === 0 ||
    sources.some(
      ({ sourceId, authority, title, url, repository, localRefs, allowedUse }) =>
        !sourceId ||
        !authority ||
        !title ||
        (!url && !repository && localRefs.length === 0) ||
        allowedUse.length === 0,
    ) ||
    new Set(sourceIds).size !== sourceIds.length
  ) {
    throw new Error(
      'German reviewer evidence register contains a missing required field or duplicate sourceId.',
    );
  }
  return new Map(sources.map((evidence) => [evidence.sourceId, evidence]));
}

function safeSourceExcerpt(root, relativeFile, focusLine, radius = 2) {
  if (typeof relativeFile !== 'string' || !Number.isInteger(focusLine) || focusLine < 1) {
    return null;
  }
  const absolutePath = path.resolve(root, relativeFile);
  const rootPrefix = `${path.resolve(root)}${path.sep}`;
  if (!absolutePath.startsWith(rootPrefix) || !fs.existsSync(absolutePath)) return null;
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/u);
  const startLine = Math.max(1, focusLine - radius);
  const endLine = Math.min(lines.length, focusLine + radius);
  return sourceExcerptRange(relativeFile, lines, startLine, endLine, focusLine);
}

function sourceExcerptRange(relativeFile, lines, startLine, endLine, focusLine) {
  return {
    path: relativeFile.split(path.sep).join('/'),
    focusLine,
    startLine,
    endLine,
    lines: lines.slice(startLine - 1, endLine).map((text, index) => ({
      line: startLine + index,
      text: text.length > 320 ? `${text.slice(0, 317)}...` : text,
    })),
  };
}

function sourceContainsExpression(source, expression) {
  const normalizedSource = source.replace(/\s+/gu, ' ');
  const normalizedExpression = expression.trim().replace(/\s+/gu, ' ');
  if (normalizedExpression === '') return false;
  const escapedExpression = normalizedExpression.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const characters = [...normalizedExpression];
  const identifierPart = /[\p{ID_Continue}$\u200C\u200D]/u;
  const bareIdentifier = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u.test(
    normalizedExpression,
  );
  const leftBoundary = identifierPart.test(characters[0])
    ? bareIdentifier
      ? '(?<![\\p{ID_Continue}$\\u200C\\u200D.])'
      : '(?<![\\p{ID_Continue}$\\u200C\\u200D])'
    : '';
  const rightBoundary = identifierPart.test(characters.at(-1))
    ? `(?![\\p{ID_Continue}$\\u200C\\u200D])${bareIdentifier ? '(?!\\s*:)' : ''}`
    : '';
  return new RegExp(`${leftBoundary}${escapedExpression}${rightBoundary}`, 'u').test(
    normalizedSource,
  );
}

function dynamicCallsiteExcerpt(root, callsite) {
  if (typeof callsite?.file !== 'string') return null;
  const absolutePath = path.resolve(root, callsite.file);
  const rootPrefix = `${path.resolve(root)}${path.sep}`;
  if (!absolutePath.startsWith(rootPrefix) || !fs.existsSync(absolutePath)) return null;
  const lines = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/u);
  const expression = typeof callsite.expression === 'string' ? callsite.expression.trim() : '';
  const api = typeof callsite.api === 'string' ? callsite.api.trim() : '';
  if (expression === '') return null;
  const escapedApi = api.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const apiPattern =
    api === 'FormattedMessage'
      ? /<\s*FormattedMessage\b/u
      : api === 'formatMessage'
        ? /\bformatMessage\s*\(/u
        : escapedApi
          ? new RegExp(`\\b${escapedApi}\\b`, 'u')
          : null;
  const expressionWindows = [];
  const expressionAndApiWindows = [];
  for (let start = 0; start < lines.length; start += 1) {
    for (let end = start; end < Math.min(lines.length, start + 10); end += 1) {
      const window = lines.slice(start, end + 1).join('\n');
      if (!sourceContainsExpression(window, expression)) continue;
      expressionWindows.push({ start, end });
      if (apiPattern?.test(window)) expressionAndApiWindows.push({ start, end });
    }
  }
  const candidates =
    expressionAndApiWindows.length > 0 ? expressionAndApiWindows : expressionWindows;
  candidates.sort(
    (left, right) =>
      left.end - left.start - (right.end - right.start) ||
      left.start - right.start ||
      left.end - right.end,
  );
  const matched = candidates[0];
  if (!matched) return null;
  return {
    resolution:
      expressionAndApiWindows.length > 0 ? 'expression-and-api-window' : 'expression-window',
    excerpt: sourceExcerptRange(
      callsite.file,
      lines,
      matched.start + 1,
      matched.end + 1,
      matched.end + 1,
    ),
  };
}

function buildSurfaceEvidence(root, context) {
  const seenReferences = new Set();
  const literalReferences = [];
  for (const reference of context.productionReferences ?? []) {
    const key = `${reference.path}:${reference.line}`;
    if (seenReferences.has(key)) continue;
    seenReferences.add(key);
    const excerpt = safeSourceExcerpt(root, reference.path, reference.line);
    if (!excerpt) continue;
    literalReferences.push({
      kind: reference.kind,
      symbol: reference.symbol,
      defaultMessage: reference.defaultMessage,
      excerpt,
    });
  }
  const dynamicProducers = (context.dynamicFamilies ?? []).map((family) => ({
    family: family.family,
    proof: family.proof,
    unknownHandling: family.unknownHandling,
    callsites: (family.callsites ?? []).map((callsite) => ({
      ...callsite,
      locatedSource: dynamicCallsiteExcerpt(root, callsite),
    })),
  }));
  const dynamicSourceResolutions = dynamicProducers
    .flatMap(({ callsites }) => callsites)
    .reduce((counts, { locatedSource }) => {
      const resolution = locatedSource?.resolution ?? 'unresolved';
      counts[resolution] = (counts[resolution] ?? 0) + 1;
      return counts;
    }, {});
  return {
    literalReferences: literalReferences.slice(0, 3),
    omittedLiteralReferenceCount: Math.max(0, literalReferences.length - 3),
    dynamicProducers,
    dynamicSourceResolutions,
    annotationEvidence: context.reviewedAnnotation?.evidence ?? [],
  };
}

function adjacentLocaleMessages(manifest, messageId, source) {
  const sourcePath = source.translations?.['en-US']?.source?.path;
  const sourceLine = source.translations?.['en-US']?.source?.line;
  if (!sourcePath || !Number.isInteger(sourceLine)) return [];
  return manifest.messages
    .filter(
      (message) =>
        message.id !== messageId && message.translations?.['en-US']?.source?.path === sourcePath,
    )
    .map((message) => ({
      id: message.id,
      line: message.translations['en-US'].source.line,
      distance: Math.abs(message.translations['en-US'].source.line - sourceLine),
      english: message.translations['en-US'].value,
      chinese: message.translations['zh-CN'].value,
    }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id, 'en'))
    .slice(0, 4);
}

function sampleValueForSelector(argumentType, selector, offset = 0) {
  if (argumentType === 'select') return selector;
  if (/^=-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(selector)) return Number(selector.slice(1));
  const values = { zero: 0, one: 1, two: 2, few: 3, many: 5, other: 2 };
  return (values[selector] ?? 2) + offset;
}

function renderIcuNodesForReview(nodes, poundValue = 2) {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'pound') return String(poundValue);
      if (node.argumentType === 'simple') return `<${node.name}>`;
      if (node.argumentType === 'number') return `<${node.name}:number>`;
      return `<${node.name}:${node.argumentType}>`;
    })
    .join('');
}

function collectIcuBranches(nodes, pathParts = [], rows = []) {
  const occurrences = new Map();
  nodes.forEach((node) => {
    if (!node.options) return;
    const argumentKey = `${node.name}:${node.argumentType}`;
    const occurrence = occurrences.get(argumentKey) ?? 0;
    occurrences.set(argumentKey, occurrence + 1);
    Object.entries(node.options).forEach(([selector, branch]) => {
      const sampleValue = sampleValueForSelector(node.argumentType, selector, node.offset ?? 0);
      const pathPart = `${argumentKey}#${occurrence}=${selector}`;
      const pathKey = [...pathParts, pathPart].join('/');
      rows.push({
        path: pathKey,
        argument: node.name,
        argumentType: node.argumentType,
        selector,
        sampleValue,
        renderedBranch: renderIcuNodesForReview(branch, sampleValue - (node.offset ?? 0)),
      });
      collectIcuBranches(branch, [...pathParts, pathPart], rows);
    });
  });
  return rows;
}

function buildIcuReviewerEvidence(english, german) {
  const englishAnalysis = analyzeIcuMessage(english);
  const germanAnalysis = analyzeIcuMessage(german);
  const englishBranches = collectIcuBranches(englishAnalysis.ast);
  const germanBranches = new Map(
    collectIcuBranches(germanAnalysis.ast).map((branch) => [branch.path, branch]),
  );
  const sampleArguments = Object.fromEntries(
    englishAnalysis.argumentSignature.map(({ name, type }) => [
      name,
      type === 'number' ? 123 : type === 'plural' || type === 'selectordinal' ? 2 : '<sample>',
    ]),
  );
  return {
    argumentSignature: englishAnalysis.argumentSignature,
    sampleArguments,
    branchCases: englishBranches.map((branch) => ({
      path: branch.path,
      argument: branch.argument,
      argumentType: branch.argumentType,
      selector: branch.selector,
      sampleValue: branch.sampleValue,
      english: branch.renderedBranch,
      german: germanBranches.get(branch.path)?.renderedBranch ?? null,
    })),
  };
}

function estimatedVisibleLength(nodes) {
  return nodes.reduce((total, node) => {
    if (node.type === 'text') return total + [...node.value].length;
    if (node.type === 'pound') return total + 2;
    if (node.argumentType === 'simple') return total + [...`<${node.name}>`].length;
    if (node.argumentType === 'number') return total + [...`<${node.name}:number>`].length;
    return (
      total +
      Math.max(...Object.values(node.options).map((branch) => estimatedVisibleLength(branch)))
    );
  }, 0);
}

function buildLengthEvidence(english, german, uiRole) {
  const templateEnglishLength = [...english].length;
  const templateGermanLength = [...german].length;
  const maximumVisibleEnglishLength = estimatedVisibleLength(analyzeIcuMessage(english).ast);
  const maximumVisibleGermanLength = estimatedVisibleLength(analyzeIcuMessage(german).ast);
  const ratio =
    maximumVisibleEnglishLength === 0
      ? null
      : Number((maximumVisibleGermanLength / maximumVisibleEnglishLength).toFixed(3));
  const flags = [];
  if (maximumVisibleGermanLength > 120) flags.push('visible-branch-over-120-characters');
  if (ratio !== null && ratio > 1.5) flags.push('candidate-over-150-percent-of-english');
  if (
    ['action-label', 'input-placeholder', 'navigation-label'].includes(uiRole) &&
    maximumVisibleGermanLength > 40
  ) {
    flags.push('compact-control-copy-over-40-characters');
  }
  return {
    templateEnglishLength,
    templateGermanLength,
    maximumVisibleEnglishLength,
    maximumVisibleGermanLength,
    visibleGermanToEnglishRatio: ratio,
    flags,
  };
}

function buildGlossaryEvidence(domainReasons, glossary, evidenceSources) {
  return (domainReasons ?? [])
    .filter((reason) => reason.startsWith('glossary:'))
    .map((reason) => reason.slice('glossary:'.length))
    .map((termId) => glossary.get(termId))
    .filter(Boolean)
    .map((term) => ({
      ...term,
      evidence: term.evidenceRefs.map((sourceId) => evidenceSources.get(sourceId) ?? { sourceId }),
    }));
}

function buildDecisionPacket(pilotMessage, context, glossaryTerms) {
  const questions = [];
  if (context.status === 'BLOCKED_CONTEXT') {
    questions.push(
      'Confirm whether the proposed compatibility-key concept, UI role, consequence, and cited evidence are accurate enough to mark this context READY.',
    );
  }
  if (!context.concept) {
    questions.push(
      'Confirm and record the concrete product concept represented by this runtime message; the current ledger concept is null.',
    );
  }
  if (/heuristic/iu.test(context.uiRoleSource ?? '')) {
    questions.push(
      `Confirm or correct the proposed UI role "${context.uiRole}" from the embedded runtime evidence; its current source is heuristic.`,
    );
  }
  if (pilotMessage.risk?.trim()) questions.push(pilotMessage.risk.trim());
  glossaryTerms
    .filter(({ decisionStatus }) => decisionStatus === 'blocked-term')
    .forEach(({ termId }) =>
      questions.push(`Resolve blocked glossary term ${termId} before approving this message.`),
    );
  const explicitDecision =
    context.status === 'BLOCKED_CONTEXT' ||
    !context.concept ||
    /heuristic/iu.test(context.uiRoleSource ?? '') ||
    glossaryTerms.some(({ decisionStatus }) => decisionStatus === 'blocked-term') ||
    /\b(?:decision|whether|versus|alternative|pending|still blocked|needs? .*review)\b/iu.test(
      pilotMessage.risk ?? '',
    );
  return {
    status: explicitDecision ? 'REQUIRES_EXPLICIT_DECISION' : 'REVIEW_CONFIRMATION_REQUIRED',
    questions,
    termOptions: glossaryTerms.map((term) => ({
      termId: term.termId,
      preferred: term.germanPreferred,
      alternatives: term.alternatives,
      forbidden: term.forbidden,
      includeContexts: term.includeContexts,
      excludeContexts: term.excludeContexts,
      decisionStatus: term.decisionStatus,
    })),
  };
}

function buildReviewerDossier({
  root,
  manifest,
  pilotMessage,
  source,
  ledgerMessage,
  glossary,
  evidenceSources,
}) {
  const surfaceEvidence = buildSurfaceEvidence(root, ledgerMessage.context);
  const glossaryTerms = buildGlossaryEvidence(
    ledgerMessage.context.reviewPolicy?.domainReasons,
    glossary,
    evidenceSources,
  );
  return {
    schemaVersion: 'tiangong.i18n-de-pilot-reviewer-dossier.v1',
    surfaceEvidence,
    sourceLocaleNeighbors: adjacentLocaleMessages(manifest, pilotMessage.id, source),
    glossaryTerms,
    decisionPacket: buildDecisionPacket(pilotMessage, ledgerMessage.context, glossaryTerms),
    icuReview: buildIcuReviewerEvidence(source.translations['en-US'].value, pilotMessage.candidate),
    lengthReview: buildLengthEvidence(
      source.translations['en-US'].value,
      pilotMessage.candidate,
      ledgerMessage.context.uiRole,
    ),
  };
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

function signature(value) {
  return analyzeIcuMessage(value).argumentSignature;
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

function serializedIcuStructure(value) {
  return JSON.stringify(icuStructure(analyzeIcuMessage(value).ast));
}

function serializedSignature(value) {
  return value.map(({ name, type }) => `${name}:${type}`).join(', ');
}

function pilotRequestsDomainReview(message) {
  return (message.reviewDomains ?? []).some(
    (domain) => !['native-german', 'product', 'review-product'].includes(domain),
  );
}

function sortFindings(findings) {
  Object.values(findings).forEach((items) => {
    items.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'));
  });
}

async function audit(options) {
  const manifest = readJson(options.root, options.manifest);
  const ledger = readJson(options.root, options.ledger);
  const pilot = readJson(options.root, options.pilot);
  const reviewLog = readJson(options.root, options.reviewLog);
  if (reviewLog.schemaVersion !== REVIEW_LOG_SCHEMA_VERSION || reviewLog.locale !== 'de-DE') {
    throw new Error(
      `German review provenance must use ${REVIEW_LOG_SCHEMA_VERSION} and locale de-DE.`,
    );
  }
  const sourceAllowlist = readJson(options.root, DEFAULT_SOURCE_ALLOWLIST);
  const reviewerGlossary = parseReviewerGlossary(options.root);
  const reviewerEvidenceSources = parseReviewerEvidenceSources(options.root);
  for (const term of reviewerGlossary.values()) {
    const unknownEvidenceRefs = term.evidenceRefs.filter(
      (sourceId) => !reviewerEvidenceSources.has(sourceId),
    );
    if (unknownEvidenceRefs.length > 0) {
      throw new Error(
        `Glossary term ${term.termId} references unknown evidence sources: ${unknownEvidenceRefs.join(
          ', ',
        )}`,
      );
    }
  }
  const manifestById = new Map(manifest.messages.map((message) => [message.id, message]));
  const ledgerById = new Map(ledger.messages.map((message) => [message.id, message]));
  const findings = {
    invalidPilotSize: [],
    duplicatePilotIds: [],
    unknownPilotIds: [],
    blockedPilotContexts: [],
    invalidPilotContextProposals: [],
    invalidCandidates: [],
    placeholderMismatches: [],
    icuStructureMismatches: [],
    chineseCharacters: [],
    englishCopies: [],
    informalAddress: [],
    staleContextLedger: [],
    staleCanonicalManifest: [],
    blockedGlossaryTerms: [],
    invalidPilotReviewState: [],
    domainRequirementMismatches: [],
    localePolicyViolations: [],
    invalidReviewDomains: [],
    invalidReviewerDossiers: [],
    offlineReviewConfirmation: [],
  };
  [
    [options.pilot, pilot],
    [options.reviewLog, reviewLog],
  ].forEach(([artifact, value]) => {
    if (value.locale !== 'de-DE') {
      findings.localePolicyViolations.push({
        artifact,
        locale: value.locale ?? null,
        requiredLocale: 'de-DE',
      });
    }
  });
  const candidateCheck = spawnSync(
    process.execPath,
    [
      path.resolve(options.root, CANDIDATE_AUDIT),
      '--mode',
      'report',
      '--check',
      '--root',
      options.root,
      '--manifest',
      options.manifest,
      '--ledger',
      options.ledger,
      '--review-log',
      options.reviewLog,
    ],
    { cwd: options.root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (candidateCheck.status !== 0) {
    findings.staleContextLedger.push({
      status: candidateCheck.status,
      stderr: candidateCheck.stderr.trim(),
      reason: 'Regenerate and check the candidate context ledger before pilot review.',
    });
  } else {
    try {
      const candidateResult = JSON.parse(candidateCheck.stdout);
      if ((candidateResult.findingCounts?.staleCanonicalManifest ?? 0) > 0) {
        findings.staleCanonicalManifest.push({
          reason: 'The canonical English/Chinese manifest or production-callsite audit is stale.',
        });
      }
    } catch (error) {
      findings.staleCanonicalManifest.push({
        reason: `Candidate audit output was not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }
  (ledger.findings?.blockedGlossaryTerms ?? []).forEach((term) => {
    findings.blockedGlossaryTerms.push(term);
  });
  const candidateProducer = normalizeProducerActor(reviewLog.pilot?.candidateProducer);
  const declaredCandidateProducer = normalizeProducerActor(
    pilot.selectionPolicy?.candidateProducer,
  );
  if (
    !candidateProducer ||
    !declaredCandidateProducer ||
    producerActorKey(candidateProducer) !== producerActorKey(declaredCandidateProducer) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reviewLog.pilot?.candidateProducedAt ?? '')
  ) {
    findings.invalidPilotReviewState.push({
      reason:
        'Pilot candidates require the same structured canonical producer actor in pilot.json and review-log.yaml plus candidateProducedAt (YYYY-MM-DD).',
    });
  }
  const exactEnglishMessageIds = new Set(
    (sourceAllowlist.exactEnglishMessages ?? [])
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

  const pilotMessages = pilot.messages ?? [];
  const allowedReviewDomains = new Set([
    'chemistry',
    'data-policy',
    'ilcd',
    'lca',
    'native-german',
    'product',
    'review-domain',
    'review-product',
    'solver',
    'statistics',
    'tidas',
    'worker',
  ]);
  if (
    pilotMessages.length < MIN_PILOT_SIZE ||
    pilotMessages.length > MAX_PILOT_SIZE ||
    pilot.targetCount !== pilotMessages.length
  ) {
    findings.invalidPilotSize.push({
      minimum: MIN_PILOT_SIZE,
      maximum: MAX_PILOT_SIZE,
      declared: pilot.targetCount,
      actual: pilotMessages.length,
    });
  }

  const idCounts = new Map();
  pilotMessages.forEach(({ id }) => idCounts.set(id, (idCounts.get(id) ?? 0) + 1));
  [...idCounts]
    .filter(([, count]) => count > 1)
    .forEach(([messageId, count]) => findings.duplicatePilotIds.push({ messageId, count }));

  const expectedHashes = new Map();
  const reviewPackMessages = [];
  pilotMessages.forEach((pilotMessage) => {
    const source = manifestById.get(pilotMessage.id);
    const ledgerMessage = ledgerById.get(pilotMessage.id);
    if (!source || !ledgerMessage) {
      findings.unknownPilotIds.push({ messageId: pilotMessage.id });
      return;
    }
    if (
      !Array.isArray(pilotMessage.reviewDomains) ||
      !pilotMessage.reviewDomains.includes('native-german') ||
      !pilotRequestsDomainReview(pilotMessage) ||
      pilotMessage.reviewDomains.some((domain) => !allowedReviewDomains.has(domain))
    ) {
      findings.invalidReviewDomains.push({
        messageId: pilotMessage.id,
        reviewDomains: pilotMessage.reviewDomains ?? null,
        reason:
          'Every high-risk pilot message requires native-german plus a controlled domain scope.',
      });
    }
    if (ledgerMessage.context.status === 'BLOCKED_CONTEXT') {
      const proposalErrors = validateContextAnnotation(
        source,
        ledgerMessage.context.reviewedAnnotation,
        ledgerMessage.hashes.sourceContext,
      );
      if (proposalErrors.length > 0) {
        findings.invalidPilotContextProposals.push({
          messageId: pilotMessage.id,
          errors: proposalErrors,
        });
      } else {
        findings.blockedPilotContexts.push({ messageId: pilotMessage.id });
      }
    }
    if (typeof pilotMessage.candidate !== 'string' || pilotMessage.candidate.length === 0) {
      findings.invalidCandidates.push({ messageId: pilotMessage.id });
      return;
    }
    let germanSignature;
    let germanStructure;
    try {
      germanSignature = signature(pilotMessage.candidate);
      germanStructure = serializedIcuStructure(pilotMessage.candidate);
    } catch (error) {
      findings.invalidCandidates.push({
        messageId: pilotMessage.id,
        reason: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const englishSignature = source.translations['en-US'].argumentSignature;
    if (serializedSignature(germanSignature) !== serializedSignature(englishSignature)) {
      findings.placeholderMismatches.push({
        messageId: pilotMessage.id,
        english: englishSignature,
        german: germanSignature,
      });
    }
    const englishStructure = serializedIcuStructure(source.translations['en-US'].value);
    if (germanStructure !== englishStructure) {
      findings.icuStructureMismatches.push({
        messageId: pilotMessage.id,
        reason: 'ICU selector, offset, nesting, or per-branch placeholder structure differs.',
      });
    }
    if (/\p{Script=Han}/u.test(pilotMessage.candidate)) {
      findings.chineseCharacters.push({ messageId: pilotMessage.id });
    }
    if (
      pilotMessage.candidate.normalize('NFC').trim() ===
        source.translations['en-US'].value.normalize('NFC').trim() &&
      !exactEnglishMessageIds.has(pilotMessage.id)
    ) {
      findings.englishCopies.push({ messageId: pilotMessage.id });
    }
    if (
      /\b(?:du|dein(?:e|er|em|en|es)?|euch|euer(?:e|er|em|en|es)?)\b/iu.test(pilotMessage.candidate)
    ) {
      findings.informalAddress.push({ messageId: pilotMessage.id });
    }
    const authoritativeDomainReview = true;
    if (
      ledgerMessage.reviewRequirements?.lcaTidasDomain !== true ||
      !pilotRequestsDomainReview(pilotMessage)
    ) {
      findings.domainRequirementMismatches.push({
        messageId: pilotMessage.id,
        ledgerReasons: ledgerMessage.reviewRequirements.domainReasons ?? [],
      });
    }
    const contextHash = ledgerMessage.hashes.context;
    const translationHash = hashJson({
      id: pilotMessage.id,
      module: source.moduleOwnership['en-US'][0],
      german: pilotMessage.candidate,
      contextHash,
    });
    const dossier = buildReviewerDossier({
      root: options.root,
      manifest,
      pilotMessage,
      source,
      ledgerMessage,
      glossary: reviewerGlossary,
      evidenceSources: reviewerEvidenceSources,
    });
    const expectedGlossaryIds = (ledgerMessage.context.reviewPolicy?.domainReasons ?? [])
      .filter((reason) => reason.startsWith('glossary:'))
      .map((reason) => reason.slice('glossary:'.length));
    const receivedGlossaryIds = new Set(dossier.glossaryTerms.map(({ termId }) => termId));
    expectedGlossaryIds
      .filter((termId) => !receivedGlossaryIds.has(termId))
      .forEach((termId) =>
        findings.invalidReviewerDossiers.push({
          messageId: pilotMessage.id,
          reason: 'missing-glossary-term',
          termId,
        }),
      );
    if (
      ledgerMessage.context.status === 'RUNTIME_EVIDENCED' &&
      dossier.surfaceEvidence.literalReferences.length === 0 &&
      dossier.surfaceEvidence.dynamicProducers.length === 0
    ) {
      findings.invalidReviewerDossiers.push({
        messageId: pilotMessage.id,
        reason: 'runtime context has no embedded literal or dynamic surface evidence',
      });
    }
    if ((dossier.surfaceEvidence.dynamicSourceResolutions.unresolved ?? 0) > 0) {
      findings.invalidReviewerDossiers.push({
        messageId: pilotMessage.id,
        reason: 'one or more dynamic callsites could not be located for an embedded excerpt',
        unresolvedCount: dossier.surfaceEvidence.dynamicSourceResolutions.unresolved,
      });
    }
    if ((dossier.surfaceEvidence.dynamicSourceResolutions['expression-window'] ?? 0) > 0) {
      findings.invalidReviewerDossiers.push({
        messageId: pilotMessage.id,
        reason: 'one or more dynamic excerpts contain the expression but not the declared API',
        expressionOnlyCount: dossier.surfaceEvidence.dynamicSourceResolutions['expression-window'],
      });
    }
    dossier.surfaceEvidence.dynamicProducers
      .flatMap(({ callsites }) => callsites)
      .filter(({ expression, locatedSource }) => {
        if (!locatedSource) return false;
        const excerptText = locatedSource.excerpt.lines.map(({ text }) => text).join('\n');
        return !sourceContainsExpression(excerptText, expression ?? '');
      })
      .forEach(({ file, expression }) =>
        findings.invalidReviewerDossiers.push({
          messageId: pilotMessage.id,
          reason: 'dynamic callsite excerpt does not contain the declared expression',
          file,
          expression,
        }),
      );
    if (
      source.translations['en-US'].argumentSignature.length > 0 &&
      Object.keys(dossier.icuReview.sampleArguments).length === 0
    ) {
      findings.invalidReviewerDossiers.push({
        messageId: pilotMessage.id,
        reason: 'argument-bearing message has no deterministic reviewer sample arguments',
      });
    }
    dossier.icuReview.branchCases
      .filter(({ german }) => german === null)
      .forEach(({ path: branchPath }) =>
        findings.invalidReviewerDossiers.push({
          messageId: pilotMessage.id,
          reason: 'ICU reviewer branch could not be paired with the German candidate',
          branchPath,
        }),
      );
    const dossierHash = hashJson({
      schemaVersion: 'tiangong.i18n-de-pilot-reviewer-dossier.v1',
      messageId: pilotMessage.id,
      dossier,
    });
    expectedHashes.set(pilotMessage.id, {
      contextHash,
      translationHash,
      domainReviewRequired: authoritativeDomainReview,
      dossierHash,
      reviewScopeHash: hashJson({
        schemaVersion: 'tiangong.i18n-de-pilot-review-scope.v5',
        contextHash,
        translationHash,
        dossierHash,
        candidateProducer,
        rationale: pilotMessage.rationale,
        risk: pilotMessage.risk,
        reviewDomains: pilotMessage.reviewDomains,
        authoritativeDomainReview,
        reviewPolicyDigest: ledger.source.reviewPolicyDigest,
      }),
    });
    reviewPackMessages.push({
      id: pilotMessage.id,
      module: source.moduleOwnership['en-US'][0],
      category: source.category,
      english: source.translations['en-US'],
      chinese: source.translations['zh-CN'],
      candidate: pilotMessage.candidate,
      rationale: pilotMessage.rationale,
      risk: pilotMessage.risk,
      reviewDomains: pilotMessage.reviewDomains,
      context: ledgerMessage.context,
      reviewerDossier: dossier,
      hashes: expectedHashes.get(pilotMessage.id),
    });
  });

  const blockedGlossaryTerms = [...reviewerGlossary.values()].filter(
    ({ decisionStatus }) => decisionStatus === 'blocked-term',
  );
  const reviewPack = {
    schemaVersion: 'tiangong.i18n-de-pilot-review-pack.v6',
    issue: pilot.issue,
    locale: pilot.locale,
    source: {
      manifest: options.manifest,
      manifestDigest: manifest.source.auditedInputDigest,
      contextLedger: options.ledger,
      contextInputDigest: ledger.source.contextInputDigest,
      reviewPolicyDigest: ledger.source.reviewPolicyDigest,
      pilot: options.pilot,
      pilotDigest: hashJson(pilot),
    },
    policy: {
      candidateOnly: true,
      runtimeActivationAllowed: false,
      humanConfirmationStorage: 'local-untracked-markdown',
      defaultConfirmationPath: DEFAULT_PILOT_CONFIRMATION,
      githubEvidenceRequired: false,
      sameReviewerMayConfirmAllDimensions: true,
      reviewDimensions: ['product-context', 'native-german', 'domain'],
      confirmationMustNotBeCommitted: true,
      approvalHashRule:
        'One local confirmation binds all 90 context, translation, dossier, and review-scope hashes plus the 9 blocked context proposals and 2 blocked glossary terms.',
      approvalBoundary:
        'Human confirmation clears only complete pending context proposals; missing, invalid, or stale proposal structure remains blocking.',
      candidateProducer,
      dossierRule:
        'Embedded excerpts, dynamic-family proof, source-locale neighboring messages, glossary evidence, ICU branch cases, and length flags are deterministic reviewer evidence, not human approval.',
    },
    blockedGlossaryTerms,
    summary: {
      messageCount: reviewPackMessages.length,
      domainReviewRequiredCount: [...expectedHashes.values()].filter(
        ({ domainReviewRequired }) => domainReviewRequired,
      ).length,
      blockedContextCount: reviewPackMessages.filter(
        ({ context }) => context.status === 'BLOCKED_CONTEXT',
      ).length,
      pendingContextApprovalCount: findings.blockedPilotContexts.length,
      invalidContextProposalCount: findings.invalidPilotContextProposals.length,
      blockedGlossaryTermCount: blockedGlossaryTerms.length,
      explicitDecisionPacketCount: reviewPackMessages.filter(
        ({ reviewerDossier }) =>
          reviewerDossier.decisionPacket.status === 'REQUIRES_EXPLICIT_DECISION',
      ).length,
      contextConfirmationRequiredCount: reviewPackMessages.filter(
        ({ context }) => !context.concept || /heuristic/iu.test(context.uiRoleSource ?? ''),
      ).length,
      argumentMessageCount: reviewPackMessages.filter(
        ({ reviewerDossier }) => Object.keys(reviewerDossier.icuReview.sampleArguments).length > 0,
      ).length,
      selectorMessageCount: reviewPackMessages.filter(
        ({ reviewerDossier }) => reviewerDossier.icuReview.branchCases.length > 0,
      ).length,
      longCandidateCount: reviewPackMessages.filter(({ reviewerDossier }) =>
        reviewerDossier.lengthReview.flags.includes('visible-branch-over-120-characters'),
      ).length,
      expansionRiskCount: reviewPackMessages.filter(({ reviewerDossier }) =>
        reviewerDossier.lengthReview.flags.includes('candidate-over-150-percent-of-english'),
      ).length,
    },
    selectionCoverage: {
      categories: Object.fromEntries(
        [...new Set(reviewPackMessages.map(({ category }) => category))]
          .sort()
          .map((category) => [
            category,
            reviewPackMessages.filter((message) => message.category === category).length,
          ]),
      ),
      modules: Object.fromEntries(
        [...new Set(reviewPackMessages.map(({ module }) => module))]
          .sort()
          .map((module) => [
            module,
            reviewPackMessages.filter((message) => message.module === module).length,
          ]),
      ),
    },
    messages: reviewPackMessages,
  };
  const offlineScope = buildPilotOfflineReviewScope(reviewPack);
  reviewPack.offlineReview = {
    schemaVersion: offlineScope.schemaVersion,
    defaultConfirmationPath: DEFAULT_PILOT_CONFIRMATION,
    scopeDigest: offlineScope.scopeDigest,
    messageCount: offlineScope.messages.length,
    blockedContextProposalCount: offlineScope.blockedContextProposals.length,
    blockedGlossaryTermCount: offlineScope.blockedGlossaryTerms.length,
  };
  const offlineReview = readPilotOfflineConfirmation(
    options.root,
    options.confirmation,
    reviewPack,
  );
  if (offlineReview.approved) {
    findings.blockedPilotContexts.length = 0;
    findings.blockedGlossaryTerms.length = 0;
  } else {
    findings.offlineReviewConfirmation.push({ reasons: offlineReview.reasons });
  }

  sortFindings(findings);
  const findingCounts = Object.fromEntries(
    Object.entries(findings).map(([name, values]) => [name, values.length]),
  );
  const structuralFindingNames = [
    'invalidPilotSize',
    'duplicatePilotIds',
    'unknownPilotIds',
    'blockedPilotContexts',
    'invalidPilotContextProposals',
    'invalidCandidates',
    'placeholderMismatches',
    'icuStructureMismatches',
    'chineseCharacters',
    'englishCopies',
    'informalAddress',
    'staleContextLedger',
    'staleCanonicalManifest',
    'blockedGlossaryTerms',
    'domainRequirementMismatches',
    'localePolicyViolations',
    'invalidReviewDomains',
    'invalidReviewerDossiers',
  ];
  const structuralFindingCount = structuralFindingNames.reduce(
    (total, name) => total + findingCounts[name],
    0,
  );
  const reviewFindingCount = Object.entries(findingCounts)
    .filter(([name]) => !structuralFindingNames.includes(name))
    .reduce((total, [, count]) => total + count, 0);
  return {
    findings,
    findingCounts,
    structuralFindingCount,
    reviewFindingCount,
    findingCount: structuralFindingCount + reviewFindingCount,
    offlineReview: {
      approved: offlineReview.approved,
      reasons: offlineReview.reasons,
      scopeDigest: offlineReview.scopeDigest,
      counts: offlineReview.counts,
    },
    pilotCount: pilotMessages.length,
    domainReviewRequiredCount: [...expectedHashes.values()].filter(
      ({ domainReviewRequired }) => domainReviewRequired,
    ).length,
    reviewPack,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await audit(options);
    const reviewPackPath = path.resolve(options.root, options.reviewPack);
    const reviewPackText = await prettier.format(JSON.stringify(result.reviewPack), {
      ...(await prettier.resolveConfig(reviewPackPath)),
      filepath: reviewPackPath,
    });
    if (options.write) {
      fs.mkdirSync(path.dirname(reviewPackPath), { recursive: true });
      fs.writeFileSync(reviewPackPath, reviewPackText);
    }
    const staleReviewPack =
      options.check &&
      (!fs.existsSync(reviewPackPath) ||
        fs.readFileSync(reviewPackPath, 'utf8') !== reviewPackText);
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SCHEMA_VERSION,
          locale: 'de-DE',
          mode: options.mode,
          wroteReviewPack: options.write,
          checkedReviewPack: options.check,
          staleReviewPack,
          pilotCount: result.pilotCount,
          domainReviewRequiredCount: result.domainReviewRequiredCount,
          reviewPackSummary: result.reviewPack.summary,
          structuralFindingCount: result.structuralFindingCount,
          reviewFindingCount: result.reviewFindingCount,
          findingCount: result.findingCount,
          findingCounts: result.findingCounts,
          offlineReview: result.offlineReview,
        },
        null,
        2,
      )}\n`,
    );
    if (staleReviewPack || (options.mode === 'enforce' && result.findingCount > 0)) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      `German pilot audit failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}
