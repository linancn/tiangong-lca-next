/**
 * Pure JSON projection primitives shared by extracted_md and search_text.
 *
 * This module owns stable alias lookup, localized value decoding, classification
 * ordering, and reference short-description decoding. Dataset-specific field
 * allowlists and output formatting remain in the two independent projectors.
 */

export type JsonRecord = Record<string, unknown>;
export type PathSegment = readonly string[];

export interface LocalizedFragment {
  language: string;
  text: string;
}

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function pick(record: unknown, ...names: string[]): unknown {
  if (!isRecord(record)) return undefined;
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function pickProperty(record: unknown, names: readonly string[]): unknown {
  return pick(record, ...names);
}

export function readPath(value: unknown, ...segments: PathSegment[]): unknown {
  let current = value;
  for (const segment of segments) {
    current = pick(current, ...segment);
    if (current === undefined || current === null) return undefined;
  }
  return current;
}

export function nestedItems(value: unknown, itemNames: PathSegment): unknown[] {
  if (value === undefined || value === null) return [];
  return asArray(value).flatMap((item) => {
    const nested = readPath(item, itemNames);
    return nested === undefined || nested === null ? [item] : asArray(nested);
  });
}

export function scalarText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

export function readTextLeaf(value: unknown): string | null {
  const scalar = scalarText(value);
  if (scalar) return scalar;
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = readTextLeaf(item);
      if (text) return text;
    }
    return null;
  }
  if (!isRecord(value)) return null;

  for (const name of ['#text', 'text', '_text']) {
    const text = readTextLeaf(value[name]);
    if (text) return text;
  }
  return scalarText(value.value);
}

/** Text-leaf behavior used by the existing Markdown generators. */
export function readDisplayTextLeaf(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }
  if (!isRecord(value)) return null;
  const text = value['#text'] ?? value.text ?? value._text;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  return trimmed || null;
}

function languageOf(value: JsonRecord): string {
  return (scalarText(pick(value, '@xml:lang', 'xml:lang', 'xml_lang', 'lang')) ?? '').toLowerCase();
}

function isLanguageKey(value: string): boolean {
  return /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})?$/iu.test(value);
}

/** Return all authored language fragments without applying a field policy. */
export function readLocalizedFragments(value: unknown): LocalizedFragment[] {
  const fragments: LocalizedFragment[] = [];

  const visit = (candidate: unknown, inheritedLanguage = ''): void => {
    const scalar = scalarText(candidate);
    if (scalar) {
      fragments.push({ language: inheritedLanguage, text: scalar });
      return;
    }

    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item, inheritedLanguage);
      return;
    }

    if (!isRecord(candidate)) return;

    const language = languageOf(candidate) || inheritedLanguage;
    const direct = readTextLeaf(candidate);
    if (direct) {
      fragments.push({ language, text: direct });
      return;
    }

    const languageEntries = Object.entries(candidate).filter(
      ([name]) => isLanguageKey(name) && !name.startsWith('@'),
    );
    if (languageEntries.length > 0) {
      for (const [name, child] of languageEntries) visit(child, name.toLowerCase());
      return;
    }

    for (const name of ['items', 'values', 'entries', 'value']) {
      if (candidate[name] !== undefined) visit(candidate[name], language);
    }
  };

  visit(value);
  return fragments;
}

export function readScalarValue(value: unknown): string | null {
  return readLocalizedFragments(value)[0]?.text ?? null;
}

/**
 * The legacy Markdown generators prefer an exact language entry for arrays,
 * then fall back to the first readable entry. Keep that behavior centralized.
 */
export function collectLocalizedTexts(value: unknown, language = 'en'): string[] {
  if (value === null || value === undefined) return [];

  const scalar = scalarText(value);
  if (scalar) return [scalar];

  const entries = Array.isArray(value) ? value : isRecord(value) ? [value] : [];
  const languageMatches: string[] = [];
  const fallback: string[] = [];
  for (const entry of entries) {
    if (entry === null || entry === undefined) continue;
    const entryScalar = scalarText(entry);
    if (entryScalar) {
      fallback.push(entryScalar);
      continue;
    }
    if (!isRecord(entry)) continue;
    const entryLanguage = pickProperty(entry, ['@xml:lang', 'xml:lang', 'xml_lang', 'lang']);
    const text = readDisplayTextLeaf(entry);
    if (!text) continue;
    if (language && entryLanguage === language) {
      languageMatches.push(text);
    } else {
      fallback.push(text);
    }
  }
  return languageMatches.length ? languageMatches : fallback;
}

/** Read one localized value using the legacy Markdown generator semantics. */
export function readLocalizedText(value: unknown, language = 'en'): string | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    return collectLocalizedTexts(value, language)[0] ?? null;
  }

  const scalar = scalarText(value);
  if (scalar) return scalar;

  if (!isRecord(value)) return null;
  const getText = value.get_text;
  if (typeof getText === 'function') {
    const text = getText.call(value, language);
    const normalized = scalarText(text);
    if (normalized) return normalized;
  }
  return readDisplayTextLeaf(value);
}

/** Read a localized value with recursive language-aware fallback semantics. */
export function readPreferredLocalizedText(value: unknown, language = 'en'): string | null {
  if (value === null || value === undefined) return null;

  const scalar = scalarText(value);
  if (scalar) return scalar;

  if (Array.isArray(value)) {
    const exact = value.find(
      (item) =>
        isRecord(item) &&
        pickProperty(item, ['@xml:lang', 'xml:lang', 'xml_lang', 'lang']) === language,
    );
    if (exact !== undefined) {
      const text = readPreferredLocalizedText(exact, language);
      if (text) return text;
    }
    for (const item of value) {
      const text = readPreferredLocalizedText(item, language);
      if (text) return text;
    }
    return null;
  }

  if (!isRecord(value)) return null;
  const getText = value.get_text;
  if (typeof getText === 'function') {
    const text = getText.call(value, language);
    const normalized = scalarText(text);
    if (normalized) return normalized;
  }
  const direct = readDisplayTextLeaf(value);
  if (direct) return direct;
  for (const [name, child] of Object.entries(value)) {
    if (name.toLowerCase().includes('text')) {
      const text = readPreferredLocalizedText(child, language);
      if (text) return text;
    }
  }
  return null;
}

export const REFERENCE_SHORT_DESCRIPTION_ALIASES = [
  'common:shortDescription',
  'common_short_description',
  'shortDescription',
  'short_description',
] as const;

export function readReferenceShortDescription(reference: unknown, language = 'en'): string | null {
  if (reference === null || reference === undefined) return null;
  if (Array.isArray(reference)) {
    for (const entry of reference) {
      const text = readReferenceShortDescription(entry, language);
      if (text) return text;
    }
    return null;
  }

  const shortDescription = pickProperty(reference, REFERENCE_SHORT_DESCRIPTION_ALIASES);
  const text = readLocalizedText(shortDescription, language);
  if (text) return text;

  const direct = readDisplayTextLeaf(reference);
  if (direct) return direct;
  return scalarText(reference);
}

export function readReferenceShortDescriptionFragments(reference: unknown): LocalizedFragment[] {
  return readLocalizedFragments(pickProperty(reference, REFERENCE_SHORT_DESCRIPTION_ALIASES));
}

export function readReferenceShortDescriptionDisplay(
  reference: unknown,
  separator = ' | ',
): string | null {
  if (!isRecord(reference)) return null;
  return displayText(pickProperty(reference, REFERENCE_SHORT_DESCRIPTION_ALIASES), separator);
}

export interface ClassificationPathOptions {
  includeElementaryFlowCategorization?: boolean;
  labelNames?: readonly string[];
}

export function readClassificationItems(container: unknown, itemNames: PathSegment): unknown[] {
  return nestedItems(container, itemNames)
    .map((item, sourceIndex) => {
      const rawLevel = isRecord(item) ? pick(item, '@level', 'level') : undefined;
      const parsedLevel = Number(rawLevel);
      return {
        item,
        sourceIndex,
        level: Number.isFinite(parsedLevel) ? parsedLevel : Number.POSITIVE_INFINITY,
      };
    })
    .sort((left, right) => left.level - right.level || left.sourceIndex - right.sourceIndex)
    .map(({ item }) => item);
}

export function readClassificationPath(
  dataSetInformation: unknown,
  options: ClassificationPathOptions = {},
): string | null {
  const classificationInformation = pickProperty(dataSetInformation, [
    'classificationInformation',
    'classification_information',
  ]);
  const containerNames = options.includeElementaryFlowCategorization
    ? [
        'common:elementaryFlowCategorization',
        'common:classification',
        'elementaryFlowCategorization',
        'classification',
        'common_elementary_flow_categorization',
        'common_classification',
      ]
    : ['common:classification', 'classification', 'common_classification'];
  const container = pickProperty(classificationInformation, containerNames);
  const itemNames = options.includeElementaryFlowCategorization
    ? ['common:category', 'common:class', 'category', 'class', 'common_category', 'common_class']
    : ['common:class', 'class', 'common_class'];
  const labels = readClassificationItems(container, itemNames)
    .map((entry) => {
      const labelNames = options.labelNames ?? ['#text', 'text', '_text'];
      return readDisplayTextLeaf(pick(entry, ...labelNames) ?? entry);
    })
    .filter((value): value is string => Boolean(value));
  return labels.length ? labels.join(' > ') : null;
}

/** Foundation Markdown's intentionally broad display helper, kept pure. */
export function collectDisplayTexts(value: unknown): string[] {
  const scalar = scalarText(value);
  if (scalar) return [scalar];
  if (Array.isArray(value)) return value.flatMap(collectDisplayTexts);
  if (!isRecord(value)) return [];

  for (const key of ['#text', 'text', '_text', 'value', 'common:shortDescription']) {
    if (value[key] !== undefined && value[key] !== null) {
      return collectDisplayTexts(value[key]);
    }
  }

  return Object.entries(value)
    .filter(([key]) => !key.startsWith('@') && key !== 'id')
    .flatMap(([, child]) => collectDisplayTexts(child));
}

export function displayText(value: unknown, separator = ' | '): string | null {
  const seen = new Set<string>();
  const values = collectDisplayTexts(value).filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
  return values.length ? values.join(separator) : null;
}

export function preferredTitle(value: unknown, language = 'en'): string | null {
  for (const candidate of asArray(value)) {
    if (!isRecord(candidate)) continue;
    const candidateLanguage = scalarText(pick(candidate, '@xml:lang', 'xml:lang', 'lang'));
    if (candidateLanguage?.toLowerCase().startsWith(language.toLowerCase())) {
      const text = displayText(pick(candidate, '#text', 'text', '_text'));
      if (text) return text;
    }
  }
  return displayText(value);
}
