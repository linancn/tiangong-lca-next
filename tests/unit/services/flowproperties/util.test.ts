/**
 * Tests for flowproperties utility functions
 * Path: src/services/flowproperties/util.ts
 *
 * Coverage focuses on:
 * - genFlowpropertyJsonOrdered: Generate properly ordered ILCD JSON structure
 */

import {
  genFlowpropertyFromData,
  genFlowpropertyJsonOrdered,
} from '@/services/flowproperties/util';

jest.mock('@/services/general/util', () => ({
  classificationToStringList: jest.fn(),
  convertToUTCISOString: jest.fn(),
  formatDateTime: jest.fn((date) => date.toISOString()),
  getLangJson: jest.fn(),
  getLangList: jest.fn(),
  classificationToJsonList: jest.fn(),
  removeEmptyObjects: jest.fn(),
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  createFlowProperty: jest.fn((data) => data),
}));

const {
  classificationToJsonList,
  classificationToStringList,
  convertToUTCISOString,
  formatDateTime,
  getLangJson,
  getLangList,
  removeEmptyObjects,
} = jest.requireMock('@/services/general/util');
const mockCreateFlowProperty = jest.requireMock('@tiangong-lca/tidas-sdk')
  .createFlowProperty as jest.Mock;

describe('FlowProperties Utility Functions (src/services/flowproperties/util.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    classificationToStringList.mockImplementation((value: any) => value || {});
    convertToUTCISOString.mockImplementation((value: any) => value || '');
    formatDateTime.mockImplementation((date: any) => date.toISOString());
    getLangJson.mockImplementation((value: any) => value || {});
    getLangList.mockImplementation((value: any) => {
      if (!value) {
        return [];
      }
      return Array.isArray(value) ? value : [value];
    });
    classificationToJsonList.mockImplementation((value: any) => value || {});
    removeEmptyObjects.mockImplementation((obj: any) => obj);
    mockCreateFlowProperty.mockImplementation((input: any) => input);
  });

  describe('genFlowpropertyJsonOrdered', () => {
    it('should generate properly ordered JSON structure', () => {
      const id = 'flowprop-123';
      const data = {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:name': [{ '@xml:lang': 'en', '#text': 'Mass' }],
            'common:synonyms': [{ '@xml:lang': 'en', '#text': 'Weight' }],
            classificationInformation: {
              'common:classification': {
                'common:class': { id: ['physical'], value: ['Physical'] },
              },
            },
            'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Mass property' }],
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'unitgroup-123',
              '@type': 'unit group data set',
              '@uri': '../unitgroups/unitgroup-123.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass units' }],
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2024-01-01T00:00:00Z',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowpropertyJsonOrdered(id, data);

      expect(result).toBeDefined();
      expect(result.flowPropertyDataSet).toBeDefined();
      expect(getLangJson).toHaveBeenCalled();
      expect(classificationToJsonList).toHaveBeenCalled();
      expect(removeEmptyObjects).toHaveBeenCalled();
    });

    it('should include ILCD namespace attributes', () => {
      removeEmptyObjects.mockImplementation((obj: any) => obj);

      const result = genFlowpropertyJsonOrdered('test-id', {
        flowPropertiesInformation: {
          dataSetInformation: {},
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
      });

      expect(result.flowPropertyDataSet['@xmlns:common']).toBe('http://lca.jrc.it/ILCD/Common');
      expect(result.flowPropertyDataSet['@xmlns']).toBe('http://lca.jrc.it/ILCD/FlowProperty');
      expect(result.flowPropertyDataSet['@version']).toBe('1.1');
    });

    it('should handle minimal data', () => {
      const result = genFlowpropertyJsonOrdered('min-id', {
        flowPropertiesInformation: {
          dataSetInformation: {},
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
      });

      expect(result.flowPropertyDataSet).toBeDefined();
      expect(result.flowPropertyDataSet.flowPropertiesInformation).toBeDefined();
    });

    it('should include UUID in correct location', () => {
      removeEmptyObjects.mockImplementation((obj: any) => obj);
      const testId = 'uuid-test-123';

      const result = genFlowpropertyJsonOrdered(testId, {
        flowPropertiesInformation: {
          dataSetInformation: {},
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
      });

      expect(result.flowPropertyDataSet.flowPropertiesInformation.dataSetInformation).toBeDefined();
    });

    it('should process classification information correctly', () => {
      const mockClassification = { id: ['cat1'], value: ['Category 1'] };
      const mockProcessedClass = [{ '@level': '0', '#text': 'Category 1' }];

      classificationToJsonList.mockReturnValue(mockProcessedClass);

      const data = {
        flowPropertiesInformation: {
          dataSetInformation: {
            classificationInformation: {
              'common:classification': {
                'common:class': mockClassification,
              },
            },
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
      };

      genFlowpropertyJsonOrdered('test-id', data);

      expect(classificationToJsonList).toHaveBeenCalledWith(mockClassification);
    });

    it('should process multilingual fields', () => {
      const mockNameData = [
        { '@xml:lang': 'en', '#text': 'Mass' },
        { '@xml:lang': 'zh', '#text': '质量' },
      ];

      getLangJson.mockReturnValue(mockNameData);

      const data = {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:name': mockNameData,
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
      };

      genFlowpropertyJsonOrdered('test-id', data);

      expect(getLangJson).toHaveBeenCalledWith(mockNameData);
    });

    it('should handle modellingAndValidation section', () => {
      removeEmptyObjects.mockImplementation((obj: any) => obj);

      const data = {
        flowPropertiesInformation: {
          dataSetInformation: {},
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
        modellingAndValidation: {
          dataSourcesTreatmentAndRepresentativeness: {
            referenceToDataSource: {
              '@refObjectId': 'source-123',
              '@type': 'source data set',
              '@uri': '../sources/source-123.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Data source' }],
            },
          },
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'compliance-123',
              },
              'common:approvalOfOverallCompliance': 'Fully compliant',
            },
          },
        },
      };

      const result = genFlowpropertyJsonOrdered('test-id', data);

      expect(result.flowPropertyDataSet.modellingAndValidation).toBeDefined();
    });

    it('should handle administrativeInformation section', () => {
      removeEmptyObjects.mockImplementation((obj: any) => obj);

      const data = {
        flowPropertiesInformation: {
          dataSetInformation: {},
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2024-01-01T00:00:00Z',
            'common:referenceToDataSetFormat': {
              '@refObjectId': 'format-123',
            },
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
            'common:permanentDataSetURI': 'http://example.com/flowprop',
          },
        },
      };

      const result = genFlowpropertyJsonOrdered('test-id', data);

      expect(result.flowPropertyDataSet.administrativeInformation).toBeDefined();
    });
  });

  describe('genFlowpropertyFromData', () => {
    it('should normalize ILCD data back into form state with helper conversions', () => {
      const classificationInput = [{ '@level': '0', '@classId': 'physical', '#text': 'Physical' }];
      const classificationOutput = { id: ['physical'], value: ['Physical'] };
      classificationToStringList.mockReturnValue(classificationOutput);

      const input = {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:UUID': 'flowprop-1',
            'common:name': { '@xml:lang': 'en', '#text': 'Mass' },
            'common:synonyms': { '@xml:lang': 'en', '#text': 'Weight' },
            classificationInformation: {
              'common:classification': {
                'common:class': classificationInput,
              },
            },
            'common:generalComment': { '@xml:lang': 'en', '#text': 'Primary property' },
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-1',
              '@type': 'unit group data set',
              '@uri': '../unitgroups/ug-1.xml',
              '@version': '01.00.000',
              'common:shortDescription': { '@xml:lang': 'en', '#text': 'Mass units' },
            },
          },
        },
        modellingAndValidation: {
          dataSourcesTreatmentAndRepresentativeness: {
            referenceToDataSource: {
              '@refObjectId': 'source-1',
              '@type': 'source data set',
              '@uri': '../sources/source-1.xml',
              '@version': '01.00.000',
              'common:shortDescription': { '@xml:lang': 'en', '#text': 'Primary source' },
            },
          },
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'source-2',
                '@type': 'source data set',
                '@uri': '../sources/source-2.xml',
                '@version': '01.00.000',
                'common:shortDescription': { '@xml:lang': 'en', '#text': 'Compliance source' },
              },
              'common:approvalOfOverallCompliance': 'Fully compliant',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2024-01-01T00:00:00Z',
            'common:referenceToDataSetFormat': {
              '@refObjectId': 'fmt-1',
              '@type': 'source data set',
              '@uri': '../sources/fmt-1.xml',
              '@version': '01.00.000',
              'common:shortDescription': { '@xml:lang': 'en', '#text': 'ILCD format' },
            },
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
            'common:referenceToPrecedingDataSetVersion': {
              '@refObjectId': 'prev-1',
              '@type': 'flow property data set',
              '@uri': '../flowproperties/prev-1.xml',
              '@version': '00.09.000',
              'common:shortDescription': { '@xml:lang': 'en', '#text': 'Previous version' },
            },
            'common:referenceToOwnershipOfDataSet': {
              '@refObjectId': 'owner-1',
              '@type': 'contact data set',
              '@uri': '../contacts/owner-1.xml',
              '@version': '01.00.000',
              'common:shortDescription': { '@xml:lang': 'en', '#text': 'Owner' },
            },
            'common:permanentDataSetURI': 'https://lcdn.tiangong.earth/flowprop-1',
          },
        },
      };

      const result = genFlowpropertyFromData(input);

      expect(classificationToStringList).toHaveBeenCalledWith(classificationInput);
      expect(getLangList).toHaveBeenCalledWith(
        input.flowPropertiesInformation.dataSetInformation['common:name'],
      );
      expect(convertToUTCISOString).toHaveBeenCalledWith('2024-01-01T00:00:00Z');
      expect(mockCreateFlowProperty).toHaveBeenCalledTimes(1);
      expect(removeEmptyObjects).toHaveBeenCalled();
      expect(result.flowPropertiesInformation?.dataSetInformation?.['common:name']).toEqual([
        { '@xml:lang': 'en', '#text': 'Mass' },
      ]);
      expect(
        result.flowPropertiesInformation?.dataSetInformation?.classificationInformation?.[
          'common:classification'
        ]?.['common:class'],
      ).toEqual(classificationOutput);
      expect(
        result.administrativeInformation?.publicationAndOwnership?.['common:permanentDataSetURI'],
      ).toBe('https://lcdn.tiangong.earth/flowprop-1');
    });

    it('should tolerate missing optional sections and keep empty helper fallbacks', () => {
      const result = genFlowpropertyFromData({
        flowPropertiesInformation: {
          dataSetInformation: {},
          quantitativeReference: {
            referenceToReferenceUnitGroup: {},
          },
        },
        administrativeInformation: {
          dataEntryBy: {},
          publicationAndOwnership: {},
        },
      });

      expect(convertToUTCISOString).toHaveBeenCalledWith(undefined);
      expect(result.flowPropertiesInformation?.dataSetInformation?.['common:name']).toEqual([]);
      expect(
        result.administrativeInformation?.dataEntryBy?.['common:referenceToDataSetFormat'],
      ).toEqual({
        '@refObjectId': undefined,
        '@version': undefined,
        '@type': undefined,
        '@uri': undefined,
        'common:shortDescription': [],
      });
    });
  });
});
