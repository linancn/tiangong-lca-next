export interface HybridSearchQuery {
  semantic_query_en: string;
  fulltext_query_en: string[];
  fulltext_query_zh: string[];
}

export const hybridQuerySchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    semantic_query_en: {
      title: 'SemanticQueryEN',
      description: 'Canonical query term for semantic retrieval in English.',
      type: 'string',
    },
    fulltext_query_en: {
      title: 'FulltextQueryEN',
      description: 'Dictionary-like aliases in English only. No intent/topic phrases.',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    fulltext_query_zh: {
      title: 'FulltextQueryZH',
      description: 'Dictionary-like aliases in Simplified Chinese only. No intent/topic phrases.',
      type: 'array',
      items: {
        type: 'string',
      },
    },
  },
  required: ['semantic_query_en', 'fulltext_query_en', 'fulltext_query_zh'],
  additionalProperties: false,
};

export const HYBRID_SYNONYM_RULES = `
Output rules:
1) Return dictionary-style synonyms/aliases only.
2) Do NOT output topic or intent phrases, e.g. "life cycle assessment", "environmental impact", "生命周期评估", "环境影响".
3) Prefer canonical names, common aliases, transliterations, and CAS numbers.
4) Avoid explanatory sentences.
5) Keep outputs deterministic: canonical term first, then standardized abbreviations/identifiers, then common aliases.
6) Avoid near-duplicate variants that only add redundant words.
`;

const EN_FORBIDDEN_SUBSTRINGS = [
  'life cycle',
  'lifecycle',
  'assessment',
  'environmental impact',
  'query',
  'search',
  'description',
];

const ZH_FORBIDDEN_SUBSTRINGS = ['生命周期', '评估', '环境影响', '查询', '检索', '描述'];

const CAS_PATTERN = /^\d{2,7}-\d{2}-\d$/;
const CJK_PATTERN = /[\u4e00-\u9fff]/;
const LATIN_CHAR_PATTERN = /[a-z]/i;

function normalizeTerm(term: string): string {
  const normalized = term.replace(/\s+/g, ' ').trim();
  const casMatch = normalized.match(/^cas\s*(\d{2,7}-\d{2}-\d)$/i);
  if (casMatch?.[1]) {
    return casMatch[1];
  }
  const zhRepeatTail = normalized.match(/^(.*)([\u4e00-\u9fff])\2$/);
  if (zhRepeatTail?.[1] && zhRepeatTail[2]) {
    return `${zhRepeatTail[1]}${zhRepeatTail[2]}`;
  }
  return normalized;
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of terms) {
    const key = term.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(term);
  }
  return out;
}

function normalizeCompareKey(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeNearDuplicates(terms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of terms) {
    const key = normalizeCompareKey(term);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(term);
  }
  return out;
}

function sortTermsDeterministically(terms: string[], locale: string): string[] {
  return [...terms].sort((a, b) => a.localeCompare(b, locale));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeTerm(item))
    .filter((item) => item.length > 0);
}

function hasForbiddenSubstring(term: string, candidates: string[]): boolean {
  return candidates.some((candidate) => term.includes(candidate));
}

function isDictionaryAliasEn(term: string): boolean {
  const normalized = normalizeTerm(term);
  const lowered = normalized.toLowerCase();
  if (!normalized || normalized.length > 160) {
    return false;
  }

  if (CAS_PATTERN.test(normalized)) {
    return true;
  }

  if (!LATIN_CHAR_PATTERN.test(normalized)) {
    return false;
  }
  if (hasForbiddenSubstring(lowered, EN_FORBIDDEN_SUBSTRINGS)) {
    return false;
  }
  if (normalized.split(' ').length > 12) {
    return false;
  }
  if (/[\n\r]/.test(normalized)) {
    return false;
  }
  return true;
}

function isDictionaryAliasZh(term: string): boolean {
  const normalized = normalizeTerm(term);
  if (!normalized || normalized.length > 80) {
    return false;
  }

  if (CAS_PATTERN.test(normalized)) {
    return true;
  }

  if (!CJK_PATTERN.test(normalized)) {
    return false;
  }
  if (hasForbiddenSubstring(normalized, ZH_FORBIDDEN_SUBSTRINGS)) {
    return false;
  }
  if (/[\n\r]/.test(normalized)) {
    return false;
  }
  return true;
}

function prependSeedTerm(terms: string[], seed: string): string[] {
  const normalizedSeed = normalizeTerm(seed);
  if (!normalizedSeed) {
    return terms;
  }
  return uniqueTerms([normalizedSeed, ...terms]);
}

export function sanitizeHybridQueryOutput(
  raw: HybridSearchQuery,
  userQuery: string,
): HybridSearchQuery {
  const semanticQueryEn = normalizeTerm(raw.semantic_query_en || '');
  let fulltextQueryEn = dedupeNearDuplicates(
    normalizeStringArray(raw.fulltext_query_en).filter(isDictionaryAliasEn),
  );
  let fulltextQueryZh = dedupeNearDuplicates(
    normalizeStringArray(raw.fulltext_query_zh).filter(isDictionaryAliasZh),
  );

  const normalizedUserQuery = normalizeTerm(userQuery);

  if (fulltextQueryEn.length === 0 && semanticQueryEn) {
    fulltextQueryEn = [semanticQueryEn];
  }
  if (fulltextQueryZh.length === 0 && normalizedUserQuery) {
    fulltextQueryZh = [normalizedUserQuery];
  }

  const enSeed = semanticQueryEn || fulltextQueryEn[0] || '';
  const zhSeed =
    normalizedUserQuery && CJK_PATTERN.test(normalizedUserQuery)
      ? normalizedUserQuery
      : fulltextQueryZh[0] || '';
  const enRest = fulltextQueryEn.filter((term) => term.toLowerCase() !== enSeed.toLowerCase());
  const zhRest = fulltextQueryZh.filter((term) => term !== zhSeed);
  const sortedEnRest = sortTermsDeterministically(dedupeNearDuplicates(enRest), 'en');
  const sortedZhRest = sortTermsDeterministically(dedupeNearDuplicates(zhRest), 'zh-Hans-CN');
  fulltextQueryEn = enSeed ? [enSeed, ...sortedEnRest] : sortedEnRest;
  fulltextQueryZh = zhSeed ? [zhSeed, ...sortedZhRest] : sortedZhRest;

  return {
    semantic_query_en: enSeed,
    fulltext_query_en: fulltextQueryEn.slice(0, 6),
    fulltext_query_zh: fulltextQueryZh.slice(0, 6),
  };
}
