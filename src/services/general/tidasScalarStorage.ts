export const TIDAS_YEAR_MIN = 1000;
export const TIDAS_YEAR_MAX = 9999;

const TIDAS_INTEGER_TEXT_PATTERN = /^\d+$/;
const TIDAS_PERCENTAGE_TEXT_PATTERN =
  /^[+-]?(?:\d{1,5}|\d{1,4}\.\d|\d{1,3}\.\d{2}|\d{1,2}\.\d{3})$/;

export type TidasScalarStorageIssue = {
  path: string;
  expected: string;
  value: unknown;
};

const isEmptyOptionalScalar = (value: unknown) =>
  value === null || value === undefined || value === '' || value === 'undefined';

const isTidasYear = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= TIDAS_YEAR_MIN &&
  value <= TIDAS_YEAR_MAX;

const isTidasPercentage = (value: unknown): value is string =>
  typeof value === 'string' && TIDAS_PERCENTAGE_TEXT_PATTERN.test(value);

export function normalizeOptionalTidasYear(value: unknown): unknown {
  if (isEmptyOptionalScalar(value)) {
    return undefined;
  }

  if (isTidasYear(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedText = value.trim();
    if (TIDAS_INTEGER_TEXT_PATTERN.test(normalizedText)) {
      const normalizedValue = Number(normalizedText);
      if (isTidasYear(normalizedValue)) {
        return normalizedValue;
      }
    }
  }

  return value;
}

export function normalizeOptionalTidasPercentage(value: unknown): unknown {
  if (isEmptyOptionalScalar(value)) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

const addYearIssue = (issues: TidasScalarStorageIssue[], path: string, value: unknown) => {
  if (!isEmptyOptionalScalar(value) && !isTidasYear(value)) {
    issues.push({
      path,
      expected: `an integer from ${TIDAS_YEAR_MIN} through ${TIDAS_YEAR_MAX}`,
      value,
    });
  }
};

const addPercentageIssue = (issues: TidasScalarStorageIssue[], path: string, value: unknown) => {
  if (!isEmptyOptionalScalar(value) && !isTidasPercentage(value)) {
    issues.push({
      path,
      expected: 'a decimal string with at most three fractional digits',
      value,
    });
  }
};

const toList = (value: unknown): any[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return value && typeof value === 'object' ? [value] : [];
};

export function validateProcessTidasScalarStorage(payload: any): TidasScalarStorageIssue[] {
  const issues: TidasScalarStorageIssue[] = [];
  const processDataSet = payload?.processDataSet;
  const time = processDataSet?.processInformation?.time;

  addYearIssue(
    issues,
    'processDataSet.processInformation.time.common:referenceYear',
    time?.['common:referenceYear'],
  );
  addYearIssue(
    issues,
    'processDataSet.processInformation.time.common:dataSetValidUntil',
    time?.['common:dataSetValidUntil'],
  );

  toList(processDataSet?.exchanges?.exchange).forEach((exchange, exchangeIndex) => {
    addPercentageIssue(
      issues,
      `processDataSet.exchanges.exchange[${exchangeIndex}].relativeStandardDeviation95In`,
      exchange?.relativeStandardDeviation95In,
    );
    toList(exchange?.allocations?.allocation).forEach((allocation, allocationIndex) => {
      addPercentageIssue(
        issues,
        `processDataSet.exchanges.exchange[${exchangeIndex}].allocations.allocation[${allocationIndex}].@allocatedFraction`,
        allocation?.['@allocatedFraction'],
      );
    });
  });

  addPercentageIssue(
    issues,
    'processDataSet.processInformation.mathematicalRelations.variableParameter.relativeStandardDeviation95In',
    processDataSet?.processInformation?.mathematicalRelations?.variableParameter
      ?.relativeStandardDeviation95In,
  );

  return issues;
}

export function validateFlowTidasScalarStorage(payload: any): TidasScalarStorageIssue[] {
  const issues: TidasScalarStorageIssue[] = [];
  toList(payload?.flowDataSet?.flowProperties?.flowProperty).forEach(
    (flowProperty, flowPropertyIndex) => {
      addPercentageIssue(
        issues,
        `flowDataSet.flowProperties.flowProperty[${flowPropertyIndex}].relativeStandardDeviation95In`,
        flowProperty?.relativeStandardDeviation95In,
      );
    },
  );
  return issues;
}

export function createTidasScalarValidationError(issues: TidasScalarStorageIssue[]) {
  return {
    data: null,
    error: {
      message: 'Payload contains TIDAS scalar values that cannot be stored canonically.',
      code: 'TIDAS_SCALAR_VALIDATION_ERROR',
      details: JSON.stringify(issues),
      hint: 'Correct the affected values and retry.',
      name: 'TidasScalarValidationError',
    },
    status: 400,
    statusText: 'TIDAS_SCALAR_VALIDATION_ERROR',
    count: null,
  };
}
