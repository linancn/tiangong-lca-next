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

const formatNumber = (value: any): string => {
  if (value === null || value === undefined) return '';
  const parseNumber = (input: any): number | null => {
    if (typeof input === 'number') {
      return Number.isFinite(input) ? input : null;
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    try {
      const parsed = Number(String(input));
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const num = parseNumber(value);
  if (num === null) return String(value);
  if (Object.is(num, -0) || num === 0) return '0';

  const precision = 6;
  const abs = Math.abs(num);
  const exponent = Math.floor(Math.log10(abs));
  const useExponential = exponent < -4 || exponent >= precision;

  if (useExponential) {
    const raw = num.toExponential(precision - 1);
    const [mantissa, exp] = raw.split('e');
    let cleanedMantissa = mantissa;
    if (mantissa.includes('.')) {
      cleanedMantissa = mantissa.replace(/\.?0+$/, '');
    }
    let sign = '';
    let digits = exp;
    if (exp.startsWith('+') || exp.startsWith('-')) {
      sign = exp[0];
      digits = exp.slice(1);
    }
    digits = digits.replace(/^0+/, '') || '0';
    if (digits.length < 2) digits = digits.padStart(2, '0');
    return `${cleanedMantissa}e${sign}${digits}`;
  }

  const decimals = Math.max(0, precision - 1 - exponent);
  const fixed = num.toFixed(decimals);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
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
    const shortDesc = pickProperty(ref, ['common:shortDescription', 'common_short_description']);
    const text = pickText(shortDesc, lang);
    if (text) return text;
    const direct = getTextFromDict(ref);
    if (direct) return direct;
  }
  return null;
};

const findProcessDataSet = (data: any): any => {
  if (!isObject(data)) return null;

  const direct =
    pickProperty(data, ['processDataSet', 'process_data_set']) ??
    pickProperty(data, ['processdataset', 'process_dataset']);
  if (direct) return direct;

  if (pickProperty(data, ['processInformation', 'process_information'])) {
    return data;
  }

  for (const key of Object.keys(data)) {
    const value = (data as any)[key];
    if (isObject(value)) {
      const found = findProcessDataSet(value);
      if (found) return found;
    }
  }

  return null;
};

const composeProcessTitle = (dataInfo: any, lang = DEFAULT_LANG): string => {
  if (!dataInfo) return 'Process';
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
  return parts.length ? parts.join(' | ') : 'Process';
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

const getReferenceFlowSummary = (
  dataset: any,
  quantRef: any,
  lang = DEFAULT_LANG,
): { name: string | null; amount: string | null } => {
  if (!dataset || !quantRef) {
    return { name: null, amount: null };
  }
  let refId: any = pickProperty(quantRef, [
    'referenceToReferenceFlow',
    'reference_to_reference_flow',
    '@ref',
  ]);
  if (isObject(refId)) {
    refId = pickProperty(refId, ['@ref', 'ref', '#text']);
  }
  if (refId === null || refId === undefined) {
    return { name: null, amount: null };
  }

  const exchangesObj = pickProperty(dataset, ['exchanges']);
  const exchangeList = ensureArray(pickProperty(exchangesObj, ['exchange']) ?? exchangesObj);
  if (!exchangeList.length) {
    return { name: null, amount: null };
  }

  let refExchange: any = null;
  for (const ex of exchangeList) {
    const exId = pickProperty(ex, [
      'dataSetInternalID',
      'data_set_internal_id',
      '@dataSetInternalID',
      '@data_set_internal_id',
    ]);
    if (exId !== undefined && exId !== null && String(exId) === String(refId)) {
      refExchange = ex;
      break;
    }
  }

  if (!refExchange) {
    return { name: null, amount: null };
  }

  const reference = pickProperty(refExchange, [
    'referenceToFlowDataSet',
    'reference_to_flow_data_set',
  ]);
  const name = pickShortDescription(reference, lang);
  const amountRaw = pickProperty(refExchange, ['meanAmount', 'mean_amount']);
  const amount = amountRaw !== undefined && amountRaw !== null ? formatNumber(amountRaw) : null;
  return { name, amount };
};

const getClassificationPath = (dataInfo: any): string | null => {
  if (!dataInfo) return null;

  const classificationInfo = pickProperty(dataInfo, [
    'classificationInformation',
    'classification_information',
  ]);
  if (!classificationInfo) return null;

  const commonClassification = pickProperty(classificationInfo, [
    'common:classification',
    'common_classification',
    'classification',
  ]);
  if (!commonClassification) return null;

  const classes = ensureArray(
    pickProperty(commonClassification, ['common:class', 'common_class', 'class']),
  );
  if (!classes.length) return null;

  const getLevel = (item: any): number | null => {
    const level = isObject(item) ? pickProperty(item, ['@level', 'level']) : null;
    if (level === undefined || level === null) return null;
    const parsed = Number(level);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sorted = classes.slice().sort((a, b) => {
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

const getTimeCoverage = (processInfo: any, lang = DEFAULT_LANG): string | null => {
  const timeInfo = processInfo ? pickProperty(processInfo, ['time']) : null;
  if (!timeInfo) return null;

  const year = toDisplayText(
    pickProperty(timeInfo, [
      'common:referenceYear',
      'common_reference_year',
      'referenceYear',
      'reference_year',
    ]),
    lang,
  );
  const until = toDisplayText(
    pickProperty(timeInfo, [
      'common:dataSetValidUntil',
      'common_data_set_valid_until',
      'dataSetValidUntil',
      'validUntil',
      'valid_until',
    ]),
    lang,
  );
  const description = joinTexts(
    pickProperty(timeInfo, [
      'common:timeRepresentativenessDescription',
      'common_time_representativeness_description',
      'timeRepresentativenessDescription',
      'time_representativeness_description',
    ]),
    lang,
  );

  const parts: string[] = [];
  if (year || until) {
    const yearText = year ?? 'None';
    const line = until
      ? `Reference Year: ${yearText} | Valid Until: ${until}`
      : `Reference Year: ${yearText}`;
    parts.push(line);
  }
  if (description) parts.push(description);
  return parts.length ? parts.join('\n') : null;
};

const getGeography = (
  processInfo: any,
  lang = DEFAULT_LANG,
): { code: string | null; restrictions: string | null } => {
  const geography = processInfo ? pickProperty(processInfo, ['geography']) : null;
  const location = geography
    ? pickProperty(geography, [
        'locationOfOperationSupplyOrProduction',
        'location_of_operation_supply_or_production',
      ])
    : null;
  if (!location) return { code: null, restrictions: null };
  const code = toDisplayText(pickProperty(location, ['location', '@location']), lang);
  const restrictions = joinTexts(
    pickProperty(location, ['descriptionOfRestrictions', 'description_of_restrictions']),
    lang,
  );
  return { code: code ?? null, restrictions: restrictions ?? null };
};

const getGeographyDescription = (processInfo: any, lang = DEFAULT_LANG): string | null => {
  const { restrictions } = getGeography(processInfo, lang);
  return restrictions;
};

const getTechnology = (processInfo: any, lang = DEFAULT_LANG): string | null => {
  const technology = processInfo ? pickProperty(processInfo, ['technology']) : null;
  if (!technology) return null;
  const applicability = joinTexts(
    pickProperty(technology, ['technologicalApplicability', 'technological_applicability']),
    lang,
  );
  const description = joinTexts(
    pickProperty(technology, [
      'technologyDescriptionAndIncludedProcesses',
      'technology_description_and_included_processes',
    ]),
    lang,
  );
  const parts = [applicability, description].filter(Boolean) as string[];
  return parts.length ? parts.join('\n\n') : null;
};

const getMethodology = (dataset: any, lang = DEFAULT_LANG): string | null => {
  if (!dataset) return null;
  const modelling = pickProperty(dataset, ['modellingAndValidation', 'modelling_and_validation']);
  const lci = modelling
    ? pickProperty(modelling, [
        'LCIMethodAndAllocation',
        'lciMethodAndAllocation',
        'lci_method_and_allocation',
      ])
    : null;
  if (!lci) return null;

  const dataSetType = toDisplayText(pickProperty(lci, ['typeOfDataSet', 'type_of_data_set']), lang);
  const principle = toDisplayText(
    pickProperty(lci, ['LCIMethodPrinciple', 'lciMethodPrinciple', 'lci_method_principle']),
    lang,
  );
  const approach = toDisplayText(
    pickProperty(lci, ['LCIMethodApproaches', 'lciMethodApproaches', 'lci_method_approaches']),
    lang,
  );

  const parts: string[] = [];
  if (dataSetType) parts.push(`**Data Set Type:** ${dataSetType}`);
  if (principle) parts.push(`**LCI Method Principle:** ${principle}`);
  if (approach) parts.push(`**LCI Method Approach:** ${approach}`);
  return parts.length ? parts.join('\n') : null;
};

const getDataSources = (dataset: any, lang = DEFAULT_LANG): string | null => {
  if (!dataset) return null;
  const modelling = pickProperty(dataset, ['modellingAndValidation', 'modelling_and_validation']);
  const dataSources = modelling
    ? pickProperty(modelling, [
        'dataSourcesTreatmentAndRepresentativeness',
        'data_sources_treatment_and_representativeness',
      ])
    : null;
  if (!dataSources) return null;

  const sampling = joinTexts(
    pickProperty(dataSources, ['samplingProcedure', 'sampling_procedure']),
    lang,
  );
  const reference = pickProperty(dataSources, [
    'referenceToDataSource',
    'reference_to_data_source',
  ]);
  const referenceText = pickText(
    reference
      ? pickProperty(reference, ['common:shortDescription', 'common_short_description'])
      : null,
    lang,
  );

  const parts: string[] = [];
  if (sampling) parts.push(sampling);
  if (referenceText) parts.push(referenceText);
  return parts.length ? parts.join('\n\n') : null;
};

const getExchangeLists = (
  dataset: any,
  lang = DEFAULT_LANG,
): { inputs: string[]; outputs: string[] } => {
  if (!dataset) return { inputs: [], outputs: [] };
  const exchangesObj = pickProperty(dataset, ['exchanges']);
  const items = ensureArray(pickProperty(exchangesObj, ['exchange']) ?? exchangesObj);
  if (!items.length) return { inputs: [], outputs: [] };

  const asFloat = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const label = (item: any): string => {
    const ref = pickProperty(item, ['referenceToFlowDataSet', 'reference_to_flow_data_set']);
    const text = pickShortDescription(ref, lang);
    if (text) return text;
    const internalId = pickProperty(item, [
      'dataSetInternalID',
      'data_set_internal_id',
      '@dataSetInternalID',
      '@data_set_internal_id',
    ]);
    const idText = internalId !== undefined && internalId !== null ? String(internalId) : '';
    const labelText = `Flow ${idText}`.trim();
    return labelText || 'Flow';
  };

  const formatLine = (item: any): string => {
    const amount = pickProperty(item, ['meanAmount', 'mean_amount']);
    return `- ${label(item)}: ${formatNumber(amount)}`;
  };

  const sorted = items
    .map((item, index) => ({
      item,
      index,
      amount: asFloat(pickProperty(item, ['meanAmount', 'mean_amount'])),
    }))
    .sort((a, b) => {
      const aMissing = a.amount === null;
      const bMissing = b.amount === null;
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      if (a.amount !== null && b.amount !== null && a.amount !== b.amount) {
        return b.amount - a.amount;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);

  const inputs = sorted
    .filter((item) => pickProperty(item, ['exchangeDirection', 'exchange_direction']) === 'Input')
    .map(formatLine)
    .slice(0, 10);

  const outputs = sorted
    .filter((item) => pickProperty(item, ['exchangeDirection', 'exchange_direction']) === 'Output')
    .map(formatLine)
    .slice(0, 10);

  return { inputs, outputs };
};

const tidasProcessToMarkdown = (processJson: any, lang = DEFAULT_LANG) => {
  const processDataSet = findProcessDataSet(processJson);
  if (!processDataSet) {
    throw new Error('Invalid process JSON: missing process data set');
  }

  const processInformation =
    pickProperty(processDataSet, ['processInformation', 'process_information']) ?? {};
  const dataSetInformation =
    pickProperty(processInformation, ['dataSetInformation', 'data_set_information']) ?? {};
  const quantitativeReference = pickProperty(processInformation, [
    'quantitativeReference',
    'quantitative_reference',
  ]);

  const title = composeProcessTitle(dataSetInformation, lang);

  const lines: string[] = [`# ${title}`, ''];
  lines.push('**Entity:** Process');

  const uuid =
    pickProperty(dataSetInformation, ['common:UUID', 'common_uuid', 'uuid', 'UUID']) ??
    pickProperty(dataSetInformation, ['common:uuid']);
  const uuidText = toDisplayText(uuid, lang);
  if (uuidText) {
    lines.push(`**UUID:** \`${uuidText}\``);
  }

  const version = getDataSetVersion(processDataSet);
  if (version) {
    lines.push(`**Version:** ${version}`);
  }

  const { code: locCode } = getGeography(processInformation, lang);
  if (locCode) {
    lines.push(`**Location:** ${locCode}`);
  }

  const { name: refFlowName, amount: refAmount } = getReferenceFlowSummary(
    processDataSet,
    quantitativeReference,
    lang,
  );
  if (refFlowName) {
    lines.push(`**Reference Flow:** ${refFlowName}`);
  }
  if (refAmount) {
    lines.push(`**Amount:** ${refAmount}`);
  }
  if (refFlowName || refAmount) {
    lines.push('');
  }

  const classification = getClassificationPath(dataSetInformation);
  if (classification) {
    lines.push(`**Classification:** ${classification}`);
    lines.push('');
  }

  const functionalUnit = joinTexts(
    quantitativeReference
      ? pickProperty(quantitativeReference, ['functionalUnitOrOther', 'functional_unit_or_other'])
      : null,
    lang,
  );
  if (functionalUnit) {
    lines.push(`**Functional Unit:** ${functionalUnit}`);
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

  const timeBlock = getTimeCoverage(processInformation, lang);
  if (timeBlock) {
    lines.push('## Time Coverage', '', timeBlock, '');
  }

  const geographyDesc = getGeographyDescription(processInformation, lang);
  if (geographyDesc) {
    lines.push('## Geography', '', geographyDesc, '');
  }

  const technology = getTechnology(processInformation, lang);
  if (technology) {
    lines.push('## Technology', '', technology, '');
  }

  const methodology = getMethodology(processDataSet, lang);
  if (methodology) {
    lines.push('## Methodology', '', methodology, '');
  }

  const dataSources = getDataSources(processDataSet, lang);
  if (dataSources) {
    lines.push('## Data Sources', '', dataSources, '');
  }

  const { inputs, outputs } = getExchangeLists(processDataSet, lang);
  if (inputs.length) {
    lines.push('## Main Inputs', '', ...inputs, '');
  }
  if (outputs.length) {
    lines.push('## Main Outputs', '', ...outputs, '');
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

    // console.log("[webhook_process_embedding_ft] batch received", { size: events.length });

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
      // console.log("[webhook_process_embedding_ft] payload received", {
      //   index,
      //   type,
      //   hasRecord: !!record,
      //   recordKeys: record ? Object.keys(record as Record<string, unknown>) : [],
      //   table,
      // });

      if (table && table !== 'processes') {
        throw new Error(`batch index ${index}: unexpected table ${table}, expect processes`);
      }

      if (type !== 'INSERT' && type !== 'UPDATE') {
        console.error('[webhook_process_embedding_ft] ignored type', { index, type });
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
      // console.log("[webhook_process_embedding_ft] json_ordered type", {
      //   index,
      //   type: typeof jsonDataRaw,
      //   isString: typeof jsonDataRaw === "string",
      // });
      if (typeof jsonDataRaw === 'string') {
        try {
          (record as Record<string, any>).json_ordered = JSON.parse(jsonDataRaw);
        } catch (error) {
          console.error('[webhook_process_embedding_ft] json parse failed', {
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

      const markdown = tidasProcessToMarkdown(jsonData);
      console.log(markdown);
      // console.log("[webhook_process_embedding_ft] markdown generated", {
      //   index,
      //   length: markdown?.length ?? 0,
      // });
      if (!markdown) throw new Error(`batch index ${index}: Empty extracted markdown`);

      const { error: updateError } = await supabaseClient
        .from('processes')
        .update({
          extracted_md: markdown,
        })
        .eq('id', id)
        .eq('version', version);

      if (updateError) {
        console.error('[webhook_process_embedding_ft] supabase update error', updateError);
        throw new Error(
          `batch index ${index}: ${
            updateError instanceof Error ? updateError.message : String(updateError)
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
    console.error('[webhook_process_embedding_ft] caught error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
