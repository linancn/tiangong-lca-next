import {
  buildUnitgroupUnitsValidationDetails,
  normalizeUnitgroupSdkValidationDetails,
  unitgroupSdkValidationTestUtils,
} from '@/pages/Unitgroups/sdkValidation';

describe('Unitgroups sdkValidation', () => {
  const { toUnitFieldDetail, toUnitList } = unitgroupSdkValidationTestUtils;

  it('covers unit helper fallbacks for list coercion and root-level unit details', () => {
    expect(toUnitList(null)).toEqual([]);
    expect(toUnitList({ '@dataSetInternalID': 'unit-1' })).toEqual([
      { '@dataSetInternalID': 'unit-1' },
    ]);
    expect(
      toUnitFieldDetail(
        {
          fieldPath: 'unitGroupInformation.dataSetInformation.common:name',
          formName: ['unitGroupInformation', 'dataSetInformation', 'common:name'],
          key: 'plain-detail',
        } as any,
        {},
      ),
    ).toMatchObject({
      fieldPath: 'unitGroupInformation.dataSetInformation.common:name',
      key: 'plain-detail',
    });

    expect(
      toUnitFieldDetail(
        {
          fieldPath: 'units.unit.0',
          formName: ['units', 'unit', 0],
          key: 'detail-key',
          rawCode: 'raw_unit_code',
        } as any,
        {
          unitGroupDataSet: {
            units: {
              unit: [{}],
            },
          },
        },
      ),
    ).toMatchObject({
      fieldPath: 'unit[1]',
      formName: [],
      key: expect.stringContaining('raw_unit_code'),
    });
  });

  it('maps unit item issues to the owning dataset internal id', () => {
    const details = normalizeUnitgroupSdkValidationDetails(
      [
        {
          code: 'required_missing',
          path: ['unitGroupDataSet', 'units', 'unit', 0, 'meanValue'],
        },
      ],
      {
        unitGroupDataSet: {
          units: {
            unit: [
              {
                '@dataSetInternalID': 'unit-1',
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
          fieldPath: 'unit[#unit-1].meanValue',
          formName: ['meanValue'],
          tabName: 'units',
        }),
      ]),
    );
  });

  it('falls back to positional unit paths when dataset internal ids are unavailable', () => {
    const details = normalizeUnitgroupSdkValidationDetails(
      [
        {
          code: 'required_missing',
          path: ['unitGroupDataSet', 'units', 'unit', 0, 'meanValue'],
        },
      ],
      {
        unitGroupDataSet: {
          units: {
            unit: [
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
          fieldPath: 'unit[1].meanValue',
          formName: ['meanValue'],
          tabName: 'units',
        }),
      ]),
    );
  });

  it('falls back to unknown tab and validation codes when unit detail metadata is blank', () => {
    expect(
      toUnitFieldDetail(
        {
          fieldPath: 'units.unit.0.meanValue',
          formName: ['units', 'unit', 0, 'meanValue'],
          key: 'detail-key',
          rawCode: '   ',
          tabName: '   ',
          validationCode: '   ',
        } as any,
        {
          unitGroupDataSet: {
            units: {
              unit: [
                {
                  meanValue: undefined,
                },
              ],
            },
          },
        },
      ),
    ).toMatchObject({
      fieldPath: 'unit[1].meanValue',
      formName: ['meanValue'],
      key: expect.stringContaining('unknown:0:unit[1].meanValue:unknown'),
    });
  });

  it('adds highlight-only details for duplicated quantitative-reference rows', () => {
    const details = buildUnitgroupUnitsValidationDetails({
      unit: [
        {
          '@dataSetInternalID': 'unit-1',
          quantitativeReference: true,
        },
        {
          '@dataSetInternalID': 'unit-2',
          quantitativeReference: true,
        },
      ],
    });

    expect(details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'units.quantitativeReferenceSummary',
          presentation: 'section',
        }),
        expect.objectContaining({
          fieldPath: 'unit[#unit-1].quantitativeReference',
          presentation: 'highlight-only',
        }),
        expect.objectContaining({
          fieldPath: 'unit[#unit-2].quantitativeReference',
          presentation: 'highlight-only',
        }),
      ]),
    );
  });

  it('emits required or section-only unit details for empty, single-object, and zero-reference states', () => {
    expect(buildUnitgroupUnitsValidationDetails(undefined)).toEqual([
      expect.objectContaining({
        fieldPath: 'units.requiredSummary',
        presentation: 'section',
      }),
    ]);

    expect(
      buildUnitgroupUnitsValidationDetails({
        unit: {
          '@dataSetInternalID': 'unit-1',
          quantitativeReference: true,
        },
      }),
    ).toEqual([]);

    expect(
      buildUnitgroupUnitsValidationDetails({
        unit: [
          {
            '@dataSetInternalID': 'unit-1',
            quantitativeReference: false,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        fieldPath: 'units.quantitativeReferenceSummary',
        presentation: 'section',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ]);
  });

  it('returns only the section-level prompt when multiple units are present but none is quantitative', () => {
    expect(
      buildUnitgroupUnitsValidationDetails({
        unit: [
          {
            '@dataSetInternalID': 'unit-1',
            quantitativeReference: false,
          },
          {
            '@dataSetInternalID': 'unit-2',
            quantitativeReference: false,
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        fieldPath: 'units.quantitativeReferenceSummary',
        presentation: 'section',
        validationCode: 'quantitative_reference_count_invalid',
      }),
    ]);
  });

  it('uses fallback highlight ids when duplicated quantitative-reference rows have blank dataset internal ids', () => {
    expect(
      buildUnitgroupUnitsValidationDetails({
        unit: [
          {
            '@dataSetInternalID': '   ',
            quantitativeReference: true,
          },
          {
            quantitativeReference: true,
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'unit[#quantitative-reference-0].quantitativeReference',
        }),
        expect.objectContaining({
          fieldPath: 'unit[#quantitative-reference-1].quantitativeReference',
        }),
      ]),
    );
  });
});
