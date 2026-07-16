import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export const RUNTIME_ACTIVATION_SCHEMA = 'tiangong.i18n-de-runtime-activation.v1';
export const RUNTIME_ACTIVATION_MANIFEST = 'docs/plans/i18n-de-DE/runtime-activation-manifest.json';
export const CANONICAL_MANIFEST = 'docs/plans/i18n-de-DE/manifest.json';
export const DYNAMIC_FAMILIES = 'docs/plans/i18n-de-DE/dynamic-families.json';
export const FROZEN_CONTEXT_LEDGER = 'docs/plans/i18n-de-DE/context-ledger.json';
export const ACTIVATION_ENTRY_TRANSLATIONS =
  'docs/plans/i18n-de-DE/activation-entry-translations.json';
export const FROZEN_REVIEW_PROVENANCE = 'docs/plans/i18n-de-DE/review-log.yaml';
export const SOURCE_ALLOWLIST = 'docs/plans/i18n-de-DE/source-allowlist.json';
export const REVIEW_GATE_SOURCE = 'src/pages/Processes/Components/edit.tsx';
export const REVIEW_GATE_FAMILY = 'reviewGateEvidenceLabels';
export const REVIEW_GATE_DESCRIPTOR_SYMBOLS = [
  'REVIEW_SUBMIT_EVIDENCE_MESSAGES',
  'REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES',
];
export const DELTA_CONFIRMATION = '.local/i18n-de-DE/issue-606-delta-review-confirmation.md';
export const FROZEN_BASELINE_COMMIT = '36836f2c3461113b28af8c3c824045d0115c6cfc';
export const BASELINE_MESSAGE_COUNT = 2689;
export const ACTIVE_LOCALES = ['en-US', 'zh-CN', 'de-DE'];

export const NEW_MESSAGE_IDS = [
  'pages.dataProcessing.bundle.amount',
  'pages.dataProcessing.bundle.artifactCount',
  'pages.dataProcessing.bundle.blocked',
  'pages.dataProcessing.bundle.complete',
  'pages.dataProcessing.bundle.contentHash',
  'pages.dataProcessing.bundle.coverage',
  'pages.dataProcessing.bundle.direction',
  'pages.dataProcessing.bundle.download',
  'pages.dataProcessing.bundle.downloads',
  'pages.dataProcessing.bundle.evidence',
  'pages.dataProcessing.bundle.exportCsv',
  'pages.dataProcessing.bundle.exportJson',
  'pages.dataProcessing.bundle.factorHash',
  'pages.dataProcessing.bundle.flow',
  'pages.dataProcessing.bundle.impactCount',
  'pages.dataProcessing.bundle.legacy',
  'pages.dataProcessing.bundle.location',
  'pages.dataProcessing.bundle.method',
  'pages.dataProcessing.bundle.methodSetHash',
  'pages.dataProcessing.bundle.process',
  'pages.dataProcessing.bundle.processCount',
  'pages.dataProcessing.bundle.refresh',
  'pages.dataProcessing.bundle.retry',
  'pages.dataProcessing.bundle.schema',
  'pages.dataProcessing.bundle.selectionHash',
  'pages.dataProcessing.bundle.snapshot',
  'pages.dataProcessing.bundle.snapshotHash',
  'pages.dataProcessing.bundle.title',
  'pages.dataProcessing.bundle.unit',
  'pages.dataProcessing.bundle.version',
  'pages.dataProcessing.publications.legacyTitle',
  'pages.dataProcessing.release.artifactSetHash',
  'pages.dataProcessing.release.blockers',
  'pages.dataProcessing.release.download',
  'pages.dataProcessing.release.downloadExpired',
  'pages.dataProcessing.release.empty',
  'pages.dataProcessing.release.manifestHash',
  'pages.dataProcessing.release.pending',
  'pages.dataProcessing.release.processTitle',
  'pages.dataProcessing.release.readback',
  'pages.dataProcessing.release.refresh',
  'pages.dataProcessing.release.retry',
  'pages.dataProcessing.release.runId',
  'pages.dataProcessing.release.status',
  'pages.dataProcessing.release.title',
  'pages.dataProcessing.release.verified',
  'pages.dataProcessing.release.version',
  'pages.process.view.releases',
];

export const MODIFIED_BASELINE_MESSAGE_IDS = [];

export const EXTERNAL_TRACKED_COPY_INPUTS = [];

export const FINAL_MESSAGE_COUNT = BASELINE_MESSAGE_COUNT + NEW_MESSAGE_IDS.length;

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export const hashJson = (value) => sha256(`${JSON.stringify(value)}\n`);

export function readJson(root, relativeFile) {
  return JSON.parse(fs.readFileSync(path.resolve(root, relativeFile), 'utf8'));
}

export function fileDigest(root, relativeFile) {
  return sha256(fs.readFileSync(path.resolve(root, relativeFile)));
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

function propertyName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteralLike(node) ? node.text : null;
}

export function extractTrackedCopyInput(root, definition) {
  const absolutePath = path.resolve(root, definition.path);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absolutePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const parseError = sourceFile.parseDiagnostics?.[0];
  if (parseError) {
    throw new Error(
      `Cannot parse ${definition.path}: ${ts.flattenDiagnosticMessageText(parseError.messageText, '\n')}`,
    );
  }

  let objectLiteral = null;
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    node.declarationList.declarations.forEach((declaration) => {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== definition.symbol) return;
      const initializer = unwrapExpression(declaration.initializer);
      if (!initializer || !ts.isArrowFunction(initializer)) return;
      const body = unwrapExpression(initializer.body);
      if (body && ts.isObjectLiteralExpression(body)) objectLiteral = body;
    });
  });
  if (!objectLiteral) {
    throw new Error(`Cannot find static object returned by ${definition.symbol}.`);
  }

  const values = {};
  objectLiteral.properties.forEach((property) => {
    if (!ts.isPropertyAssignment(property)) return;
    const name = propertyName(property.name);
    if (name && definition.properties.includes(name)) {
      values[name] = property.initializer.getText(sourceFile);
    }
  });
  const missing = definition.properties.filter((name) => !Object.hasOwn(values, name));
  if (missing.length > 0) {
    throw new Error(`${definition.symbol} is missing tracked copy: ${missing.join(', ')}.`);
  }
  return {
    id: definition.id,
    path: definition.path,
    symbol: definition.symbol,
    properties: definition.properties,
    values,
    extractedCopyDigest: hashJson({
      path: definition.path,
      symbol: definition.symbol,
      values,
    }),
  };
}

export function extractReviewGateDescriptorEvidence(root) {
  const absolutePath = path.resolve(root, REVIEW_GATE_SOURCE);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absolutePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const parseError = sourceFile.parseDiagnostics?.[0];
  if (parseError) {
    throw new Error(
      `Cannot parse ${REVIEW_GATE_SOURCE}: ${ts.flattenDiagnosticMessageText(parseError.messageText, '\n')}`,
    );
  }
  const declarations = new Map();
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    node.declarationList.declarations.forEach((declaration) => {
      if (ts.isIdentifier(declaration.name)) declarations.set(declaration.name.text, declaration);
    });
  });
  const maps = REVIEW_GATE_DESCRIPTOR_SYMBOLS.map((symbol) => {
    const declaration = declarations.get(symbol);
    const initializer = unwrapExpression(declaration?.initializer);
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
      throw new Error(`Cannot find static descriptor map ${symbol} in ${REVIEW_GATE_SOURCE}.`);
    }
    const entries = initializer.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`${symbol} may contain only static property assignments.`);
      }
      const member = propertyName(property.name);
      const descriptor = unwrapExpression(property.initializer);
      if (!member || !descriptor || !ts.isObjectLiteralExpression(descriptor)) {
        throw new Error(`${symbol} contains a non-static descriptor.`);
      }
      const fields = Object.fromEntries(
        descriptor.properties.flatMap((field) => {
          if (!ts.isPropertyAssignment(field)) return [];
          const name = propertyName(field.name);
          const value = unwrapExpression(field.initializer);
          return name && value && ts.isStringLiteralLike(value) ? [[name, value.text]] : [];
        }),
      );
      if (typeof fields.id !== 'string' || typeof fields.defaultMessage !== 'string') {
        throw new Error(`${symbol}.${member} must contain literal id and defaultMessage fields.`);
      }
      return { member, id: fields.id, defaultMessage: fields.defaultMessage };
    });
    return { symbol, entries };
  });
  const messageIds = maps.flatMap(({ entries }) => entries.map(({ id }) => id)).sort();
  if (new Set(messageIds).size !== messageIds.length) {
    throw new Error('Review-gate descriptor maps contain duplicate message IDs.');
  }
  const evidence = {
    id: 'review-gate-evidence-label-descriptor-maps',
    path: REVIEW_GATE_SOURCE,
    family: REVIEW_GATE_FAMILY,
    maps,
    messageIds,
  };
  return { ...evidence, extractedDescriptorDigest: hashJson(evidence) };
}

function gitFileAt(root, commit, relativeFile) {
  return execFileSync('git', ['show', `${commit}:${relativeFile}`], {
    cwd: root,
    encoding: null,
    maxBuffer: 20 * 1024 * 1024,
  });
}

export function readJsonAtGitCommit(root, commit, relativeFile) {
  return JSON.parse(gitFileAt(root, commit, relativeFile).toString('utf8'));
}

export function frozenInputDigests(root) {
  const paths = [
    CANONICAL_MANIFEST,
    FROZEN_CONTEXT_LEDGER,
    ACTIVATION_ENTRY_TRANSLATIONS,
    FROZEN_REVIEW_PROVENANCE,
  ];
  return Object.fromEntries(
    paths.map((relativeFile) => [
      relativeFile,
      sha256(gitFileAt(root, FROZEN_BASELINE_COMMIT, relativeFile)),
    ]),
  );
}

function currentInputRecords(root, canonicalManifest, externalCopies, descriptorEvidence) {
  const localeFiles = [
    'src/locales/de-DE.ts',
    ...fs
      .readdirSync(path.resolve(root, 'src/locales/de-DE'))
      .filter((fileName) => fileName.endsWith('.ts'))
      .sort()
      .map((fileName) => `src/locales/de-DE/${fileName}`),
  ];
  const files = [
    CANONICAL_MANIFEST,
    DYNAMIC_FAMILIES,
    ACTIVATION_ENTRY_TRANSLATIONS,
    FROZEN_CONTEXT_LEDGER,
    FROZEN_REVIEW_PROVENANCE,
    SOURCE_ALLOWLIST,
    'scripts/i18n/audit-locales.mjs',
    'scripts/i18n/german-frozen-review-check.mjs',
    'scripts/i18n/german-runtime-policy.mjs',
    'scripts/i18n/german-runtime-activation.mjs',
    'scripts/i18n/german-runtime-delta-review.mjs',
    ...localeFiles,
  ];
  const fileRecords = files.map((relativeFile) => ({
    kind: 'file',
    path: relativeFile,
    sha256: fileDigest(root, relativeFile),
  }));
  const extractedRecords = externalCopies.map(
    ({ id, path: relativeFile, symbol, extractedCopyDigest }) => ({
      kind: 'extracted-copy',
      id,
      path: relativeFile,
      symbol,
      sha256: extractedCopyDigest,
    }),
  );
  extractedRecords.push({
    kind: 'extracted-descriptor-map',
    id: descriptorEvidence.id,
    path: descriptorEvidence.path,
    family: descriptorEvidence.family,
    sha256: descriptorEvidence.extractedDescriptorDigest,
  });
  return {
    canonicalAuditedInputDigest: canonicalManifest.source.auditedInputDigest,
    inputs: [...fileRecords, ...extractedRecords].sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'),
    ),
  };
}

export function buildRuntimeActivationManifest(root) {
  const canonicalManifest = readJson(root, CANONICAL_MANIFEST);
  const baselineManifest = readJsonAtGitCommit(root, FROZEN_BASELINE_COMMIT, CANONICAL_MANIFEST);
  const externalCopies = EXTERNAL_TRACKED_COPY_INPUTS.map((definition) =>
    extractTrackedCopyInput(root, definition),
  );
  const descriptorEvidence = extractReviewGateDescriptorEvidence(root);
  const currentInputs = currentInputRecords(
    root,
    canonicalManifest,
    externalCopies,
    descriptorEvidence,
  );
  const baselineDigests = frozenInputDigests(root);
  const leafModuleCounts = Object.fromEntries(
    ACTIVE_LOCALES.map((locale) => [
      locale,
      canonicalManifest.localeTopology?.[locale]?.leafModules?.length ?? null,
    ]),
  );
  const distinctLeafModuleCounts = new Set(Object.values(leafModuleCounts));
  if (distinctLeafModuleCounts.size !== 1 || distinctLeafModuleCounts.has(null)) {
    throw new Error('Every active locale must have the same canonical leaf-module topology.');
  }
  const [leafModuleCount] = distinctLeafModuleCounts;

  const manifest = {
    schemaVersion: RUNTIME_ACTIVATION_SCHEMA,
    issue: 'https://github.com/linancn/tiangong-lca-next/issues/606',
    locale: 'de-DE',
    baseline: {
      sourceCommit: FROZEN_BASELINE_COMMIT,
      messageCount: BASELINE_MESSAGE_COUNT,
      leafMessageCount: 2682,
      activationEntryCount: 7,
      frozenInputDigests: baselineDigests,
      frozenCanonicalAuditedInputDigest: baselineManifest.source?.auditedInputDigest ?? null,
      evidenceContract:
        'The immutable merged de-DE runtime baseline retains every previously accepted German, English, and Chinese value. Issue #606 reviews only its explicit new-message delta; local human decisions remain outside Git.',
    },
    delta: {
      newMessageIds: NEW_MESSAGE_IDS,
      newMessageCount: NEW_MESSAGE_IDS.length,
      modifiedBaselineMessageIds: MODIFIED_BASELINE_MESSAGE_IDS,
      modifiedBaselineMessageCount: MODIFIED_BASELINE_MESSAGE_IDS.length,
      externalTrackedCopyInputs: externalCopies.map(
        ({ values: _values, ...trackedInput }) => trackedInput,
      ),
      externalTrackedCopyCount: externalCopies.length,
      reviewGateDescriptorEvidence: descriptorEvidence,
      localReviewItemCount:
        NEW_MESSAGE_IDS.length + MODIFIED_BASELINE_MESSAGE_IDS.length + externalCopies.length,
      localConfirmationDefaultPath: DELTA_CONFIRMATION,
    },
    activeRuntime: {
      activeLocales: ACTIVE_LOCALES,
      canonicalGermanLocale: 'de-DE',
      topLevelBundle: 'src/locales/de-DE.ts',
      leafModuleCount,
      leafModuleCounts,
      finalMessageCount: FINAL_MESSAGE_COUNT,
      allowedGermanRuntimeLocaleLiterals: ['de', 'de-DE', 'de-de', 'de_DE'],
      regionalBundlesAllowed: false,
      aliasesNormalizeTo: 'de-DE',
      antDesignAdapter: 'de_DE',
      dayjsAdapter: 'de',
      datasetTextLanguageFallback: 'en',
      docsAndLegalFallback: 'en',
    },
    reviewPolicy: {
      baselineHumanReview: 'carry-forward-only-when-frozen-inputs-and-values-match',
      deltaHumanReview: 'ignored-local-hash-bound-confirmation-required',
      githubHumanDecisionEvidence: false,
      mechanicalTranslationAllowed: false,
      requiredContext:
        'English, Chinese, real callsites, product concept, UI role/state, user-visible consequence, neighboring workflow, LCA/TIDAS terminology, ICU/placeholders/technical tokens, and length risk.',
    },
    source: {
      canonicalManifest: CANONICAL_MANIFEST,
      canonicalAuditedInputDigest: currentInputs.canonicalAuditedInputDigest,
      digestAlgorithm: 'sha256',
      inputs: currentInputs.inputs,
    },
  };
  manifest.source.inputDigest = hashJson(manifest.source.inputs);
  return manifest;
}

export function messageContext(messageId) {
  if (messageId.startsWith('pages.dataProcessing.bundle.')) {
    return {
      concept:
        'Persisted Calculation Bundle inventory, integrity evidence, LCI/LCIA rows, and guarded artifact downloads.',
      uiRole: messageId.includes('download')
        ? 'download action or recoverable download feedback'
        : 'calculation-result panel label, status, or evidence field',
      consequence:
        'Data managers must distinguish directed inventory values, LCIA methods, completeness, hashes, and download controls without confusing the private calculation evidence with a public release.',
      rationale:
        'LCI, LCIA, UUID, JSON, CSV, hash values, units, locations, and directions remain exact technical concepts while surrounding actions and state are natural German.',
      terminology: [
        'Berechnungspaket',
        'Abdeckung',
        'LCIA-Methode',
        'Momentaufnahme',
        'Nachweis',
        'Artefakt',
      ],
      lengthRisk:
        'High: field labels, badges, tables, tabs, and compact action rows share a responsive management panel.',
    };
  }
  if (messageId.startsWith('pages.dataProcessing.release.')) {
    return {
      concept:
        'Canonical LifecycleModel and Result Process release state, independent readback verification, and self-contained package download.',
      uiRole: messageId.includes('download')
        ? 'release download action or expired-link feedback'
        : 'release panel title, state, identity, verification, or blocker label',
      consequence:
        'Users must understand whether a result is published, independently read back, blocked, or awaiting verification before downloading a TIDAS/ILCD package.',
      rationale:
        'Model/Result, Release, ID, hash values, TIDAS, and ILCD are retained as domain identifiers; workflow state and recovery instructions are localized.',
      terminology: [
        'Model-/Result-Release',
        'Rückleseprüfung',
        'Release-Version',
        'Blockade',
        'Artefaktsatz',
      ],
      lengthRisk:
        'High: status labels and recovery copy appear beside hashes and download controls in a narrow panel.',
    };
  }
  if (messageId === 'pages.dataProcessing.publications.legacyTitle') {
    return {
      concept: 'Label separating legacy LCIA publication records from canonical releases.',
      uiRole: 'legacy-publication section title',
      consequence:
        'Users must not mistake an older LCIA-only publication for the new verified Model/Result release.',
      rationale: 'The wording preserves LCIA while clearly marking the older publication path.',
      terminology: ['Alte LCIA-Veröffentlichung'],
      lengthRisk: 'Low: a short section heading.',
    };
  }
  if (messageId === 'pages.process.view.releases') {
    return {
      concept:
        'Process-detail tab containing canonical releases associated with the source Process.',
      uiRole: 'process-detail tab label',
      consequence:
        'Users need a concise route from the source Process to its independently identified result releases.',
      rationale: 'The short plural label matches the existing process-detail navigation style.',
      terminology: ['Veröffentlichungen'],
      lengthRisk: 'Low: compact tab label.',
    };
  }
  if (messageId === 'pages.button.check.errorWithSections') {
    return {
      concept: 'Dataset validation failure summary across one or more editor sections.',
      uiRole: 'error feedback shown after a failed data check',
      consequence:
        'The user must know which localized editor sections contain errors without inheriting Chinese punctuation or source-language fragment order.',
      rationale:
        'A complete sentence owns the grammar; {sections} is produced by the locale-aware list formatter.',
      terminology: ['Datenprüfung', 'Bereiche'],
      lengthRisk: 'Medium: notification/toast copy with a variable-length localized section list.',
    };
  }
  if (
    messageId === 'component.globalHeader.help.englishFallback' ||
    messageId.endsWith('.englishFallbackLabel')
  ) {
    return {
      concept: 'A German-shell link whose destination content is intentionally English.',
      uiRole: 'navigation/link label',
      consequence:
        'The user must know before opening the link that German help/legal content is not being claimed.',
      rationale:
        'The explicit English label prevents a misleading language promise and a Chinese fallback.',
      terminology: ['Englisch', 'Hilfedokumentation', 'Nutzungsbedingungen', 'Datenschutzhinweis'],
      lengthRisk: 'Medium: compact login/header controls must remain readable.',
    };
  }
  if (messageId.startsWith('component.tidasPackage.import.apiGuide.')) {
    return {
      concept: 'TIDAS API import documentation link with an intentional English destination.',
      uiRole: messageId.endsWith('.docs') ? 'link label' : 'explanatory help',
      consequence:
        'The user must understand both the import-integration purpose and that the opened documentation is English.',
      rationale: 'This is a reviewed expected-English fallback, not untranslated app-owned copy.',
      terminology: ['API-Import', 'englischsprachige Dokumentation', 'Anfrageablauf'],
      lengthRisk: 'Medium: alert description inside the import modal.',
    };
  }
  if (messageId.startsWith('pages.process.reviewSubmitGate.evidence.')) {
    return {
      concept: 'Field label attached to a concrete numerical-stability gate evidence value.',
      uiRole: 'diagnostic evidence label',
      consequence:
        'Reviewers must distinguish process, exchange/flow, consuming/providing process, version, and target evidence while technical values stay unchanged.',
      rationale: 'Only the label is localized; backend identifiers remain interpolation values.',
      terminology: [
        'Prozess',
        'Austausch',
        'Fluss',
        'Nachfragender Prozess',
        'Bereitstellender Prozess',
        'Zielprozess',
      ],
      lengthRisk: 'High: multiple label-value pairs share a narrow task-center diagnostic surface.',
    };
  }
  if (messageId.startsWith('pages.process.reviewSubmitGate.diagnostics.')) {
    return {
      concept: 'Identifier label for the review-submission gate worker-job chain.',
      uiRole: 'diagnostic identifier label',
      consequence:
        'Operators must tell the root, submit, gate, and final review-submission jobs apart without translating the identifier value.',
      rationale: 'German compounds retain Worker/Job/ID as established runtime terminology.',
      terminology: ['Worker-Job-ID', 'Einreichung', 'Stabilitätsvalidierung'],
      lengthRisk: 'High: shown in compact diagnostic rows and copied alongside raw identifiers.',
    };
  }
  if (messageId.startsWith('pages.process.lca.taskCenter.diagnostics.')) {
    return {
      concept: 'Ordinary LCA or TIDAS package background-task diagnostic field.',
      uiRole: messageId.endsWith('.empty') ? 'empty-state feedback' : 'diagnostic field label',
      consequence:
        'The user must understand task identity, ordering, job type, request payload, or the absence of diagnostics without exposing hard-coded snake_case labels.',
      rationale:
        'The UI label is localized while raw requests, enum values, and IDs remain technical data.',
      terminology: [
        'Aufgaben-ID',
        'Worker-Job-ID',
        'Stamm-Job-ID',
        'Aufgabenart',
        'Anfrageparameter',
      ],
      lengthRisk: 'Medium: labels wrap in a 440px diagnostic stack.',
    };
  }
  if (messageId === 'teams.notifications.unknownTeam') {
    return {
      concept: 'Fallback team name when an invitation payload has no usable localized title.',
      uiRole: 'team-name table-cell fallback in the notifications list',
      consequence:
        'The user sees a locale-owned placeholder instead of an English leak when teamTitle is missing, empty, or blank.',
      rationale:
        'The fallback labels absent application data; German still prefers an English dataset title when one exists, preserving the existing data-language strategy.',
      terminology: ['Team', 'Unbekanntes Team'],
      lengthRisk: 'Low: short value in the existing team-name table column.',
    };
  }
  throw new Error(`No complete delta context is registered for ${messageId}.`);
}

export function externalCopyContext(id) {
  if (id === 'import-report.human-summary') {
    return {
      concept: 'Downloadable TIDAS import-result summary with counts and backend result code.',
      uiRole: 'report summary outside the React Intl message catalog',
      consequence:
        'The downloaded report must accurately distinguish total entries, skipped open data, user-data conflicts, imported entries, and validation issues.',
      rationale:
        'The report schema keeps de_DE as an adapter key while the product still has only one German locale.',
      terminology: [
        'Importergebnis',
        'Open-Data-Datensätze',
        'benutzereigene Daten',
        'Validierungsprobleme',
      ],
      lengthRisk: 'Low for layout; high semantic density in a single sentence.',
    };
  }
  if (id === 'import-report.readme-markdown') {
    return {
      concept: 'Long-form repair guide embedded in a downloaded TIDAS import report.',
      uiRole: 'downloaded Markdown guide outside the React Intl message catalog',
      consequence:
        'The user must be able to locate validation paths, interpret severity/context, resolve user-data conflicts, and understand filtered open data without losing technical field names.',
      rationale:
        'German prose explains the workflow; schema keys, enum values, file paths, and identifiers remain exact technical tokens.',
      terminology: [
        'Validierungsproblem',
        'Schweregrad',
        'benutzereigene Daten',
        'Open Data',
        'Datenpaket',
      ],
      lengthRisk:
        'No viewport risk; high consistency risk across headings, lists, and repair steps.',
    };
  }
  throw new Error(`No complete external-copy context is registered for ${id}.`);
}
