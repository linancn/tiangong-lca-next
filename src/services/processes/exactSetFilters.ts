import type { DatasetClassificationFilterValue } from '../general/datasetClassification';

export type ProcessExactSetFilters = {
  classification?: DatasetClassificationFilterValue[];
  keyword?: string;
};

const asJsonList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];

const asJsonObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const jsonText = (value: unknown) =>
  value === undefined || value === null
    ? ''
    : (typeof value === 'object' ? JSON.stringify(value) : String(value)).trim();

export function validateProcessExactSetFilters(filters: ProcessExactSetFilters) {
  if (filters.keyword !== undefined && typeof filters.keyword !== 'string') {
    throw new Error('Invalid exact-process keyword');
  }
  if (filters.classification === undefined) {
    return;
  }
  if (!Array.isArray(filters.classification) || filters.classification.length > 50) {
    throw new Error('Invalid exact-process classification');
  }
  const validCode = (value: unknown) =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
  for (const selected of filters.classification) {
    if (
      !selected ||
      !['classification', 'elementary'].includes(selected.scope) ||
      !validCode(selected.code) ||
      (selected.system !== undefined && !validCode(selected.system)) ||
      (selected.path !== undefined &&
        (!Array.isArray(selected.path) ||
          selected.path.length < 1 ||
          selected.path.length > 20 ||
          !selected.path.every(validCode) ||
          selected.code.trim() !== selected.path[selected.path.length - 1]?.trim()))
    ) {
      throw new Error('Invalid exact-process classification selector');
    }
  }
}

/** Match the Database #838 predicate within one canonical ILCD classification system. */
export function matchesProcessExactSetClassification(
  classificationInformation: unknown,
  selectors?: DatasetClassificationFilterValue[],
) {
  if (!selectors?.length) {
    return true;
  }
  const containers = asJsonList(asJsonObject(classificationInformation)['common:classification']);
  return selectors.some((selected) => {
    if (selected.scope !== 'classification') {
      return false;
    }
    return containers.some((item) => {
      const container = asJsonObject(item);
      if (
        selected.system !== undefined &&
        jsonText(container['@name']) !== selected.system.trim()
      ) {
        return false;
      }
      const nodes = asJsonList(container['common:class']);
      if (selected.path) {
        const expected = selected.path.map((code) => code.trim());
        const actual = nodes
          .map((value, ordinal) => {
            const node = asJsonObject(value);
            const level = jsonText(node['@level']);
            return {
              level: /^[0-9]{1,2}$/.test(level) ? Number(level) : ordinal,
              code: jsonText(node['@classId']),
            };
          })
          .filter((node) => node.level < expected.length)
          .sort((left, right) => left.level - right.level);
        return (
          actual.length === expected.length &&
          actual.every((node, index) => node.level === index && node.code === expected[index])
        );
      }
      return nodes.some(
        (node) => jsonText(asJsonObject(node)['@classId']) === selected.code.trim(),
      );
    });
  });
}

function collectOriginalText(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectOriginalText);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !key.startsWith('@'))
      .flatMap(([, item]) => collectOriginalText(item));
  }
  return [];
}

/** Search persisted name/comment text and exact identity, before any display localization. */
export function matchesProcessExactSetKeyword(row: Record<string, unknown>, keyword = '') {
  const terms = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const text = collectOriginalText([row.id, row.version, row.name, row['common:generalComment']])
    .join(' ')
    .toLowerCase();
  return terms.every((term) => text.includes(term));
}
