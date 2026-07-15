#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const { analyzeIcuMessage } = require('./icu-message-parser.cjs');

const SCHEMA_VERSION = 'tiangong.i18n-german-pilot-audit.v1';
const DEFAULT_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const DEFAULT_LEDGER = 'docs/plans/i18n-de-DE/context-ledger.json';
const DEFAULT_PILOT = 'docs/plans/i18n-de-DE/pilot.json';
const DEFAULT_REVIEW_LOG = 'docs/plans/i18n-de-DE/review-log.yaml';
const DEFAULT_REVIEW_PACK = 'docs/plans/i18n-de-DE/pilot-review-pack.json';
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
    write: false,
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      process.stdout.write(
        'Usage: node scripts/i18n/audit-german-pilot.mjs [--mode report|enforce] [--write|--check] [--root path]\n',
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

function serializedSignature(value) {
  return value.map(({ name, type }) => `${name}:${type}`).join(', ');
}

function requiresDomainReview(message) {
  return message.reviewDomains.some(
    (domain) => !['native-german', 'product', 'review-product'].includes(domain),
  );
}

function sortFindings(findings) {
  Object.values(findings).forEach((items) => {
    items.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'));
  });
}

function audit(options) {
  const manifest = readJson(options.root, options.manifest);
  const ledger = readJson(options.root, options.ledger);
  const pilot = readJson(options.root, options.pilot);
  const reviewLog = readJson(options.root, options.reviewLog);
  const manifestById = new Map(manifest.messages.map((message) => [message.id, message]));
  const ledgerById = new Map(ledger.messages.map((message) => [message.id, message]));
  const findings = {
    invalidPilotSize: [],
    duplicatePilotIds: [],
    unknownPilotIds: [],
    blockedPilotContexts: [],
    invalidCandidates: [],
    placeholderMismatches: [],
    chineseCharacters: [],
    englishCopies: [],
    informalAddress: [],
    missingProductReviews: [],
    missingNativeGermanReviews: [],
    missingDomainReviews: [],
    invalidReviews: [],
    staleReviews: [],
    reviewerIndependenceViolations: [],
    unresolvedCriticalOrMajor: [],
  };

  const pilotMessages = pilot.messages ?? [];
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
    if (ledgerMessage.context.status === 'BLOCKED_CONTEXT') {
      findings.blockedPilotContexts.push({ messageId: pilotMessage.id });
    }
    if (typeof pilotMessage.candidate !== 'string' || pilotMessage.candidate.length === 0) {
      findings.invalidCandidates.push({ messageId: pilotMessage.id });
      return;
    }
    let germanSignature;
    try {
      germanSignature = signature(pilotMessage.candidate);
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
    if (/\p{Script=Han}/u.test(pilotMessage.candidate)) {
      findings.chineseCharacters.push({ messageId: pilotMessage.id });
    }
    if (pilotMessage.candidate === source.translations['en-US'].value) {
      findings.englishCopies.push({ messageId: pilotMessage.id });
    }
    if (
      /\b(?:du|dein(?:e|er|em|en|es)?|euch|euer(?:e|er|em|en|es)?)\b/iu.test(pilotMessage.candidate)
    ) {
      findings.informalAddress.push({ messageId: pilotMessage.id });
    }
    expectedHashes.set(pilotMessage.id, {
      contextHash: ledgerMessage.hashes.context,
      translationHash: hashJson({
        id: pilotMessage.id,
        module: source.moduleOwnership['en-US'][0],
        german: pilotMessage.candidate,
        contextHash: ledgerMessage.hashes.context,
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
      hashes: expectedHashes.get(pilotMessage.id),
    });
  });

  const reviews = reviewLog.pilot?.reviews ?? [];
  const validApprovals = new Map();
  reviews.forEach((review, index) => {
    const expected = expectedHashes.get(review.messageId);
    const validRole = ['product-context', 'native-german', 'domain'].includes(review.role);
    if (
      !expected ||
      !validRole ||
      typeof review.reviewer !== 'string' ||
      review.reviewer.length === 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? '') ||
      !['APPROVED', 'CHANGES_REQUESTED'].includes(review.decision)
    ) {
      findings.invalidReviews.push({ index, review });
      return;
    }
    if (
      review.contextHash !== expected.contextHash ||
      review.translationHash !== expected.translationHash
    ) {
      findings.staleReviews.push({
        messageId: review.messageId,
        role: review.role,
        reviewer: review.reviewer,
      });
      return;
    }
    if (review.role === 'native-german' && review.reviewer === reviewLog.pilot.candidateProducer) {
      findings.reviewerIndependenceViolations.push({
        messageId: review.messageId,
        reviewer: review.reviewer,
      });
      return;
    }
    if (review.decision === 'APPROVED') {
      validApprovals.set(`${review.messageId}\0${review.role}`, review);
    }
    (review.findings ?? [])
      .filter(
        ({ severity, status }) => ['Critical', 'Major'].includes(severity) && status !== 'RESOLVED',
      )
      .forEach((finding) => {
        findings.unresolvedCriticalOrMajor.push({
          messageId: review.messageId,
          role: review.role,
          finding,
        });
      });
  });

  pilotMessages.forEach((message) => {
    if (!validApprovals.has(`${message.id}\0product-context`)) {
      findings.missingProductReviews.push({ messageId: message.id });
    }
    if (!validApprovals.has(`${message.id}\0native-german`)) {
      findings.missingNativeGermanReviews.push({ messageId: message.id });
    }
    if (requiresDomainReview(message) && !validApprovals.has(`${message.id}\0domain`)) {
      findings.missingDomainReviews.push({ messageId: message.id });
    }
  });

  sortFindings(findings);
  const findingCounts = Object.fromEntries(
    Object.entries(findings).map(([name, values]) => [name, values.length]),
  );
  const structuralFindingNames = [
    'invalidPilotSize',
    'duplicatePilotIds',
    'unknownPilotIds',
    'blockedPilotContexts',
    'invalidCandidates',
    'placeholderMismatches',
    'chineseCharacters',
    'englishCopies',
    'informalAddress',
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
    pilotCount: pilotMessages.length,
    domainReviewRequiredCount: pilotMessages.filter(requiresDomainReview).length,
    reviewPack: {
      schemaVersion: 'tiangong.i18n-de-pilot-review-pack.v1',
      issue: pilot.issue,
      locale: pilot.locale,
      source: {
        manifest: options.manifest,
        manifestDigest: manifest.source.auditedInputDigest,
        contextLedger: options.ledger,
        contextInputDigest: ledger.source.contextInputDigest,
        pilot: options.pilot,
        pilotDigest: hashJson(pilot),
      },
      policy: {
        candidateOnly: true,
        runtimeActivationAllowed: false,
        reviewEvidenceTarget: options.reviewLog,
        requiredRoles: ['product-context', 'native-german', 'domain-when-listed'],
      },
      summary: {
        messageCount: reviewPackMessages.length,
        domainReviewRequiredCount: pilotMessages.filter(requiresDomainReview).length,
        blockedContextCount: reviewPackMessages.filter(
          ({ context }) => context.status === 'BLOCKED_CONTEXT',
        ).length,
      },
      messages: reviewPackMessages,
    },
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const result = audit(options);
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
    (!fs.existsSync(reviewPackPath) || fs.readFileSync(reviewPackPath, 'utf8') !== reviewPackText);
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
        structuralFindingCount: result.structuralFindingCount,
        reviewFindingCount: result.reviewFindingCount,
        findingCount: result.findingCount,
        findingCounts: result.findingCounts,
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
