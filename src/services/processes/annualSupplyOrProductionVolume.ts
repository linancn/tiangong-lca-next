import type { ProcessExchangeData, ProcessRefUnitDisplay } from './data';

export const ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX = 'reference flow';
const ANNUAL_SUPPLY_VOLUME_DEFAULT_LANGS = ['en', 'zh'];

export const ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([Ee][+-]?\d+)?\s+\S.*$/;

const ANNUAL_SUPPLY_VOLUME_NUMBER_PREFIX_PATTERN =
  /^\s*([+-]?(\d+(\.\d*)?|\.\d+)([Ee][+-]?\d+)?)(?:\s+(.*))?$/;
const ANNUAL_SUPPLY_VOLUME_NUMERIC_INPUT_PREFIX_PATTERN =
  /^[+-]?(?:$|\d+(?:\.\d*)?(?:[Ee][+-]?\d*)?|\.\d+(?:[Ee][+-]?\d*)?|\.\d*)$/;
const ANNUAL_SUPPLY_VOLUME_NUMERIC_INPUT_ALLOWED_PATTERN = /[\d.+\-Ee]/;

type LangTextResolver = (value: unknown, lang: string) => string;

type AnnualSupplyVolumeTextParts = {
  numericText: string;
  suffixText: string;
};

type AnnualSupplyVolumeUnitLookupRow = {
  referenceToFlowDataSetId?: unknown;
  referenceToFlowDataSetVersion?: unknown;
  refUnitRes?: ProcessRefUnitDisplay;
};

const normalizeText = (value: unknown) =>
  typeof value === 'string' && value.trim() && value.trim() !== '-' ? value.trim() : '';

const toReferenceValue = (reference?: ProcessExchangeData['referenceToFlowDataSet']) => {
  return Array.isArray(reference) ? reference[0] : reference;
};

const getReferenceFlowIdentity = (exchange?: ProcessExchangeData) => {
  const referenceFlow = toReferenceValue(exchange?.referenceToFlowDataSet);

  return {
    id: normalizeText(referenceFlow?.['@refObjectId']),
    version: normalizeText(referenceFlow?.['@version']),
  };
};

const getFallbackLangText = (value: unknown, lang: string): string => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return normalizeText(value);
  }

  if (Array.isArray(value)) {
    const localizedItem =
      value.find((item) => item?.['@xml:lang'] === lang) ??
      value.find((item) => normalizeText(item?.['#text']));

    return normalizeText(localizedItem?.['#text']);
  }

  if (typeof value === 'object') {
    return normalizeText((value as Record<string, unknown>)['#text']);
  }

  return '';
};

const uniqueNonEmpty = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
};

export const parseAnnualSupplyVolumeText = (value: unknown): AnnualSupplyVolumeTextParts => {
  const text = normalizeText(value);

  if (!text) {
    return {
      numericText: '',
      suffixText: '',
    };
  }

  const matched = text.match(ANNUAL_SUPPLY_VOLUME_NUMBER_PREFIX_PATTERN);

  if (matched) {
    return {
      numericText: matched[1],
      suffixText: normalizeText(matched[5]),
    };
  }

  const [numericText, ...suffixParts] = text.split(/\s+/);

  return {
    numericText,
    suffixText: normalizeText(suffixParts.join(' ')),
  };
};

export const normalizeAnnualSupplyVolumeSuffix = (suffix: unknown) =>
  normalizeText(suffix) || ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX;

const resolveAnnualSupplyVolumeSuffix = (existingSuffix: unknown, suffix: unknown) => {
  const normalizedExistingSuffix = normalizeText(existingSuffix);
  const normalizedSuffix = normalizeAnnualSupplyVolumeSuffix(suffix);

  if (
    normalizedExistingSuffix &&
    normalizedExistingSuffix !== normalizedSuffix &&
    normalizedExistingSuffix.endsWith(` ${normalizedSuffix}`)
  ) {
    return normalizedExistingSuffix;
  }

  return normalizedSuffix;
};

export const sanitizeAnnualSupplyVolumeNumericInput = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';

  return Array.from(text).reduce((sanitizedText, character) => {
    if (!ANNUAL_SUPPLY_VOLUME_NUMERIC_INPUT_ALLOWED_PATTERN.test(character)) {
      return sanitizedText;
    }

    const nextText = `${sanitizedText}${character}`;

    return ANNUAL_SUPPLY_VOLUME_NUMERIC_INPUT_PREFIX_PATTERN.test(nextText)
      ? nextText
      : sanitizedText;
  }, '');
};

export const formatAnnualSupplyVolumeText = (numericText: unknown, suffix: unknown) => {
  const normalizedNumericText = sanitizeAnnualSupplyVolumeNumericInput(numericText);

  if (!normalizedNumericText) {
    return '';
  }

  return `${normalizedNumericText} ${normalizeAnnualSupplyVolumeSuffix(suffix)}`;
};

export const normalizeAnnualSupplyVolumeText = (value: unknown, suffix: unknown) => {
  const { numericText, suffixText } = parseAnnualSupplyVolumeText(value);
  return formatAnnualSupplyVolumeText(
    numericText,
    resolveAnnualSupplyVolumeSuffix(suffixText, suffix),
  );
};

export const normalizeAnnualSupplyVolumeMultiLang = (
  value: unknown,
  suffixResolver: string | ((item: Record<string, unknown>) => string),
) => {
  const normalizeItem = (item: unknown) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const itemRecord = item as Record<string, unknown>;
    const suffix =
      typeof suffixResolver === 'function' ? suffixResolver(itemRecord) : suffixResolver;

    return {
      ...itemRecord,
      '#text': normalizeAnnualSupplyVolumeText(itemRecord['#text'], suffix),
    };
  };

  if (Array.isArray(value)) {
    return value.map(normalizeItem);
  }

  return normalizeItem(value);
};

const getAnnualSupplyVolumeTextForLang = (value: unknown, lang: string) => {
  if (Array.isArray(value)) {
    const valueItems = value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object',
    );
    const langItem =
      valueItems.find((item) => item['@xml:lang'] === lang) ??
      valueItems.find((item) => item['@xml:lang'] === 'en') ??
      valueItems.find((item) => normalizeText(item['#text'])) ??
      valueItems[0];

    return langItem ? langItem['#text'] : undefined;
  }

  if (value && typeof value === 'object') {
    return (value as Record<string, unknown>)['#text'];
  }

  return value;
};

export const getAnnualSupplyVolumeDisplayNumericText = (value: unknown, lang: string) => {
  const { numericText } = parseAnnualSupplyVolumeText(
    getAnnualSupplyVolumeTextForLang(value, lang),
  );
  return sanitizeAnnualSupplyVolumeNumericInput(numericText);
};

export const buildAnnualSupplyVolumeMultiLang = (
  numericValue: unknown,
  suffixResolver: string | ((lang: string) => string),
  languages = ANNUAL_SUPPLY_VOLUME_DEFAULT_LANGS,
) => {
  const { numericText } = parseAnnualSupplyVolumeText(numericValue);
  const normalizedNumericText = sanitizeAnnualSupplyVolumeNumericInput(numericText);

  if (!normalizedNumericText) {
    return [];
  }

  return uniqueNonEmpty(languages).map((lang) => {
    const suffix = typeof suffixResolver === 'function' ? suffixResolver(lang) : suffixResolver;

    return {
      '@xml:lang': lang,
      '#text': formatAnnualSupplyVolumeText(normalizedNumericText, suffix),
    };
  });
};

export const getQuantitativeReferenceExchange = (exchangeDataSource: ProcessExchangeData[]) => {
  return (
    exchangeDataSource.find((exchange) => exchange?.quantitativeReference === true) ??
    exchangeDataSource.find(
      (exchange) => normalizeText(exchange?.exchangeDirection).toLowerCase() === 'output',
    ) ??
    exchangeDataSource[0]
  );
};

export const buildAnnualSupplyVolumeUnitLookupRows = (
  exchangeDataSource: ProcessExchangeData[],
): AnnualSupplyVolumeUnitLookupRow[] => {
  if (!Array.isArray(exchangeDataSource)) {
    return [];
  }

  return exchangeDataSource.map((exchange) => {
    const { id, version } = getReferenceFlowIdentity(exchange);

    return {
      referenceToFlowDataSetId: id,
      referenceToFlowDataSetVersion: version,
    };
  });
};

export const mergeAnnualSupplyVolumeUnitRows = (
  exchangeDataSource: ProcessExchangeData[],
  unitRows: unknown,
) => {
  if (!Array.isArray(exchangeDataSource)) {
    return [];
  }

  const normalizedUnitRows = Array.isArray(unitRows)
    ? (unitRows as AnnualSupplyVolumeUnitLookupRow[])
    : [];

  return exchangeDataSource.map((exchange) => {
    const { id, version } = getReferenceFlowIdentity(exchange);
    const unitRow =
      normalizedUnitRows.find((row) => {
        const rowId = normalizeText(row?.referenceToFlowDataSetId);
        const rowVersion = normalizeText(row?.referenceToFlowDataSetVersion);

        return rowId === id && rowVersion === version;
      }) ??
      normalizedUnitRows.find((row) => {
        return normalizeText(row?.referenceToFlowDataSetId) === id;
      });

    if (!unitRow?.refUnitRes) {
      return exchange;
    }

    return {
      ...exchange,
      refUnitRes: unitRow.refUnitRes,
    };
  });
};

export const deriveAnnualSupplyVolumeSuffix = ({
  exchangeDataSource,
  getLangText = getFallbackLangText,
  lang,
}: {
  exchangeDataSource: ProcessExchangeData[];
  getLangText?: LangTextResolver;
  lang: string;
}) => {
  const quantitativeReferenceExchange = getQuantitativeReferenceExchange(exchangeDataSource);
  const referenceFlow = toReferenceValue(quantitativeReferenceExchange?.referenceToFlowDataSet);
  const refUnitRes = quantitativeReferenceExchange?.refUnitRes as ProcessRefUnitDisplay | undefined;
  const unitName =
    normalizeText(refUnitRes?.refUnitName) || normalizeText(getLangText(refUnitRes?.name, lang));
  const referenceFlowName = normalizeText(
    getLangText(referenceFlow?.['common:shortDescription'], lang),
  );
  const contextText = normalizeText(
    getLangText(quantitativeReferenceExchange?.functionalUnitOrOther, lang),
  );
  const suffixParts = uniqueNonEmpty([unitName, contextText || referenceFlowName]);

  return suffixParts.join(' ') || ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX;
};
