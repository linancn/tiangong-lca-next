import type { ProcessExchangeData } from './data';

export const ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX = 'reference flow';

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

const normalizeText = (value: unknown) =>
  typeof value === 'string' && value.trim() && value.trim() !== '-' ? value.trim() : '';

const toReferenceValue = (reference?: ProcessExchangeData['referenceToFlowDataSet']) => {
  return Array.isArray(reference) ? reference[0] : reference;
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
  const { numericText } = parseAnnualSupplyVolumeText(value);
  return formatAnnualSupplyVolumeText(numericText, suffix);
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

export const getQuantitativeReferenceExchange = (exchangeDataSource: ProcessExchangeData[]) => {
  return (
    exchangeDataSource.find((exchange) => exchange?.quantitativeReference === true) ??
    exchangeDataSource.find(
      (exchange) => normalizeText(exchange?.exchangeDirection).toLowerCase() === 'output',
    ) ??
    exchangeDataSource[0]
  );
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
  const unitName = normalizeText(
    (quantitativeReferenceExchange?.refUnitRes as { refUnitName?: unknown } | undefined)
      ?.refUnitName,
  );
  const referenceFlowName = normalizeText(
    getLangText(referenceFlow?.['common:shortDescription'], lang),
  );
  const contextText = normalizeText(
    getLangText(quantitativeReferenceExchange?.functionalUnitOrOther, lang),
  );
  const suffixParts = uniqueNonEmpty([unitName, contextText || referenceFlowName]);

  return suffixParts.join(' ') || ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX;
};
