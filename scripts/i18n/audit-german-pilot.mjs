#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import {
  normalizeGithubLogin,
  normalizeGithubUserId,
  normalizeProducerActor,
  producerActorKey,
  verifyGithubHumanReviewEvidence,
} from './github-review-attestation.mjs';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const { analyzeIcuMessage } = require('./icu-message-parser.cjs');

const SCHEMA_VERSION = 'tiangong.i18n-german-pilot-audit.v4';
const DEFAULT_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
const DEFAULT_LEDGER = 'docs/plans/i18n-de-DE/context-ledger.json';
const DEFAULT_PILOT = 'docs/plans/i18n-de-DE/pilot.json';
const DEFAULT_REVIEW_LOG = 'docs/plans/i18n-de-DE/review-log.yaml';
const DEFAULT_REVIEW_PACK = 'docs/plans/i18n-de-DE/pilot-review-pack.json';
const DEFAULT_SOURCE_ALLOWLIST = 'docs/plans/i18n-de-DE/source-allowlist.json';
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

function assignedReviewersFromLog(reviewLog, findings) {
  const roleConfigNames = new Map([
    ['product-context', 'productContextReviewer'],
    ['native-german', 'nativeGermanReviewer'],
    ['domain', 'lcaTidasDomainReviewer'],
  ]);
  const assigned = new Map();
  roleConfigNames.forEach((configName, role) => {
    const config = reviewLog.roles?.[configName];
    const githubLogin = normalizeGithubLogin(config?.githubLogin);
    const githubUserId = normalizeGithubUserId(config?.githubUserId);
    const assignedByGithubUserId = normalizeGithubUserId(config?.assignedByGithubUserId);
    if (
      config?.status === 'assigned' &&
      config?.identityType === 'github-human' &&
      githubLogin !== '' &&
      githubUserId !== '' &&
      normalizeGithubLogin(config?.identity) === githubLogin &&
      normalizeGithubLogin(config?.assignedBy) !== '' &&
      assignedByGithubUserId !== '' &&
      normalizeGithubLogin(config?.assignedBy) !== githubLogin &&
      assignedByGithubUserId !== githubUserId &&
      typeof config?.qualificationEvidence === 'string' &&
      config.qualificationEvidence.trim() !== '' &&
      typeof config?.assignmentAttestationUrl === 'string' &&
      config.assignmentAttestationUrl.trim() !== ''
    ) {
      assigned.set(role, { login: githubLogin, userId: githubUserId });
      return;
    }
    findings.unassignedReviewRoles.push({ role, configName });
  });
  return assigned;
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
  const sourceAllowlist = readJson(options.root, DEFAULT_SOURCE_ALLOWLIST);
  const manifestById = new Map(manifest.messages.map((message) => [message.id, message]));
  const ledgerById = new Map(ledger.messages.map((message) => [message.id, message]));
  const findings = {
    invalidPilotSize: [],
    duplicatePilotIds: [],
    unknownPilotIds: [],
    blockedPilotContexts: [],
    invalidCandidates: [],
    placeholderMismatches: [],
    icuStructureMismatches: [],
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
    staleContextLedger: [],
    staleCanonicalManifest: [],
    blockedGlossaryTerms: [],
    unassignedReviewRoles: [],
    duplicateReviews: [],
    invalidPilotReviewState: [],
    domainRequirementMismatches: [],
    localePolicyViolations: [],
    invalidReviewDomains: [],
    externalHumanReviewEvidence: [],
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
  const assignedReviewers = assignedReviewersFromLog(reviewLog, findings);
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
  if (
    !['pilot-approved', 'bulk-translation-in-progress', 'translation-approved'].includes(
      reviewLog.status,
    ) ||
    reviewLog.pilot?.status !== 'approved-for-bulk-translation'
  ) {
    findings.invalidPilotReviewState.push({
      status: reviewLog.status ?? null,
      pilotStatus: reviewLog.pilot?.status ?? null,
      requiredStatus: 'pilot-approved or a later delivery state / approved-for-bulk-translation',
    });
  }
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
          typeof entry.reviewedBy === 'string' &&
          entry.reviewedBy.trim() !== '' &&
          [...assignedReviewers.values()].some(
            ({ login }) => login === normalizeGithubLogin(entry.reviewedBy),
          ) &&
          /^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedAt ?? ''),
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
      findings.blockedPilotContexts.push({ messageId: pilotMessage.id });
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
    expectedHashes.set(pilotMessage.id, {
      contextHash,
      translationHash,
      domainReviewRequired: authoritativeDomainReview,
      reviewScopeHash: hashJson({
        schemaVersion: 'tiangong.i18n-de-pilot-review-scope.v4',
        contextHash,
        translationHash,
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
      hashes: expectedHashes.get(pilotMessage.id),
    });
  });

  const reviews = reviewLog.pilot?.reviews ?? [];
  const validApprovals = new Map();
  const reviewGroups = new Map();
  reviews.forEach((review, index) => {
    const key = `${review?.messageId}\0${review?.role}`;
    if (!reviewGroups.has(key)) reviewGroups.set(key, []);
    reviewGroups.get(key).push({ review, index });
  });
  reviewGroups.forEach((records, key) => {
    if (records.length > 1) {
      const [messageId, role] = key.split('\0');
      findings.duplicateReviews.push({ messageId, role, count: records.length });
    }
  });
  reviewGroups.forEach((records) => {
    if (records.length !== 1) return;
    const { review, index } = records[0];
    const expected = expectedHashes.get(review.messageId);
    const validRole = ['product-context', 'native-german', 'domain'].includes(review.role);
    const reviewer = normalizeGithubLogin(review.reviewer);
    const findingsAreValid =
      Array.isArray(review.findings) &&
      review.findings.every(
        (finding) =>
          finding &&
          ['Critical', 'Major', 'Minor'].includes(finding.severity) &&
          ['OPEN', 'RESOLVED'].includes(finding.status) &&
          typeof finding.summary === 'string' &&
          finding.summary.trim() !== '',
      );
    if (
      !expected ||
      !validRole ||
      reviewer === '' ||
      reviewer !== assignedReviewers.get(review.role)?.login ||
      !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? '') ||
      !['APPROVED', 'CHANGES_REQUESTED'].includes(review.decision) ||
      !findingsAreValid
    ) {
      findings.invalidReviews.push({ index, review });
      return;
    }
    if (
      review.contextHash !== expected.contextHash ||
      review.translationHash !== expected.translationHash ||
      review.reviewScopeHash !== expected.reviewScopeHash
    ) {
      findings.staleReviews.push({
        messageId: review.messageId,
        role: review.role,
        reviewer: review.reviewer,
      });
      return;
    }
    if (
      `github-human:${assignedReviewers.get(review.role)?.userId ?? ''}` ===
      producerActorKey(candidateProducer)
    ) {
      findings.reviewerIndependenceViolations.push({
        messageId: review.messageId,
        role: review.role,
        reviewer: review.reviewer,
      });
      return;
    }
    if (
      review.decision === 'APPROVED' &&
      review.findings.every(({ status }) => status === 'RESOLVED')
    ) {
      validApprovals.set(`${review.messageId}\0${review.role}`, review);
    }
    review.findings
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

  const pilotUnresolvedFindings = reviewLog.pilot?.unresolvedFindings ?? [];
  if (!Array.isArray(pilotUnresolvedFindings)) {
    findings.invalidReviews.push({ reason: 'pilot.unresolvedFindings must be an array.' });
  } else {
    pilotUnresolvedFindings.forEach((finding, index) => {
      if (
        !finding ||
        !['Critical', 'Major', 'Minor'].includes(finding.severity) ||
        !['OPEN', 'RESOLVED'].includes(finding.status) ||
        typeof finding.summary !== 'string' ||
        finding.summary.trim() === ''
      ) {
        findings.invalidReviews.push({
          source: 'pilot.unresolvedFindings',
          index,
          finding,
        });
        return;
      }
      if (['Critical', 'Major'].includes(finding.severity) && finding.status !== 'RESOLVED') {
        findings.unresolvedCriticalOrMajor.push({ source: 'pilot', finding });
      }
    });
  }

  pilotMessages.forEach((message) => {
    if (!validApprovals.has(`${message.id}\0product-context`)) {
      findings.missingProductReviews.push({ messageId: message.id });
    }
    if (!validApprovals.has(`${message.id}\0native-german`)) {
      findings.missingNativeGermanReviews.push({ messageId: message.id });
    }
    if (
      expectedHashes.get(message.id)?.domainReviewRequired &&
      !validApprovals.has(`${message.id}\0domain`)
    ) {
      findings.missingDomainReviews.push({ messageId: message.id });
    }
  });

  const externalEvidence = await verifyGithubHumanReviewEvidence({
    reviewLog,
    scope: 'pilot',
    requiredRoles: ['product-context', 'native-german', 'domain'],
    recordsByRole: new Map(
      ['product-context', 'native-german', 'domain'].map((role) => [
        role,
        reviews.filter((review) => review.role === role),
      ]),
    ),
    contextDigest: {
      manifestDigest: manifest.source.auditedInputDigest,
      reviewPolicyDigest: ledger.source.reviewPolicyDigest,
      pilotDigest: hashJson(pilot),
      candidateProducer,
      messages: [...expectedHashes]
        .map(([messageId, hashes]) => ({ messageId, ...hashes }))
        .sort((left, right) => left.messageId.localeCompare(right.messageId, 'en')),
    },
    producerActors: [candidateProducer],
  });
  findings.externalHumanReviewEvidence.push(...externalEvidence.findings);

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
    domainReviewRequiredCount: [...expectedHashes.values()].filter(
      ({ domainReviewRequired }) => domainReviewRequired,
    ).length,
    reviewPack: {
      schemaVersion: 'tiangong.i18n-de-pilot-review-pack.v4',
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
        reviewEvidenceTarget: options.reviewLog,
        requiredRoles: ['product-context', 'native-german', 'domain-when-ledger-or-pilot-requires'],
        reviewerIdentitySource: `${options.reviewLog} roles`,
        approvalHashRule:
          'Every review pins contextHash, translationHash, and reviewScopeHash. Duplicate decisions are invalid.',
        candidateProducer,
      },
      reviewAttestationRequirements: externalEvidence.requirements,
      summary: {
        messageCount: reviewPackMessages.length,
        domainReviewRequiredCount: [...expectedHashes.values()].filter(
          ({ domainReviewRequired }) => domainReviewRequired,
        ).length,
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
