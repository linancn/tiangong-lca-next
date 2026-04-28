import {
  buildFlowPropertiesValidationDetails,
  filterFlowSdkIssuesForUi,
  flowSdkValidationTestUtils,
  normalizeFlowSdkValidationDetails,
} from '@/pages/Flows/sdkValidation';

describe('Flows sdkValidation', () => {
  const { getFlowSdkIssueRootPath, toFlowPropertyFieldDetail, toFlowPropertyList } =
    flowSdkValidationTestUtils;

  it('returns an empty list when no flow sdk issues are provided for the ui filter', () => {
    expect(filterFlowSdkIssuesForUi()).toEqual([]);
  });

  it('normalizes root-prefixed dataset paths and direct flow-property helper fallbacks', () => {
    expect(
      getFlowSdkIssueRootPath({
        path: [
          'root',
          'flowDataSet',
          'flowInformation',
          'quantitativeReference',
          'referenceToReferenceFlowProperty',
        ],
      } as any),
    ).toBe('flowInformation.quantitativeReference.referenceToReferenceFlowProperty');
    expect(
      getFlowSdkIssueRootPath({
        path: ['customFlowDataSet', 'flowInformation', 'dataSetInformation'],
      } as any),
    ).toBe('flowInformation.dataSetInformation');
    expect(
      getFlowSdkIssueRootPath({
        path: ['flowInformation', 'dataSetInformation'],
      } as any),
    ).toBe('flowInformation.dataSetInformation');
    expect(toFlowPropertyList(null)).toEqual([]);
    expect(toFlowPropertyList({ '@dataSetInternalID': 'prop-1' })).toEqual([
      { '@dataSetInternalID': 'prop-1' },
    ]);

    expect(
      toFlowPropertyFieldDetail(
        {
          fieldPath: 'flowProperties.flowProperty.0',
          formName: ['flowProperties', 'flowProperty', 0],
          key: 'detail-key',
          rawCode: 'raw_flow_code',
        } as any,
        {
          flowDataSet: {
            flowProperties: {
              flowProperty: [{}],
            },
          },
        },
      ),
    ).toMatchObject({
      fieldPath: 'flowProperty[1]',
      formName: [],
      key: expect.stringContaining('raw_flow_code'),
    });
  });

  it('filters derived reference-flow-property sdk issues out of flow ui consumption', () => {
    const referenceFlowPropertyIssue = {
      code: 'required_missing',
      path: [
        'flowDataSet',
        'flowInformation',
        'quantitativeReference',
        'referenceToReferenceFlowProperty',
      ],
    };
    const typeOfDataSetIssue = {
      code: 'required_missing',
      path: ['flowDataSet', 'modellingAndValidation', 'LCIMethod', 'typeOfDataSet'],
    };

    expect(filterFlowSdkIssuesForUi([referenceFlowPropertyIssue, typeOfDataSetIssue])).toEqual([
      typeOfDataSetIssue,
    ]);
    expect(
      normalizeFlowSdkValidationDetails([referenceFlowPropertyIssue], {
        flowDataSet: {
          flowInformation: {
            quantitativeReference: {
              referenceToReferenceFlowProperty: undefined,
            },
          },
        },
      }),
    ).toEqual([]);
  });

  it('maps flow type-of-dataset issues to the flowInformation tab', () => {
    const details = normalizeFlowSdkValidationDetails(
      [
        {
          code: 'required_missing',
          path: ['flowDataSet', 'modellingAndValidation', 'LCIMethod', 'typeOfDataSet'],
        },
      ],
      {
        flowDataSet: {
          modellingAndValidation: {
            LCIMethod: {
              typeOfDataSet: undefined,
            },
          },
        },
      },
    );

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'modellingAndValidation.LCIMethod.typeOfDataSet',
          formName: ['modellingAndValidation', 'LCIMethod', 'typeOfDataSet'],
          tabName: 'flowInformation',
        }),
      ]),
    );
  });

  it('falls back to unknown tab and validation codes when flow-property detail metadata is blank', () => {
    expect(
      toFlowPropertyFieldDetail(
        {
          fieldPath: 'flowProperties.flowProperty.0.meanValue',
          formName: ['flowProperties', 'flowProperty', 0, 'meanValue'],
          key: 'detail-key',
          rawCode: '   ',
          tabName: '   ',
          validationCode: '   ',
        } as any,
        {
          flowDataSet: {
            flowProperties: {
              flowProperty: [
                {
                  meanValue: undefined,
                },
              ],
            },
          },
        },
      ),
    ).toMatchObject({
      fieldPath: 'flowProperty[1].meanValue',
      formName: ['meanValue'],
      key: expect.stringContaining('unknown:0:flowProperty[1].meanValue:unknown'),
    });
  });

  it('maps flow-property item issues to the owning dataset internal id', () => {
    const details = normalizeFlowSdkValidationDetails(
      [
        {
          code: 'required_missing',
          path: ['flowDataSet', 'flowProperties', 'flowProperty', 0, 'meanValue'],
        },
      ],
      {
        flowDataSet: {
          flowProperties: {
            flowProperty: [
              {
                '@dataSetInternalID': 'prop-1',
                meanValue: undefined,
              },
            ],
          },
        },
      },
    );

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'flowProperty[#prop-1].meanValue',
          formName: ['meanValue'],
          tabName: 'flowProperties',
        }),
      ]),
    );
  });

  it('falls back to positional flow-property paths when dataset internal ids are unavailable', () => {
    const details = normalizeFlowSdkValidationDetails(
      [
        {
          code: 'required_missing',
          path: ['flowDataSet', 'flowProperties', 'flowProperty', 0, 'meanValue'],
        },
      ],
      {
        flowDataSet: {
          flowProperties: {
            flowProperty: [
              {
                meanValue: undefined,
              },
            ],
          },
        },
      },
    );

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'flowProperty[1].meanValue',
          formName: ['meanValue'],
          tabName: 'flowProperties',
        }),
      ]),
    );
  });

  it('adds highlight-only details for duplicated quantitative-reference rows', () => {
    const details = buildFlowPropertiesValidationDetails({
      flowProperty: [
        {
          '@dataSetInternalID': 'prop-1',
          quantitativeReference: true,
        },
        {
          '@dataSetInternalID': 'prop-2',
          quantitativeReference: true,
        },
      ],
    });

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'flowProperties.quantitativeReferenceSummary',
          presentation: 'section',
        }),
        expect.objectContaining({
          fieldPath: 'flowProperty[#prop-1].quantitativeReference',
          presentation: 'highlight-only',
        }),
        expect.objectContaining({
          fieldPath: 'flowProperty[#prop-2].quantitativeReference',
          presentation: 'highlight-only',
        }),
      ]),
    );
  });

  it('uses fallback quantitative-reference highlight ids when selected flow properties have no dataset internal ids', () => {
    const details = buildFlowPropertiesValidationDetails({
      flowProperty: [
        {
          quantitativeReference: true,
        },
        {
          quantitativeReference: true,
        },
      ],
    });

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'flowProperty[#quantitative-reference-0].quantitativeReference',
        }),
        expect.objectContaining({
          fieldPath: 'flowProperty[#quantitative-reference-1].quantitativeReference',
        }),
      ]),
    );
  });

  it('adds a localizable section detail when no flow properties are selected', () => {
    const details = buildFlowPropertiesValidationDetails(undefined);

    expect(details).toEqual([
      expect.objectContaining({
        fieldPath: 'flowProperties.requiredSummary',
        presentation: 'section',
        validationCode: 'flow_properties_required',
      }),
    ]);
  });

  it('treats a single flow-property object as a valid list and only emits a section detail when none are selected', () => {
    expect(
      buildFlowPropertiesValidationDetails({
        flowProperty: {
          '@dataSetInternalID': 'prop-1',
          quantitativeReference: true,
        },
      }),
    ).toEqual([]);

    expect(
      buildFlowPropertiesValidationDetails({
        flowProperty: [
          {
            '@dataSetInternalID': 'prop-1',
            quantitativeReference: false,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        fieldPath: 'flowProperties.quantitativeReferenceSummary',
        presentation: 'section',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ]);
  });

  it('returns only the section-level prompt when multiple flow properties are present but none is quantitative', () => {
    expect(
      buildFlowPropertiesValidationDetails({
        flowProperty: [
          {
            '@dataSetInternalID': 'prop-1',
            quantitativeReference: false,
          },
          {
            '@dataSetInternalID': 'prop-2',
            quantitativeReference: false,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        fieldPath: 'flowProperties.quantitativeReferenceSummary',
        presentation: 'section',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ]);
  });
});
