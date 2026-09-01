import { normalizeJsonOrdered } from './flow_extraction.ts';
import {
  asArray as sharedAsArray,
  displayText as sharedDisplayText,
  isRecord as sharedIsRecord,
  pick as sharedPick,
  preferredTitle as sharedPreferredTitle,
  readClassificationPath as sharedReadClassificationPath,
  readReferenceShortDescriptionDisplay as sharedReadReferenceShortDescriptionDisplay,
  scalarText as sharedScalarText,
} from './projection_primitives.ts';

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

const isRecord = sharedIsRecord;
const pick = sharedPick;

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

const asArray = sharedAsArray;
const scalarText = sharedScalarText;
const displayText = sharedDisplayText;
const preferredTitle = sharedPreferredTitle;

function classificationPath(dataSetInformation: unknown): string | null {
  return sharedReadClassificationPath(dataSetInformation, {
    labelNames: ['#text', 'value', 'common:name', 'name'],
  });
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
    sharedReadReferenceShortDescriptionDisplay(referenceUnitGroup),
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
    sharedReadReferenceShortDescriptionDisplay(pick(dataSetInformation, 'referenceToContact')),
  );
  pushField(
    lines,
    'Digital File',
    sharedReadReferenceShortDescriptionDisplay(pick(dataSetInformation, 'referenceToDigitalFile')),
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
