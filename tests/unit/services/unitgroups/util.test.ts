/**
 * Tests for unit group utility functions
 * Path: src/services/unitgroups/util.ts
 */

import {
  genUnitGroupFromData,
  genUnitGroupJsonOrdered,
  genUnitTableData,
} from '@/services/unitgroups/util';

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  createUnitGroup: jest.fn((data) => data),
}));

const mockCreateUnitGroup = jest.requireMock('@tiangong-lca/tidas-sdk')
  .createUnitGroup as jest.Mock;

const baseUnitGroupData = {
  '@xmlns': 'http://lca.jrc.it/ILCD/UnitGroup',
  '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
  '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
  '@version': '1.1',
  '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/UnitGroup ../../schemas/ILCD_UnitGroupDataSet.xsd',
  unitGroupInformation: {
    dataSetInformation: {
      'common:UUID': 'original-uuid',
      'common:name': {
        '@xml:lang': 'en',
        '#text': 'Unit of currency',
      },
      classificationInformation: {
        'common:classification': {
          'common:class': {
            '@level': '0',
            '@classId': 'c-economy',
            '#text': 'Economic unit groups',
          },
        },
      },
      'common:generalComment': {
        '@xml:lang': 'en',
        '#text': 'Original comment',
      },
    },
    quantitativeReference: {
      referenceToReferenceUnit: 'u-0',
    },
  },
  modellingAndValidation: {
    complianceDeclarations: {
      compliance: {
        'common:referenceToComplianceSystem': {
          '@refObjectId': 'comp-1',
          '@type': 'source data set',
          '@uri': 'http://example.com/compliance',
          '@version': '1.0',
          'common:shortDescription': {
            '@xml:lang': 'en',
            '#text': 'ILCD compliance 1.0',
          },
        },
        'common:approvalOfOverallCompliance': 'Fully compliant',
      },
    },
  },
  administrativeInformation: {
    dataEntryBy: {
      'common:timeStamp': '2023-01-01T00:00:00Z',
      'common:referenceToDataSetFormat': {
        '@refObjectId': 'fmt-1',
        '@type': 'source data set',
        '@uri': 'http://example.com/format',
        '@version': '1.0',
        'common:shortDescription': {
          '@xml:lang': 'en',
          '#text': 'ILCD format 1.0',
        },
      },
    },
    publicationAndOwnership: {
      'common:dataSetVersion': '1.0.0',
      'common:referenceToOwnershipOfDataSet': {
        '@refObjectId': 'owner-42',
        '@type': 'contact data set',
        '@uri': 'http://example.com/owner',
        '@version': '1.0',
        'common:shortDescription': [
          { '@xml:lang': 'en', '#text': 'Owner name' },
          { '@xml:lang': 'zh', '#text': '数据集所有者' },
        ],
      },
    },
  },
  units: {
    unit: [
      {
        '@dataSetInternalID': 'u-0',
        name: 'EUR',
        meanValue: '1',
        generalComment: {
          '@xml:lang': 'en',
          '#text': 'Reference unit',
        },
      },
      {
        '@dataSetInternalID': 'u-1',
        name: '$',
        meanValue: '1.16',
        generalComment: [
          { '@xml:lang': 'en', '#text': 'US Dollar' },
          { '@xml:lang': 'zh', '#text': '美元' },
        ],
      },
    ],
  },
};

const createSampleUnitGroupData = () => JSON.parse(JSON.stringify(baseUnitGroupData));

describe('Unit Group Utility Functions', () => {
  beforeEach(() => {
    mockCreateUnitGroup.mockClear();
  });

  describe('genUnitGroupFromData', () => {
    it('should normalize dataset for form usage with language lists and reference flags', () => {
      const sample = createSampleUnitGroupData();

      const result = genUnitGroupFromData(sample);

      expect(mockCreateUnitGroup).toHaveBeenCalledTimes(1);
      const factoryPayload = mockCreateUnitGroup.mock.calls[0][0];

      expect(factoryPayload.unitGroupDataSet.units.unit).toEqual([
        {
          '@dataSetInternalID': 'u-0',
          name: 'EUR',
          meanValue: '1',
          generalComment: {
            '@xml:lang': 'en',
            '#text': 'Reference unit',
          },
          quantitativeReference: true,
        },
        {
          '@dataSetInternalID': 'u-1',
          name: '$',
          meanValue: '1.16',
          generalComment: [
            { '@xml:lang': 'en', '#text': 'US Dollar' },
            { '@xml:lang': 'zh', '#text': '美元' },
          ],
          quantitativeReference: false,
        },
      ]);

      expect(result.unitGroupInformation?.dataSetInformation?.['common:name']).toEqual([
        { '@xml:lang': 'en', '#text': 'Unit of currency' },
      ]);
      expect(
        result.unitGroupInformation?.dataSetInformation?.classificationInformation?.[
          'common:classification'
        ]?.['common:class'],
      ).toEqual({ id: ['c-economy'], value: ['Economic unit groups'] });
      expect(result.unitGroupInformation?.dataSetInformation?.['common:generalComment']).toEqual([
        { '@xml:lang': 'en', '#text': 'Original comment' },
      ]);
      const dataSetFormatRef =
        result.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat'];
      expect(dataSetFormatRef && !Array.isArray(dataSetFormatRef)).toBe(true);
      expect(dataSetFormatRef).toBeDefined();
      expect(Array.isArray(dataSetFormatRef)).toBe(false);
      expect((dataSetFormatRef as any)['common:shortDescription']).toEqual([
        { '@xml:lang': 'en', '#text': 'ILCD format 1.0' },
      ]);
      expect(result.unitGroupInformation?.quantitativeReference?.referenceToReferenceUnit).toBe(
        'u-0',
      );
      expect(result.units?.unit).toEqual([
        {
          '@dataSetInternalID': 'u-0',
          name: 'EUR',
          meanValue: '1',
          generalComment: {
            '@xml:lang': 'en',
            '#text': 'Reference unit',
          },
          quantitativeReference: true,
        },
        {
          '@dataSetInternalID': 'u-1',
          name: '$',
          meanValue: '1.16',
          generalComment: [
            { '@xml:lang': 'en', '#text': 'US Dollar' },
            { '@xml:lang': 'zh', '#text': '美元' },
          ],
          quantitativeReference: false,
        },
      ]);
    });

    it('should wrap a single unit object into an array before passing to the factory', () => {
      const sample = createSampleUnitGroupData();
      sample.units.unit = {
        '@dataSetInternalID': 'u-0',
        name: 'EUR',
        meanValue: '1',
      } as any;
      sample.unitGroupInformation.quantitativeReference.referenceToReferenceUnit = 'u-0';

      const result = genUnitGroupFromData(sample);

      expect(mockCreateUnitGroup).toHaveBeenCalledTimes(1);
      const unitsPayload = mockCreateUnitGroup.mock.calls[0][0].unitGroupDataSet.units.unit;
      expect(Array.isArray(unitsPayload)).toBe(true);
      expect(unitsPayload).toHaveLength(1);
      expect(result.units?.unit).toEqual([
        {
          '@dataSetInternalID': 'u-0',
          name: 'EUR',
          meanValue: '1',
          generalComment: undefined,
          quantitativeReference: true,
        },
      ]);
    });
  });

  describe('genUnitGroupJsonOrdered', () => {
    it('should build an ILCD-compliant structure with the correct reference unit and namespaces', () => {
      const formData = genUnitGroupFromData(createSampleUnitGroupData());

      const result = genUnitGroupJsonOrdered('new-unit-group-id', formData);

      expect(result.unitGroupDataSet['@xmlns']).toBe('http://lca.jrc.it/ILCD/UnitGroup');
      expect(result.unitGroupDataSet['@xmlns:common']).toBe('http://lca.jrc.it/ILCD/Common');
      expect(result.unitGroupDataSet['@version']).toBe('1.1');
      expect(result.unitGroupDataSet.unitGroupInformation.dataSetInformation['common:UUID']).toBe(
        'new-unit-group-id',
      );
      expect(
        result.unitGroupDataSet.unitGroupInformation.dataSetInformation['common:name'],
      ).toEqual({ '@xml:lang': 'en', '#text': 'Unit of currency' });
      expect(
        result.unitGroupDataSet.unitGroupInformation.dataSetInformation.classificationInformation?.[
          'common:classification'
        ]?.['common:class'],
      ).toEqual({ '@level': '0', '@classId': 'c-economy', '#text': 'Economic unit groups' });
      expect(
        result.unitGroupDataSet.unitGroupInformation.quantitativeReference
          ?.referenceToReferenceUnit,
      ).toBe('u-0');

      expect(result.unitGroupDataSet.units.unit).toEqual([
        {
          '@dataSetInternalID': 'u-0',
          name: 'EUR',
          meanValue: '1',
          generalComment: {
            '@xml:lang': 'en',
            '#text': 'Reference unit',
          },
        },
        {
          '@dataSetInternalID': 'u-1',
          name: '$',
          meanValue: '1.16',
          generalComment: [
            { '@xml:lang': 'en', '#text': 'US Dollar' },
            { '@xml:lang': 'zh', '#text': '美元' },
          ],
        },
      ]);
      expect(
        result.unitGroupDataSet.modellingAndValidation?.complianceDeclarations?.compliance?.[
          'common:referenceToComplianceSystem'
        ]?.['common:shortDescription'],
      ).toEqual({ '@xml:lang': 'en', '#text': 'ILCD compliance 1.0' });
      const orderedDataSetFormatRef =
        result.unitGroupDataSet.administrativeInformation?.dataEntryBy?.[
          'common:referenceToDataSetFormat'
        ];
      expect(orderedDataSetFormatRef && !Array.isArray(orderedDataSetFormatRef)).toBe(true);
      expect(orderedDataSetFormatRef).toBeDefined();
      expect(Array.isArray(orderedDataSetFormatRef)).toBe(false);
      expect((orderedDataSetFormatRef as any)['common:shortDescription']).toEqual({
        '@xml:lang': 'en',
        '#text': 'ILCD format 1.0',
      });

      const orderedOwnershipRef =
        result.unitGroupDataSet.administrativeInformation?.publicationAndOwnership?.[
          'common:referenceToOwnershipOfDataSet'
        ];
      expect(orderedOwnershipRef && !Array.isArray(orderedOwnershipRef)).toBe(true);
      expect(orderedOwnershipRef).toBeDefined();
      expect(Array.isArray(orderedOwnershipRef)).toBe(false);
      expect((orderedOwnershipRef as any)['common:shortDescription']).toEqual([
        { '@xml:lang': 'en', '#text': 'Owner name' },
        { '@xml:lang': 'zh', '#text': '数据集所有者' },
      ]);
      expect(
        Object.prototype.hasOwnProperty.call(
          result.unitGroupDataSet.unitGroupInformation.dataSetInformation,
          'email',
        ),
      ).toBe(false);
    });
  });

  describe('genUnitTableData', () => {
    it('should produce table rows with localized general comments and reference flags', () => {
      const formData = genUnitGroupFromData(createSampleUnitGroupData());
      const units = formData.units?.unit ?? [];

      const rows = genUnitTableData(units, 'zh');

      expect(rows).toEqual([
        {
          dataSetInternalID: 'u-0',
          name: 'EUR',
          meanValue: '1',
          generalComment: 'Reference unit',
          quantitativeReference: true,
        },
        {
          dataSetInternalID: 'u-1',
          name: '$',
          meanValue: '1.16',
          generalComment: '美元',
          quantitativeReference: false,
        },
      ]);
    });
  });
});
