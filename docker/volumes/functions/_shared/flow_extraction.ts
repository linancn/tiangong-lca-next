const DEFAULT_LANG = 'en';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pickProperty = (obj: unknown, names: string[]): unknown => {
  if (!isObject(obj)) return undefined;
  for (const name of names) {
    const value = obj[name];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const getTextFromDict = (data: unknown): string | null => {
  if (data === null || data === undefined) return null;
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    const text = String(data).trim();
    return text || null;
  }
  if (!isObject(data)) return null;
  const text = data['#text'] ?? data.text ?? data._text;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  return trimmed || null;
};

const collectTexts = (value: unknown, lang = DEFAULT_LANG): string[] => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text ? [text] : [];
  }

  const entries = Array.isArray(value) ? value : isObject(value) ? [value] : [];
  const langMatches: string[] = [];
  const fallback: string[] = [];

  for (const entry of entries) {
    if (entry === null || entry === undefined) continue;
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      const text = String(entry).trim();
      if (text) fallback.push(text);
      continue;
    }
    if (!isObject(entry)) continue;
    const entryLang = pickProperty(entry, ['@xml:lang', 'xml:lang', 'xml_lang', 'lang']);
    const text = getTextFromDict(entry);
    if (!text) continue;
    if (lang && entryLang === lang) {
      langMatches.push(text);
    } else {
      fallback.push(text);
    }
  }

  return langMatches.length ? langMatches : fallback;
};

const pickText = (value: unknown, lang = DEFAULT_LANG): string | null => {
  if (isObject(value)) {
    const getText = Reflect.get(value, 'get_text');
    if (typeof getText === 'function') {
      const text = getText.call(value, lang);
      if (text) {
        const trimmed = String(text).trim();
        if (trimmed) return trimmed;
      }
    }
  }

  const texts = collectTexts(value, lang);
  if (texts.length) return texts[0];
  if (isObject(value)) return getTextFromDict(value);
  return null;
};

const joinTexts = (value: unknown, lang = DEFAULT_LANG, sep = '\n\n'): string | null => {
  const texts = collectTexts(value, lang)
    .map((text) => text.trim())
    .filter(Boolean);
  return texts.length ? texts.join(sep) : null;
};

const toDisplayText = (value: unknown, lang = DEFAULT_LANG): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }
  return pickText(value, lang);
};

const findFlowDataSet = (data: unknown): Record<string, unknown> | null => {
  if (!isObject(data)) return null;

  const direct =
    pickProperty(data, ['flowDataSet', 'flow_data_set']) ??
    pickProperty(data, ['flowdataset', 'flow_dataset']);
  if (isObject(direct)) return direct;

  if (pickProperty(data, ['flowInformation', 'flow_information'])) return data;

  for (const value of Object.values(data)) {
    const found = findFlowDataSet(value);
    if (found) return found;
  }

  return null;
};

const getDataSetVersion = (dataset: Record<string, unknown>): string | null => {
  const admin = pickProperty(dataset, ['administrativeInformation', 'administrative_information']);
  const publication = pickProperty(admin, ['publicationAndOwnership', 'publication_and_ownership']);
  const version = pickProperty(publication, [
    'common:dataSetVersion',
    'common_data_set_version',
    'dataSetVersion',
    'data_set_version',
    'version',
  ]);
  return version ? toDisplayText(version) : null;
};

const getClassificationPath = (dataInfo: unknown): string | null => {
  const classification = pickProperty(dataInfo, [
    'classificationInformation',
    'classification_information',
  ]);
  const container = pickProperty(classification, [
    'common:elementaryFlowCategorization',
    'common:classification',
    'elementaryFlowCategorization',
    'classification',
    'common_elementary_flow_categorization',
    'common_classification',
  ]);
  const categories = ensureArray(
    pickProperty(container, [
      'common:category',
      'common:class',
      'category',
      'class',
      'common_category',
      'common_class',
    ]),
  );

  const levelOf = (entry: unknown): number | null => {
    const level = pickProperty(entry, ['@level', 'level']);
    if (level === undefined || level === null) return null;
    const parsed = Number(level);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parts = categories
    .slice()
    .sort((a, b) => {
      const levelA = levelOf(a);
      const levelB = levelOf(b);
      if (levelA === null && levelB === null) return 0;
      if (levelA === null) return 1;
      if (levelB === null) return -1;
      return levelA - levelB;
    })
    .map((entry) => getTextFromDict(entry))
    .filter((text): text is string => Boolean(text));
  return parts.length ? parts.join(' > ') : null;
};

const composeFlowTitle = (dataInfo: unknown, lang = DEFAULT_LANG): string => {
  const nameObj = pickProperty(dataInfo, ['name']);
  const parts = [
    joinTexts(pickProperty(nameObj, ['baseName', 'base_name', 'basename']), lang, ' | '),
    joinTexts(
      pickProperty(nameObj, ['mixAndLocationTypes', 'mix_and_location_types']),
      lang,
      ' | ',
    ),
    joinTexts(
      pickProperty(nameObj, ['treatmentStandardsRoutes', 'treatment_standards_routes']),
      lang,
      ' | ',
    ),
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(' | ') : 'Flow';
};

const formatNumber = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : String(value);
  }
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed.toString() : String(value);
};

const pickShortDescription = (ref: unknown, lang = DEFAULT_LANG): string | null => {
  if (ref === null || ref === undefined) return null;
  if (Array.isArray(ref)) {
    for (const entry of ref) {
      const text = pickShortDescription(entry, lang);
      if (text) return text;
    }
    return null;
  }

  const shortDescription = pickProperty(ref, [
    'common:shortDescription',
    'common_short_description',
    'shortDescription',
    'short_description',
  ]);
  const text = pickText(shortDescription, lang);
  if (text) return text;

  const direct = getTextFromDict(ref);
  if (direct) return direct;

  if (typeof ref === 'string' || typeof ref === 'number' || typeof ref === 'boolean') {
    const primitive = String(ref).trim();
    return primitive || null;
  }

  return null;
};

const getReferencePropertySummary = (
  dataset: Record<string, unknown>,
  lang = DEFAULT_LANG,
): { name: string | null; value: string | null } => {
  const flowInfo = pickProperty(dataset, ['flowInformation', 'flow_information']);
  const quantitativeReference = pickProperty(flowInfo, [
    'quantitativeReference',
    'quantitative_reference',
  ]);
  const refId = pickProperty(quantitativeReference, [
    'referenceToReferenceFlowProperty',
    'reference_to_reference_flow_property',
    '@ref',
  ]);

  const properties = pickProperty(dataset, ['flowProperties', 'flow_properties']);
  const propItems = ensureArray(
    pickProperty(properties, ['flowProperty', 'flow_property']) ?? properties,
  );

  if (!propItems.length || refId === null || refId === undefined) {
    return { name: null, value: null };
  }

  const refItem = propItems.find((item) => {
    const itemId = pickProperty(item, [
      'dataSetInternalID',
      'data_set_internal_id',
      '@dataSetInternalID',
      '@data_set_internal_id',
    ]);
    return itemId !== undefined && itemId !== null && String(itemId) === String(refId);
  });

  if (!refItem) {
    return { name: null, value: null };
  }

  const refInfo = pickProperty(refItem, [
    'referenceToFlowPropertyDataSet',
    'reference_to_flow_property_data_set',
  ]);
  const meanValue = pickProperty(refItem, ['meanValue', 'mean_value']);
  return {
    name: pickShortDescription(refInfo, lang),
    value: meanValue !== undefined && meanValue !== null ? formatNumber(meanValue) : null,
  };
};

const getEcNumber = (dataInfo: unknown): string | null => {
  const other = pickProperty(dataInfo, ['common:other', 'common_other', 'other']);
  const ecContainer = pickProperty(other, [
    'ecn:ECNumber',
    'ECNumber',
    'ecn_ec_number',
    'ec_number',
  ]);
  return toDisplayText(ecContainer);
};

const getMethodology = (dataset: Record<string, unknown>): string | null => {
  const modelling = pickProperty(dataset, ['modellingAndValidation', 'modelling_and_validation']);
  const lci = pickProperty(modelling, ['LCIMethod', 'lciMethod', 'lci_method']);
  const dataSetType = pickProperty(lci, ['typeOfDataSet', 'type_of_data_set']);
  const typeText = toDisplayText(dataSetType);
  return typeText ? `**Data Set Type:** ${typeText}` : null;
};

const getGeography = (flowInfo: unknown, lang = DEFAULT_LANG): string | null => {
  const geography = pickProperty(flowInfo, ['geography']);
  const location = pickProperty(geography, ['locationOfSupply', 'location_of_supply', 'location']);
  const locationText = toDisplayText(location, lang);
  return locationText ? `**Location of Supply:** ${locationText}` : null;
};

const getTechnology = (flowInfo: unknown, lang = DEFAULT_LANG): string | null => {
  const technology = pickProperty(flowInfo, ['technology']);
  if (isObject(technology)) {
    return joinTexts(
      pickProperty(technology, ['technologicalApplicability', 'technological_applicability']),
      lang,
    );
  }
  return joinTexts(technology, lang);
};

const getFlowProperties = (dataset: Record<string, unknown>, lang = DEFAULT_LANG): string[] => {
  const props = pickProperty(dataset, ['flowProperties', 'flow_properties']);
  const items = ensureArray(pickProperty(props, ['flowProperty', 'flow_property']) ?? props);
  const lines: string[] = [];

  for (const item of items) {
    const ref = pickProperty(item, [
      'referenceToFlowPropertyDataSet',
      'reference_to_flow_property_data_set',
    ]);
    const meanValue = pickProperty(item, ['meanValue', 'mean_value']);
    const name = pickShortDescription(ref, lang) || 'Flow property';
    lines.push(`- ${name}: ${formatNumber(meanValue)}`);
  }

  return lines;
};

export function normalizeJsonOrdered(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return JSON.parse(value);
}

export function generateFlowMarkdown(flowJson: unknown, lang = DEFAULT_LANG): string {
  const flowDataSet = findFlowDataSet(flowJson);
  if (!flowDataSet) {
    throw new Error('Invalid flow JSON: missing flow data set');
  }

  const flowInformation = pickProperty(flowDataSet, ['flowInformation', 'flow_information']) ?? {};
  const dataSetInformation =
    pickProperty(flowInformation, ['dataSetInformation', 'data_set_information']) ?? {};
  const title = composeFlowTitle(dataSetInformation, lang);
  const lines: string[] = [`# ${title}`, '', '**Entity:** Flow'];

  const uuid =
    pickProperty(dataSetInformation, ['common:UUID', 'common_uuid', 'uuid', 'UUID']) ??
    pickProperty(dataSetInformation, ['common:uuid']);
  const uuidText = toDisplayText(uuid, lang);
  if (uuidText) lines.push(`**UUID:** \`${uuidText}\``);

  const version = getDataSetVersion(flowDataSet);
  if (version) lines.push(`**Version:** ${version}`);

  const { name: refPropName, value: refPropValue } = getReferencePropertySummary(flowDataSet, lang);
  if (refPropName || refPropValue) {
    lines.push(`**Reference Property:** ${refPropName || 'N/A'}`);
  }
  if (refPropValue) lines.push(`**Property Mean:** ${refPropValue}`);

  const methodology = getMethodology(flowDataSet);
  if (methodology) lines.push(methodology);

  const casNumber = toDisplayText(
    pickProperty(dataSetInformation, ['CASNumber', 'casNumber', 'cas_number']),
    lang,
  );
  if (casNumber) lines.push(`**CAS:** ${casNumber}`);

  const ecNumber = getEcNumber(dataSetInformation);
  if (ecNumber) lines.push(`**EC Number:** ${ecNumber}`);

  const classification = getClassificationPath(dataSetInformation);
  if (classification) lines.push(`**Classification:** ${classification}`, '');

  const synonyms = joinTexts(
    pickProperty(dataSetInformation, ['common:synonyms', 'common_synonyms', 'synonyms']),
    lang,
  );
  if (synonyms) lines.push(`**Synonyms:** ${synonyms}`);

  if (lines.length && lines[lines.length - 1] !== '') {
    lines.push('');
  }

  const description = joinTexts(
    pickProperty(dataSetInformation, [
      'common:generalComment',
      'common_general_comment',
      'generalComment',
      'general_comment',
    ]),
    lang,
  );
  if (description) lines.push('## Description', '', description, '');

  const geography = getGeography(flowInformation, lang);
  if (geography) lines.push('## Geography', '', geography, '');

  const technology = getTechnology(flowInformation, lang);
  if (technology) lines.push('## Technology', '', technology, '');

  const flowProperties = getFlowProperties(flowDataSet, lang);
  if (flowProperties.length) lines.push('## Flow Properties', '', ...flowProperties, '');

  if (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}
