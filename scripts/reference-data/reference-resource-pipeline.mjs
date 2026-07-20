import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as prettier from 'prettier';

export const PIPELINE_VERSION = '1';
export const OFFICIAL_SOURCE_AUDIT_SCHEMA_VERSION = 1;
export const PROJECT_REVIEW_SCHEMA_VERSION = 2;
export const PROJECT_REVIEW_POLICY_VERSION = 'reference-project-review-v1';
export const SOURCE_PROVENANCE_REVIEW_POLICY_VERSION = 'reference-source-provenance-review-v1';

const MANIFEST_PATH = 'src/services/referenceResources/reference-resource-manifest.json';
const GENERATED_MANIFEST_PATH = 'src/services/referenceResources/generatedManifest.ts';

const DELIVERY_STATUSES = new Set([
  'legacy-unverified',
  'official',
  'official-crosswalk',
  'project-translated',
  'project-reviewed',
]);
const NON_NATIVE_STATUSES = new Set(['development-base', 'missing']);

const PRODUCTION_CLEARANCE_SCOPE_PROFILES = Object.freeze({
  'classification-redistribution-translation': Object.freeze({
    conditions: Object.freeze([]),
    uses: Object.freeze([
      'public-production-deployment',
      'redistribution',
      'translation-and-derivative-works',
    ]),
  }),
  'ef-reference-file-reuse': Object.freeze({
    conditions: Object.freeze([
      'attribution-required',
      'modification-notice-required',
      'project-extensions-separately-identified',
    ]),
    uses: Object.freeze(['file-level-reuse', 'public-production-deployment']),
  }),
});

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const deterministicGzip = (value) => {
  const gzip = gzipSync(value, { level: 9, mtime: 0 });
  gzip.writeUInt32LE(0, 4);
  gzip[9] = 255;
  return gzip;
};

const stableValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
};

export const stableJson = (value, pretty = false) =>
  `${JSON.stringify(stableValue(value), null, pretty ? 2 : undefined)}${pretty ? '\n' : ''}`;

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  return value === null || value === undefined ? [] : [value];
};

const requireNonBlank = (value, description) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${description} must be a non-blank string.`);
  }
  return value;
};

const validateOrderedUniqueStrings = (value, description, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${description} must be ${allowEmpty ? 'an' : 'a non-empty'} array.`);
  }
  value.forEach((item, index) => requireNonBlank(item, `${description}[${index}]`));
  const canonical = [...new Set(value)].sort();
  if (stableJson(value) !== stableJson(canonical)) {
    throw new Error(`${description} must contain unique strings in sorted order.`);
  }
  return value;
};

const getDigestedExternalSourceComponents = (resource) =>
  asArray(resource?.structureSource?.sourceComponents).filter(
    ({ digest }) => digest !== null && digest !== undefined,
  );

const getDigestedExternalSourceScopes = (resource) =>
  getDigestedExternalSourceComponents(resource)
    .map(({ digest }) => digest?.scope)
    .sort();

const getOfficialSecondaryMappingIds = (resource) =>
  asArray(resource?.officialSecondaryMappings)
    .map(({ mappingId }) => mappingId)
    .sort();

const validateOfficialSecondaryMappingProductionClearance = (resource, requirementSourceScopes) => {
  const externalComponents = getDigestedExternalSourceComponents(resource);
  const seenMappingIds = new Set();
  for (const mapping of asArray(resource?.officialSecondaryMappings)) {
    const description = `${resource.resourceId}/${mapping?.mappingId ?? 'secondary-mapping'} production clearance`;
    const mappingId = requireNonBlank(mapping?.mappingId, `${description} mappingId`);
    if (seenMappingIds.has(mappingId)) {
      throw new Error(
        `${resource.resourceId} has duplicate official secondary mapping ${mappingId}.`,
      );
    }
    seenMappingIds.add(mappingId);

    const rawResponseDigest = mapping?.rawResponseDigest;
    const matchingComponents = externalComponents.filter(
      ({ digest }) => stableJson(digest) === stableJson(rawResponseDigest),
    );
    if (matchingComponents.length !== 1) {
      throw new Error(
        `${description} rawResponseDigest must exactly match one digested external source component.`,
      );
    }
    if (!requirementSourceScopes.includes(rawResponseDigest.scope)) {
      throw new Error(
        `${description} raw response scope ${rawResponseDigest.scope} is not covered by clearanceRequirements.`,
      );
    }
    if (mapping?.usageTerms?.productionStatus !== 'ready') {
      throw new Error(
        `${description} usage terms are not explicitly approved for production (${mapping?.usageTerms?.productionStatus ?? 'missing'}).`,
      );
    }
  }
};

export const validateProjectReviewedOfficialAvailability = (resource) => {
  const projectReviewedLocales = Object.entries(resource?.overlays ?? {})
    .filter(([, overlay]) => overlay?.status === 'project-reviewed')
    .map(([locale]) => locale)
    .sort();
  if (projectReviewedLocales.length === 0) {
    return;
  }

  const description = `${resource.resourceId} project-reviewed official availability`;
  const availability = resource?.officialAvailability;
  if (availability?.schemaVersion !== 1) {
    throw new Error(`${description} schemaVersion must be 1.`);
  }
  if (availability?.release !== resource?.edition?.value) {
    throw new Error(`${description} release must match the verified resource edition.`);
  }
  if (availability?.retrievedAt !== resource?.structureSource?.retrievedAt) {
    throw new Error(`${description} retrievedAt must match the frozen structure-source audit.`);
  }
  const sourceUrl = requireNonBlank(availability?.sourceUrl, `${description} sourceUrl`);
  const allowedSourceUrls = new Set([
    ...asArray(resource?.structureSource?.sourceComponents).map(({ sourceUrl: value }) => value),
    ...asArray(resource?.officialSecondaryMappings).map(({ sourceUrl: value }) => value),
  ]);
  if (!/^https:\/\//u.test(sourceUrl) || !allowedSourceUrls.has(sourceUrl)) {
    throw new Error(`${description} sourceUrl must name a declared HTTPS release source.`);
  }

  const expectedSourceScopes = getDigestedExternalSourceScopes(resource);
  const actualSourceScopes = validateOrderedUniqueStrings(
    availability?.sourceComponentScopes,
    `${description} sourceComponentScopes`,
  );
  if (stableJson(actualSourceScopes) !== stableJson(expectedSourceScopes)) {
    throw new Error(
      `${description} sourceComponentScopes must exactly bind every digested external source component.`,
    );
  }

  const expectedMappingIds = getOfficialSecondaryMappingIds(resource);
  const actualMappingIds = validateOrderedUniqueStrings(
    availability?.officialSecondaryMappingIds,
    `${description} officialSecondaryMappingIds`,
    { allowEmpty: true },
  );
  if (stableJson(actualMappingIds) !== stableJson(expectedMappingIds)) {
    throw new Error(
      `${description} officialSecondaryMappingIds must exactly bind every secondary mapping.`,
    );
  }

  const actualDecisionLocales = Object.keys(availability?.localeDecisions ?? {}).sort();
  if (stableJson(actualDecisionLocales) !== stableJson(projectReviewedLocales)) {
    throw new Error(
      `${description} localeDecisions must exactly cover project-reviewed locales ${projectReviewedLocales.join(', ')}.`,
    );
  }
  for (const locale of projectReviewedLocales) {
    const decision = availability.localeDecisions[locale];
    if (decision?.locale !== locale || decision?.status !== 'official-unavailable') {
      throw new Error(
        `${description} ${locale} must be an explicit locale-bound official-unavailable decision.`,
      );
    }
    requireNonBlank(decision?.note, `${description} ${locale} note`);
  }
};

export const validateProductionClearanceEvidence = (resource) => {
  const usageTerms = resource?.structureSource?.usageTerms;
  if (usageTerms?.status !== 'production-cleared') {
    return;
  }

  const description = `${resource.resourceId} production clearance`;
  const requirements = usageTerms.clearanceRequirements;
  const profile = PRODUCTION_CLEARANCE_SCOPE_PROFILES[requirements?.profile];
  if (!profile) {
    throw new Error(`${description} must name a supported clearanceRequirements.profile.`);
  }
  const requirementSourceScopes = validateOrderedUniqueStrings(
    requirements?.sourceComponentScopes,
    `${description} clearanceRequirements.sourceComponentScopes`,
  );
  validateOrderedUniqueStrings(requirements?.uses, `${description} clearanceRequirements.uses`);
  validateOrderedUniqueStrings(
    requirements?.conditions,
    `${description} clearanceRequirements.conditions`,
    { allowEmpty: true },
  );
  if (
    stableJson(requirements.uses) !== stableJson(profile.uses) ||
    stableJson(requirements.conditions) !== stableJson(profile.conditions)
  ) {
    throw new Error(
      `${description} clearanceRequirements must exactly implement profile ${requirements.profile}.`,
    );
  }

  const digestedSourceScopes = getDigestedExternalSourceScopes(resource);
  validateOrderedUniqueStrings(
    digestedSourceScopes,
    `${description} digested external source component scopes`,
  );
  if (stableJson(requirementSourceScopes) !== stableJson(digestedSourceScopes)) {
    throw new Error(
      `${description} clearanceRequirements.sourceComponentScopes must exactly cover every digested external source component.`,
    );
  }
  validateOfficialSecondaryMappingProductionClearance(resource, requirementSourceScopes);

  const evidence = usageTerms.evidence;
  if (evidence?.schemaVersion !== 1) {
    throw new Error(`${description} evidence.schemaVersion must be 1.`);
  }
  if (evidence?.type !== 'product-owner-attestation') {
    throw new Error(`${description} evidence.type must be product-owner-attestation.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(evidence?.date ?? '')) {
    throw new Error(`${description} evidence.date must be an ISO date.`);
  }
  const evidenceUrl = requireNonBlank(evidence?.url, `${description} evidence.url`);
  if (!/^https:\/\//u.test(evidenceUrl)) {
    throw new Error(`${description} evidence.url must be an HTTPS URL.`);
  }
  if (evidence?.resourceId !== resource.resourceId) {
    throw new Error(`${description} evidence.resourceId must match the resource.`);
  }
  if (evidence?.edition !== resource.edition?.value) {
    throw new Error(`${description} evidence.edition must match the verified edition.`);
  }
  requireNonBlank(evidence?.note, `${description} evidence.note`);
  if (stableJson(evidence?.scope) !== stableJson(requirements)) {
    throw new Error(`${description} evidence.scope must exactly match clearanceRequirements.`);
  }
};

const labelRecord = (key, assertion, node, property) => ({
  key,
  assertion,
  baseLabel: requireNonBlank(node[property], `${key} ${property}`),
  applyLabel: (label) => {
    node[property] = label;
  },
});

const walkCategoryNodes = (nodes, parentKey, records) => {
  asArray(nodes).forEach((node, index) => {
    const key = parentKey ? `${parentKey}/category[${index}]` : `category[${index}]`;
    const id = requireNonBlank(node?.['@id'], `${key} @id`);
    records.push(labelRecord(key, { id }, node, '@name'));
    walkCategoryNodes(node.category, key, records);
  });
};

const enumerateTreeLabels = (document) => {
  const sections = asArray(document?.CategorySystem?.categories);
  if (sections.length !== 1) {
    throw new Error(
      `Tree resource must contain exactly one categories section; got ${sections.length}.`,
    );
  }
  const records = [];
  walkCategoryNodes(sections[0]?.category, '', records);
  return records;
};

const enumerateDataTypeLabels = (document) => {
  const sections = asArray(document?.CategorySystem?.categories);
  const occurrences = new Map();
  const records = [];
  sections.forEach((section, index) => {
    const dataType = requireNonBlank(section?.['@dataType'], `categories[${index}] @dataType`);
    const occurrence = occurrences.get(dataType) ?? 0;
    occurrences.set(dataType, occurrence + 1);
    const key = `categories[${index}:${dataType}#${occurrence}]`;
    walkCategoryNodes(section.category, key, records);
  });
  return records;
};

const enumerateLocationLabels = (document) => {
  const locations = asArray(document?.ILCDLocations?.location);
  return locations.map((node, index) => {
    const code = requireNonBlank(node?.['@value'], `location[${index}] @value`);
    return labelRecord(`location:${code}`, { code }, node, '#text');
  });
};

export const enumerateLabels = (document, identityStrategy) => {
  const records =
    identityStrategy === 'tree-index-path-with-id-assertion'
      ? enumerateTreeLabels(document)
      : identityStrategy === 'data-type-index-path-occurrence-with-id-assertion'
        ? enumerateDataTypeLabels(document)
        : identityStrategy === 'location-code'
          ? enumerateLocationLabels(document)
          : (() => {
              throw new Error(`Unsupported identity strategy: ${identityStrategy}`);
            })();

  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.key)) {
      throw new Error(`Duplicate base identity key: ${record.key}`);
    }
    seen.add(record.key);
  }
  return records;
};

const sameAssertion = (left, right) => stableJson(left) === stableJson(right);

export const applyOverlay = (baseDocument, identityStrategy, overlay) => {
  const output = structuredClone(baseDocument);
  const records = enumerateLabels(output, identityStrategy);
  const recordsByKey = new Map(records.map((record) => [record.key, record]));
  const seen = new Set();
  let blank = 0;
  let extra = 0;
  let duplicate = 0;

  for (const item of asArray(overlay?.labels)) {
    const key = typeof item?.key === 'string' ? item.key : '';
    if (seen.has(key)) {
      duplicate += 1;
      continue;
    }
    seen.add(key);
    const record = recordsByKey.get(key);
    if (!record) {
      extra += 1;
      continue;
    }
    if (!sameAssertion(record.assertion, item.assertion)) {
      throw new Error(
        `${overlay.resourceId}/${overlay.locale} assertion mismatch at ${key}: expected ${stableJson(record.assertion)}, received ${stableJson(item.assertion)}.`,
      );
    }
    if (typeof item.label !== 'string' || item.label.trim() === '') {
      blank += 1;
      continue;
    }
    record.applyLabel(item.label);
  }

  const coverage = {
    expected: records.length,
    translated: records.filter(({ key }) => seen.has(key)).length - blank,
    blank,
    extra,
    duplicate,
  };
  coverage.missing = coverage.expected - coverage.translated;

  if (coverage.blank || coverage.extra || coverage.duplicate || coverage.missing) {
    throw new Error(
      `${overlay.resourceId}/${overlay.locale} overlay coverage failed: ${stableJson(coverage)}.`,
    );
  }
  return { document: output, coverage };
};

export const validateDataTypeNames = (canonicalDataTypes, dataTypeNames, description) => {
  const actual = Object.keys(dataTypeNames ?? {}).sort();
  const expected = [...canonicalDataTypes].sort();
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(
      `${description} dataTypeNames must exactly cover canonicalDataTypes: expected ${expected.join(', ')}, received ${actual.join(', ')}.`,
    );
  }
  for (const dataType of canonicalDataTypes) {
    requireNonBlank(dataTypeNames[dataType], `${description} dataTypeNames.${dataType}`);
  }
  const values = Object.values(dataTypeNames);
  if (new Set(values).size !== values.length) {
    throw new Error(`${description} dataTypeNames must be one-to-one.`);
  }
};

export const validateBaseDataTypes = (canonicalDataTypes, document, description) => {
  const canonical = new Set(canonicalDataTypes);
  for (const [index, section] of asArray(document?.CategorySystem?.categories).entries()) {
    const dataType = requireNonBlank(
      section?.['@dataType'],
      `${description} categories[${index}] @dataType`,
    );
    if (!canonical.has(dataType)) {
      throw new Error(
        `${description} categories[${index}] uses non-canonical data type ${dataType}.`,
      );
    }
  }
};

const applyDataTypeNames = (document, dataTypeNames) => {
  const sections = asArray(document?.CategorySystem?.categories);
  for (const section of sections) {
    const canonicalDataType = section?.['@dataType'];
    if (typeof canonicalDataType === 'string' && dataTypeNames[canonicalDataType]) {
      section['@dataType'] = dataTypeNames[canonicalDataType];
    }
  }
};

const readJson = (repoRoot, path) => JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));

const readJsonWithBytes = (repoRoot, path) => {
  const bytes = readFileSync(resolve(repoRoot, path));
  return { bytes, data: JSON.parse(bytes.toString('utf8')) };
};

const canonicalStructure = (records) => records.map(({ key, assertion }) => ({ key, assertion }));

const canonicalLabels = (records) =>
  records.map(({ key, assertion, baseLabel }) => ({ key, assertion, label: baseLabel }));

const canonicalDigest = (value, scope, identityCount) => ({
  algorithm: 'sha256',
  value: sha256(stableJson(value)),
  scope,
  identityCount,
});

const assertCanonicalDigest = (actual, expected, description) => {
  if (!sameAssertion(actual, expected)) {
    throw new Error(
      `${description} differs: expected ${stableJson(expected)}, received ${stableJson(actual)}.`,
    );
  }
};

const getRuntimeFileName = (resource, locale, jsonDigest) =>
  `${resource.runtime.fileStem}.${jsonDigest.slice(0, 16)}${
    locale === resource.baseLocale ? '' : `_${locale}`
  }.min.json.gz`;

const validateLocaleClosure = (resource, supportedLanguages) => {
  const declared = Object.keys(resource.overlays).sort();
  const supported = [...supportedLanguages].sort();
  if (stableJson(declared) !== stableJson(supported)) {
    throw new Error(
      `${resource.resourceId} locale closure differs from CONTENT_LANGUAGE_REGISTRY: expected ${supported.join(', ')}, received ${declared.join(', ')}.`,
    );
  }
  if (!DELIVERY_STATUSES.has(resource.overlays[resource.baseLocale]?.status)) {
    throw new Error(`${resource.resourceId} base locale ${resource.baseLocale} must be native.`);
  }
};

export const validateProvenance = (resource) => {
  requireNonBlank(resource.edition?.value, `${resource.resourceId} edition.value`);
  requireNonBlank(resource.edition?.note, `${resource.resourceId} edition.note`);
  if (resource.edition?.verificationStatus !== 'verified') {
    throw new Error(`${resource.resourceId} edition must be verified.`);
  }

  const source = resource.structureSource;
  requireNonBlank(source?.authority, `${resource.resourceId} structureSource.authority`);
  if (source?.verificationStatus !== 'verified') {
    throw new Error(`${resource.resourceId} structure source must be verified.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(source?.retrievedAt ?? '')) {
    throw new Error(`${resource.resourceId} structureSource.retrievedAt must be an ISO date.`);
  }
  const sourceComponents = asArray(source?.sourceComponents);
  if (sourceComponents.length === 0) {
    throw new Error(`${resource.resourceId} needs at least one source component.`);
  }
  const digestedComponents = sourceComponents.filter(
    ({ digest }) => digest !== null && digest !== undefined,
  );
  if (digestedComponents.length === 0) {
    throw new Error(`${resource.resourceId} needs at least one digested source component.`);
  }
  for (const [index, component] of digestedComponents.entries()) {
    requireNonBlank(
      component.sourceUrl,
      `${resource.resourceId} digested sourceComponents[${index}].sourceUrl`,
    );
    requireNonBlank(
      component.digest?.scope,
      `${resource.resourceId} sourceComponents[${index}].digest.scope`,
    );
    if (
      component.digest?.algorithm !== 'sha256' ||
      !/^[a-f0-9]{64}$/u.test(component.digest?.value ?? '') ||
      !Number.isInteger(component.digest?.byteLength) ||
      component.digest.byteLength <= 0
    ) {
      throw new Error(
        `${resource.resourceId} sourceComponents[${index}] needs a SHA-256 digest and positive byteLength.`,
      );
    }
  }
  if (
    !source?.sourceUrl &&
    !sourceComponents.some(
      ({ sourceUrl }) => typeof sourceUrl === 'string' && sourceUrl.trim() !== '',
    )
  ) {
    throw new Error(`${resource.resourceId} needs an official source URL.`);
  }
  requireNonBlank(source?.usageTerms?.status, `${resource.resourceId} usageTerms.status`);
  requireNonBlank(source?.usageTerms?.note, `${resource.resourceId} usageTerms.note`);
  requireNonBlank(source?.usageTerms?.url, `${resource.resourceId} usageTerms.url`);
  validateProductionClearanceEvidence(resource);
  validateProjectReviewedOfficialAvailability(resource);
};

const validateOverlayEnvelope = (resource, locale, overlay, overlayData) => {
  if (overlayData.schemaVersion !== 1) {
    throw new Error(`${resource.resourceId}/${locale} overlay schemaVersion must be 1.`);
  }
  if (overlayData.resourceId !== resource.resourceId || overlayData.locale !== locale) {
    throw new Error(
      `${resource.resourceId}/${locale} overlay identity does not match its manifest entry.`,
    );
  }
  if (overlayData.deliveryStatus !== overlay.status) {
    throw new Error(
      `${resource.resourceId}/${locale} overlay deliveryStatus ${overlayData.deliveryStatus} differs from manifest status ${overlay.status}.`,
    );
  }
  if (overlay.status === 'project-reviewed' && !overlay.evidence?.reviewFile) {
    throw new Error(
      `${resource.resourceId}/${locale} project-reviewed overlay needs a reviewFile.`,
    );
  }
};

const validateDeliveryEvidence = (resource, locale, overlay) => {
  const description = `${resource.resourceId}/${locale}`;
  if (overlay.evidence?.generatorVersion !== PIPELINE_VERSION) {
    throw new Error(`${description} evidence must name generator version ${PIPELINE_VERSION}.`);
  }
  if (asArray(overlay.evidence?.sources).length === 0) {
    throw new Error(`${description} needs delivery source evidence.`);
  }
  if (!asArray(overlay.evidence?.tests).includes('npm run reference-data:check')) {
    throw new Error(`${description} evidence must include npm run reference-data:check.`);
  }
};

const validateReviewRecordClosure = (resource, locale, baseRecords, overlayData, reviewData) => {
  const expectedByKey = new Map(baseRecords.map((record) => [record.key, record]));
  const overlayByKey = new Map(overlayData.labels.map((item) => [item.key, item]));
  const seen = new Set();
  const reviewByKey = new Map();
  let blank = 0;
  let extra = 0;
  let duplicate = 0;
  for (const item of asArray(reviewData.records)) {
    const key = typeof item?.key === 'string' ? item.key : '';
    if (seen.has(key)) {
      duplicate += 1;
      continue;
    }
    seen.add(key);
    const expected = expectedByKey.get(key);
    if (!expected) {
      extra += 1;
      continue;
    }
    if (!sameAssertion(expected.assertion, item.assertion)) {
      throw new Error(`${resource.resourceId}/${locale} review assertion mismatch at ${key}.`);
    }
    if (item.decision !== 'accepted' && item.decision !== 'corrected') {
      throw new Error(`${resource.resourceId}/${locale} review decision is invalid at ${key}.`);
    }
    if (typeof item.finalLabel !== 'string' || item.finalLabel.trim() === '') {
      blank += 1;
      continue;
    }
    if (overlayByKey.get(key)?.label !== item.finalLabel) {
      throw new Error(
        `${resource.resourceId}/${locale} review finalLabel differs from the runtime overlay at ${key}.`,
      );
    }
    reviewByKey.set(key, item);
  }
  const coverage = {
    expected: baseRecords.length,
    reviewed: seen.size - blank - extra,
    blank,
    extra,
    duplicate,
  };
  coverage.missing = coverage.expected - coverage.reviewed;
  if (coverage.blank || coverage.extra || coverage.duplicate || coverage.missing) {
    throw new Error(
      `${resource.resourceId}/${locale} review coverage failed: ${stableJson(coverage)}.`,
    );
  }

  return baseRecords.map(({ key }) => reviewByKey.get(key));
};

const validateProjectTranslationReview = (
  resource,
  locale,
  baseRecords,
  orderedReviewRecords,
  reviewData,
) => {
  const description = `${resource.resourceId}/${locale} project review`;
  if (reviewData.policyVersion !== PROJECT_REVIEW_POLICY_VERSION) {
    throw new Error(`${description} policyVersion must be ${PROJECT_REVIEW_POLICY_VERSION}.`);
  }

  const translationRunId = requireNonBlank(
    reviewData.translationRun?.runId,
    `${description} translationRun.runId`,
  );
  const reviewRunId = requireNonBlank(
    reviewData.reviewRun?.runId,
    `${description} reviewRun.runId`,
  );
  if (translationRunId === reviewRunId) {
    throw new Error(`${description} translation and review run IDs must be independent.`);
  }
  requireNonBlank(reviewData.translationRun?.model, `${description} translationRun.model`);
  requireNonBlank(reviewData.reviewRun?.model, `${description} reviewRun.model`);

  const candidates = [];
  const findings = [];
  const corrections = [];
  const finalLabels = [];
  for (const [index, item] of orderedReviewRecords.entries()) {
    const baseRecord = baseRecords[index];
    let candidateLabel;
    if (item.decision === 'corrected') {
      candidateLabel = requireNonBlank(
        item.candidateLabel,
        `${description} corrected candidateLabel at ${item.key}`,
      );
      if (candidateLabel === item.finalLabel) {
        throw new Error(
          `${description} corrected candidateLabel must differ from finalLabel at ${item.key}.`,
        );
      }
      corrections.push({
        key: item.key,
        assertion: item.assertion,
        candidateLabel,
        finalLabel: item.finalLabel,
      });
    } else {
      if (Object.hasOwn(item, 'candidateLabel')) {
        throw new Error(
          `${description} accepted record must reconstruct its candidate from finalLabel at ${item.key}.`,
        );
      }
      candidateLabel = item.finalLabel;
    }
    candidates.push({
      key: item.key,
      assertion: baseRecord.assertion,
      label: candidateLabel,
    });
    findings.push({ key: item.key, assertion: baseRecord.assertion, decision: item.decision });
    finalLabels.push({
      key: item.key,
      assertion: baseRecord.assertion,
      label: item.finalLabel,
    });
  }

  const candidateDigest = canonicalDigest(
    candidates,
    'ordered-translation-candidate-labels',
    candidates.length,
  );
  const findingsDigest = canonicalDigest(
    findings,
    'ordered-independent-review-findings',
    findings.length,
  );
  const correctionsDigest = canonicalDigest(
    corrections,
    'ordered-independent-review-corrections',
    corrections.length,
  );
  const finalDigest = canonicalDigest(
    finalLabels,
    'ordered-project-reviewed-final-labels',
    finalLabels.length,
  );
  assertCanonicalDigest(
    reviewData.translationRun.outputCandidateDigest,
    candidateDigest,
    `${description} translation candidate digest`,
  );
  assertCanonicalDigest(
    reviewData.reviewRun.inputCandidateDigest,
    candidateDigest,
    `${description} review input candidate digest`,
  );
  assertCanonicalDigest(
    reviewData.reviewRun.findingsDigest,
    findingsDigest,
    `${description} findings digest`,
  );
  assertCanonicalDigest(
    reviewData.reviewRun.correctionsDigest,
    correctionsDigest,
    `${description} corrections digest`,
  );
  assertCanonicalDigest(
    reviewData.reviewRun.finalDigest,
    finalDigest,
    `${description} final-label digest`,
  );
};

const validateSourceProvenanceReview = (
  resource,
  locale,
  orderedReviewRecords,
  reviewData,
  officialSourceAudit,
) => {
  const description = `${resource.resourceId}/${locale} source-provenance review`;
  if (reviewData.policyVersion !== SOURCE_PROVENANCE_REVIEW_POLICY_VERSION) {
    throw new Error(
      `${description} policyVersion must be ${SOURCE_PROVENANCE_REVIEW_POLICY_VERSION}.`,
    );
  }
  if (!officialSourceAudit) {
    throw new Error(`${description} needs a validated official source audit.`);
  }
  assertCanonicalDigest(
    reviewData.sourceAuditBinding,
    officialSourceAudit.binding,
    `${description} sourceAuditBinding`,
  );
  if (orderedReviewRecords.some(({ decision }) => decision !== 'accepted')) {
    throw new Error(`${description} records must use accepted decisions.`);
  }
};

export const validateReview = (
  resource,
  locale,
  baseRecords,
  overlayData,
  reviewData,
  officialSourceAudit,
) => {
  if (
    reviewData?.schemaVersion !== PROJECT_REVIEW_SCHEMA_VERSION ||
    reviewData.resourceId !== resource.resourceId ||
    reviewData.locale !== locale
  ) {
    throw new Error(
      `${resource.resourceId}/${locale} review identity or schemaVersion is invalid.`,
    );
  }
  const orderedReviewRecords = validateReviewRecordClosure(
    resource,
    locale,
    baseRecords,
    overlayData,
    reviewData,
  );
  if (reviewData.reviewKind === 'project-translation') {
    validateProjectTranslationReview(
      resource,
      locale,
      baseRecords,
      orderedReviewRecords,
      reviewData,
    );
  } else if (reviewData.reviewKind === 'source-provenance-audit') {
    validateSourceProvenanceReview(
      resource,
      locale,
      orderedReviewRecords,
      reviewData,
      officialSourceAudit,
    );
  } else {
    throw new Error(`${resource.resourceId}/${locale} reviewKind is unsupported.`);
  }
  return {
    algorithm: 'sha256',
    value: sha256(stableJson(reviewData)),
  };
};

const validateSha256Digest = (digest, description, expectedScope) => {
  if (
    digest?.algorithm !== 'sha256' ||
    !/^[a-f0-9]{64}$/u.test(digest?.value ?? '') ||
    !Number.isInteger(digest?.byteLength) ||
    digest.byteLength <= 0
  ) {
    throw new Error(`${description} must contain a SHA-256 value and positive byteLength.`);
  }
  if (expectedScope && digest.scope !== expectedScope) {
    throw new Error(`${description}.scope must be ${expectedScope}.`);
  }
};

const exactStringKeyClosure = (actualObject, expectedKeys, description) => {
  const actual = Object.keys(actualObject ?? {}).sort();
  const expected = [...expectedKeys].sort();
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(
      `${description} must exactly cover ${expected.join(', ')}; received ${actual.join(', ')}.`,
    );
  }
};

const SOURCE_PROVENANCE_STATUSES = new Set(['exact', 'project-modified', 'project-extension']);

export const validateOfficialSourceAudit = ({
  resource,
  baseDocument,
  baseRecords,
  auditData,
  auditFileBytes,
}) => {
  const binding = resource.structureSource?.officialSourceAudit;
  const description = `${resource.resourceId}/official-source-audit`;
  if (!binding) {
    throw new Error(`${description} manifest binding is missing.`);
  }
  requireNonBlank(binding.auditId, `${description} manifest auditId`);
  requireNonBlank(binding.sourceFile, `${description} manifest sourceFile`);
  requireNonBlank(binding.transformVersion, `${description} manifest transformVersion`);
  requireNonBlank(binding.sourceComponentRole, `${description} manifest sourceComponentRole`);
  validateSha256Digest(
    binding.digest,
    `${description} manifest digest`,
    'frozen-normalized-official-source-audit-json',
  );
  if (
    auditFileBytes.byteLength !== binding.digest.byteLength ||
    sha256(auditFileBytes) !== binding.digest.value
  ) {
    throw new Error(`${description} bytes differ from the frozen manifest digest.`);
  }

  if (
    auditData?.schemaVersion !== OFFICIAL_SOURCE_AUDIT_SCHEMA_VERSION ||
    auditData.auditId !== binding.auditId ||
    auditData.resourceId !== resource.resourceId ||
    auditData.identityStrategy !== resource.identityStrategy ||
    auditData.transformVersion !== binding.transformVersion ||
    auditData.edition !== resource.edition?.value ||
    auditData.retrievedAt !== resource.structureSource?.retrievedAt
  ) {
    throw new Error(`${description} identity, edition, transform, or retrieval date is invalid.`);
  }

  const sourceComponent = asArray(resource.structureSource?.sourceComponents).find(
    ({ role }) => role === binding.sourceComponentRole,
  );
  if (!sourceComponent) {
    throw new Error(
      `${description} cannot find source component role ${binding.sourceComponentRole}.`,
    );
  }
  if (
    auditData.source?.role !== sourceComponent.role ||
    auditData.source?.edition !== sourceComponent.edition ||
    auditData.source?.sourceUrl !== sourceComponent.sourceUrl ||
    !sameAssertion(auditData.source?.rawDigest, sourceComponent.digest)
  ) {
    throw new Error(`${description} upstream source binding differs from the manifest component.`);
  }

  const canonicalBaseDigest = canonicalDigest(
    baseDocument,
    'canonical-base-json',
    baseRecords.length,
  );
  assertCanonicalDigest(
    auditData.canonicalBaseDigest,
    canonicalBaseDigest,
    `${description} canonical base digest`,
  );

  const records = asArray(auditData.records);
  if (records.length !== baseRecords.length) {
    throw new Error(
      `${description} must exactly cover ${baseRecords.length} base identities; received ${records.length}.`,
    );
  }
  const counts = {
    exact: 0,
    'project-modified': 0,
    'project-extension': 0,
  };
  const normalizedProjection = [];
  for (const [index, baseRecord] of baseRecords.entries()) {
    const item = records[index];
    if (
      item?.key !== baseRecord.key ||
      !sameAssertion(item?.assertion, baseRecord.assertion) ||
      item?.baseLabel !== baseRecord.baseLabel
    ) {
      throw new Error(`${description} base projection differs at index ${index}.`);
    }
    if (!SOURCE_PROVENANCE_STATUSES.has(item.provenanceStatus)) {
      throw new Error(`${description} has invalid provenanceStatus at ${baseRecord.key}.`);
    }
    counts[item.provenanceStatus] += 1;
    if (item.provenanceStatus === 'project-extension') {
      if (item.sourceIdentity !== null || item.sourceLabel !== null) {
        throw new Error(
          `${description} project extension must not claim an official source at ${baseRecord.key}.`,
        );
      }
    } else {
      if (
        !sameAssertion(item.sourceIdentity, {
          key: baseRecord.key,
          assertion: baseRecord.assertion,
        })
      ) {
        throw new Error(`${description} official scoped identity differs at ${baseRecord.key}.`);
      }
      requireNonBlank(item.sourceLabel, `${description} sourceLabel at ${baseRecord.key}`);
      if (
        (item.provenanceStatus === 'exact' && item.sourceLabel !== item.baseLabel) ||
        (item.provenanceStatus === 'project-modified' && item.sourceLabel === item.baseLabel)
      ) {
        throw new Error(
          `${description} ${item.provenanceStatus} label relation is invalid at ${baseRecord.key}.`,
        );
      }
    }
    normalizedProjection.push({
      key: item.key,
      assertion: item.assertion,
      baseLabel: item.baseLabel,
      provenanceStatus: item.provenanceStatus,
      sourceIdentity: item.sourceIdentity,
      sourceLabel: item.sourceLabel,
    });
  }

  const expectedCounts = {
    total: baseRecords.length,
    exact: counts.exact,
    projectModified: counts['project-modified'],
    projectExtension: counts['project-extension'],
  };
  if (!sameAssertion(auditData.counts, expectedCounts)) {
    throw new Error(
      `${description} counts differ: expected ${stableJson(expectedCounts)}, received ${stableJson(auditData.counts)}.`,
    );
  }
  const matchedUpstream = expectedCounts.exact + expectedCounts.projectModified;
  if (
    !Number.isInteger(auditData.upstreamIdentityCount) ||
    !Number.isInteger(auditData.unmatchedUpstreamIdentityCount) ||
    auditData.upstreamIdentityCount < matchedUpstream ||
    auditData.unmatchedUpstreamIdentityCount !== auditData.upstreamIdentityCount - matchedUpstream
  ) {
    throw new Error(`${description} upstream identity counts are inconsistent.`);
  }

  const projectionDigest = canonicalDigest(
    normalizedProjection,
    'ordered-scoped-official-source-projection',
    normalizedProjection.length,
  );
  assertCanonicalDigest(
    auditData.projectionDigest,
    projectionDigest,
    `${description} projection digest`,
  );

  return {
    binding: {
      auditId: binding.auditId,
      auditFileDigest: binding.digest,
      projectionDigest,
      transformVersion: binding.transformVersion,
    },
    counts: expectedCounts,
  };
};

export const validateOfficialDeliveryBinding = (resource, locale, overlay, officialSourceAudit) => {
  const description = `${resource.resourceId}/${locale} official delivery`;
  if (overlay.status === 'official') {
    if (
      !officialSourceAudit ||
      officialSourceAudit.counts.exact !== officialSourceAudit.counts.total
    ) {
      throw new Error(`${description} requires an all-exact same-edition source audit.`);
    }
    assertCanonicalDigest(
      overlay.evidence?.sourceAuditBinding,
      officialSourceAudit.binding,
      `${description} sourceAuditBinding`,
    );
  }
  if (overlay.status === 'official-crosswalk') {
    const mappingId = requireNonBlank(
      overlay.evidence?.officialSecondaryMappingId,
      `${description} officialSecondaryMappingId`,
    );
    if (
      !asArray(resource.officialSecondaryMappings).some(
        (mapping) => mapping.mappingId === mappingId,
      )
    ) {
      throw new Error(`${description} references unknown secondary mapping ${mappingId}.`);
    }
  }
};

export const validateOfficialSecondaryMapping = ({
  resource,
  mapping,
  sourceData,
  sourceFileBytes,
  supportedLanguages,
  baseRecords,
  overlayDataByLocale,
}) => {
  const description = `${resource.resourceId}/${mapping?.mappingId ?? 'secondary-mapping'}`;
  if (mapping?.status !== 'official-secondary-mapping') {
    throw new Error(`${description} must use status official-secondary-mapping.`);
  }
  if (
    sourceData?.schemaVersion !== 1 ||
    sourceData.resourceId !== resource.resourceId ||
    sourceData.mappingId !== mapping.mappingId ||
    sourceData.provenanceStatus !== mapping.status
  ) {
    throw new Error(`${description} source identity, schemaVersion, or status is invalid.`);
  }
  if (
    sourceData.release !== mapping.release ||
    sourceData.retrievedAt !== mapping.retrievedAt ||
    sourceData.source?.releaseUrl !== mapping.sourceUrl ||
    sourceData.source?.datasetUri !== mapping.datasetUrl ||
    sourceData.source?.sparqlEndpoint !== mapping.queryUrl
  ) {
    throw new Error(`${description} source and manifest provenance differ.`);
  }
  requireNonBlank(sourceData.source?.query, `${description} SPARQL query`);
  requireNonBlank(
    sourceData.source?.releaseResolution,
    `${description} release resolution evidence`,
  );
  requireNonBlank(sourceData.source?.usageTerms?.name, `${description} usage terms name`);
  requireNonBlank(sourceData.source?.usageTerms?.url, `${description} usage terms URL`);
  requireNonBlank(sourceData.source?.usageTerms?.note, `${description} usage terms note`);
  if (sourceData.source?.usageTerms?.status !== mapping.usageTerms?.status) {
    throw new Error(`${description} usage terms status differs from the manifest.`);
  }

  const sourceFileDigest = mapping.sourceFileDigest;
  validateSha256Digest(
    sourceFileDigest,
    `${description} sourceFileDigest`,
    'official-secondary-mapping-audit-json',
  );
  if (
    !sourceFileBytes ||
    sourceFileBytes.byteLength !== sourceFileDigest.byteLength ||
    sha256(sourceFileBytes) !== sourceFileDigest.value
  ) {
    throw new Error(`${description} source file digest differs from the manifest.`);
  }

  const rawResponse = sourceData.source?.rawResponse;
  const rawDigest = rawResponse?.digest;
  validateSha256Digest(
    rawDigest,
    `${description} raw response digest`,
    'cellar-sparql-application-sparql-results-json-response-body',
  );
  if (!sameAssertion(rawDigest, mapping.rawResponseDigest)) {
    throw new Error(`${description} raw response digest differs from the manifest.`);
  }
  if (rawResponse?.encoding !== 'base64-chunks' || !Array.isArray(rawResponse.chunks)) {
    throw new Error(`${description} raw response must use base64-chunks encoding.`);
  }
  const encodedResponse = rawResponse.chunks.join('');
  const rawResponseBytes = Buffer.from(encodedResponse, 'base64');
  if (
    rawResponseBytes.toString('base64') !== encodedResponse ||
    rawResponseBytes.byteLength !== rawDigest.byteLength ||
    sha256(rawResponseBytes) !== rawDigest.value
  ) {
    throw new Error(`${description} raw response bytes do not match their digest.`);
  }
  let sparqlResponse;
  try {
    sparqlResponse = JSON.parse(rawResponseBytes.toString('utf8'));
  } catch {
    throw new Error(`${description} raw SPARQL response is not valid JSON.`);
  }

  if (
    sourceData.matchPolicy !== 'all-base-iso-3166-1-alpha-2-exact' ||
    sourceData.localePolicy !== 'registry-exact-explicit-decision'
  ) {
    throw new Error(`${description} uses an unsupported match or locale policy.`);
  }
  const targetLocales = supportedLanguages.filter((locale) => locale !== resource.baseLocale);
  exactStringKeyClosure(
    sourceData.localeDecisions,
    targetLocales,
    `${description} localeDecisions`,
  );
  const mappedLocales = [];
  const officialUnavailableLocales = [];
  const mappedBindings = {};
  for (const locale of targetLocales) {
    const decision = sourceData.localeDecisions[locale];
    if (decision?.status === 'mapped') {
      mappedBindings[locale] = requireNonBlank(
        decision.binding,
        `${description} ${locale} SPARQL binding`,
      );
      mappedLocales.push(locale);
      continue;
    }
    if (decision?.status === 'official-unavailable') {
      if (decision.binding !== undefined && decision.binding !== null) {
        throw new Error(`${description} ${locale} official-unavailable cannot name a binding.`);
      }
      if (
        decision.evidence?.release !== sourceData.release ||
        decision.evidence?.retrievedAt !== sourceData.retrievedAt ||
        !requireNonBlank(
          decision.evidence?.sourceUrl,
          `${description} ${locale} unavailable evidence URL`,
        ).includes(sourceData.release)
      ) {
        throw new Error(
          `${description} ${locale} official-unavailable needs evidence for release ${sourceData.release}.`,
        );
      }
      requireNonBlank(
        decision.evidence?.note,
        `${description} ${locale} unavailable evidence note`,
      );
      if (resource.overlays?.[locale]?.status !== 'project-reviewed') {
        throw new Error(
          `${description} ${locale} official-unavailable requires a project-reviewed overlay.`,
        );
      }
      officialUnavailableLocales.push(locale);
      continue;
    }
    throw new Error(`${description} ${locale} must be mapped or official-unavailable.`);
  }
  if (new Set(Object.values(mappedBindings)).size !== mappedLocales.length) {
    throw new Error(`${description} mapped locale SPARQL bindings must be one-to-one.`);
  }
  const expectedResponseVariables = ['country', 'iso2', ...Object.values(mappedBindings)].sort();
  const actualResponseVariables = asArray(sparqlResponse?.head?.vars).sort();
  if (stableJson(actualResponseVariables) !== stableJson(expectedResponseVariables)) {
    throw new Error(`${description} raw response variables differ from mapped locale decisions.`);
  }

  const expectedRecords = baseRecords.filter(({ assertion }) =>
    /^[A-Z]{2}$/u.test(assertion?.code ?? ''),
  );
  const expectedByKey = new Map(expectedRecords.map((record) => [record.key, record]));
  const rawByKey = new Map();
  for (const binding of asArray(sparqlResponse?.results?.bindings)) {
    const code = binding?.iso2?.value;
    if (!/^[A-Z]{2}$/u.test(code ?? '')) {
      throw new Error(`${description} raw response contains a non-alpha-2 code.`);
    }
    const key = `location:${code}`;
    if (!expectedByKey.has(key)) {
      continue;
    }
    if (rawByKey.has(key)) {
      throw new Error(`${description} raw response contains duplicate ISO alpha-2 code ${code}.`);
    }
    const labels = {};
    for (const locale of mappedLocales) {
      const bindingName = mappedBindings[locale];
      const labelBinding = binding?.[bindingName];
      if (
        labelBinding?.type !== 'literal' ||
        labelBinding?.['xml:lang'] !== locale ||
        typeof labelBinding?.value !== 'string' ||
        labelBinding.value.trim() === ''
      ) {
        throw new Error(
          `${description} raw response has no exact ${locale} label binding for ${code}.`,
        );
      }
      labels[locale] = labelBinding.value;
    }
    const sourceConcept = requireNonBlank(
      binding?.country?.value,
      `${description} ${code} concept URI`,
    );
    if (!sourceConcept.startsWith('http://publications.europa.eu/resource/authority/country/')) {
      throw new Error(`${description} ${code} does not use an EU Vocabularies country URI.`);
    }
    rawByKey.set(key, { sourceConcept, labels });
  }

  const sourceRecords = asArray(sourceData.records);
  const sourceByKey = new Map();
  for (const item of sourceRecords) {
    if (sourceByKey.has(item?.key)) {
      throw new Error(`${description} contains duplicate record ${item?.key}.`);
    }
    sourceByKey.set(item?.key, item);
  }
  const actualKeys = [...sourceByKey.keys()].sort();
  const expectedKeys = [...expectedByKey.keys()].sort();
  if (stableJson(actualKeys) !== stableJson(expectedKeys)) {
    throw new Error(
      `${description} records must exactly cover the ${expectedKeys.length} base ISO alpha-2 identities.`,
    );
  }

  for (const [key, expected] of expectedByKey) {
    const item = sourceByKey.get(key);
    const raw = rawByKey.get(key);
    if (!raw) {
      throw new Error(`${description} raw response is missing ${key}.`);
    }
    if (!sameAssertion(item?.assertion, expected.assertion)) {
      throw new Error(`${description} assertion mismatch at ${key}.`);
    }
    if (item?.sourceConcept !== raw.sourceConcept) {
      throw new Error(`${description} source concept differs from the raw response at ${key}.`);
    }
    exactStringKeyClosure(item?.labels, mappedLocales, `${description} ${key} labels`);
    for (const locale of mappedLocales) {
      const mappedLabel = item.labels[locale];
      if (
        mappedLabel?.provenanceStatus !== 'official-secondary-mapping' ||
        mappedLabel?.label !== raw.labels[locale]
      ) {
        throw new Error(
          `${description} ${key}/${locale} is not an exact official secondary mapping.`,
        );
      }
      const runtimeOverlay = overlayDataByLocale.get(locale);
      const runtimeLabel = asArray(runtimeOverlay?.labels).find(
        (candidate) => candidate.key === key,
      )?.label;
      if (runtimeLabel !== mappedLabel.label) {
        throw new Error(
          `${description} ${key}/${locale} differs from the project-reviewed runtime overlay.`,
        );
      }
    }
  }

  return {
    identities: expectedRecords.length,
    locales: mappedLocales.length,
    officialUnavailableLocales: officialUnavailableLocales.length,
    labels: expectedRecords.length * mappedLocales.length,
  };
};

const runtimeLocalization = (resource, locale, overlay) => {
  if (DELIVERY_STATUSES.has(overlay.status)) {
    return {
      status: 'native',
      assetLanguage: locale,
      deliveryStatus: overlay.status,
    };
  }
  if (overlay.status === 'development-base') {
    return {
      status: 'development-base',
      resolvedLanguage: overlay.resolvedLocale ?? resource.baseLocale,
      ownerIssue: overlay.ownerIssue,
      diagnostic: overlay.diagnostic,
    };
  }
  return {
    status: 'missing',
    ownerIssue: overlay.ownerIssue,
    diagnostic: overlay.diagnostic,
  };
};

const generatedHeader = `// Generated by scripts/reference-data/reference-resource-pipeline.mjs.\n// Do not edit; update reference-resource-manifest.json or source/overlay JSON and run npm run reference-data:write.\n\n`;

const renderGeneratedManifest = (manifest) => {
  const resources = manifest.resources.map((resource) => ({
    ...resource,
    baseLanguage: resource.baseLocale,
    provenance: {
      status:
        resource.edition.verificationStatus === 'verified' &&
        resource.structureSource.verificationStatus === 'verified'
          ? 'verified'
          : 'pending-verification',
      edition: resource.edition.value,
      publisher: resource.structureSource.authority,
      officialUrl: resource.structureSource.sourceUrl,
      license: resource.structureSource.usageTerms.status,
      retrievedAt: resource.structureSource.retrievedAt,
      ownerIssue: '#634',
    },
    runtimeAssets: Object.fromEntries(
      Object.entries(resource.runtime.assets).map(([locale, asset]) => [
        locale,
        {
          language: locale,
          fileName: asset.fileName,
          jsonDigest: asset.jsonDigest,
          gzipDigest: asset.gzipDigest,
          byteLength: asset.byteLength,
          dataTypeNames: asset.dataTypeNames,
        },
      ]),
    ),
    localizations: Object.fromEntries(
      Object.entries(resource.overlays).map(([locale, overlay]) => [
        locale,
        runtimeLocalization(resource, locale, overlay),
      ]),
    ),
  }));
  return `${generatedHeader}export const GENERATED_REFERENCE_RESOURCE_MANIFEST_VERSION = ${JSON.stringify(
    manifest.schemaVersion,
  )} as const;\n\n// prettier-ignore\nexport const GENERATED_REFERENCE_CANONICAL_DATA_TYPES = ${JSON.stringify(
    manifest.canonicalDataTypes,
    null,
    2,
  )} as const;\n\n// prettier-ignore\nexport const GENERATED_REFERENCE_RESOURCE_MANIFEST = ${JSON.stringify(
    resources,
    null,
    2,
  )} as const;\n`;
};

const compareOrWrite = (repoRoot, path, expected, mode, drift) => {
  const absolutePath = resolve(repoRoot, path);
  const current = existsSync(absolutePath) ? readFileSync(absolutePath) : undefined;
  const next = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);
  if (current?.equals(next)) {
    return;
  }
  if (mode === 'write') {
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, next);
    return;
  }
  drift.push(relative(repoRoot, absolutePath));
};

const removeOrReportStaleRuntimeAssets = (repoRoot, managedDirectories, mode, drift) => {
  for (const [directory, expectedFiles] of managedDirectories) {
    const absoluteDirectory = resolve(repoRoot, directory);
    if (!existsSync(absoluteDirectory)) {
      continue;
    }
    for (const fileName of readdirSync(absoluteDirectory)) {
      if (!fileName.endsWith('.min.json.gz') || expectedFiles.has(fileName)) {
        continue;
      }
      const path = `${directory}/${fileName}`;
      if (mode === 'write') {
        unlinkSync(resolve(repoRoot, path));
      } else {
        drift.push(path);
      }
    }
  }
};

export async function buildReferenceResources({ repoRoot, mode, supportedLanguages }) {
  const manifest = readJson(repoRoot, MANIFEST_PATH);
  if (manifest.schemaVersion !== 2 || manifest.generator?.version !== PIPELINE_VERSION) {
    throw new Error(`Reference-resource manifest schema/generator version is unsupported.`);
  }
  const managedRuntimeDirectories = asArray(manifest.managedRuntimeDirectories);
  if (
    managedRuntimeDirectories.length === 0 ||
    new Set(managedRuntimeDirectories).size !== managedRuntimeDirectories.length
  ) {
    throw new Error('managedRuntimeDirectories must be a non-empty unique directory list.');
  }
  managedRuntimeDirectories.forEach((directory, index) =>
    requireNonBlank(directory, `managedRuntimeDirectories[${index}]`),
  );
  const resourceIds = new Set();
  const drift = [];
  const managedDirectories = new Map(
    managedRuntimeDirectories.map((directory) => [directory, new Set()]),
  );
  const runtimeOutputs = [];

  for (const resource of manifest.resources) {
    requireNonBlank(resource.resourceId, 'resourceId');
    if (resourceIds.has(resource.resourceId)) {
      throw new Error(`Duplicate resourceId: ${resource.resourceId}`);
    }
    resourceIds.add(resource.resourceId);
    validateProvenance(resource);
    validateLocaleClosure(resource, supportedLanguages);

    const baseDocument = readJson(repoRoot, resource.sourceFiles.base);
    validateBaseDataTypes(manifest.canonicalDataTypes, baseDocument, resource.resourceId);
    const baseRecords = enumerateLabels(baseDocument, resource.identityStrategy);
    const sourceAuditBinding = resource.structureSource?.officialSourceAudit;
    if (!sourceAuditBinding?.sourceFile) {
      throw new Error(`${resource.resourceId}/official-source-audit manifest binding is missing.`);
    }
    const { bytes: sourceAuditFileBytes, data: sourceAuditData } = readJsonWithBytes(
      repoRoot,
      sourceAuditBinding?.sourceFile,
    );
    const officialSourceAudit = validateOfficialSourceAudit({
      resource,
      baseDocument,
      baseRecords,
      auditData: sourceAuditData,
      auditFileBytes: sourceAuditFileBytes,
    });
    const canonicalBase = stableJson(baseDocument);
    const structure = canonicalStructure(baseRecords);
    const usageTerms = resource.structureSource?.usageTerms;
    validateProductionClearanceEvidence(resource);
    usageTerms.productionStatus = usageTerms.status === 'production-cleared' ? 'ready' : 'blocked';
    usageTerms.ownerIssue = usageTerms.productionStatus === 'blocked' ? '#634' : null;
    usageTerms.blockerReason = usageTerms.productionStatus === 'blocked' ? usageTerms.note : null;
    resource.structureSource.sourceDigest = {
      algorithm: 'sha256',
      value: sha256(canonicalBase),
      scope: 'canonical-base-json',
    };
    resource.structureDigest = {
      algorithm: 'sha256',
      value: sha256(stableJson(structure)),
      identityCount: structure.length,
      scope: 'ordered-identity-and-assertion-sequence',
    };

    const runtimeAssets = {};
    const runtimeDocuments = new Map([[resource.baseLocale, baseDocument]]);
    const overlayDataByLocale = new Map();
    for (const [locale, overlay] of Object.entries(resource.overlays)) {
      validateOfficialDeliveryBinding(resource, locale, overlay, officialSourceAudit);
      if (locale === resource.baseLocale) {
        validateDeliveryEvidence(resource, locale, overlay);
        overlay.coverage = {
          expected: baseRecords.length,
          translated: baseRecords.length,
          blank: 0,
          extra: 0,
          duplicate: 0,
          missing: 0,
        };
        overlay.labelDigest = {
          algorithm: 'sha256',
          value: sha256(stableJson(canonicalLabels(baseRecords))),
        };
        if (overlay.status === 'project-reviewed') {
          if (!overlay.evidence?.reviewFile) {
            throw new Error(
              `${resource.resourceId}/${locale} project-reviewed base needs a reviewFile.`,
            );
          }
          overlay.evidence.reviewDigest = validateReview(
            resource,
            locale,
            baseRecords,
            { labels: canonicalLabels(baseRecords) },
            readJson(repoRoot, overlay.evidence.reviewFile),
            officialSourceAudit,
          );
        } else {
          overlay.evidence.reviewDigest = null;
        }
        continue;
      }
      if (NON_NATIVE_STATUSES.has(overlay.status)) {
        if (overlay.sourceFile) {
          throw new Error(
            `${resource.resourceId}/${locale} ${overlay.status} entry cannot own an overlay file.`,
          );
        }
        overlay.coverage = {
          expected: baseRecords.length,
          translated: 0,
          blank: 0,
          extra: 0,
          duplicate: 0,
          missing: baseRecords.length,
        };
        overlay.labelDigest = null;
        continue;
      }
      if (!DELIVERY_STATUSES.has(overlay.status)) {
        throw new Error(
          `${resource.resourceId}/${locale} has unsupported status ${overlay.status}.`,
        );
      }
      const overlayData = readJson(repoRoot, overlay.sourceFile);
      overlayDataByLocale.set(locale, overlayData);
      validateOverlayEnvelope(resource, locale, overlay, overlayData);
      validateDeliveryEvidence(resource, locale, overlay);
      const result = applyOverlay(baseDocument, resource.identityStrategy, overlayData);
      validateDataTypeNames(
        manifest.canonicalDataTypes,
        overlayData.dataTypeNames,
        `${resource.resourceId}/${locale}`,
      );
      applyDataTypeNames(result.document, overlayData.dataTypeNames);
      overlay.coverage = result.coverage;
      overlay.labelDigest = {
        algorithm: 'sha256',
        value: sha256(stableJson(overlayData.labels)),
      };
      overlay.evidence.reviewDigest =
        overlay.status === 'project-reviewed'
          ? validateReview(
              resource,
              locale,
              baseRecords,
              overlayData,
              readJson(repoRoot, overlay.evidence.reviewFile),
              officialSourceAudit,
            )
          : null;
      runtimeDocuments.set(locale, result.document);
    }

    for (const mapping of asArray(resource.officialSecondaryMappings)) {
      const { bytes, data } = readJsonWithBytes(repoRoot, mapping.sourceFile);
      validateOfficialSecondaryMapping({
        resource,
        mapping,
        sourceData: data,
        sourceFileBytes: bytes,
        supportedLanguages,
        baseRecords,
        overlayDataByLocale,
      });
    }

    for (const [locale, document] of runtimeDocuments) {
      const json = stableJson(document);
      const gzip = deterministicGzip(Buffer.from(json));
      const jsonDigest = sha256(json);
      const fileName = getRuntimeFileName(resource, locale, jsonDigest);
      const dataTypeNames =
        locale === resource.baseLocale
          ? Object.fromEntries(manifest.canonicalDataTypes.map((dataType) => [dataType, dataType]))
          : readJson(repoRoot, resource.overlays[locale].sourceFile).dataTypeNames;
      runtimeAssets[locale] = {
        language: locale,
        fileName,
        jsonDigest: { algorithm: 'sha256', value: jsonDigest },
        gzipDigest: { algorithm: 'sha256', value: sha256(gzip) },
        byteLength: gzip.byteLength,
        dataTypeNames,
      };
      runtimeOutputs.push({
        path: `${resource.runtime.directory}/${fileName}`,
        value: gzip,
      });
      const expectedFiles = managedDirectories.get(resource.runtime.directory);
      if (!expectedFiles) {
        throw new Error(
          `${resource.resourceId} runtime directory ${resource.runtime.directory} is not declared in managedRuntimeDirectories.`,
        );
      }
      expectedFiles.add(fileName);
    }
    resource.runtime.assets = runtimeAssets;
    resource.cacheRevision = sha256(
      stableJson({
        schemaVersion: manifest.schemaVersion,
        resourceId: resource.resourceId,
        structureDigest: resource.structureDigest.value,
        assets: Object.fromEntries(
          Object.entries(runtimeAssets).map(([locale, asset]) => [locale, asset.jsonDigest.value]),
        ),
      }),
    ).slice(0, 16);
  }

  const canonicalManifest = JSON.parse(stableJson(manifest));
  const prettierConfig = (await prettier.resolveConfig(resolve(repoRoot, MANIFEST_PATH))) ?? {};
  const manifestText = await prettier.format(stableJson(canonicalManifest, true), {
    ...prettierConfig,
    filepath: MANIFEST_PATH,
    parser: 'json',
  });
  for (const output of runtimeOutputs) {
    compareOrWrite(repoRoot, output.path, output.value, mode, drift);
  }
  compareOrWrite(repoRoot, MANIFEST_PATH, manifestText, mode, drift);
  compareOrWrite(
    repoRoot,
    GENERATED_MANIFEST_PATH,
    renderGeneratedManifest(canonicalManifest),
    mode,
    drift,
  );
  removeOrReportStaleRuntimeAssets(repoRoot, managedDirectories, mode, drift);

  if (drift.length > 0) {
    throw new Error(
      `Reference-resource generated files are stale: ${drift.join(', ')}. Run npm run reference-data:write.`,
    );
  }
  return canonicalManifest;
}

export const getReferenceResourceProductionBlockers = (manifest, supportedLanguages) =>
  manifest.resources.flatMap((resource) => {
    if (resource.required !== true) {
      return [];
    }

    const blockers = [];
    const usageTerms = resource.structureSource?.usageTerms;
    let clearanceEvidenceError = null;
    try {
      validateProductionClearanceEvidence(resource);
    } catch (error) {
      clearanceEvidenceError = error instanceof Error ? error.message : String(error);
    }
    if (
      usageTerms?.status !== 'production-cleared' ||
      usageTerms?.productionStatus !== 'ready' ||
      clearanceEvidenceError
    ) {
      blockers.push({
        resourceId: resource.resourceId,
        locale: null,
        ownerIssue: usageTerms?.ownerIssue ?? '#634',
        reason: clearanceEvidenceError
          ? `production-clearance evidence is invalid: ${clearanceEvidenceError}`
          : `usage terms are ${usageTerms?.status ?? 'missing or unverified'}: ${
              usageTerms?.blockerReason ??
              usageTerms?.note ??
              'production clearance evidence is missing'
            }`,
      });
    }

    try {
      validateProjectReviewedOfficialAvailability(resource);
    } catch (error) {
      blockers.push({
        resourceId: resource.resourceId,
        locale: null,
        ownerIssue: '#634',
        reason: `project-reviewed official-availability evidence is invalid: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    for (const locale of supportedLanguages) {
      const overlay = resource.overlays?.[locale];
      const asset = resource.runtime?.assets?.[locale];
      if (
        !overlay ||
        (overlay.status !== 'official' && overlay.status !== 'project-reviewed') ||
        !asset
      ) {
        blockers.push({
          resourceId: resource.resourceId,
          locale,
          ownerIssue: overlay?.ownerIssue ?? '#634',
          reason: !overlay
            ? 'delivery declaration is missing'
            : overlay.status !== 'official' && overlay.status !== 'project-reviewed'
              ? `delivery status is ${overlay.status}`
              : 'generated native runtime asset is missing',
        });
      }
    }

    return blockers;
  });

export const assertReferenceResourcesProductionReady = (manifest, supportedLanguages) => {
  const blockers = getReferenceResourceProductionBlockers(manifest, supportedLanguages);
  if (blockers.length === 0) {
    return;
  }
  throw new Error(
    `Reference resources are not production-ready: ${blockers
      .map(
        ({ resourceId, locale, ownerIssue, reason }) =>
          `${resourceId}${locale ? `/${locale}` : ''} (${ownerIssue}): ${reason}`,
      )
      .join('; ')}.`,
  );
};

async function main() {
  const productionCheck = process.argv.includes('--production-check');
  if (productionCheck && process.argv.includes('--write')) {
    throw new Error('--production-check is read-only and cannot be combined with --write.');
  }
  const mode = productionCheck
    ? 'check'
    : process.argv.includes('--write')
      ? 'write'
      : process.argv.includes('--check')
        ? 'check'
        : null;
  if (!mode) {
    throw new Error('Use --check, --write, or --production-check.');
  }
  const repoRoot = resolve(import.meta.dirname, '../..');
  const { SUPPORTED_CONTENT_LANGUAGES } =
    await import('../../src/services/general/contentLanguageRegistry.ts');
  const manifest = await buildReferenceResources({
    repoRoot,
    mode,
    supportedLanguages: SUPPORTED_CONTENT_LANGUAGES,
  });
  if (productionCheck) {
    assertReferenceResourcesProductionReady(manifest, SUPPORTED_CONTENT_LANGUAGES);
  }
  console.log(
    `Reference-resource pipeline ${productionCheck ? 'production check' : mode} passed for ${manifest.resources.length} resources and ${SUPPORTED_CONTENT_LANGUAGES.length} registry languages.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
