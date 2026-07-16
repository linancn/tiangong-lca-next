#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  buildRuntimeActivationManifest,
  CANONICAL_MANIFEST,
  DELTA_CONFIRMATION,
  DYNAMIC_FAMILIES,
  EXTERNAL_TRACKED_COPY_INPUTS,
  externalCopyContext,
  extractReviewGateDescriptorEvidence,
  extractTrackedCopyInput,
  fileDigest,
  FROZEN_BASELINE_COMMIT,
  FROZEN_CONTEXT_LEDGER,
  hashJson,
  messageContext,
  MODIFIED_BASELINE_MESSAGE_IDS,
  NEW_MESSAGE_IDS,
  readJson,
  REVIEW_GATE_FAMILY,
  RUNTIME_ACTIVATION_MANIFEST,
} from './german-runtime-policy.mjs';

export const DELTA_SCOPE_SCHEMA = 'tiangong.i18n-de-runtime-delta-scope.v1';
export const DELTA_CONFIRMATION_SCHEMA = 'tiangong.i18n-de-runtime-delta-confirmation.v1';

const PRIVATE_REVIEW_DIRECTORY = '.local/i18n-de-DE';
const CONFIRMATION_BEGIN = '<!-- ISSUE-602-DELTA-CONFIRMATION-BEGIN -->';
const CONFIRMATION_END = '<!-- ISSUE-602-DELTA-CONFIRMATION-END -->';
const NOTE_BEGIN = '<!-- ISSUE-602-DELTA-NOTE-BEGIN:';
const NOTE_END = '<!-- ISSUE-602-DELTA-NOTE-END:';
const DECISION_KEYS = ['productContext', 'nativeGerman', 'lcaTidasTerminology'];
const APPROVAL_KEYS = [
  'productContextApproved',
  'nativeGermanApproved',
  'lcaTidasTerminologyApproved',
];

const normalizeNewlines = (value) => value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');

const noteToken = (id) => Buffer.from(id).toString('base64url');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

function confirmationPattern() {
  return new RegExp(
    `${escapeRegExp(CONFIRMATION_BEGIN)}\\n` +
      '```json\\n([\\s\\S]*?)\\n```\\n' +
      escapeRegExp(CONFIRMATION_END),
    'gu',
  );
}

export function normalizeDeltaReviewBody(markdown) {
  let normalized = normalizeNewlines(markdown);
  normalized = normalized.replace(
    confirmationPattern(),
    `${CONFIRMATION_BEGIN}\n[confirmation block omitted from body digest]\n${CONFIRMATION_END}`,
  );
  normalized = normalized.replace(
    /<!-- ISSUE-602-DELTA-NOTE-BEGIN:([^ ]+) -->[\s\S]*?<!-- ISSUE-602-DELTA-NOTE-END:\1 -->/gu,
    (_match, token) =>
      `<!-- ISSUE-602-DELTA-NOTE-BEGIN:${token} -->\n[review note omitted from body digest]\n<!-- ISSUE-602-DELTA-NOTE-END:${token} -->`,
  );
  return normalized;
}

export const deltaReviewBodyDigest = (markdown) => hashJson(normalizeDeltaReviewBody(markdown));

function assertPrivatePath(root, relativeFile, { mustExist }) {
  const normalized = relativeFile.split(path.sep).join('/');
  if (!normalized.startsWith(`${PRIVATE_REVIEW_DIRECTORY}/`)) {
    throw new Error(`Delta confirmation must stay under ${PRIVATE_REVIEW_DIRECTORY}.`);
  }
  const target = path.resolve(root, relativeFile);
  const privateRoot = path.resolve(root, PRIVATE_REVIEW_DIRECTORY);
  if (target === privateRoot || !target.startsWith(`${privateRoot}${path.sep}`)) {
    throw new Error(`Delta confirmation must stay under ${PRIVATE_REVIEW_DIRECTORY}.`);
  }
  if (mustExist && !fs.existsSync(target)) throw new Error('Local delta confirmation is missing.');
  for (let current = target; current.startsWith(privateRoot); current = path.dirname(current)) {
    if (!fs.existsSync(current)) continue;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('The private delta-review path must not traverse a symbolic link.');
    }
    if (current === privateRoot) break;
  }
  const relativeTarget = path.relative(root, target);
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', relativeTarget], {
    cwd: root,
    stdio: 'ignore',
  });
  if (tracked.status === 0) throw new Error('Local delta confirmation must not be tracked by Git.');
  const ignored = spawnSync('git', ['check-ignore', '--quiet', '--', relativeTarget], {
    cwd: root,
    stdio: 'ignore',
  });
  if (ignored.status !== 0)
    throw new Error('Local delta confirmation must be covered by .gitignore.');
  return target;
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function currentManifestIsFresh(root, expected) {
  const actual = readJson(root, RUNTIME_ACTIVATION_MANIFEST);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function buildDeltaReviewScope(root) {
  const runtimeManifest = buildRuntimeActivationManifest(root);
  if (!currentManifestIsFresh(root, runtimeManifest)) {
    throw new Error(
      `Runtime activation manifest is stale; run npm run i18n:de:runtime:manifest:write first.`,
    );
  }
  const canonicalManifest = readJson(root, CANONICAL_MANIFEST);
  const dynamicRegistry = readJson(root, DYNAMIC_FAMILIES);
  const descriptorEvidence = extractReviewGateDescriptorEvidence(root);
  const frozenLedger = readJson(root, FROZEN_CONTEXT_LEDGER);
  const canonicalById = new Map(canonicalManifest.messages.map((message) => [message.id, message]));
  const frozenById = new Map(frozenLedger.messages.map((message) => [message.id, message]));
  const allMessageIds = [...NEW_MESSAGE_IDS, ...MODIFIED_BASELINE_MESSAGE_IDS];
  const messages = allMessageIds.map((id) => {
    const current = canonicalById.get(id);
    if (!current) throw new Error(`Canonical manifest is missing delta message ${id}.`);
    const frozen = frozenById.get(id) ?? null;
    const isNew = NEW_MESSAGE_IDS.includes(id);
    if (isNew === Boolean(frozen)) {
      throw new Error(
        isNew
          ? `New delta message ${id} already exists in the frozen baseline.`
          : `Modified baseline message ${id} is absent from the frozen baseline.`,
      );
    }
    const dynamicFamilies = (current.dynamicFamilies ?? []).map((familyName) => {
      const family = dynamicRegistry.families?.[familyName];
      if (!family) {
        throw new Error(`Dynamic family ${familyName} for ${id} is absent from the registry.`);
      }
      const callsites = (dynamicRegistry.callsites ?? [])
        .filter(({ family: callsiteFamily }) => callsiteFamily === familyName)
        .map(({ api, count, file, expression }) => ({ api, count, file, expression }));
      if (callsites.length === 0) {
        throw new Error(`Dynamic family ${familyName} for ${id} has no reviewed callsite.`);
      }
      const descriptorMaps = familyName === REVIEW_GATE_FAMILY ? descriptorEvidence.maps : [];
      if (
        familyName === REVIEW_GATE_FAMILY &&
        JSON.stringify([...family.keys].sort()) !== JSON.stringify(descriptorEvidence.messageIds)
      ) {
        throw new Error(
          `${familyName} registry keys do not match the two runtime descriptor maps.`,
        );
      }
      return {
        family: familyName,
        proof: family.proof,
        unknownHandling: family.unknownHandling,
        keys: family.keys,
        descriptorMaps,
        callsites,
      };
    });
    const item = {
      id,
      changeType: isNew ? 'new-message' : 'modified-baseline-message',
      moduleOwnership: current.moduleOwnership,
      english: current.translations['en-US'],
      chinese: current.translations['zh-CN'],
      german: current.translations['de-DE'],
      frozen:
        frozen === null
          ? null
          : {
              english: frozen.english,
              chinese: frozen.chinese,
              german: frozen.german,
              hashes: frozen.hashes,
            },
      productionReferences: current.references,
      dynamicFamilies,
      defaultMessages: current.defaultMessages,
      context: messageContext(id),
    };
    return { ...item, itemDigest: hashJson(item) };
  });
  const externalTrackedCopy = EXTERNAL_TRACKED_COPY_INPUTS.map((definition) => {
    const extracted = extractTrackedCopyInput(root, definition);
    const item = {
      ...extracted,
      context: externalCopyContext(extracted.id),
    };
    return { ...item, itemDigest: hashJson(item) };
  });
  const scope = {
    schemaVersion: DELTA_SCOPE_SCHEMA,
    issue: 'https://github.com/linancn/tiangong-lca-next/issues/602',
    locale: 'de-DE',
    source: {
      frozenBaselineCommit: FROZEN_BASELINE_COMMIT,
      reviewContract: 'issue-602-exact-28-items-with-related-context-v1',
      reviewRendererDigest: fileDigest(root, 'scripts/i18n/german-runtime-delta-review.mjs'),
    },
    messages,
    externalTrackedCopy,
    counts: {
      newMessages: NEW_MESSAGE_IDS.length,
      modifiedBaselineMessages: MODIFIED_BASELINE_MESSAGE_IDS.length,
      externalTrackedCopy: externalTrackedCopy.length,
      totalItems: messages.length + externalTrackedCopy.length,
    },
  };
  return { ...scope, scopeDigest: hashJson(scope) };
}

const fenced = (value, language = '') => `\`\`\`\`${language}\n${value}\n\`\`\`\``;

function renderReferences(references) {
  if (!references || references.length === 0) return '- 直接调用点：无';
  return [
    '- 直接调用点：',
    ...references.map(
      ({ path: sourcePath, line, column, kind, defaultMessage }) =>
        `  - ${sourcePath}:${line}:${column} · ${kind}${defaultMessage === null ? '' : ` · defaultMessage=${JSON.stringify(defaultMessage)}`}`,
    ),
  ].join('\n');
}

function renderDynamicFamilies(dynamicFamilies) {
  if (!dynamicFamilies || dynamicFamilies.length === 0) return '- 动态 family 调用点：无';
  return [
    '- 受审动态 family 证据：',
    ...dynamicFamilies.flatMap(
      ({ family, proof, unknownHandling, keys, descriptorMaps, callsites }) => [
        `  - family：${family}`,
        `    - family proof：${proof}`,
        `    - 边界类型：${unknownHandling.kind}`,
        `    - 边界 proof：${unknownHandling.proof}`,
        `    - 闭集成员（${keys.length}）：${keys.join('、')}`,
        ...(descriptorMaps.length === 0
          ? []
          : [
              '    - 运行时 descriptor maps：',
              ...descriptorMaps.map(
                ({ symbol, entries }) =>
                  `      - ${symbol}：${entries.map(({ member, id }) => `${member} → ${id}`).join('；')}`,
              ),
            ]),
        '    - 真实调用点：',
        ...callsites.map(
          ({ file, api, expression, count }) =>
            `      - ${file} · ${api}(${expression}) · expression=${JSON.stringify(expression)} · count=${count}`,
        ),
      ],
    ),
  ].join('\n');
}

function renderMessage(message, index, total) {
  const token = noteToken(`message:${message.id}`);
  const context = message.context;
  return [
    `## ${index + 1} / ${total} — ${message.id}`,
    '',
    `- 变更类型：${message.changeType}`,
    `- owning module：${message.moduleOwnership['en-US']?.join(', ') ?? 'unknown'}`,
    `- 产品概念：${context.concept}`,
    `- UI role/state：${context.uiRole}`,
    `- 用户可见后果：${context.consequence}`,
    `- 翻译理由：${context.rationale}`,
    `- 术语：${context.terminology.join('、')}`,
    `- 长度/布局风险：${context.lengthRisk}`,
    renderReferences(message.productionReferences),
    renderDynamicFamilies(message.dynamicFamilies),
    '',
    '### Canonical English',
    fenced(message.english?.value ?? '<missing>', 'text'),
    '',
    '### Canonical Chinese',
    fenced(message.chinese?.value ?? '<missing>', 'text'),
    '',
    '### German candidate',
    fenced(message.german?.value ?? '<missing>', 'text'),
    ...(message.frozen
      ? [
          '',
          '### Frozen #601 English (before this delta)',
          fenced(message.frozen.english?.value ?? '<missing>', 'text'),
          '',
          '### Frozen #601 Chinese (before this delta)',
          fenced(message.frozen.chinese?.value ?? '<missing>', 'text'),
          '',
          '### Frozen #601 German (before this delta)',
          fenced(message.frozen.german?.value ?? '<missing>', 'text'),
        ]
      : []),
    '',
    `- ICU English：${JSON.stringify(message.english?.argumentSignature ?? [])}`,
    `- ICU Chinese：${JSON.stringify(message.chinese?.argumentSignature ?? [])}`,
    `- ICU German：${JSON.stringify(message.german?.argumentSignature ?? [])}`,
    `- itemDigest：${message.itemDigest}`,
    '',
    '### 人工备注（可编辑）',
    `${NOTE_BEGIN}${token} -->`,
    '',
    `${NOTE_END}${token} -->`,
  ].join('\n');
}

function renderExternal(item, index) {
  const token = noteToken(`external:${item.id}`);
  const context = item.context;
  return [
    `## External ${index + 1} / ${EXTERNAL_TRACKED_COPY_INPUTS.length} — ${item.id}`,
    '',
    `- tracked source：${item.path} · ${item.symbol}`,
    `- 产品概念：${context.concept}`,
    `- UI role/state：${context.uiRole}`,
    `- 用户可见后果：${context.consequence}`,
    `- 翻译理由：${context.rationale}`,
    `- 术语：${context.terminology.join('、')}`,
    `- 长度/布局风险：${context.lengthRisk}`,
    '',
    '### Canonical English source expression',
    fenced(item.values.en_US, 'tsx'),
    '',
    '### Canonical Chinese source expression',
    fenced(item.values.zh_CN, 'tsx'),
    '',
    '### German candidate source expression',
    fenced(item.values.de_DE, 'tsx'),
    '',
    `- itemDigest：${item.itemDigest}`,
    '',
    '### 人工备注（可编辑）',
    `${NOTE_BEGIN}${token} -->`,
    '',
    `${NOTE_END}${token} -->`,
  ].join('\n');
}

function renderConfirmation(scope, reviewBodyDigest) {
  const confirmation = {
    schemaVersion: DELTA_CONFIRMATION_SCHEMA,
    locale: 'de-DE',
    scope: 'issue-602-runtime-delta',
    scopeDigest: scope.scopeDigest,
    reviewBodyDigest,
    reviewer: '',
    reviewedAt: '',
    decisions: {
      productContext: 'PENDING',
      nativeGerman: 'PENDING',
      lcaTidasTerminology: 'PENDING',
    },
    approvals: {
      productContextApproved: false,
      nativeGermanApproved: false,
      lcaTidasTerminologyApproved: false,
    },
    counts: scope.counts,
    unresolvedCriticalOrMajor: 0,
    notes: '',
  };
  return `${CONFIRMATION_BEGIN}\n\`\`\`json\n${JSON.stringify(confirmation, null, 2)}\n\`\`\`\n${CONFIRMATION_END}`;
}

export function renderDeltaReviewMarkdown(scope) {
  const placeholder = renderConfirmation(scope, '__REVIEW_BODY_DIGEST__');
  const sections = [
    '# Issue #602 German runtime delta review',
    '',
    '此文件仅审阅 #602 新增/修改的 German 文案，不重新打开 #601 已批准的 2,665 条完整目录。文件必须保持本地、Git ignored，不能上传或摘录到 GitHub。',
    '',
    '## 审阅要求',
    '',
    '1. 同时阅读 English、Chinese、真实调用点、产品概念、UI role/state、用户后果、术语、ICU/technical token 与长度风险。',
    '2. 不接受脱离上下文的机械直译。发现 Critical/Major 问题时保留 PENDING 或使用 CHANGES_REQUESTED。',
    '3. 仅在全部内容可接受后填写末尾 JSON：reviewer/reviewedAt，三个 decision=APPROVED，三个 approval=true。',
    '4. 只能编辑人工备注区域和确认块；正文或 tracked copy 变化会使本确认失效。',
    '',
    `- 新 message：${scope.counts.newMessages}`,
    `- 修改 baseline message：${scope.counts.modifiedBaselineMessages}`,
    `- bundle 外 tracked prose：${scope.counts.externalTrackedCopy}`,
    `- 总审阅项：${scope.counts.totalItems}`,
    '',
    '# Locale message delta',
    '',
    ...scope.messages.map((message, index) => renderMessage(message, index, scope.messages.length)),
    '',
    '# Bundle-external tracked German prose',
    '',
    ...scope.externalTrackedCopy.map(renderExternal),
    '',
    '# Human confirmation',
    '',
    placeholder,
    '',
  ];
  const placeholderMarkdown = sections.join('\n');
  return placeholderMarkdown.replace(
    '__REVIEW_BODY_DIGEST__',
    deltaReviewBodyDigest(placeholderMarkdown),
  );
}

function parseConfirmation(markdown) {
  const matches = [...normalizeNewlines(markdown).matchAll(confirmationPattern())];
  if (matches.length !== 1) throw new Error('Delta review must contain one confirmation block.');
  return JSON.parse(matches[0][1]);
}

export function evaluateDeltaConfirmation(markdown, scope) {
  const reasons = [];
  const canonical = renderDeltaReviewMarkdown(scope);
  let confirmation;
  try {
    confirmation = parseConfirmation(markdown);
  } catch (error) {
    return { approved: false, reasons: [error instanceof Error ? error.message : String(error)] };
  }
  const expectedKeys = [
    'schemaVersion',
    'locale',
    'scope',
    'scopeDigest',
    'reviewBodyDigest',
    'reviewer',
    'reviewedAt',
    'decisions',
    'approvals',
    'counts',
    'unresolvedCriticalOrMajor',
    'notes',
  ];
  if (!exactKeys(confirmation, expectedKeys)) reasons.push('Confirmation fields are incomplete.');
  if (confirmation.schemaVersion !== DELTA_CONFIRMATION_SCHEMA)
    reasons.push('Confirmation schema is stale.');
  if (confirmation.locale !== 'de-DE' || confirmation.scope !== 'issue-602-runtime-delta') {
    reasons.push('Confirmation targets the wrong locale or scope.');
  }
  if (confirmation.scopeDigest !== scope.scopeDigest) reasons.push('Confirmation scope is stale.');
  if (
    confirmation.reviewBodyDigest !== deltaReviewBodyDigest(canonical) ||
    deltaReviewBodyDigest(markdown) !== deltaReviewBodyDigest(canonical)
  ) {
    reasons.push('Visible review body has changed since generation.');
  }
  if (typeof confirmation.reviewer !== 'string' || confirmation.reviewer.trim() === '') {
    reasons.push('A local reviewer reference is required.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(confirmation.reviewedAt ?? '')) {
    reasons.push('reviewedAt must use YYYY-MM-DD.');
  }
  if (!exactKeys(confirmation.decisions, DECISION_KEYS)) {
    reasons.push('All three review decisions are required.');
  } else {
    DECISION_KEYS.forEach((key) => {
      if (confirmation.decisions[key] !== 'APPROVED') reasons.push(`${key} is not APPROVED.`);
    });
  }
  if (!exactKeys(confirmation.approvals, APPROVAL_KEYS)) {
    reasons.push('All three explicit approval flags are required.');
  } else {
    APPROVAL_KEYS.forEach((key) => {
      if (confirmation.approvals[key] !== true) reasons.push(`${key} is not true.`);
    });
  }
  if (JSON.stringify(confirmation.counts) !== JSON.stringify(scope.counts)) {
    reasons.push('Confirmation counts are stale.');
  }
  if (confirmation.unresolvedCriticalOrMajor !== 0) {
    reasons.push('Critical/Major findings remain unresolved.');
  }
  if (typeof confirmation.notes !== 'string') reasons.push('notes must be a string.');

  const expectedTokens = [
    ...scope.messages.map(({ id }) => noteToken(`message:${id}`)),
    ...scope.externalTrackedCopy.map(({ id }) => noteToken(`external:${id}`)),
  ].sort();
  const actualTokens = [
    ...normalizeNewlines(markdown).matchAll(/<!-- ISSUE-602-DELTA-NOTE-BEGIN:([^ ]+) -->/gu),
  ]
    .map((match) => match[1])
    .sort();
  if (JSON.stringify(actualTokens) !== JSON.stringify(expectedTokens)) {
    reasons.push('Per-item review-note boundaries do not match the delta scope.');
  }
  return { approved: reasons.length === 0, reasons };
}

export function readDeltaConfirmation(root, relativeFile = DELTA_CONFIRMATION) {
  let scope = null;
  try {
    scope = buildDeltaReviewScope(root);
    const target = assertPrivatePath(root, relativeFile, { mustExist: true });
    return {
      ...evaluateDeltaConfirmation(fs.readFileSync(target, 'utf8'), scope),
      counts: scope.counts,
    };
  } catch (error) {
    return {
      approved: false,
      reasons: [error instanceof Error ? error.message : String(error)],
      counts: scope?.counts ?? {
        newMessages: NEW_MESSAGE_IDS.length,
        modifiedBaselineMessages: MODIFIED_BASELINE_MESSAGE_IDS.length,
        externalTrackedCopy: EXTERNAL_TRACKED_COPY_INPUTS.length,
        totalItems:
          NEW_MESSAGE_IDS.length +
          MODIFIED_BASELINE_MESSAGE_IDS.length +
          EXTERNAL_TRACKED_COPY_INPUTS.length,
      },
    };
  }
}

function parseArgs(argv) {
  const options = {
    operation: 'generate',
    root: process.cwd(),
    file: DELTA_CONFIRMATION,
    force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--generate') options.operation = 'generate';
    else if (argument === '--check') options.operation = 'check';
    else if (argument === '--force') options.force = true;
    else if (argument === '--root' || argument === '--file') {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      options[argument === '--root' ? 'root' : 'file'] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  options.root = path.resolve(options.root);
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const scope = buildDeltaReviewScope(options.root);
  if (options.operation === 'generate') {
    const target = assertPrivatePath(options.root, options.file, { mustExist: false });
    if (fs.existsSync(target) && !options.force) {
      throw new Error('Refusing to overwrite the existing delta confirmation without --force.');
    }
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    const temporary = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, renderDeltaReviewMarkdown(scope), { mode: 0o600 });
    fs.renameSync(temporary, target);
    fs.chmodSync(target, 0o600);
    process.stdout.write(
      `${JSON.stringify({ operation: 'generate', locale: 'de-DE', file: options.file, counts: scope.counts })}\n`,
    );
    return;
  }
  const result = readDeltaConfirmation(options.root, options.file);
  process.stdout.write(
    `${JSON.stringify({ operation: 'check', locale: 'de-DE', approved: result.approved, counts: result.counts, reasons: result.reasons })}\n`,
  );
  if (!result.approved) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `German runtime delta review failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}
