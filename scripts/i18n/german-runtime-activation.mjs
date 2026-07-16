#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readCatalogOfflineConfirmation } from './german-offline-review.mjs';
import { readDeltaConfirmation } from './german-runtime-delta-review.mjs';
import {
  ACTIVATION_ENTRY_TRANSLATIONS,
  ACTIVE_LOCALES,
  BASELINE_MESSAGE_COUNT,
  buildRuntimeActivationManifest,
  CANONICAL_MANIFEST,
  DELTA_CONFIRMATION,
  DYNAMIC_FAMILIES,
  extractReviewGateDescriptorEvidence,
  fileDigest,
  FINAL_MESSAGE_COUNT,
  FROZEN_BASELINE_COMMIT,
  FROZEN_CONTEXT_LEDGER,
  FROZEN_REVIEW_PROVENANCE,
  MODIFIED_BASELINE_MESSAGE_IDS,
  NEW_MESSAGE_IDS,
  readJson,
  REVIEW_GATE_FAMILY,
  RUNTIME_ACTIVATION_MANIFEST,
  RUNTIME_ACTIVATION_SCHEMA,
  SOURCE_ALLOWLIST,
} from './german-runtime-policy.mjs';

const require = createRequire(import.meta.url);
const prettier = require('prettier');

const CANONICAL_AUDIT = 'scripts/i18n/audit-locales.mjs';
const FROZEN_CATALOG_CONFIRMATION = '.local/i18n-de-DE/catalog-review-confirmation.md';
const ALLOWED_GERMAN_RUNTIME_LITERALS = new Set(['de', 'de-DE', 'de-de', 'de_DE']);

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    mode: 'enforce',
    write: false,
    check: false,
    manifest: RUNTIME_ACTIVATION_MANIFEST,
    deltaConfirmation: DELTA_CONFIRMATION,
    catalogConfirmation: FROZEN_CATALOG_CONFIRMATION,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') options.write = true;
    else if (argument === '--check') options.check = true;
    else if (
      ['--root', '--mode', '--manifest', '--delta-confirmation', '--catalog-confirmation'].includes(
        argument,
      )
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      const key = {
        '--root': 'root',
        '--mode': 'mode',
        '--manifest': 'manifest',
        '--delta-confirmation': 'deltaConfirmation',
        '--catalog-confirmation': 'catalogConfirmation',
      }[argument];
      options[key] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!['report', 'enforce'].includes(options.mode))
    throw new Error(`Invalid mode ${options.mode}.`);
  if (options.write && options.check) throw new Error('--write and --check cannot be combined.');
  options.root = path.resolve(options.root);
  return options;
}

const sorted = (values) => [...values].sort((left, right) => left.localeCompare(right, 'en'));

const valuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function currentGermanValue(message) {
  return message?.translations?.['de-DE']?.value;
}

function baselineLocaleValue(message, locale) {
  const field = { 'en-US': 'english', 'zh-CN': 'chinese', 'de-DE': 'german' }[locale];
  return message?.[field]?.value;
}

function technicalTokens(value) {
  return new Set(value.match(/\b(?:[A-ZÄÖÜ]{2,}|[A-ZÄÖÜ][A-Z0-9]*(?:-[A-Z0-9]+)+)\b/gu) ?? []);
}

function walkSourceFiles(root, relativeDirectory) {
  const absoluteDirectory = path.resolve(root, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativeEntry = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walkSourceFiles(root, relativeEntry);
    return entry.isFile() && /\.(?:c|m)?[jt]sx?$/u.test(entry.name) ? [relativeEntry] : [];
  });
}

function collectForbiddenBundles(root) {
  const localeRoot = path.resolve(root, 'src/locales');
  return fs
    .readdirSync(localeRoot, { withFileTypes: true })
    .filter((entry) => /^de(?:[-_]|$)/iu.test(entry.name))
    .filter(
      (entry) =>
        !(
          (entry.isDirectory() && entry.name === 'de-DE') ||
          (entry.isFile() && entry.name === 'de-DE.ts')
        ),
    )
    .map((entry) => ({
      path: `src/locales/${entry.name}`,
      reason:
        'Only the canonical src/locales/de-DE.ts bundle and its de-DE leaf directory are allowed.',
    }));
}

function collectForbiddenRuntimeLiterals(root) {
  const literalPattern = /(['"])(de(?:[-_][A-Za-z0-9]+)*)\1/giu;
  return [...walkSourceFiles(root, 'config'), ...walkSourceFiles(root, 'src')]
    .filter((relativeFile) => !relativeFile.startsWith('src/.umi'))
    .filter((relativeFile) => !relativeFile.startsWith('src/locales/'))
    .flatMap((relativeFile) => {
      const source = fs.readFileSync(path.resolve(root, relativeFile), 'utf8');
      const literals = [...source.matchAll(literalPattern)].map((match) => match[2]);
      return sorted(new Set(literals))
        .filter((literal) => !ALLOWED_GERMAN_RUNTIME_LITERALS.has(literal))
        .map((literal) => ({
          path: relativeFile,
          literal,
          reason:
            'Runtime source may name only canonical de-DE plus controlled Ant de_DE and Day.js de adapters; regional inputs belong in normalization tests, not new bundles.',
        }));
    });
}

function verifyFrozenSnapshot(root, runtimeManifest, findings) {
  let resolvedCommit = null;
  try {
    resolvedCommit = execFileSync('git', ['rev-parse', `${FROZEN_BASELINE_COMMIT}^{commit}`], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    execFileSync('git', ['merge-base', '--is-ancestor', FROZEN_BASELINE_COMMIT, 'HEAD'], {
      cwd: root,
      stdio: 'ignore',
    });
  } catch (error) {
    findings.baselineSnapshotMismatches.push({
      sourceCommit: FROZEN_BASELINE_COMMIT,
      reason: 'The immutable Issue #601 source commit must exist and be an ancestor of HEAD.',
    });
  }
  if (resolvedCommit && resolvedCommit !== FROZEN_BASELINE_COMMIT) {
    findings.baselineSnapshotMismatches.push({
      expected: FROZEN_BASELINE_COMMIT,
      actual: resolvedCommit,
    });
  }
  if (runtimeManifest.schemaVersion !== RUNTIME_ACTIVATION_SCHEMA) {
    findings.baselineSnapshotMismatches.push({ reason: 'Runtime activation schema is invalid.' });
  }
  const frozenDigests = runtimeManifest.baseline?.frozenInputDigests ?? {};
  [FROZEN_CONTEXT_LEDGER, ACTIVATION_ENTRY_TRANSLATIONS, FROZEN_REVIEW_PROVENANCE].forEach(
    (relativeFile) => {
      const actual = fileDigest(root, relativeFile);
      if (actual !== frozenDigests[relativeFile]) {
        findings.baselineSnapshotMismatches.push({
          path: relativeFile,
          expected: frozenDigests[relativeFile] ?? null,
          actual,
          reason: 'This tracked #601 baseline input changed after approval.',
        });
      }
    },
  );
}

function verifyActiveInventory(canonicalManifest, frozenLedger, entryArtifact, findings) {
  const canonicalIds = new Set(canonicalManifest.messages.map(({ id }) => id));
  const baselineIds = new Set(frozenLedger.messages.map(({ id }) => id));
  const expectedNew = new Set(NEW_MESSAGE_IDS);
  const actualNew = sorted([...canonicalIds].filter((id) => !baselineIds.has(id)));
  const removedBaseline = sorted([...baselineIds].filter((id) => !canonicalIds.has(id)));
  if (!valuesEqual(actualNew, NEW_MESSAGE_IDS) || removedBaseline.length > 0) {
    findings.deltaInventoryMismatches.push({
      expectedNewMessageIds: NEW_MESSAGE_IDS,
      actualNewMessageIds: actualNew,
      removedBaselineMessageIds: removedBaseline,
    });
  }
  if (baselineIds.size !== BASELINE_MESSAGE_COUNT || canonicalIds.size !== FINAL_MESSAGE_COUNT) {
    findings.deltaInventoryMismatches.push({
      expectedBaselineCount: BASELINE_MESSAGE_COUNT,
      actualBaselineCount: baselineIds.size,
      expectedFinalCount: FINAL_MESSAGE_COUNT,
      actualFinalCount: canonicalIds.size,
    });
  }
  const activeLocales = sorted(Object.keys(canonicalManifest.localeTopology ?? {}));
  if (!valuesEqual(activeLocales, sorted(ACTIVE_LOCALES))) {
    findings.activeLocalePolicyViolations.push({
      expected: ACTIVE_LOCALES,
      actual: activeLocales,
    });
  }
  canonicalManifest.messages.forEach((message) => {
    ACTIVE_LOCALES.forEach((locale) => {
      if (!message.translations?.[locale]) {
        findings.activeLocalePolicyViolations.push({
          messageId: message.id,
          missingLocale: locale,
        });
      }
    });
  });

  const frozenById = new Map(frozenLedger.messages.map((message) => [message.id, message]));
  const currentById = new Map(canonicalManifest.messages.map((message) => [message.id, message]));
  const modified = new Set(MODIFIED_BASELINE_MESSAGE_IDS);
  frozenById.forEach((frozen, id) => {
    const current = currentById.get(id);
    if (!current) return;
    const differences = ACTIVE_LOCALES.filter(
      (locale) => current.translations?.[locale]?.value !== baselineLocaleValue(frozen, locale),
    );
    if (modified.has(id)) {
      if (!differences.includes('de-DE')) {
        findings.baselineMessageMismatches.push({
          messageId: id,
          reason: 'A declared modified baseline message must contain reviewed German delta copy.',
        });
      }
      return;
    }
    if (differences.length > 0) {
      findings.baselineMessageMismatches.push({
        messageId: id,
        changedLocales: differences,
        reason: 'An unchanged #601 baseline value differs from the frozen context ledger.',
      });
    }
  });
  MODIFIED_BASELINE_MESSAGE_IDS.forEach((id) => {
    if (!baselineIds.has(id) || expectedNew.has(id)) {
      findings.deltaInventoryMismatches.push({
        messageId: id,
        reason: 'Invalid modified-baseline id.',
      });
    }
  });

  const entryMessages = entryArtifact.messages ?? {};
  const expectedEntryIds = sorted(Object.keys(entryMessages));
  const actualEntryIds = sorted(
    canonicalManifest.messages
      .filter((message) => message.moduleOwnership?.['de-DE']?.includes('$entry'))
      .map(({ id }) => id),
  );
  if (!valuesEqual(expectedEntryIds, actualEntryIds)) {
    findings.entryAssemblyMismatches.push({ expectedEntryIds, actualEntryIds });
  }
  expectedEntryIds.forEach((id) => {
    const actualValue = currentGermanValue(currentById.get(id));
    if (actualValue !== entryMessages[id]) {
      findings.entryAssemblyMismatches.push({
        messageId: id,
        expected: entryMessages[id],
        actual: actualValue ?? null,
      });
    }
  });
}

function verifyGermanValues(canonicalManifest, allowlist, findings) {
  const emptyMessageIds = new Set(allowlist.emptyMessageIds ?? []);
  const exactEnglishMessageIds = new Set(
    (allowlist.exactEnglishMessages ?? [])
      .filter(
        (entry) =>
          entry?.decision === 'preserve-exact-english' &&
          typeof entry.messageId === 'string' &&
          typeof entry.reason === 'string' &&
          entry.reason.trim() !== '',
      )
      .map(({ messageId }) => messageId),
  );
  const approvedTokens = new Set(
    [...(allowlist.preservedTokens ?? []), ...(allowlist.sourcePatternTokens ?? [])].map(
      ({ token }) => token,
    ),
  );
  const mappedTokens = allowlist.mappedTokens ?? [];

  canonicalManifest.messages.forEach((message) => {
    const english = message.translations?.['en-US']?.value ?? '';
    const german = message.translations?.['de-DE']?.value;
    if (typeof german !== 'string') return;
    const normalized = german.normalize('NFC').trim();
    if (normalized === '' && !emptyMessageIds.has(message.id)) {
      findings.germanValueViolations.push({
        messageId: message.id,
        reason: 'Unexpected empty German value.',
      });
    }
    if (/\p{Script=Han}/u.test(german)) {
      findings.germanValueViolations.push({
        messageId: message.id,
        reason: 'German value contains Han characters.',
      });
    }
    if (
      normalized !== '' &&
      normalized === english.normalize('NFC').trim() &&
      !exactEnglishMessageIds.has(message.id)
    ) {
      findings.germanValueViolations.push({
        messageId: message.id,
        reason: 'Unapproved exact English copy.',
      });
    }
    const englishTokens = technicalTokens(english);
    const germanTokens = technicalTokens(german);
    [...germanTokens]
      .filter((token) => englishTokens.has(token) && !approvedTokens.has(token))
      .forEach((token) => {
        findings.germanValueViolations.push({
          messageId: message.id,
          token,
          reason: 'Unapproved preserved technical token.',
        });
      });
    mappedTokens.forEach((rule) => {
      if (
        englishTokens.has(rule.source) &&
        germanTokens.has(rule.source) &&
        !(rule.messageIdExceptions ?? []).includes(message.id)
      ) {
        findings.germanValueViolations.push({
          messageId: message.id,
          token: rule.source,
          expected: rule.target,
          reason: 'Mapped technical token was not localized.',
        });
      }
    });
  });
}

function verifyReviewGateDescriptorAssembly(root, runtimeManifest, findings) {
  const registry = readJson(root, DYNAMIC_FAMILIES);
  const family = registry.families?.[REVIEW_GATE_FAMILY];
  const extracted = extractReviewGateDescriptorEvidence(root);
  const registeredIds = sorted(family?.keys ?? []);
  const callsites = (registry.callsites ?? [])
    .filter(({ family: familyName }) => familyName === REVIEW_GATE_FAMILY)
    .map(({ api, count, file, expression }) => ({ api, count, file, expression }));
  const expectedCallsites = [
    {
      api: 'formatMessage',
      count: 1,
      file: 'src/pages/Processes/Components/edit.tsx',
      expression: 'message',
    },
  ];
  const manifestEvidence = runtimeManifest.delta?.reviewGateDescriptorEvidence;
  if (
    !family ||
    family.unknownHandling?.kind !== 'closedWorld' ||
    !valuesEqual(registeredIds, extracted.messageIds) ||
    !valuesEqual(callsites, expectedCallsites) ||
    !valuesEqual(manifestEvidence, extracted)
  ) {
    findings.dynamicFamilyAssemblyMismatches.push({
      family: REVIEW_GATE_FAMILY,
      registeredIds,
      extractedDescriptorIds: extracted.messageIds,
      expectedCallsites,
      actualCallsites: callsites,
      unknownHandling: family?.unknownHandling?.kind ?? null,
      reason:
        'The closed review-gate family must exactly equal both runtime descriptor maps and its one audited formatter callsite.',
    });
  }
}

function buildFindings(options, generatedManifest) {
  const findings = {
    staleRuntimeActivationManifest: [],
    canonicalAuditFailures: [],
    baselineSnapshotMismatches: [],
    baselineCatalogConfirmation: [],
    activeLocalePolicyViolations: [],
    baselineMessageMismatches: [],
    deltaInventoryMismatches: [],
    entryAssemblyMismatches: [],
    dynamicFamilyAssemblyMismatches: [],
    germanValueViolations: [],
    deltaReviewConfirmation: [],
    forbiddenGermanBundles: collectForbiddenBundles(options.root),
    forbiddenGermanRuntimeLiterals: collectForbiddenRuntimeLiterals(options.root),
  };
  const manifestPath = path.resolve(options.root, options.manifest);
  const currentManifest = fs.existsSync(manifestPath)
    ? readJson(options.root, options.manifest)
    : null;
  if (!currentManifest || !valuesEqual(currentManifest, generatedManifest)) {
    findings.staleRuntimeActivationManifest.push({
      path: options.manifest,
      reason: 'Run npm run i18n:de:runtime:manifest:write after the final controlled copy change.',
    });
  }

  const canonicalAudit = spawnSync(
    process.execPath,
    [
      path.resolve(options.root, CANONICAL_AUDIT),
      '--root',
      options.root,
      '--mode',
      'enforce',
      '--check',
    ],
    { cwd: options.root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  if (canonicalAudit.status !== 0) {
    findings.canonicalAuditFailures.push({
      status: canonicalAudit.status,
      reason: 'The three-locale canonical topology/ICU/callsite audit must pass.',
      stderr: canonicalAudit.stderr.trim(),
    });
  }

  const canonicalManifest = readJson(options.root, CANONICAL_MANIFEST);
  const frozenLedger = readJson(options.root, FROZEN_CONTEXT_LEDGER);
  const entryArtifact = readJson(options.root, ACTIVATION_ENTRY_TRANSLATIONS);
  const allowlist = readJson(options.root, SOURCE_ALLOWLIST);
  verifyFrozenSnapshot(options.root, generatedManifest, findings);
  verifyActiveInventory(canonicalManifest, frozenLedger, entryArtifact, findings);
  verifyReviewGateDescriptorAssembly(options.root, generatedManifest, findings);
  verifyGermanValues(canonicalManifest, allowlist, findings);

  const catalogReview = readCatalogOfflineConfirmation(
    options.root,
    options.catalogConfirmation,
    frozenLedger,
  );
  if (!catalogReview.approved) {
    findings.baselineCatalogConfirmation.push({
      reason: 'The local #601 full-catalog confirmation is missing, malformed, or stale.',
      details: catalogReview.reasons,
    });
  }
  const deltaReview = readDeltaConfirmation(options.root, options.deltaConfirmation);
  if (!deltaReview.approved) {
    findings.deltaReviewConfirmation.push({
      reason: 'The local Issue #602 delta confirmation is missing, malformed, or stale.',
      details: deltaReview.reasons,
    });
  }
  Object.values(findings).forEach((items) =>
    items.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en')),
  );
  return {
    findings,
    catalogReviewApproved: catalogReview.approved,
    deltaReviewApproved: deltaReview.approved,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedManifest = buildRuntimeActivationManifest(options.root);
  const manifestPath = path.resolve(options.root, options.manifest);
  const manifestText = await prettier.format(JSON.stringify(generatedManifest), {
    ...(await prettier.resolveConfig(manifestPath)),
    filepath: manifestPath,
  });
  if (options.write) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, manifestText);
  }
  const staleManifest =
    !fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== manifestText;
  const { findings, catalogReviewApproved, deltaReviewApproved } = buildFindings(
    options,
    generatedManifest,
  );
  if (!options.check && !staleManifest) findings.staleRuntimeActivationManifest.length = 0;
  const findingCounts = Object.fromEntries(
    Object.entries(findings).map(([name, values]) => [name, values.length]),
  );
  const findingCount = Object.values(findingCounts).reduce((sum, count) => sum + count, 0);
  const result = {
    schemaVersion: RUNTIME_ACTIVATION_SCHEMA,
    locale: 'de-DE',
    mode: options.mode,
    wroteManifest: options.write,
    checkedManifest: options.check,
    staleManifest,
    manifestPath: options.manifest,
    summary: {
      baselineMessageCount: BASELINE_MESSAGE_COUNT,
      newMessageCount: NEW_MESSAGE_IDS.length,
      modifiedBaselineMessageCount: MODIFIED_BASELINE_MESSAGE_IDS.length,
      finalMessageCount: FINAL_MESSAGE_COUNT,
      baselineCatalogReviewApproved: catalogReviewApproved,
      deltaReviewApproved,
      findingCount,
      findingCounts,
    },
    findings,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if ((options.check && staleManifest) || (options.mode === 'enforce' && findingCount > 0)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `German runtime activation audit failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}
