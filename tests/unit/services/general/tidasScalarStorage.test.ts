import {
  createTidasScalarValidationError,
  normalizeOptionalTidasPercentage,
  normalizeOptionalTidasYear,
  validateFlowTidasScalarStorage,
  validateProcessTidasScalarStorage,
} from '@/services/general/tidasScalarStorage';

describe('TIDAS scalar storage normalization', () => {
  it.each([null, undefined, '', 'undefined'])(
    'normalizes an empty year %p to undefined',
    (value) => {
      expect(normalizeOptionalTidasYear(value)).toBeUndefined();
    },
  );

  it('normalizes canonical year text while preserving invalid values for the save gate', () => {
    expect(normalizeOptionalTidasYear(2024)).toBe(2024);
    expect(normalizeOptionalTidasYear(' 2030 ')).toBe(2030);
    expect(normalizeOptionalTidasYear('2030.0')).toBe('2030.0');
    expect(normalizeOptionalTidasYear('not-a-year')).toBe('not-a-year');
    expect(normalizeOptionalTidasYear('999')).toBe('999');
    expect(normalizeOptionalTidasYear(2024.5)).toBe(2024.5);
    expect(normalizeOptionalTidasYear(10_000)).toBe(10_000);
  });

  it.each([null, undefined, '', 'undefined'])(
    'normalizes an empty percentage %p to undefined',
    (value) => {
      expect(normalizeOptionalTidasPercentage(value)).toBeUndefined();
    },
  );

  it('normalizes finite percentage numbers and trims percentage text', () => {
    expect(normalizeOptionalTidasPercentage(12.5)).toBe('12.5');
    expect(normalizeOptionalTidasPercentage(' 12.500 ')).toBe('12.500');
    expect(normalizeOptionalTidasPercentage(Number.POSITIVE_INFINITY)).toBe(
      Number.POSITIVE_INFINITY,
    );
    const objectValue = { value: 12.5 };
    expect(normalizeOptionalTidasPercentage(objectValue)).toBe(objectValue);
  });
});

describe('TIDAS scalar storage validation', () => {
  it('accepts canonical process year and percentage scalars', () => {
    expect(
      validateProcessTidasScalarStorage({
        processDataSet: {
          processInformation: {
            time: {
              'common:referenceYear': 2024,
              'common:dataSetValidUntil': 2030,
            },
            mathematicalRelations: {
              variableParameter: { relativeStandardDeviation95In: '1.250' },
            },
          },
          exchanges: {
            exchange: {
              relativeStandardDeviation95In: '12.5',
              allocations: { allocation: [{ '@allocatedFraction': '0' }] },
            },
          },
        },
      }),
    ).toEqual([]);
  });

  it('reports every non-canonical process scalar and ignores optional empty values', () => {
    const issues = validateProcessTidasScalarStorage({
      processDataSet: {
        processInformation: {
          time: {
            'common:referenceYear': 2024.5,
            'common:dataSetValidUntil': '2030',
          },
          mathematicalRelations: {
            variableParameter: { relativeStandardDeviation95In: null },
          },
        },
        exchanges: {
          exchange: [
            {
              relativeStandardDeviation95In: 12.5,
              allocations: { allocation: { '@allocatedFraction': '12.3456' } },
            },
          ],
        },
      },
    });

    expect(issues.map((issue) => issue.path)).toEqual([
      'processDataSet.processInformation.time.common:referenceYear',
      'processDataSet.processInformation.time.common:dataSetValidUntil',
      'processDataSet.exchanges.exchange[0].relativeStandardDeviation95In',
      'processDataSet.exchanges.exchange[0].allocations.allocation[0].@allocatedFraction',
    ]);
  });

  it('validates singleton, array, and absent flow-property containers', () => {
    expect(
      validateFlowTidasScalarStorage({
        flowDataSet: {
          flowProperties: { flowProperty: { relativeStandardDeviation95In: '12.5' } },
        },
      }),
    ).toEqual([]);
    expect(
      validateFlowTidasScalarStorage({
        flowDataSet: {
          flowProperties: {
            flowProperty: [
              { relativeStandardDeviation95In: '12.3456' },
              { relativeStandardDeviation95In: {} },
            ],
          },
        },
      }).map((issue) => issue.path),
    ).toEqual([
      'flowDataSet.flowProperties.flowProperty[0].relativeStandardDeviation95In',
      'flowDataSet.flowProperties.flowProperty[1].relativeStandardDeviation95In',
    ]);
    expect(validateFlowTidasScalarStorage({})).toEqual([]);
  });

  it('builds a structured 400 response for save-boundary failures', () => {
    const issues = [{ path: 'path', expected: 'string', value: 12.5 }];
    expect(createTidasScalarValidationError(issues)).toEqual(
      expect.objectContaining({
        data: null,
        status: 400,
        statusText: 'TIDAS_SCALAR_VALIDATION_ERROR',
        error: expect.objectContaining({
          code: 'TIDAS_SCALAR_VALIDATION_ERROR',
          details: JSON.stringify(issues),
        }),
      }),
    );
  });
});
