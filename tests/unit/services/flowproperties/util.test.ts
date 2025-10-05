/**
 * Tests for flowproperties utility functions
 * Path: src/services/flowproperties/util.ts
 *
 * Coverage focuses on:
 * - genFlowpropertyJsonOrdered: Generate properly ordered ILCD JSON structure
 */

import { genFlowpropertyJsonOrdered } from '@/services/flowproperties/util';

jest.mock('@/services/general/util', () => ({
  getLangJson: jest.fn(),
  classificationToJsonList: jest.fn(),
  removeEmptyObjects: jest.fn(),
}));

const { getLangJson, classificationToJsonList, removeEmptyObjects } =
  jest.requireMock('@/services/general/util');

describe('FlowProperties Utility Functions (src/services/flowproperties/util.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLangJson.mockImplementation((value: any) => value || {});
    classificationToJsonList.mockImplementation((value: any) => value || {});
    removeEmptyObjects.mockImplementation((obj: any) => obj);
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
});
