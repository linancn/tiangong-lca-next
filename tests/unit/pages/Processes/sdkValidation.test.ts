import {
  buildProcessExchangesRequiredValidationDetails,
  buildProcessQuantitativeReferenceValidationDetails,
  normalizeProcessSdkValidationDetails,
} from '@/pages/Processes/sdkValidation';

describe('process sdk validation mapping', () => {
  it('maps invalid_union root issues to the concrete root form field', () => {
    const details = normalizeProcessSdkValidationDetails(
      [
        {
          code: 'invalid_union',
          errors: [
            [
              {
                code: 'invalid_value',
                message: 'Invalid input: expected "Unit process, single operation"',
                path: [],
                values: ['Unit process, single operation'],
              },
            ],
            [
              {
                code: 'invalid_value',
                message: 'Invalid input: expected "Unit process, black box"',
                path: [],
                values: ['Unit process, black box'],
              },
            ],
          ],
          message: 'Invalid input',
          path: [
            'processDataSet',
            'modellingAndValidation',
            'LCIMethodAndAllocation',
            'typeOfDataSet',
          ],
          rawCode: 'invalid_union',
          severity: 'error',
        },
      ],
      {
        processDataSet: {
          modellingAndValidation: {
            LCIMethodAndAllocation: {},
          },
        },
      },
    );

    expect(details).toEqual([
      expect.objectContaining({
        fieldPath: 'modellingAndValidation.LCIMethodAndAllocation.typeOfDataSet',
        formName: ['modellingAndValidation', 'LCIMethodAndAllocation', 'typeOfDataSet'],
        tabName: 'modellingAndValidation',
        validationCode: 'required_missing',
      }),
    ]);
  });

  it('keeps missing review list issues on the validation section anchor', () => {
    const details = normalizeProcessSdkValidationDetails(
      [
        {
          code: 'invalid_type',
          expected: 'object',
          message: 'Invalid input: expected object, received undefined',
          path: ['processDataSet', 'modellingAndValidation', 'validation', 'review'],
          severity: 'error',
        },
      ],
      {
        processDataSet: {
          modellingAndValidation: {
            validation: {},
          },
        },
      },
    );

    expect(details).toEqual([
      expect.objectContaining({
        fieldPath: 'modellingAndValidation.validation.review',
        formName: ['modellingAndValidation', 'validation', 'review'],
        tabName: 'modellingAndValidation',
        validationCode: 'required_missing',
      }),
    ]);
  });

  it('maps quantitative-reference issues to the quantitative-reference exchange field', () => {
    const details = normalizeProcessSdkValidationDetails(
      [
        {
          code: 'invalid_union',
          errors: [
            [
              {
                code: 'invalid_value',
                message: 'Invalid input: expected "Reference flow(s)"',
                path: [],
                values: ['Reference flow(s)'],
              },
            ],
          ],
          message: 'Invalid input',
          path: ['processDataSet', 'processInformation', 'quantitativeReference', '@type'],
          rawCode: 'invalid_union',
          severity: 'error',
        },
      ],
      {
        processDataSet: {
          exchanges: {
            exchange: [
              {
                '@dataSetInternalID': 'ref-output',
                exchangeDirection: 'Output',
                quantitativeReference: true,
                referenceToFlowDataSet: {
                  '@refObjectId': 'flow-1',
                },
              },
            ],
          },
          processInformation: {
            quantitativeReference: {
              referenceToReferenceFlow: 'ref-output',
            },
          },
        },
      },
    );

    expect(details).toEqual([
      expect.objectContaining({
        exchangeInternalId: 'ref-output',
        fieldPath: 'exchange[#ref-output].quantitativeReference',
        formName: ['quantitativeReference'],
        tabName: 'exchanges',
        validationCode: 'required_missing',
      }),
    ]);
  });

  it('keeps non-missing enum issues as invalid values', () => {
    const details = normalizeProcessSdkValidationDetails(
      [
        {
          code: 'invalid_union',
          errors: [
            [
              {
                code: 'invalid_value',
                message: 'Invalid input: expected "Reference flow(s)"',
                path: [],
                values: ['Reference flow(s)'],
              },
            ],
          ],
          message: 'Invalid input',
          path: ['processDataSet', 'processInformation', 'quantitativeReference', '@type'],
          rawCode: 'invalid_union',
          severity: 'error',
        },
      ],
      {
        processDataSet: {
          exchanges: {
            exchange: [
              {
                '@dataSetInternalID': 'ref-output',
                exchangeDirection: 'Output',
                quantitativeReference: true,
                referenceToFlowDataSet: {
                  '@refObjectId': 'flow-1',
                },
              },
            ],
          },
          processInformation: {
            quantitativeReference: {
              '@type': 'Unsupported type',
              referenceToReferenceFlow: 'ref-output',
            },
          },
        },
      },
    );

    expect(details).toEqual([
      expect.objectContaining({
        exchangeInternalId: 'ref-output',
        fieldPath: 'exchange[#ref-output].quantitativeReference',
        formName: ['quantitativeReference'],
        tabName: 'exchanges',
        validationCode: 'invalid_value',
      }),
    ]);
  });

  it('suppresses quantitative-reference sdk field mapping when the selected reference-flow count is invalid', () => {
    const details = normalizeProcessSdkValidationDetails(
      [
        {
          code: 'invalid_union',
          errors: [
            [
              {
                code: 'invalid_value',
                message: 'Invalid input: expected "Reference flow(s)"',
                path: [],
                values: ['Reference flow(s)'],
              },
            ],
          ],
          message: 'Invalid input',
          path: ['processDataSet', 'processInformation', 'quantitativeReference', '@type'],
          rawCode: 'invalid_union',
          severity: 'error',
        },
      ],
      {
        processDataSet: {
          exchanges: {
            exchange: [
              {
                '@dataSetInternalID': 'ref-output-1',
                exchangeDirection: 'Output',
                quantitativeReference: true,
              },
              {
                '@dataSetInternalID': 'ref-output-2',
                exchangeDirection: 'Output',
                quantitativeReference: true,
              },
            ],
          },
          processInformation: {
            quantitativeReference: {},
          },
        },
      },
    );

    expect(details).toEqual([]);
  });

  it('builds one exchanges summary message and highlights every selected reference flow when the count is invalid', () => {
    const details = buildProcessQuantitativeReferenceValidationDetails({
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': 'ref-input',
            exchangeDirection: 'Input',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-input',
            },
          },
          {
            '@dataSetInternalID': 'ref-output',
            exchangeDirection: 'Output',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-output',
            },
          },
        ],
      },
    });

    expect(details).toEqual([
      expect.objectContaining({
        fieldPath: 'exchanges.quantitativeReferenceSummary',
        key: 'exchanges:quantitative-reference-count:section',
        presentation: 'section',
        tabName: 'exchanges',
        validationCode: 'quantitative_reference_count_invalid',
      }),
      expect.objectContaining({
        exchangeInternalId: 'ref-input',
        fieldPath: 'exchange[#ref-input].quantitativeReference',
        presentation: 'highlight-only',
        tabName: 'exchanges',
        validationCode: 'quantitative_reference_count_invalid',
      }),
      expect.objectContaining({
        exchangeInternalId: 'ref-output',
        fieldPath: 'exchange[#ref-output].quantitativeReference',
        presentation: 'highlight-only',
        tabName: 'exchanges',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ]);
  });

  it('only builds an exchanges summary message when no reference flow is selected', () => {
    const details = buildProcessQuantitativeReferenceValidationDetails({
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': 'flow-a',
            exchangeDirection: 'Input',
            quantitativeReference: false,
          },
          {
            '@dataSetInternalID': 'flow-b',
            exchangeDirection: 'Output',
            quantitativeReference: false,
          },
        ],
      },
    });

    expect(details).toEqual([
      expect.objectContaining({
        fieldPath: 'exchanges.quantitativeReferenceSummary',
        key: 'exchanges:quantitative-reference-count:section',
        presentation: 'section',
        tabName: 'exchanges',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ]);
  });

  it('does not build an exchanges summary message when exactly one exchange is selected', () => {
    const details = buildProcessQuantitativeReferenceValidationDetails({
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': 'flow-a',
            exchangeDirection: 'Input',
            quantitativeReference: false,
          },
          {
            '@dataSetInternalID': 'flow-b',
            exchangeDirection: 'Output',
            quantitativeReference: true,
          },
        ],
      },
    });

    expect(details).toEqual([]);
  });

  it('ignores non-boolean quantitative-reference values when a reference flow is already resolved', () => {
    const details = buildProcessQuantitativeReferenceValidationDetails({
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': 'flow-a',
            exchangeDirection: 'Input',
            quantitativeReference: 'true',
          },
          {
            '@dataSetInternalID': 'flow-b',
            exchangeDirection: 'Output',
            quantitativeReference: false,
          },
        ],
      },
      processInformation: {
        quantitativeReference: {
          referenceToReferenceFlow: 'flow-b',
        },
      },
    });

    expect(details).toEqual([]);
  });

  it('builds an exchanges section message when no exchanges exist', () => {
    const details = buildProcessExchangesRequiredValidationDetails({
      processInformation: { name: 'Existing process' },
      exchanges: {},
    });

    expect(details).toEqual([
      expect.objectContaining({
        fieldPath: 'exchanges.requiredSummary',
        key: 'exchanges:required:section',
        presentation: 'section',
        tabName: 'exchanges',
        validationCode: 'exchanges_required',
      }),
    ]);
  });
});
