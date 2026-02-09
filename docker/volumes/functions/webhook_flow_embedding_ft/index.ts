// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

const DEFAULT_LANG = 'en';

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pickProperty = (obj: any, names: string[]) => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const name of names) {
    const value = (obj as any)[name];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const ensureArray = <T>(obj: T | T[] | null | undefined): T[] => {
  if (obj === null || obj === undefined) return [];
  return Array.isArray(obj) ? obj : [obj];
};

const getTextFromDict = (data: any): string | null => {
  if (data === null || data === undefined) return null;
  if (typeof data === 'string' || typeof data === 'number') {
    const text = String(data).trim();
    return text || null;
  }
  if (isObject(data)) {
    const text = data['#text'] ?? data['text'] ?? data['_text'];
    if (typeof text === 'string') {
      const trimmed = text.trim();
      return trimmed || null;
    }
  }
  return null;
};

const getLangText = (value: any, lang = DEFAULT_LANG): string | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return text || null;
  }

  if (Array.isArray(value)) {
    const exact = value.find(
      (item) => isObject(item) && item['@xml:lang'] && item['@xml:lang'] === lang,
    );
    if (exact !== undefined) {
      const text = getLangText(exact, lang);
      if (text) return text;
    }
    for (const item of value) {
      const text = getLangText(item, lang);
      if (text) return text;
    }
    return null;
  }

  if (isObject(value)) {
    if (typeof (value as any).get_text === 'function') {
      const text = (value as any).get_text(lang);
      if (text) {
        const trimmed = String(text).trim();
        if (trimmed) return trimmed;
      }
    }
    const text = getTextFromDict(value);
    if (text) return text;
    for (const key of Object.keys(value)) {
      if (key.toLowerCase().includes('text')) {
        const nestedText = getLangText((value as any)[key], lang);
        if (nestedText) return nestedText;
      }
    }
  }

  return null;
};

const toDisplayText = (value: any, lang = DEFAULT_LANG): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }
  return getLangText(value, lang) ?? getTextFromDict(value);
};

const collectTexts = (value: any, lang = DEFAULT_LANG): string[] => {
  if (value === null || value === undefined) return [];

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text ? [text] : [];
  }

  let entries: any[] = [];
  if (Array.isArray(value)) {
    entries = value;
  } else if (isObject(value)) {
    entries = [value];
  } else {
    return [];
  }

  const langMatches: string[] = [];
  const fallback: string[] = [];
  for (const entry of entries) {
    if (entry === null || entry === undefined) {
      continue;
    }
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

const pickText = (value: any, lang = DEFAULT_LANG): string | null => {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    const texts = collectTexts(value, lang);
    return texts.length ? texts[0] : null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }

  if (isObject(value)) {
    if (typeof (value as any).get_text === 'function') {
      const text = (value as any).get_text(lang);
      if (text) {
        const trimmed = String(text).trim();
        if (trimmed) return trimmed;
      }
    }
    const direct = getTextFromDict(value);
    if (direct) return direct;
  }

  return null;
};

const joinTexts = (value: any, lang = DEFAULT_LANG, sep = '\n\n'): string | null => {
  const texts = collectTexts(value, lang)
    .map((text) => text.trim())
    .filter((text) => text);
  return texts.length ? texts.join(sep) : null;
};

const formatNumber = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : String(value);
  }
  try {
    const num = Number(String(value));
    if (Number.isFinite(num)) return num.toString();
  } catch {
    // fall through
  }
  return String(value);
};

const pickShortDescription = (ref: any, lang = DEFAULT_LANG): string | null => {
  if (ref === null || ref === undefined) return null;
  if (Array.isArray(ref)) {
    for (const entry of ref) {
      const text = pickShortDescription(entry, lang);
      if (text) return text;
    }
    return null;
  }
  if (isObject(ref)) {
    const shortDesc = pickProperty(ref, [
      'common:shortDescription',
      'common_short_description',
      'shortDescription',
      'short_description',
    ]);
    const text = pickText(shortDesc, lang);
    if (text) return text;
    const direct = getTextFromDict(ref);
    if (direct) return direct;
  }
  if (typeof ref === 'string' || typeof ref === 'number' || typeof ref === 'boolean') {
    const text = String(ref).trim();
    return text || null;
  }
  return null;
};

const findFlowDataSet = (data: any): any => {
  if (!isObject(data)) return null;

  const direct =
    pickProperty(data, ['flowDataSet', 'flow_data_set']) ??
    pickProperty(data, ['flowdataset', 'flow_dataset']);
  if (direct) return direct;

  if (pickProperty(data, ['flowInformation', 'flow_information'])) {
    return data;
  }

  for (const key of Object.keys(data)) {
    const value = (data as any)[key];
    if (isObject(value)) {
      const found = findFlowDataSet(value);
      if (found) return found;
    }
  }

  return null;
};

const composeFlowTitle = (dataInfo: any, lang = DEFAULT_LANG): string => {
  if (!dataInfo) return 'Flow';
  const nameObj = pickProperty(dataInfo, ['name']);
  const parts: string[] = [];
  const fields = [
    ['baseName', 'base_name', 'basename'],
    ['mixAndLocationTypes', 'mix_and_location_types'],
    ['treatmentStandardsRoutes', 'treatment_standards_routes'],
  ];
  for (const names of fields) {
    const value = nameObj ? pickProperty(nameObj, names) : undefined;
    const part = joinTexts(value, lang, ' | ');
    if (part) parts.push(part);
  }
  return parts.length ? parts.join(' | ') : 'Flow';
};

const getReferencePropertySummary = (
  dataset: any,
  lang = DEFAULT_LANG,
): { name: string | null; value: string | null } => {
  if (!dataset) return { name: null, value: null };

  const flowInfo = pickProperty(dataset, ['flowInformation', 'flow_information']);
  const quantitativeReference = flowInfo
    ? pickProperty(flowInfo, ['quantitativeReference', 'quantitative_reference'])
    : null;
  const refId = quantitativeReference
    ? pickProperty(quantitativeReference, [
        'referenceToReferenceFlowProperty',
        'reference_to_reference_flow_property',
        '@ref',
      ])
    : null;

  const properties = pickProperty(dataset, ['flowProperties', 'flow_properties']);
  const propItems = ensureArray(
    pickProperty(properties, ['flowProperty', 'flow_property']) ?? properties,
  );
  if (!propItems.length || refId === null || refId === undefined) {
    return { name: null, value: null };
  }

  let refItem: any = null;
  for (const item of propItems) {
    const itemId = pickProperty(item, [
      'dataSetInternalID',
      'data_set_internal_id',
      '@dataSetInternalID',
      '@data_set_internal_id',
    ]);
    if (itemId !== undefined && itemId !== null && String(itemId) === String(refId)) {
      refItem = item;
      break;
    }
  }

  if (!refItem) {
    return { name: null, value: null };
  }

  const refInfo = pickProperty(refItem, [
    'referenceToFlowPropertyDataSet',
    'reference_to_flow_property_data_set',
  ]);
  const meanValue = pickProperty(refItem, ['meanValue', 'mean_value']);
  const name = pickShortDescription(refInfo, lang);
  const value = meanValue !== undefined && meanValue !== null ? formatNumber(meanValue) : null;
  return { name, value };
};

const getClassificationPath = (dataInfo: any): string | null => {
  if (!dataInfo) return null;

  const classification = pickProperty(dataInfo, [
    'classificationInformation',
    'classification_information',
  ]);
  if (!classification) return null;

  const container = pickProperty(classification, [
    'common:elementaryFlowCategorization',
    'common:classification',
    'elementaryFlowCategorization',
    'classification',
    'common_elementary_flow_categorization',
    'common_classification',
  ]);
  if (!container) return null;

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
  if (!categories.length) return null;

  const getLevel = (item: any): number | null => {
    const level = isObject(item) ? pickProperty(item, ['@level', 'level']) : null;
    if (level === undefined || level === null) return null;
    const parsed = Number(level);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sorted = categories.slice().sort((a, b) => {
    const levelA = getLevel(a);
    const levelB = getLevel(b);
    if (levelA === null && levelB === null) return 0;
    if (levelA === null) return 1;
    if (levelB === null) return -1;
    return levelA - levelB;
  });

  const parts: string[] = [];
  for (const entry of sorted) {
    const text = getTextFromDict(entry);
    if (text) parts.push(text);
  }
  return parts.length ? parts.join(' > ') : null;
};

const getEcNumber = (dataInfo: any): string | null => {
  if (!dataInfo) return null;
  const other = pickProperty(dataInfo, ['common:other', 'common_other', 'other']);
  if (!other || !isObject(other)) return null;
  const ecContainer = pickProperty(other, [
    'ecn:ECNumber',
    'ECNumber',
    'ecn_ec_number',
    'ec_number',
  ]);
  if (typeof ecContainer === 'string' || typeof ecContainer === 'number') {
    const text = String(ecContainer).trim();
    return text || null;
  }
  if (isObject(ecContainer)) {
    const text = getTextFromDict(ecContainer);
    return text || null;
  }
  return null;
};

const getDataSetVersion = (dataset: any): string | null => {
  if (!dataset) return null;
  const admin = pickProperty(dataset, ['administrativeInformation', 'administrative_information']);
  const publication = admin
    ? pickProperty(admin, ['publicationAndOwnership', 'publication_and_ownership'])
    : null;
  const version = publication
    ? pickProperty(publication, [
        'common:dataSetVersion',
        'common_data_set_version',
        'dataSetVersion',
        'data_set_version',
        'version',
      ])
    : null;
  return version ? toDisplayText(version, DEFAULT_LANG) : null;
};

const getMethodology = (dataset: any): string | null => {
  if (!dataset) return null;
  const modelling = pickProperty(dataset, ['modellingAndValidation', 'modelling_and_validation']);
  const lci = modelling ? pickProperty(modelling, ['LCIMethod', 'lciMethod', 'lci_method']) : null;
  const dataSetType = lci ? pickProperty(lci, ['typeOfDataSet', 'type_of_data_set']) : null;
  const typeText = dataSetType ? toDisplayText(dataSetType, DEFAULT_LANG) : null;
  return typeText ? `**Data Set Type:** ${typeText}` : null;
};

const getGeography = (flowInfo: any, lang = DEFAULT_LANG): string | null => {
  const geography = flowInfo ? pickProperty(flowInfo, ['geography']) : null;
  if (!geography) return null;
  const location = pickProperty(geography, ['locationOfSupply', 'location_of_supply', 'location']);
  const locationText = toDisplayText(location, lang);
  if (!locationText) return null;
  return `**Location of Supply:** ${locationText}`;
};

const getTechnology = (flowInfo: any, lang = DEFAULT_LANG): string | null => {
  const technology = flowInfo ? pickProperty(flowInfo, ['technology']) : null;
  if (!technology) return null;
  if (isObject(technology)) {
    const applicability = joinTexts(
      pickProperty(technology, ['technologicalApplicability', 'technological_applicability']),
      lang,
    );
    return applicability;
  }
  return joinTexts(technology, lang);
};

const getFlowProperties = (dataset: any, lang = DEFAULT_LANG): string[] => {
  if (!dataset) return [];
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

const tidasFlowToMarkdown = (flowJson: any, lang = DEFAULT_LANG) => {
  const flowDataSet = findFlowDataSet(flowJson);
  if (!flowDataSet) {
    throw new Error('Invalid flow JSON: missing flow data set');
  }

  const flowInformation = pickProperty(flowDataSet, ['flowInformation', 'flow_information']) ?? {};
  const dataSetInformation =
    pickProperty(flowInformation, ['dataSetInformation', 'data_set_information']) ?? {};

  const title = composeFlowTitle(dataSetInformation, lang);

  const lines: string[] = [`# ${title}`, ''];
  lines.push('**Entity:** Flow');

  const uuid =
    pickProperty(dataSetInformation, ['common:UUID', 'common_uuid', 'uuid', 'UUID']) ??
    pickProperty(dataSetInformation, ['common:uuid']);
  const uuidText = toDisplayText(uuid, lang);
  if (uuidText) {
    lines.push(`**UUID:** \`${uuidText}\``);
  }

  const version = getDataSetVersion(flowDataSet);
  if (version) {
    lines.push(`**Version:** ${version}`);
  }

  const { name: refPropName, value: refPropValue } = getReferencePropertySummary(flowDataSet, lang);
  if (refPropName || refPropValue) {
    lines.push(`**Reference Property:** ${refPropName || 'N/A'}`);
  }
  if (refPropValue) {
    lines.push(`**Property Mean:** ${refPropValue}`);
  }

  const methodology = getMethodology(flowDataSet);
  if (methodology) {
    lines.push(methodology);
  }

  const casNumber = toDisplayText(
    pickProperty(dataSetInformation, ['CASNumber', 'casNumber', 'cas_number']),
    lang,
  );
  if (casNumber) {
    lines.push(`**CAS:** ${casNumber}`);
  }

  const ecNumber = getEcNumber(dataSetInformation);
  if (ecNumber) {
    lines.push(`**EC Number:** ${ecNumber}`);
  }

  const classification = getClassificationPath(dataSetInformation);
  if (classification) {
    lines.push(`**Classification:** ${classification}`);
    lines.push('');
  }

  const synonyms = joinTexts(
    pickProperty(dataSetInformation, ['common:synonyms', 'common_synonyms', 'synonyms']),
    lang,
  );
  if (synonyms) {
    lines.push(`**Synonyms:** ${synonyms}`);
  }

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
  if (description) {
    lines.push('## Description', '', description, '');
  }

  const geography = getGeography(flowInformation, lang);
  if (geography) {
    lines.push('## Geography', '', geography, '');
  }

  const technology = getTechnology(flowInformation, lang);
  if (technology) {
    lines.push('## Technology', '', technology, '');
  }

  const flowProperties = getFlowProperties(flowDataSet, lang);
  if (flowProperties.length) {
    lines.push('## Flow Properties', '', ...flowProperties, '');
  }

  if (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.join('\n');
};

Deno.serve(async (req) => {
  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    allowedMethods: [AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  try {
    const rawPayload: unknown = await req.json();
    const events: WebhookPayload[] = Array.isArray(rawPayload)
      ? (rawPayload as WebhookPayload[])
      : [rawPayload as WebhookPayload];

    // console.log("[webhook_flow_embedding_ft] batch received", { size: events.length });

    const results: Array<{
      index: number;
      id?: string;
      version?: string;
      type?: string;
      table?: string;
      status: 'success' | 'ignored' | 'skipped';
      markdownLength?: number;
    }> = [];

    for (const [index, payload] of events.entries()) {
      const { type, record, table } = payload ?? {};
      // console.log("[webhook_flow_embedding_ft] payload received", {
      //   index,
      //   type,
      //   hasRecord: !!record,
      //   recordKeys: record ? Object.keys(record as Record<string, unknown>) : [],
      //   table,
      // });

      if (table && table !== 'flows') {
        throw new Error(`batch index ${index}: unexpected table ${table}, expect flows`);
      }

      if (type !== 'INSERT' && type !== 'UPDATE') {
        console.error('[webhook_flow_embedding_ft] ignored type', { index, type });
        results.push({ index, type, table, status: 'ignored' });
        continue;
      }

      if (!record) {
        throw new Error(`batch index ${index}: No record data found`);
      }

      const { id, version } = record as { id?: string; version?: string };
      if (!id || !version) {
        throw new Error(`batch index ${index}: Record is missing id or version`);
      }

      const jsonDataRaw = (record as Record<string, any>).json_ordered;
      // console.log("[webhook_flow_embedding_ft] json_ordered type", {
      //   index,
      //   type: typeof jsonDataRaw,
      //   isString: typeof jsonDataRaw === "string",
      // });
      if (typeof jsonDataRaw === 'string') {
        try {
          (record as Record<string, any>).json_ordered = JSON.parse(jsonDataRaw);
        } catch (error) {
          console.error('[webhook_flow_embedding_ft] json parse failed', {
            index,
            message: error instanceof Error ? error.message : String(error),
          });
          throw new Error(
            `batch index ${index}: Failed to parse json_ordered string: ${
              error instanceof Error ? error.message : 'unknown'
            }`,
          );
        }
      }
      const jsonData = (record as Record<string, any>).json_ordered;
      if (!jsonData) {
        throw new Error(`batch index ${index}: No json_ordered data found in record`);
      }

      const markdown = tidasFlowToMarkdown(jsonData);
      console.log(markdown);
      // console.log("[webhook_flow_embedding_ft] markdown generated", {
      //   index,
      //   length: markdown?.length ?? 0,
      // });
      if (!markdown) throw new Error(`batch index ${index}: Empty extracted markdown`);

      const { error: updateError } = await supabaseClient
        .from('flows')
        .update({
          extracted_md: markdown,
        })
        .eq('id', id)
        .eq('version', version);

      if (updateError) {
        console.error('[webhook_flow_embedding_ft] supabase update error', updateError);
        throw new Error(
          `batch index ${index}: ${
            updateError instanceof Error ? updateError.message : JSON.stringify(updateError)
          }`,
        );
      }
      console.log('md update success', {
        index,
        id,
        version,
        markdownLength: markdown.length,
      });
      results.push({
        index,
        id,
        version,
        type,
        table,
        status: 'success',
        markdownLength: markdown.length,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[webhook_flow_embedding_ft] caught error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
