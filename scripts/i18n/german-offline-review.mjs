#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const OFFLINE_CONFIRMATION_SCHEMA = 'tiangong.i18n-de-offline-pilot-confirmation.v1';
export const OFFLINE_SCOPE_SCHEMA = 'tiangong.i18n-de-offline-pilot-review-scope.v1';
export const CATALOG_CONFIRMATION_SCHEMA = 'tiangong.i18n-de-offline-catalog-confirmation.v1';
export const CATALOG_SCOPE_SCHEMA = 'tiangong.i18n-de-offline-catalog-review-scope.v1';
export const DEFAULT_PILOT_REVIEW_PACK = 'docs/plans/i18n-de-DE/pilot-review-pack.json';
export const DEFAULT_PILOT_CONFIRMATION = '.local/i18n-de-DE/pilot-review-confirmation.md';
export const DEFAULT_CATALOG_CONFIRMATION = '.local/i18n-de-DE/catalog-review-confirmation.md';
export const PRIVATE_REVIEW_DIRECTORY = '.local/i18n-de-DE';

const CONFIRMATION_BEGIN = '<!-- TIANGONG_I18N_DE_CONFIRMATION_BEGIN -->';
const CONFIRMATION_END = '<!-- TIANGONG_I18N_DE_CONFIRMATION_END -->';
const NOTE_BEGIN_PREFIX = '<!-- TIANGONG_I18N_DE_NOTE_BEGIN:';
const NOTE_END_PREFIX = '<!-- TIANGONG_I18N_DE_NOTE_END:';
const DECISIONS = ['productContext', 'nativeGerman', 'lcaTidasDomain'];
const APPROVALS = [
  'allPilotMessages',
  'allBlockedContextProposals',
  'allPreferredBlockedGlossaryTerms',
];
const CONFIRMATION_KEYS = [
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

function normalizeNewlines(value) {
  return value.replace(/\r\n?/gu, '\n');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function displayReviewPath(root, target) {
  return isInside(root, target) ? path.relative(root, target) : '<external-private-path>';
}

function nearestExistingAncestor(target) {
  let current = path.resolve(target);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

function assertPrivateReviewPath(root, target, { mustExist = false } = {}) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const lexicalInsideRepository = isInside(resolvedRoot, resolvedTarget);
  const privateRoot = path.resolve(resolvedRoot, PRIVATE_REVIEW_DIRECTORY);

  if (lexicalInsideRepository && !isInside(privateRoot, resolvedTarget)) {
    throw new Error(
      `Repository-local confirmation files must stay under ${PRIVATE_REVIEW_DIRECTORY}.`,
    );
  }

  if (mustExist && !fs.existsSync(resolvedTarget)) {
    throw new Error('Local confirmation file is missing.');
  }
  if (fs.existsSync(resolvedTarget)) {
    const targetStats = fs.lstatSync(resolvedTarget);
    if (targetStats.isSymbolicLink() || !targetStats.isFile()) {
      throw new Error('Local confirmation must be a regular non-symlink file.');
    }
  }

  const existingParentPath = nearestExistingAncestor(path.dirname(resolvedTarget));
  if (!fs.statSync(existingParentPath).isDirectory()) {
    throw new Error('The nearest existing confirmation parent must be a directory.');
  }
  const existingParent = fs.realpathSync(existingParentPath);
  const realRoot = fs.realpathSync(resolvedRoot);
  if (!lexicalInsideRepository && isInside(realRoot, existingParent)) {
    throw new Error(
      `Repository-local confirmation files must stay under ${PRIVATE_REVIEW_DIRECTORY}.`,
    );
  }

  if (lexicalInsideRepository) {
    const relativeExistingParent = path.relative(resolvedRoot, existingParentPath);
    const expectedRealParent = path.resolve(realRoot, relativeExistingParent);
    if (existingParent !== expectedRealParent) {
      throw new Error('The private review directory must not traverse a symbolic link.');
    }
    const relativeTarget = path.relative(resolvedRoot, resolvedTarget);
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', relativeTarget], {
      cwd: resolvedRoot,
      encoding: 'utf8',
    });
    if (tracked.status === 0) {
      throw new Error('Local confirmation files must not be tracked by Git.');
    }
    const ignored = spawnSync('git', ['check-ignore', '--quiet', '--', relativeTarget], {
      cwd: resolvedRoot,
      encoding: 'utf8',
    });
    if (ignored.status !== 0) {
      throw new Error('Repository-local confirmation files must be covered by .gitignore.');
    }
  }

  return {
    absolutePath: resolvedTarget,
    displayPath: displayReviewPath(resolvedRoot, resolvedTarget),
  };
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function text(value, fallback = '未提供') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).normalize('NFC');
}

function inline(value, fallback = '未提供') {
  return text(value, fallback).replaceAll('|', '\\|').replace(/\r?\n/gu, '<br>');
}

function code(value) {
  return `\`${text(value).replaceAll('`', '\\`')}\``;
}

function bulletList(values, fallback = '无') {
  if (!Array.isArray(values) || values.length === 0) return `- ${fallback}\n`;
  return `${values.map((value) => `- ${text(value)}`).join('\n')}\n`;
}

function countScope(scope) {
  return {
    pilotMessages: scope.messages.length,
    blockedContextProposals: scope.blockedContextProposals.length,
    blockedGlossaryTerms: scope.blockedGlossaryTerms.length,
  };
}

export function buildPilotOfflineReviewScope(reviewPack) {
  if (!reviewPack || reviewPack.locale !== 'de-DE' || !Array.isArray(reviewPack.messages)) {
    throw new Error('German pilot review pack must contain locale de-DE and a messages array.');
  }
  const blockedGlossaryTerms = reviewPack.blockedGlossaryTerms ?? [];
  const scope = {
    schemaVersion: OFFLINE_SCOPE_SCHEMA,
    locale: 'de-DE',
    localePolicy: {
      canonicalTag: 'de-DE',
      regionalVariants: false,
      vocabulary: 'region-neutral-standard-german',
    },
    source: {
      manifestDigest: reviewPack.source?.manifestDigest ?? null,
      reviewPolicyDigest: reviewPack.source?.reviewPolicyDigest ?? null,
      pilotDigest: reviewPack.source?.pilotDigest ?? null,
      candidateProducer: reviewPack.policy?.candidateProducer ?? null,
    },
    messages: reviewPack.messages
      .map(({ id, hashes }) => ({
        messageId: id,
        contextHash: hashes?.contextHash ?? null,
        translationHash: hashes?.translationHash ?? null,
        dossierHash: hashes?.dossierHash ?? null,
        reviewScopeHash: hashes?.reviewScopeHash ?? null,
        domainReviewRequired: hashes?.domainReviewRequired ?? null,
      }))
      .sort((left, right) => left.messageId.localeCompare(right.messageId, 'en')),
    blockedContextProposals: reviewPack.messages
      .filter(({ context }) => context?.status === 'BLOCKED_CONTEXT')
      .map(({ id, context, hashes }) => ({
        messageId: id,
        contextHash: hashes?.contextHash ?? null,
        proposal: context?.reviewedAnnotation ?? null,
      }))
      .sort((left, right) => left.messageId.localeCompare(right.messageId, 'en')),
    blockedGlossaryTerms: blockedGlossaryTerms
      .map((term) => ({
        termId: term.termId,
        sourceEnglish: term.sourceEnglish,
        sourceChinese: term.sourceChinese ?? [],
        germanPreferred: term.germanPreferred,
        abbreviation: term.abbreviation ?? null,
        alternatives: term.alternatives ?? [],
        includeContexts: term.includeContexts ?? [],
        excludeContexts: term.excludeContexts ?? [],
        forbidden: term.forbidden ?? [],
        evidenceRefs: term.evidenceRefs ?? [],
        risk: term.risk,
        decisionStatus: term.decisionStatus,
      }))
      .sort((left, right) => left.termId.localeCompare(right.termId, 'en')),
  };
  return { ...scope, scopeDigest: hashJson(scope) };
}

export function buildCatalogOfflineReviewScope(ledger) {
  if (!ledger || ledger.locale !== 'de-DE' || !Array.isArray(ledger.messages)) {
    throw new Error('German catalog ledger must contain locale de-DE and a messages array.');
  }
  const scope = {
    schemaVersion: CATALOG_SCOPE_SCHEMA,
    locale: 'de-DE',
    localePolicy: {
      canonicalTag: 'de-DE',
      regionalVariants: false,
      vocabulary: 'region-neutral-standard-german',
    },
    source: {
      manifestDigest: ledger.source?.manifestDigest ?? null,
      reviewPolicyDigest: ledger.source?.reviewPolicyDigest ?? null,
    },
    messages: ledger.messages
      .map(({ id, hashes, context, reviewRequirements }) => ({
        messageId: id,
        contextHash: hashes?.context ?? null,
        translationHash: hashes?.translation ?? null,
        contextStatus: context?.status ?? null,
        domainReviewRequired: reviewRequirements?.lcaTidasDomain ?? null,
      }))
      .sort((left, right) => left.messageId.localeCompare(right.messageId, 'en')),
    blockedContextProposals: ledger.messages
      .filter(({ context }) => context?.status === 'BLOCKED_CONTEXT')
      .map(({ id, hashes, context }) => ({
        messageId: id,
        contextHash: hashes?.context ?? null,
        proposal: context?.reviewedAnnotation ?? null,
      }))
      .sort((left, right) => left.messageId.localeCompare(right.messageId, 'en')),
    blockedGlossaryTerms: (ledger.findings?.blockedGlossaryTerms ?? [])
      .map((term) => ({
        termId: term.termId,
        sourceEnglish: term.sourceEnglish,
        sourceChinese: term.sourceChinese ?? [],
        germanPreferred: term.germanPreferred ?? null,
        abbreviation: term.abbreviation ?? null,
        alternatives: term.alternatives ?? [],
        includeContexts: term.includeContexts ?? [],
        excludeContexts: term.excludeContexts ?? [],
        forbidden: term.forbidden ?? [],
        evidenceRefs: term.evidenceRefs ?? [],
        risk: term.risk ?? null,
        decisionStatus: term.decisionStatus ?? null,
      }))
      .sort((left, right) => left.termId.localeCompare(right.termId, 'en')),
  };
  return { ...scope, scopeDigest: hashJson(scope) };
}

function confirmationPattern() {
  const fence = '`'.repeat(3);
  return new RegExp(
    `${CONFIRMATION_BEGIN.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\n${fence}json\\n([\\s\\S]*?)\\n${fence}\\n${CONFIRMATION_END.replace(
      /[.*+?^${}()|[\]\\]/gu,
      '\\$&',
    )}`,
    'gu',
  );
}

function normalizeReviewBody(markdown) {
  let normalized = normalizeNewlines(markdown);
  normalized = normalized.replace(
    confirmationPattern(),
    `${CONFIRMATION_BEGIN}\n[confirmation block omitted from body digest]\n${CONFIRMATION_END}`,
  );
  normalized = normalized.replace(
    /<!-- TIANGONG_I18N_DE_NOTE_BEGIN:([^\n]+) -->[\s\S]*?<!-- TIANGONG_I18N_DE_NOTE_END:([^\n]+) -->/gu,
    (whole, beginId, endId) =>
      beginId === endId
        ? `${NOTE_BEGIN_PREFIX}${beginId} -->\n[review note omitted from body digest]\n${NOTE_END_PREFIX}${endId} -->`
        : whole,
  );
  return normalized;
}

export function computeReviewBodyDigest(markdown) {
  return createHash('sha256').update(normalizeReviewBody(markdown)).digest('hex');
}

function renderConfirmation(scope, reviewBodyDigest) {
  const counts = countScope(scope);
  const confirmation = {
    schemaVersion: OFFLINE_CONFIRMATION_SCHEMA,
    locale: 'de-DE',
    scope: 'pilot',
    scopeDigest: scope.scopeDigest,
    reviewBodyDigest,
    reviewer: '',
    reviewedAt: '',
    decisions: {
      productContext: 'PENDING',
      nativeGerman: 'PENDING',
      lcaTidasDomain: 'PENDING',
    },
    approvals: {
      allPilotMessages: false,
      allBlockedContextProposals: false,
      allPreferredBlockedGlossaryTerms: false,
    },
    counts,
    unresolvedCriticalOrMajor: 0,
    notes: '',
  };
  return `${CONFIRMATION_BEGIN}\n\`\`\`json\n${JSON.stringify(confirmation, null, 2)}\n\`\`\`\n${CONFIRMATION_END}`;
}

function renderBlockedContexts(scope) {
  const rows = scope.blockedContextProposals.map(({ messageId, proposal }, index) => {
    const evidence = (proposal?.evidence ?? [])
      .map(
        ({ kind, reference, rationale }) =>
          `  - ${text(kind)} — ${text(reference)}：${text(rationale)}`,
      )
      .join('\n');
    return [
      `### C${String(index + 1).padStart(2, '0')} — ${code(messageId)}`,
      '',
      `- 概念：${text(proposal?.concept)}`,
      `- UI 角色：${text(proposal?.uiRole)}`,
      `- 用户可见后果：${text(proposal?.consequence)}`,
      `- 提案理由：${text(proposal?.rationale)}`,
      '- 证据：',
      evidence || '  - 未提供',
      '',
    ].join('\n');
  });
  return rows.join('\n');
}

function renderBlockedTerms(scope) {
  return scope.blockedGlossaryTerms
    .map((term, index) =>
      [
        `### T${String(index + 1).padStart(2, '0')} — ${code(term.termId)}`,
        '',
        '| 项目 | 内容 |',
        '| --- | --- |',
        `| English | ${inline(term.sourceEnglish)} |`,
        `| 中文 | ${inline((term.sourceChinese ?? []).join('；'))} |`,
        `| 首选德语 | ${inline(term.germanPreferred)} |`,
        `| 缩写 | ${inline(term.abbreviation, '无')} |`,
        `| 可选表达 | ${inline((term.alternatives ?? []).join('；'), '无')} |`,
        `| 适用上下文 | ${inline((term.includeContexts ?? []).join('；'))} |`,
        `| 不适用上下文 | ${inline((term.excludeContexts ?? []).join('；'))} |`,
        `| 禁用表达 | ${inline((term.forbidden ?? []).join('；'), '无')} |`,
        `| 证据引用 | ${inline((term.evidenceRefs ?? []).join('；'))} |`,
        `| 风险 | ${inline(term.risk)} |`,
        '',
      ].join('\n'),
    )
    .join('\n');
}

function renderProductionEvidence(message) {
  const context = message.context ?? {};
  const references = context.productionReferences ?? [];
  const defaultMessages = context.defaultMessages ?? [];
  const dynamicFamilies = context.dynamicFamilies ?? [];
  const parts = [];
  if (references.length > 0) {
    parts.push('**生产调用点**', '');
    references.forEach((reference) => {
      parts.push(
        `- ${code(`${reference.path}:${reference.line}`)} — ${text(reference.kind)} / ${text(
          reference.symbol,
          '无符号名',
        )}; defaultMessage: ${text(reference.defaultMessage, '无')}`,
      );
    });
    parts.push('');
  }
  if (defaultMessages.length > 0) {
    parts.push('**默认消息证据**', '');
    defaultMessages.forEach((entry) => {
      const locations = (entry.locations ?? [])
        .map(({ path: sourcePath, line }) => `${sourcePath}:${line}`)
        .join('；');
      parts.push(`- ${text(entry.value)} — ${text(locations)}`);
    });
    parts.push('');
  }
  if (dynamicFamilies.length > 0) {
    parts.push('**动态消息族证据**', '');
    dynamicFamilies.forEach((family) => {
      parts.push(`- ${code(family.family)}：${text(family.proof)}`);
      (family.callsites ?? []).forEach((callsite) => {
        parts.push(
          `  - ${code(callsite.file)} — ${text(callsite.api)}(${text(callsite.expression)})`,
        );
      });
      if (family.unknownHandling) {
        parts.push(`  - 未知值处理：${text(family.unknownHandling.proof)}`);
      }
    });
    parts.push('');
  }
  const annotationEvidence = context.reviewedAnnotation?.evidence ?? [];
  if (annotationEvidence.length > 0) {
    parts.push('**保留消息上下文提案证据**', '');
    annotationEvidence.forEach(({ kind, reference, rationale }) => {
      parts.push(`- ${text(kind)} — ${text(reference)}：${text(rationale)}`);
    });
    parts.push('');
  }
  return parts.length > 0 ? parts.join('\n') : '无生产调用点；请依据上方保留消息提案审阅。\n';
}

function renderNeighbors(message) {
  const neighbors = message.reviewerDossier?.sourceLocaleNeighbors ?? [];
  if (neighbors.length === 0) return '无。\n';
  return [
    '| 相邻 message ID | English | 中文 |',
    '| --- | --- | --- |',
    ...neighbors.map(
      ({ id, english, chinese }) => `| ${code(id)} | ${inline(english)} | ${inline(chinese)} |`,
    ),
    '',
  ].join('\n');
}

function renderGlossary(message) {
  const terms = message.reviewerDossier?.glossaryTerms ?? [];
  if (terms.length === 0) return '无直接术语匹配。\n';
  return [
    '| 术语 ID | English / 中文 | 首选德语 | 可选 / 禁用 | 状态 |',
    '| --- | --- | --- | --- | --- |',
    ...terms.map(
      (term) =>
        `| ${code(term.termId)} | ${inline(term.sourceEnglish)} / ${inline(
          (term.sourceChinese ?? []).join('、'),
        )} | ${inline(term.germanPreferred)} | ${inline(
          [
            ...(term.alternatives ?? []),
            ...(term.forbidden ?? []).map((item) => `禁用：${item}`),
          ].join('；'),
          '无',
        )} | ${inline(term.decisionStatus)} |`,
    ),
    '',
  ].join('\n');
}

function renderIcu(message) {
  const icu = message.reviewerDossier?.icuReview ?? {};
  const signatures = icu.argumentSignature ?? [];
  const cases = icu.branchCases ?? [];
  const parts = [
    `- 参数签名：${signatures.length > 0 ? signatures.map(({ name, type }) => `${name}:${type}`).join('；') : '无'}`,
    `- 示例参数：${Object.keys(icu.sampleArguments ?? {}).length > 0 ? JSON.stringify(icu.sampleArguments) : '无'}`,
  ];
  if (cases.length > 0) {
    parts.push('- ICU 分支：');
    cases.forEach((branch) => {
      parts.push(
        `  - ${text(branch.path)} | EN: ${text(branch.english)} | DE: ${text(branch.german)}`,
      );
    });
  }
  return `${parts.join('\n')}\n`;
}

function renderMessage(message, index) {
  const context = message.context ?? {};
  const dossier = message.reviewerDossier ?? {};
  const decisionPacket = dossier.decisionPacket ?? {};
  const length = dossier.lengthReview ?? {};
  const noteId = message.id;
  return [
    `## ${String(index + 1).padStart(2, '0')} / 90 — ${code(message.id)}`,
    '',
    '| 语言 | 文案 |',
    '| --- | --- |',
    `| English | ${inline(message.english?.value)} |`,
    `| 中文 | ${inline(message.chinese?.value)} |`,
    `| German candidate | ${inline(message.candidate)} |`,
    '',
    `- 模块 / 类别：${code(message.module)} / ${text(message.category)}`,
    `- 候选理由：${text(message.rationale)}`,
    `- 风险：${text(message.risk)}`,
    `- 审阅维度：${(message.reviewDomains ?? []).map(code).join('、')}`,
    `- 上下文状态：${code(context.status)}`,
    `- 产品概念：${text(context.concept, '当前未命名；请结合证据确认')}`,
    `- UI 角色：${text(context.uiRole)}（来源：${text(context.uiRoleSource)}）`,
    `- 用户可见后果：${text(context.consequence)}`,
    '',
    '<details>',
    '<summary>展开完整上下文证据</summary>',
    '',
    renderProductionEvidence(message),
    '**英中相邻消息**',
    '',
    renderNeighbors(message),
    '**相关术语**',
    '',
    renderGlossary(message),
    '**必须明确回答的问题**',
    '',
    bulletList(decisionPacket.questions ?? []),
    '**ICU / 占位符**',
    '',
    renderIcu(message),
    '**长度风险**',
    '',
    `- English / German 模板长度：${text(length.templateEnglishLength)} / ${text(
      length.templateGermanLength,
    )}`,
    `- 最大可见长度：${text(length.maximumVisibleEnglishLength)} / ${text(
      length.maximumVisibleGermanLength,
    )}`,
    `- 德英长度比：${text(length.visibleGermanToEnglishRatio)}`,
    `- 标记：${(length.flags ?? []).length > 0 ? length.flags.map(code).join('、') : '无'}`,
    '',
    '**摘要绑定值（只读）**',
    '',
    `- contextHash: ${code(message.hashes?.contextHash)}`,
    `- translationHash: ${code(message.hashes?.translationHash)}`,
    `- dossierHash: ${code(message.hashes?.dossierHash)}`,
    `- reviewScopeHash: ${code(message.hashes?.reviewScopeHash)}`,
    '',
    '</details>',
    '',
    `${NOTE_BEGIN_PREFIX}${noteId} -->`,
    '人工意见（可选；可在此标注具体修改建议）：',
    '',
    `${NOTE_END_PREFIX}${noteId} -->`,
    '',
  ].join('\n');
}

export function renderPilotOfflineReviewMarkdown(reviewPack) {
  const scope = buildPilotOfflineReviewScope(reviewPack);
  const counts = countScope(scope);
  const placeholder = renderConfirmation(scope, '__REVIEW_BODY_DIGEST__');
  const body = [
    '# TianGong 德语 Pilot 人工确认单',
    '',
    '> 本文件只保存在本地，不提交仓库，也不粘贴到 GitHub。它用于一次性审阅 90 条高风险德语候选。',
    '> 同一位人工可以确认产品上下文、德语自然度和 LCA/TIDAS 术语三个维度。',
    '',
    '## 填写方法',
    '',
    '1. 阅读下方 90 条消息、9 个保留消息上下文提案和 2 个待定术语。不要孤立地只看德语候选。',
    '2. 如需修改，在对应消息的“人工意见”区域写建议，并把相关 decision 保持为 `PENDING` 或改为 `CHANGES_REQUESTED`。',
    '3. 全部认可后，仅编辑下面 JSON 确认块：填写 `reviewer`、`reviewedAt`，把三个 decision 改为 `APPROVED`，把三个 approval 改为布尔值 `true`。',
    '4. 不要修改 `scopeDigest`、`reviewBodyDigest`、counts 或正文。任何候选/上下文/术语变化都会要求重新生成并再次确认。',
    '',
    placeholder,
    '',
    '## 本次确认范围',
    '',
    `- Pilot 消息：${counts.pilotMessages}`,
    `- 待确认保留消息上下文提案：${counts.blockedContextProposals}`,
    `- 待确认术语：${counts.blockedGlossaryTerms}`,
    `- 当前范围摘要：${code(scope.scopeDigest)}`,
    '',
    '批准表示：每条候选均已结合 English、中文、运行时/保留消息上下文、UI 后果、术语、ICU 和长度风险审阅；不存在未解决的 Critical/Major 问题。',
    '',
    '## 9 个保留消息上下文提案',
    '',
    renderBlockedContexts(scope),
    '## 2 个待定术语',
    '',
    '批准首选术语表示在列明的适用范围内采用该首选表达；不把它机械套用于排除范围。',
    '',
    renderBlockedTerms(scope),
    '## 90 条 Pilot 消息',
    '',
    ...reviewPack.messages.map(renderMessage),
  ].join('\n');
  const bodyDigest = computeReviewBodyDigest(body);
  return body.replace('__REVIEW_BODY_DIGEST__', bodyDigest);
}

function renderCatalogConfirmation(scope, reviewBodyDigest) {
  const confirmation = {
    schemaVersion: CATALOG_CONFIRMATION_SCHEMA,
    locale: 'de-DE',
    scope: 'catalog',
    scopeDigest: scope.scopeDigest,
    reviewBodyDigest,
    reviewer: '',
    reviewedAt: '',
    decisions: {
      productContext: 'PENDING',
      nativeGerman: 'PENDING',
      lcaTidasDomain: 'PENDING',
    },
    approvals: {
      allCatalogMessages: false,
      allBlockedContextProposals: false,
      allPreferredBlockedGlossaryTerms: false,
    },
    counts: catalogCounts(scope),
    unresolvedCriticalOrMajor: 0,
    notes: '',
  };
  return `${CONFIRMATION_BEGIN}\n\`\`\`json\n${JSON.stringify(confirmation, null, 2)}\n\`\`\`\n${CONFIRMATION_END}`;
}

function renderCatalogNeighbors(messages, index) {
  const neighbors = messages.slice(Math.max(0, index - 2), index + 3).filter((_, offset) => {
    const absoluteIndex = Math.max(0, index - 2) + offset;
    return absoluteIndex !== index;
  });
  if (neighbors.length === 0) return '无。\n';
  return [
    '| 相邻 message ID | English | 中文 |',
    '| --- | --- | --- |',
    ...neighbors.map(
      ({ id, english, chinese }) =>
        `| ${code(id)} | ${inline(english?.value)} | ${inline(chinese?.value)} |`,
    ),
    '',
  ].join('\n');
}

function renderCatalogMessage(message, index, messages) {
  const context = message.context ?? {};
  const annotation = context.reviewedAnnotation;
  const annotationEvidence = annotation?.evidence ?? [];
  const total = messages.length;
  const width = String(total).length;
  return [
    `## ${String(index + 1).padStart(width, '0')} / ${total} — ${code(message.id)}`,
    '',
    '| 语言 | 文案 |',
    '| --- | --- |',
    `| English | ${inline(message.english?.value)} |`,
    `| 中文 | ${inline(message.chinese?.value)} |`,
    `| German candidate | ${inline(message.german?.value, '尚未提供；此范围不能最终批准')} |`,
    '',
    `- 模块 / 类别：${code(message.module)} / ${text(message.category)}`,
    `- English 来源：${code(
      `${text(message.english?.source?.path)}:${text(message.english?.source?.line)}`,
    )}`,
    `- 中文来源：${code(
      `${text(message.chinese?.source?.path)}:${text(message.chinese?.source?.line)}`,
    )}`,
    `- English 参数：${inline(JSON.stringify(message.english?.argumentSignature ?? []))}`,
    `- 中文参数：${inline(JSON.stringify(message.chinese?.argumentSignature ?? []))}`,
    `- German 参数：${inline(JSON.stringify(message.german?.argumentSignature ?? []))}`,
    `- 上下文状态：${code(context.status)}`,
    `- 产品概念：${text(context.concept, '尚未提供')}`,
    `- UI 角色：${text(context.uiRole)}（来源：${text(context.uiRoleSource)}）`,
    `- 用户可见后果：${text(context.consequence)}`,
    `- 领域审核要求：${message.reviewRequirements?.lcaTidasDomain === true ? '是' : '否'}；${(
      message.reviewRequirements?.domainReasons ?? []
    ).join('；')}`,
    '',
    '<details>',
    '<summary>展开完整上下文证据</summary>',
    '',
    renderProductionEvidence(message),
    '**上下文提案**',
    '',
    annotation
      ? [
          `- rationale：${text(annotation.rationale)}`,
          `- sourceContextHash：${code(annotation.sourceContextHash)}`,
          ...annotationEvidence.map(
            ({ kind, reference, rationale }) =>
              `- ${text(kind)} — ${text(reference)}：${text(rationale)}`,
          ),
        ].join('\n')
      : '无；如果本消息没有运行时证据，则必须先补齐提案，不能靠人工确认绕过。',
    '',
    '**英中相邻消息**',
    '',
    renderCatalogNeighbors(messages, index),
    '**摘要绑定值（只读）**',
    '',
    `- sourceContextHash: ${code(message.hashes?.sourceContext)}`,
    `- contextHash: ${code(message.hashes?.context)}`,
    `- translationHash: ${code(message.hashes?.translation)}`,
    '',
    '</details>',
    '',
    `${NOTE_BEGIN_PREFIX}${message.id} -->`,
    '人工意见（可选；可在此标注具体修改建议）：',
    '',
    `${NOTE_END_PREFIX}${message.id} -->`,
    '',
  ].join('\n');
}

export function renderCatalogOfflineReviewMarkdown(ledger) {
  const scope = buildCatalogOfflineReviewScope(ledger);
  const counts = catalogCounts(scope);
  const placeholder = renderCatalogConfirmation(scope, '__REVIEW_BODY_DIGEST__');
  const body = [
    '# TianGong 德语全量 Catalog 人工确认单',
    '',
    '> 本文件只保存在本地，不提交仓库，也不粘贴到 GitHub。',
    '> 它与 Pilot 确认相互独立；同一位人工可以确认产品上下文、德语自然度和 LCA/TIDAS 术语三个维度。',
    '',
    '## 填写方法',
    '',
    `1. 阅读下方 ${counts.catalogMessages} 条消息、${counts.blockedContextProposals} 个保留消息上下文提案和 ${counts.blockedGlossaryTerms} 个待定术语。`,
    '2. 如果任何 German candidate、上下文或证据缺失或不正确，不要批准；先修正受跟踪的候选/提案并重新生成。',
    '3. 如需记录修改建议，只写在对应消息的“人工意见”区域。',
    '4. 全部认可后，填写下面 JSON 确认块并将三个 decision 改为 `APPROVED`、三个 approval 改为布尔值 `true`。',
    '5. 不要修改 scope/body digest、counts 或正文。',
    '',
    placeholder,
    '',
    '## 本次确认范围',
    '',
    `- Catalog 消息：${counts.catalogMessages}`,
    `- 保留消息上下文提案：${counts.blockedContextProposals}`,
    `- 待定术语：${counts.blockedGlossaryTerms}`,
    `- 当前范围摘要：${code(scope.scopeDigest)}`,
    '',
    `## ${counts.blockedContextProposals} 个保留消息上下文提案`,
    '',
    renderBlockedContexts(scope),
    `## ${counts.blockedGlossaryTerms} 个待定术语`,
    '',
    renderBlockedTerms(scope),
    `## ${counts.catalogMessages} 条 Catalog 消息`,
    '',
    ...ledger.messages.map((message, index, messages) =>
      renderCatalogMessage(message, index, messages),
    ),
  ].join('\n');
  const bodyDigest = computeReviewBodyDigest(body);
  return body.replace('__REVIEW_BODY_DIGEST__', bodyDigest);
}

export function parseOfflineReviewMarkdown(markdown) {
  const normalized = normalizeNewlines(markdown);
  const begins = normalized.split(CONFIRMATION_BEGIN).length - 1;
  const ends = normalized.split(CONFIRMATION_END).length - 1;
  const matches = [...normalized.matchAll(confirmationPattern())];
  if (begins !== 1 || ends !== 1 || matches.length !== 1) {
    throw new Error('Offline review must contain exactly one complete confirmation block.');
  }
  let confirmation;
  try {
    confirmation = JSON.parse(matches[0][1]);
  } catch {
    throw new Error('Offline review confirmation block must contain valid JSON.');
  }
  return confirmation;
}

function noteIds(markdown) {
  const normalized = normalizeNewlines(markdown);
  const begins = [...normalized.matchAll(/<!-- TIANGONG_I18N_DE_NOTE_BEGIN:([^\n]+) -->/gu)].map(
    (match) => match[1],
  );
  const ends = [...normalized.matchAll(/<!-- TIANGONG_I18N_DE_NOTE_END:([^\n]+) -->/gu)].map(
    (match) => match[1],
  );
  return { begins, ends };
}

export function evaluatePilotOfflineConfirmation(markdown, reviewPack) {
  const scope = buildPilotOfflineReviewScope(reviewPack);
  const expectedCounts = countScope(scope);
  const canonicalMarkdown = renderPilotOfflineReviewMarkdown(reviewPack);
  const canonicalBody = normalizeReviewBody(canonicalMarkdown);
  const canonicalBodyDigest = computeReviewBodyDigest(canonicalMarkdown);
  const reasons = [];
  let confirmation;
  try {
    confirmation = parseOfflineReviewMarkdown(markdown);
  } catch (error) {
    return {
      approved: false,
      reasons: [error instanceof Error ? error.message : String(error)],
      scopeDigest: scope.scopeDigest,
      counts: expectedCounts,
    };
  }
  if (!exactKeys(confirmation, CONFIRMATION_KEYS)) {
    reasons.push('Confirmation fields do not exactly match the supported schema.');
  }
  if (confirmation.schemaVersion !== OFFLINE_CONFIRMATION_SCHEMA) {
    reasons.push('Confirmation schemaVersion is unsupported.');
  }
  if (confirmation.locale !== 'de-DE' || confirmation.scope !== 'pilot') {
    reasons.push('Confirmation must target the de-DE pilot scope.');
  }
  if (confirmation.scopeDigest !== scope.scopeDigest) {
    reasons.push('Confirmation scopeDigest is stale.');
  }
  if (
    confirmation.reviewBodyDigest !== canonicalBodyDigest ||
    computeReviewBodyDigest(markdown) !== canonicalBodyDigest ||
    normalizeReviewBody(markdown) !== canonicalBody
  ) {
    reasons.push('Visible review body has changed since generation.');
  }
  if (typeof confirmation.reviewer !== 'string' || confirmation.reviewer.trim() === '') {
    reasons.push('A local reviewer name or reference is required.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(confirmation.reviewedAt ?? '')) {
    reasons.push('reviewedAt must use YYYY-MM-DD.');
  }
  if (!exactKeys(confirmation.decisions, DECISIONS)) {
    reasons.push('The three review-dimension decisions are required.');
  } else {
    DECISIONS.forEach((key) => {
      if (confirmation.decisions[key] !== 'APPROVED') {
        reasons.push(`Decision ${key} is not APPROVED.`);
      }
    });
  }
  if (!exactKeys(confirmation.approvals, APPROVALS)) {
    reasons.push('The three explicit approval flags are required.');
  } else {
    APPROVALS.forEach((key) => {
      if (confirmation.approvals[key] !== true) {
        reasons.push(`Approval ${key} must be boolean true.`);
      }
    });
  }
  if (!exactKeys(confirmation.counts, Object.keys(expectedCounts))) {
    reasons.push('Confirmation counts do not match the supported schema.');
  } else {
    Object.entries(expectedCounts).forEach(([key, value]) => {
      if (confirmation.counts[key] !== value) reasons.push(`Count ${key} is stale.`);
    });
  }
  if (confirmation.unresolvedCriticalOrMajor !== 0) {
    reasons.push('unresolvedCriticalOrMajor must be numeric zero.');
  }
  if (typeof confirmation.notes !== 'string') {
    reasons.push('notes must be a string.');
  }
  const notes = noteIds(markdown);
  const expectedNoteIds = reviewPack.messages.map(({ id }) => id);
  if (
    JSON.stringify(notes.begins) !== JSON.stringify(expectedNoteIds) ||
    JSON.stringify(notes.ends) !== JSON.stringify(expectedNoteIds)
  ) {
    reasons.push('Per-message review-note boundaries do not match the 90-message scope.');
  }
  return {
    approved: reasons.length === 0,
    reasons,
    scopeDigest: scope.scopeDigest,
    counts: expectedCounts,
  };
}

export function readPilotOfflineConfirmation(root, relativeFile, reviewPack) {
  let resolved;
  try {
    resolved = assertPrivateReviewPath(root, path.resolve(root, relativeFile));
  } catch (error) {
    const scope = buildPilotOfflineReviewScope(reviewPack);
    return {
      approved: false,
      reasons: [error instanceof Error ? error.message : String(error)],
      scopeDigest: scope.scopeDigest,
      counts: countScope(scope),
    };
  }
  if (!fs.existsSync(resolved.absolutePath)) {
    const scope = buildPilotOfflineReviewScope(reviewPack);
    return {
      approved: false,
      reasons: ['Local confirmation file is missing.'],
      scopeDigest: scope.scopeDigest,
      counts: countScope(scope),
    };
  }
  return evaluatePilotOfflineConfirmation(
    fs.readFileSync(resolved.absolutePath, 'utf8'),
    reviewPack,
  );
}

function catalogCounts(scope) {
  return {
    catalogMessages: scope.messages.length,
    blockedContextProposals: scope.blockedContextProposals.length,
    blockedGlossaryTerms: scope.blockedGlossaryTerms.length,
  };
}

export function evaluateCatalogOfflineConfirmation(markdown, ledger) {
  const scope = buildCatalogOfflineReviewScope(ledger);
  const expectedCounts = catalogCounts(scope);
  const canonicalMarkdown = renderCatalogOfflineReviewMarkdown(ledger);
  const canonicalBody = normalizeReviewBody(canonicalMarkdown);
  const canonicalBodyDigest = computeReviewBodyDigest(canonicalMarkdown);
  const reasons = [];
  let confirmation;
  try {
    confirmation = parseOfflineReviewMarkdown(markdown);
  } catch (error) {
    return {
      approved: false,
      reasons: [error instanceof Error ? error.message : String(error)],
      scopeDigest: scope.scopeDigest,
      counts: expectedCounts,
    };
  }
  if (!exactKeys(confirmation, CONFIRMATION_KEYS)) {
    reasons.push('Confirmation fields do not exactly match the supported schema.');
  }
  if (confirmation.schemaVersion !== CATALOG_CONFIRMATION_SCHEMA) {
    reasons.push('Confirmation schemaVersion is unsupported.');
  }
  if (confirmation.locale !== 'de-DE' || confirmation.scope !== 'catalog') {
    reasons.push('Confirmation must target the de-DE catalog scope.');
  }
  if (confirmation.scopeDigest !== scope.scopeDigest) {
    reasons.push('Confirmation scopeDigest is stale.');
  }
  if (
    confirmation.reviewBodyDigest !== canonicalBodyDigest ||
    computeReviewBodyDigest(markdown) !== canonicalBodyDigest ||
    normalizeReviewBody(markdown) !== canonicalBody
  ) {
    reasons.push('Visible review body has changed since generation.');
  }
  if (typeof confirmation.reviewer !== 'string' || confirmation.reviewer.trim() === '') {
    reasons.push('A local reviewer name or reference is required.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(confirmation.reviewedAt ?? '')) {
    reasons.push('reviewedAt must use YYYY-MM-DD.');
  }
  if (!exactKeys(confirmation.decisions, DECISIONS)) {
    reasons.push('The three review-dimension decisions are required.');
  } else {
    DECISIONS.forEach((key) => {
      if (confirmation.decisions[key] !== 'APPROVED') {
        reasons.push(`Decision ${key} is not APPROVED.`);
      }
    });
  }
  const expectedApprovals = [
    'allCatalogMessages',
    'allBlockedContextProposals',
    'allPreferredBlockedGlossaryTerms',
  ];
  if (!exactKeys(confirmation.approvals, expectedApprovals)) {
    reasons.push('The three explicit catalog approval flags are required.');
  } else {
    expectedApprovals.forEach((key) => {
      if (confirmation.approvals[key] !== true) {
        reasons.push(`Approval ${key} must be boolean true.`);
      }
    });
  }
  if (!exactKeys(confirmation.counts, Object.keys(expectedCounts))) {
    reasons.push('Confirmation counts do not match the supported schema.');
  } else {
    Object.entries(expectedCounts).forEach(([key, value]) => {
      if (confirmation.counts[key] !== value) reasons.push(`Count ${key} is stale.`);
    });
  }
  if (confirmation.unresolvedCriticalOrMajor !== 0) {
    reasons.push('unresolvedCriticalOrMajor must be numeric zero.');
  }
  if (typeof confirmation.notes !== 'string') reasons.push('notes must be a string.');
  const notes = noteIds(markdown);
  const expectedNoteIds = ledger.messages.map(({ id }) => id);
  if (
    JSON.stringify(notes.begins) !== JSON.stringify(expectedNoteIds) ||
    JSON.stringify(notes.ends) !== JSON.stringify(expectedNoteIds)
  ) {
    reasons.push('Per-message review-note boundaries do not match the catalog scope.');
  }
  return {
    approved: reasons.length === 0,
    reasons,
    scopeDigest: scope.scopeDigest,
    counts: expectedCounts,
  };
}

export function readCatalogOfflineConfirmation(root, relativeFile, ledger) {
  let resolved;
  try {
    resolved = assertPrivateReviewPath(root, path.resolve(root, relativeFile));
  } catch (error) {
    const scope = buildCatalogOfflineReviewScope(ledger);
    return {
      approved: false,
      reasons: [error instanceof Error ? error.message : String(error)],
      scopeDigest: scope.scopeDigest,
      counts: catalogCounts(scope),
    };
  }
  if (!fs.existsSync(resolved.absolutePath)) {
    const scope = buildCatalogOfflineReviewScope(ledger);
    return {
      approved: false,
      reasons: ['Local catalog confirmation file is missing.'],
      scopeDigest: scope.scopeDigest,
      counts: catalogCounts(scope),
    };
  }
  return evaluateCatalogOfflineConfirmation(fs.readFileSync(resolved.absolutePath, 'utf8'), ledger);
}

function usage() {
  return `Usage: node scripts/i18n/german-offline-review.mjs [options]

Options:
  --generate             generate the local Markdown review file (default)
  --check                validate a completed local Markdown review file
  --scope <pilot|catalog> review scope (default: pilot)
  --root <path>          repository root (default: current working directory)
  --pack <path>          pilot review pack relative to root
  --ledger <path>        catalog context ledger relative to root
  --output <path>        generation target relative to root
  --input <path>         validation input relative to root
  --force                explicitly replace an existing generation target
  --help                 show this help
`;
}

function parseArgs(argv) {
  const options = {
    operation: 'generate',
    scope: 'pilot',
    root: process.cwd(),
    pack: DEFAULT_PILOT_REVIEW_PACK,
    ledger: 'docs/plans/i18n-de-DE/context-ledger.json',
    output: DEFAULT_PILOT_CONFIRMATION,
    input: DEFAULT_PILOT_CONFIRMATION,
    force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (argument === '--generate') options.operation = 'generate';
    else if (argument === '--check') options.operation = 'check';
    else if (argument === '--force') options.force = true;
    else if (
      ['--scope', '--root', '--pack', '--ledger', '--output', '--input'].includes(argument)
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      index += 1;
      options[
        {
          '--scope': 'scope',
          '--root': 'root',
          '--pack': 'pack',
          '--ledger': 'ledger',
          '--output': 'output',
          '--input': 'input',
        }[argument]
      ] = value;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  options.root = path.resolve(options.root);
  if (!['pilot', 'catalog'].includes(options.scope)) {
    throw new Error('--scope must be pilot or catalog.');
  }
  if (options.scope === 'catalog') {
    if (options.output === DEFAULT_PILOT_CONFIRMATION)
      options.output = DEFAULT_CATALOG_CONFIRMATION;
    if (options.input === DEFAULT_PILOT_CONFIRMATION) options.input = DEFAULT_CATALOG_CONFIRMATION;
  }
  return options;
}

function readJson(root, relativeFile) {
  const absolutePath = path.resolve(root, relativeFile);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing required file: ${relativeFile}`);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function atomicWriteNew(root, target, value, force) {
  const resolved = assertPrivateReviewPath(root, target);
  if (fs.existsSync(resolved.absolutePath) && !force) {
    throw new Error('Refusing to overwrite existing review file without --force.');
  }
  fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
  assertPrivateReviewPath(root, resolved.absolutePath);
  const temporary = `${resolved.absolutePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, value, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, resolved.absolutePath);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return resolved;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const source =
    options.scope === 'pilot'
      ? readJson(options.root, options.pack)
      : readJson(options.root, options.ledger);
  if (options.operation === 'generate') {
    const outputPath = path.resolve(options.root, options.output);
    const markdown =
      options.scope === 'pilot'
        ? renderPilotOfflineReviewMarkdown(source)
        : renderCatalogOfflineReviewMarkdown(source);
    const resolved = atomicWriteNew(options.root, outputPath, markdown, options.force);
    const scope =
      options.scope === 'pilot'
        ? buildPilotOfflineReviewScope(source)
        : buildCatalogOfflineReviewScope(source);
    process.stdout.write(
      `${JSON.stringify({
        operation: 'generate',
        output: resolved.displayPath,
        scope: options.scope,
        locale: 'de-DE',
        counts: options.scope === 'pilot' ? countScope(scope) : catalogCounts(scope),
      })}\n`,
    );
    return;
  }
  const inputPath = path.resolve(options.root, options.input);
  const resolved = assertPrivateReviewPath(options.root, inputPath, { mustExist: true });
  const result =
    options.scope === 'pilot'
      ? evaluatePilotOfflineConfirmation(fs.readFileSync(resolved.absolutePath, 'utf8'), source)
      : evaluateCatalogOfflineConfirmation(fs.readFileSync(resolved.absolutePath, 'utf8'), source);
  process.stdout.write(
    `${JSON.stringify({
      operation: 'check',
      scope: options.scope,
      locale: 'de-DE',
      approved: result.approved,
      counts: result.counts,
      reasons: result.reasons,
    })}\n`,
  );
  if (!result.approved) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `German offline review failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  });
}
