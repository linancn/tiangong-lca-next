import { normalizeJsonOrdered } from './flow_extraction.ts';

export type FoundationDatasetKind = 'contact' | 'flowproperty' | 'source' | 'unitgroup';

type JsonRecord = Record<string, unknown>;

const PROFILE = {
  contact: {
    root: 'contactDataSet',
    entity: 'Contact',
    information: ['contactInformation'],
  },
  flowproperty: {
    root: 'flowPropertyDataSet',
    entity: 'Flow Property',
    information: ['flowPropertiesInformation'],
  },
  source: {
    root: 'sourceDataSet',
    entity: 'Source',
    information: ['sourceInformation'],
  },
  unitgroup: {
    root: 'unitGroupDataSet',
    entity: 'Unit Group',
    information: ['unitGroupInformation'],
  },
} as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(record: unknown, ...keys: string[]): unknown {
  if (!isRecord(record)) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function findDataset(value: unknown, rootKey: string): JsonRecord | null {
  if (!isRecord(value)) return null;
  if (isRecord(value[rootKey])) return value[rootKey] as JsonRecord;
  if (rootKey in value) return null;
  for (const child of Object.values(value)) {
    const found = findDataset(child, rootKey);
    if (found) return found;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function scalarText(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }
  return null;
}

function collectDisplayTexts(value: unknown): string[] {
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

function uniqueTexts(value: unknown): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of collectDisplayTexts(value)) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

function displayText(value: unknown, separator = ' | '): string | null {
  const values = uniqueTexts(value);
  return values.length ? values.join(separator) : null;
}

function preferredTitle(value: unknown): string | null {
  const candidates = asArray(value);
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const lang = scalarText(pick(candidate, '@xml:lang', 'xml:lang', 'lang'));
    if (lang?.toLowerCase().startsWith('en')) {
      const text = displayText(pick(candidate, '#text', 'text', '_text'));
      if (text) return text;
    }
  }
  return displayText(value);
}

function classificationPath(dataSetInformation: unknown): string | null {
  const classificationInformation = pick(
    dataSetInformation,
    'classificationInformation',
    'classification_information',
  );
  const classification = pick(classificationInformation, 'common:classification', 'classification');
  const classes = asArray(pick(classification, 'common:class', 'class'));
  const sorted = classes.slice().sort((left, right) => {
    const leftLevel = Number(pick(left, '@level', 'level'));
    const rightLevel = Number(pick(right, '@level', 'level'));
    if (Number.isFinite(leftLevel) && Number.isFinite(rightLevel)) return leftLevel - rightLevel;
    if (Number.isFinite(leftLevel)) return -1;
    if (Number.isFinite(rightLevel)) return 1;
    return 0;
  });
  const labels = sorted
    .map((entry) => displayText(pick(entry, '#text', 'value', 'common:name', 'name') ?? entry))
    .filter((value): value is string => Boolean(value));
  return labels.length ? labels.join(' > ') : null;
}

function datasetVersion(dataset: JsonRecord): string | null {
  return displayText(
    pick(
      pick(
        pick(dataset, 'administrativeInformation', 'administrative_information'),
        'publicationAndOwnership',
        'publication_and_ownership',
      ),
      'common:dataSetVersion',
      'dataSetVersion',
      'data_set_version',
    ),
  );
}

function pushField(lines: string[], label: string, value: unknown): void {
  const text = displayText(value);
  if (text) lines.push(`**${label}:** ${text}`);
}

function pushSection(lines: string[], title: string, value: unknown): void {
  const text = displayText(value, '\n\n');
  if (text) lines.push('', `## ${title}`, '', text);
}

function appendContact(lines: string[], information: unknown, dataSetInformation: unknown): void {
  pushField(lines, 'Short Name', pick(dataSetInformation, 'common:shortName', 'shortName'));
  pushField(lines, 'Classification', classificationPath(dataSetInformation));
  pushField(lines, 'Organisation', pick(dataSetInformation, 'centralContactPoint'));
  pushField(lines, 'Address', pick(dataSetInformation, 'contactAddress'));
  pushField(lines, 'Telephone', pick(dataSetInformation, 'telephone'));
  pushField(lines, 'Telefax', pick(dataSetInformation, 'telefax'));
  pushField(lines, 'Email', pick(dataSetInformation, 'email'));
  pushField(lines, 'Website', pick(dataSetInformation, 'WWWAddress'));
  pushSection(
    lines,
    'Description',
    pick(dataSetInformation, 'contactDescriptionOrComment', 'common:generalComment'),
  );
  void information;
}

function appendFlowProperty(
  lines: string[],
  information: unknown,
  dataSetInformation: unknown,
): void {
  pushField(lines, 'Synonyms', pick(dataSetInformation, 'common:synonyms', 'synonyms'));
  pushField(lines, 'Classification', classificationPath(dataSetInformation));
  const quantitativeReference = pick(information, 'quantitativeReference');
  const referenceUnitGroup = pick(quantitativeReference, 'referenceToReferenceUnitGroup');
  pushField(
    lines,
    'Reference Unit Group',
    pick(referenceUnitGroup, 'common:shortDescription', 'shortDescription'),
  );
  pushSection(
    lines,
    'Description',
    pick(dataSetInformation, 'common:generalComment', 'generalComment'),
  );
}

function appendSource(lines: string[], information: unknown, dataSetInformation: unknown): void {
  pushField(lines, 'Classification', classificationPath(dataSetInformation));
  pushField(lines, 'Citation', pick(dataSetInformation, 'sourceCitation'));
  pushField(lines, 'Publication Type', pick(dataSetInformation, 'publicationType'));
  pushField(
    lines,
    'Contact',
    pick(pick(dataSetInformation, 'referenceToContact'), 'common:shortDescription'),
  );
  pushField(
    lines,
    'Digital File',
    pick(pick(dataSetInformation, 'referenceToDigitalFile'), 'common:shortDescription'),
  );
  pushSection(
    lines,
    'Description',
    pick(dataSetInformation, 'sourceDescriptionOrComment', 'common:generalComment'),
  );
  void information;
}

function appendUnitGroup(lines: string[], information: unknown, dataSetInformation: unknown): void {
  pushField(lines, 'Classification', classificationPath(dataSetInformation));
  const referenceId = scalarText(
    pick(pick(information, 'quantitativeReference'), 'referenceToReferenceUnit'),
  );
  const dataset = isRecord(information) ? information.__dataset : undefined;
  const units = asArray(pick(pick(dataset, 'units'), 'unit'));
  const unitLines = units
    .map((unit) => {
      const name = displayText(pick(unit, 'name'));
      if (!name) return null;
      const internalId = scalarText(pick(unit, '@dataSetInternalID', 'dataSetInternalID'));
      const meanValue = scalarText(pick(unit, 'meanValue'));
      const tags = [internalId && internalId === referenceId ? 'reference' : null, meanValue]
        .filter(Boolean)
        .join(', ');
      const comment = displayText(pick(unit, 'generalComment'));
      return `- ${name}${tags ? ` (${tags})` : ''}${comment ? ` — ${comment}` : ''}`;
    })
    .filter((value): value is string => Boolean(value));
  if (unitLines.length) lines.push('', '## Units', '', ...unitLines);
  pushSection(
    lines,
    'Description',
    pick(dataSetInformation, 'common:generalComment', 'generalComment'),
  );
}

export function generateFoundationDatasetMarkdown(
  kind: FoundationDatasetKind,
  jsonOrdered: unknown,
): string {
  const profile = PROFILE[kind];
  const normalized = normalizeJsonOrdered(jsonOrdered);
  const dataset = findDataset(normalized, profile.root);
  if (!dataset) {
    throw new Error(`Invalid ${kind} JSON: missing ${profile.root}`);
  }

  const rawInformation = pick(dataset, ...profile.information);
  const information = isRecord(rawInformation)
    ? ({ ...rawInformation, __dataset: dataset } as JsonRecord)
    : ({ __dataset: dataset } as JsonRecord);
  const dataSetInformation = pick(information, 'dataSetInformation', 'data_set_information') ?? {};
  const title =
    preferredTitle(
      pick(dataSetInformation, 'common:name', 'name', 'common:shortName', 'shortName'),
    ) ?? profile.entity;

  const lines = [`# ${title}`, '', `**Entity:** ${profile.entity}`];
  const uuid = displayText(pick(dataSetInformation, 'common:UUID', 'UUID', 'uuid'));
  if (uuid) lines.push(`**UUID:** \`${uuid}\``);
  const version = datasetVersion(dataset);
  if (version) lines.push(`**Version:** ${version}`);

  switch (kind) {
    case 'contact':
      appendContact(lines, information, dataSetInformation);
      break;
    case 'flowproperty':
      appendFlowProperty(lines, information, dataSetInformation);
      break;
    case 'source':
      appendSource(lines, information, dataSetInformation);
      break;
    case 'unitgroup':
      appendUnitGroup(lines, information, dataSetInformation);
      break;
  }

  return lines.join('\n').trim();
}

export const generateContactMarkdown = (value: unknown): string =>
  generateFoundationDatasetMarkdown('contact', value);
export const generateFlowPropertyMarkdown = (value: unknown): string =>
  generateFoundationDatasetMarkdown('flowproperty', value);
export const generateSourceMarkdown = (value: unknown): string =>
  generateFoundationDatasetMarkdown('source', value);
export const generateUnitGroupMarkdown = (value: unknown): string =>
  generateFoundationDatasetMarkdown('unitgroup', value);
