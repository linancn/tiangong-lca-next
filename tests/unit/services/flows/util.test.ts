/**
 * Tests for flow utility functions
 * Path: src/services/flows/util.ts
 */

import {
  genFlowFromData,
  genFlowJsonOrdered,
  genFlowName,
  genFlowNameJson,
  genFlowPropertyTabTableData,
} from '@/services/flows/util';

// Mock dependencies
jest.mock('@/services/general/util', () => ({
  classificationToJsonList: jest.fn((data) => data),
  classificationToStringList: jest.fn((data) => data),
  getLangJson: jest.fn((data) => data),
  getLangList: jest.fn((data) => (Array.isArray(data) ? data : data ? [data] : [])),
  getLangText: jest.fn((data, lang) => {
    if (!data) return '-';
    if (Array.isArray(data)) {
      const item = data.find((d) => d?.['@xml:lang'] === lang);
      return item?.['#text'] || data[0]?.['#text'] || '-';
    }
    return data?.['#text'] || data || '-';
  }),
  jsonToList: jest.fn((data) => (Array.isArray(data) ? data : data ? [data] : [])),
  removeEmptyObjects: jest.fn((obj) => obj),
}));

// Mock tidas-sdk module
jest.mock('@tiangong-lca/tidas-sdk', () => ({
  createFlow: jest.fn((data) => data),
}));

describe('Flow Utility Functions', () => {
  describe('genFlowName', () => {
    it('should generate flow name from all name components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'emission to air' }],
        mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'GLO' }],
        flowProperties: [{ '@xml:lang': 'en', '#text': 'mass' }],
      };

      const result = genFlowName(name, 'en');
      expect(result).toBe('Carbon dioxide; emission to air; GLO; mass');
    });

    it('should handle missing name components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowName(name, 'en');
      expect(result).toBe('Carbon dioxide');
    });

    it('should remove trailing semicolons', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'emission to air' }],
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowName(name, 'en');
      expect(result).toBe('Carbon dioxide; emission to air');
    });

    it('should return "-" for empty name', () => {
      const name = {
        baseName: null,
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowName(name, 'en');
      expect(result).toBe('-');
    });

    it('should handle multiple language versions', () => {
      const name = {
        baseName: [
          { '@xml:lang': 'en', '#text': 'Carbon dioxide' },
          { '@xml:lang': 'zh', '#text': '二氧化碳' },
        ],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const resultEn = genFlowName(name, 'en');
      const resultZh = genFlowName(name, 'zh');

      expect(resultEn).toBe('Carbon dioxide');
      expect(resultZh).toBe('二氧化碳');
    });

    it('should skip dashes in name components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': '-' }],
        mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'GLO' }],
        flowProperties: null,
      };

      const result = genFlowName(name, 'en');
      expect(result).toBe('Carbon dioxide; GLO');
    });

    it('should handle empty string components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': '' }],
        mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'GLO' }],
        flowProperties: null,
      };

      const result = genFlowName(name, 'en');
      // Should skip empty strings similar to dashes
      expect(result).toContain('Carbon dioxide');
      expect(result).toContain('GLO');
    });

    it('should handle undefined name object', () => {
      const result = genFlowName(undefined, 'en');
      expect(result).toBe('-');
    });

    it('should handle all components with dashes', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': '-' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': '-' }],
        mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': '-' }],
        flowProperties: [{ '@xml:lang': 'en', '#text': '-' }],
      };

      const result = genFlowName(name, 'en');
      expect(result).toBe('-');
    });
  });

  describe('genFlowNameJson', () => {
    it('should generate name JSON for all languages', () => {
      const name = {
        baseName: [
          { '@xml:lang': 'en', '#text': 'Carbon dioxide' },
          { '@xml:lang': 'zh', '#text': '二氧化碳' },
        ],
        treatmentStandardsRoutes: [
          { '@xml:lang': 'en', '#text': 'emission to air' },
          { '@xml:lang': 'zh', '#text': '空气排放' },
        ],
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowNameJson(name);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]['@xml:lang']).toBe('en');
      expect(result[0]['#text']).toBe('Carbon dioxide; emission to air');
      expect(result[1]['@xml:lang']).toBe('zh');
      expect(result[1]['#text']).toBe('二氧化碳; 空气排放');
    });

    it('should handle single language', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowNameJson(name);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]['@xml:lang']).toBe('en');
    });

    it('should handle null baseName', () => {
      const name = {
        baseName: null,
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowNameJson(name);
      expect(result).toEqual([]);
    });

    it('should handle undefined name object', () => {
      const result = genFlowNameJson(undefined);
      expect(result).toEqual([]);
    });

    it('should generate names for languages only present in baseName', () => {
      const name = {
        baseName: [
          { '@xml:lang': 'en', '#text': 'Water' },
          { '@xml:lang': 'zh', '#text': '水' },
          { '@xml:lang': 'es', '#text': 'Agua' },
        ],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        flowProperties: null,
      };

      const result = genFlowNameJson(name);

      expect(result).toHaveLength(3);
      expect(result[0]['@xml:lang']).toBe('en');
      expect(result[1]['@xml:lang']).toBe('zh');
      expect(result[2]['@xml:lang']).toBe('es');
    });
  });

  describe('genFlowPropertyTabTableData', () => {
    it('should convert flow property array to table data', () => {
      const data = [
        {
          '@dataSetInternalID': '0',
          referenceToFlowPropertyDataSet: {
            '@refObjectId': 'prop-id-1',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
          },
          meanValue: '1',
          quantitativeReference: true,
          minimumValue: '0.9',
          maximumValue: '1.1',
          uncertaintyDistributionType: 'normal',
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Test comment' }],
        },
        {
          '@dataSetInternalID': '1',
          referenceToFlowPropertyDataSet: {
            '@refObjectId': 'prop-id-2',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Volume' }],
          },
          meanValue: '0.5',
          quantitativeReference: false,
        },
      ];

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('0');
      expect(result[0].dataSetInternalID).toBe('0');
      expect(result[0].referenceToFlowPropertyDataSetId).toBe('prop-id-1');
      expect(result[0].referenceToFlowPropertyDataSetVersion).toBe('01.00.000');
      expect(result[0].meanValue).toBe('1');
      expect(result[0].quantitativeReference).toBe(true);
      expect(result[1].key).toBe('1');
      expect(result[1].quantitativeReference).toBe(false);
    });

    it('should handle single flow property object', () => {
      const data = {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
          '@version': '01.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
        },
        meanValue: '1',
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].dataSetInternalID).toBe('0');
    });

    it('should return empty array for null data', () => {
      const result = genFlowPropertyTabTableData(null, 'en');
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined data', () => {
      const result = genFlowPropertyTabTableData(undefined, 'en');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      const result = genFlowPropertyTabTableData([], 'en');
      expect(result).toEqual([]);
    });

    it('should handle missing optional fields', () => {
      const data = {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
        },
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(result[0].dataSetInternalID).toBe('0');
      expect(result[0].referenceToFlowPropertyDataSetVersion).toBe('-');
      expect(result[0].meanValue).toBeUndefined();
      expect(result[0].quantitativeReference).toBe(false);
    });

    it('should handle missing dataSetInternalID', () => {
      const data = {
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
        },
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(result[0].dataSetInternalID).toBe('-');
      expect(result[0].key).toBe('-');
    });

    it('should handle missing referenceToFlowPropertyDataSet', () => {
      const data = {
        '@dataSetInternalID': '0',
        meanValue: '1',
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(result[0].referenceToFlowPropertyDataSetId).toBe('-');
      expect(result[0].referenceToFlowPropertyDataSetVersion).toBe('-');
      expect(result[0].referenceToFlowPropertyDataSet).toBe('-');
    });

    it('should handle locationOfSupply field', () => {
      const data = {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
          '@version': '01.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
        },
        locationOfSupply: 'GLO',
        meanValue: '1',
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(result[0].location).toBe('GLO');
    });

    it('should handle missing locationOfSupply field', () => {
      const data = {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
        },
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(result[0].location).toBe('-');
    });

    it('should handle multiple languages and select correct one', () => {
      const data = {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
          '@version': '01.00.000',
          'common:shortDescription': [
            { '@xml:lang': 'en', '#text': 'Mass' },
            { '@xml:lang': 'zh', '#text': '质量' },
          ],
        },
        'common:generalComment': [
          { '@xml:lang': 'en', '#text': 'English comment' },
          { '@xml:lang': 'zh', '#text': '中文评论' },
        ],
      };

      const resultEn = genFlowPropertyTabTableData(data, 'en');
      const resultZh = genFlowPropertyTabTableData(data, 'zh');

      expect(resultEn[0].referenceToFlowPropertyDataSet).toBe('Mass');
      expect(resultEn[0]['common:generalComment']).toBe('English comment');
      expect(resultZh[0].referenceToFlowPropertyDataSet).toBe('质量');
      expect(resultZh[0]['common:generalComment']).toBe('中文评论');
    });

    it('should handle uncertainty distribution fields', () => {
      const data = {
        '@dataSetInternalID': '0',
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'prop-id-1',
        },
        meanValue: '1.0',
        minimumValue: '0.8',
        maximumValue: '1.2',
        uncertaintyDistributionType: 'log-normal',
        relativeStandardDeviation95In: '0.1',
        dataDerivationTypeStatus: 'Measured',
      };

      const result = genFlowPropertyTabTableData(data, 'en');

      expect(result[0].minimumValue).toBe('0.8');
      expect(result[0].maximumValue).toBe('1.2');
      expect(result[0].uncertaintyDistributionType).toBe('log-normal');
      expect(result[0].relativeStandardDeviation95In).toBe('0.1');
      expect(result[0].dataDerivationTypeStatus).toBe('Measured');
    });
  });

  describe('genFlowJsonOrdered', () => {
    it('should generate ordered JSON structure for Elementary flow', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {
          flowProperty: [
            {
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
              },
              meanValue: '1',
              quantitativeReference: true,
            },
          ],
        },
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
            },
            'common:synonyms': [{ '@xml:lang': 'en', '#text': 'CO2' }],
            classificationInformation: {
              'common:elementaryFlowCategorization': {
                'common:category': [
                  { '@level': '0', '#text': 'Emissions' },
                  { '@level': '1', '#text': 'Emissions to air' },
                ],
              },
            },
            CASNumber: '124-38-9',
            sumFormula: 'CO2',
            'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Test comment' }],
          },
          geography: {
            locationOfSupply: 'GLO',
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'compliance-id',
                '@version': '01.00.000',
                '@type': 'source data set',
                '@uri': 'http://example.com',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'ILCD compliance' }],
              },
              'common:approvalOfOverallCompliance': 'Fully compliant',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
            'common:referenceToDataSetFormat': {
              '@refObjectId': 'format-id',
              '@version': '01.00.000',
              '@type': 'source data set',
              '@uri': 'http://example.com',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'ILCD format' }],
            },
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
            'common:permanentDataSetURI': 'http://example.com/flow/test-flow-id',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result).toBeDefined();
      expect(result.flowDataSet).toBeDefined();
      expect(result.flowDataSet['@xmlns']).toBe('http://lca.jrc.it/ILCD/Flow');
      expect(result.flowDataSet.flowInformation.dataSetInformation['common:UUID']).toBe(id);
      expect(result.flowDataSet.flowInformation.quantitativeReference).toEqual({
        referenceToReferenceFlowProperty: '0',
      });
      expect(
        result.flowDataSet.flowInformation.dataSetInformation.classificationInformation,
      ).toHaveProperty('common:elementaryFlowCategorization');
    });

    it('should generate ordered JSON structure for Product flow', () => {
      const id = 'test-product-flow-id';
      const data = {
        flowProperties: {
          flowProperty: [
            {
              // Array with single object
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
              },
              meanValue: '1',
              quantitativeReference: true,
            },
          ],
        },
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Steel' }],
            },
            classificationInformation: {
              'common:classification': {
                'common:class': [
                  { '@level': '0', '#text': 'Materials' },
                  { '@level': '1', '#text': 'Metals' },
                ],
              },
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Product flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet).toBeDefined();
      expect(
        result.flowDataSet.flowInformation.dataSetInformation.classificationInformation,
      ).toHaveProperty('common:classification');
      expect(
        result.flowDataSet.flowInformation.dataSetInformation.classificationInformation,
      ).not.toHaveProperty('common:elementaryFlowCategorization');
    });

    it('should handle multiple flow properties', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {
          flowProperty: [
            {
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
              },
              meanValue: '1',
              quantitativeReference: true,
            },
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-2',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Volume' }],
              },
              meanValue: '0.5',
            },
          ],
        },
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test flow' }],
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(Array.isArray(result.flowDataSet.flowProperties.flowProperty)).toBe(true);
      expect(result.flowDataSet.flowProperties.flowProperty).toHaveLength(2);
    });

    it('should handle single flow property as array with one element', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {
          flowProperty: [
            {
              // Array with single element
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
              },
              meanValue: '1',
              quantitativeReference: true,
            },
          ],
        },
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test flow' }],
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      // When there's only one flow property in array, it should be converted to object
      expect(result.flowDataSet.flowProperties.flowProperty).toBeDefined();
      expect(Array.isArray(result.flowDataSet.flowProperties.flowProperty)).toBe(false);
      expect(result.flowDataSet.flowProperties.flowProperty['@dataSetInternalID']).toBe('0');
    });

    it('should handle empty flow properties', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {},
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test flow' }],
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet.flowProperties.flowProperty).toEqual({});
    });

    it('should handle locationOfSupply as NULL string', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {},
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test flow' }],
            },
          },
          geography: {
            locationOfSupply: 'NULL',
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet.flowInformation.geography.locationOfSupply).toEqual({});
    });

    it('should preserve locationOfSupply when not NULL', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {},
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test flow' }],
            },
          },
          geography: {
            locationOfSupply: 'GLO',
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet.flowInformation.geography.locationOfSupply).toBe('GLO');
    });

    it('should not mutate input data when generating ordered JSON', () => {
      const id = 'mutation-check-flow-id';
      const data = {
        flowProperties: {
          flowProperty: [
            {
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
              },
              meanValue: '1',
              quantitativeReference: true,
            },
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-2',
                '@type': 'flow property data set',
                '@uri': 'http://example.com',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Volume' }],
              },
              meanValue: '0.5',
            },
          ],
        },
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Form flow draft' }],
            },
            'common:synonyms': [{ '@xml:lang': 'en', '#text': 'Co product' }],
          },
          geography: {
            locationOfSupply: 'GLO',
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Product flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
        },
      };

      const originalSnapshot = JSON.parse(JSON.stringify(data));

      genFlowJsonOrdered(id, data);

      expect(data).toEqual(originalSnapshot);
    });

    it('should include all name components', () => {
      const id = 'test-flow-id';
      const data = {
        flowProperties: {},
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Base name' }],
              treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'Treatment' }],
              mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'Mix type' }],
              flowProperties: [{ '@xml:lang': 'en', '#text': 'Flow props' }],
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet.flowInformation.dataSetInformation.name).toHaveProperty('baseName');
      expect(result.flowDataSet.flowInformation.dataSetInformation.name).toHaveProperty(
        'treatmentStandardsRoutes',
      );
      expect(result.flowDataSet.flowInformation.dataSetInformation.name).toHaveProperty(
        'mixAndLocationTypes',
      );
      expect(result.flowDataSet.flowInformation.dataSetInformation.name).toHaveProperty(
        'flowProperties',
      );
    });

    it('should handle missing optional fields', () => {
      const id = 'test-flow-id';
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet).toBeDefined();
      expect(result.flowDataSet.flowInformation.dataSetInformation['common:UUID']).toBe(id);
    });
  });

  describe('genFlowFromData', () => {
    it('should convert flow data to FormFlow structure', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            'common:UUID': 'test-flow-id',
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Carbon dioxide' }],
            },
            CASNumber: '124-38-9',
          },
          quantitativeReference: {
            referenceToReferenceFlowProperty: '0',
          },
        },
        flowProperties: {
          flowProperty: [
            {
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
              },
              meanValue: '1',
            },
          ],
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      const result = genFlowFromData(data);

      expect(result).toBeDefined();
      expect(result.flowInformation).toBeDefined();
      expect(result.flowProperties).toBeDefined();
      expect(result.modellingAndValidation).toBeDefined();
      expect(result.administrativeInformation).toBeDefined();
    });

    it('should handle single flow property object and convert to array', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
          },
        },
        flowProperties: {
          flowProperty: {
            '@dataSetInternalID': '0',
            referenceToFlowPropertyDataSet: {
              '@refObjectId': 'prop-id-1',
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowFromData(data);

      expect(Array.isArray(result.flowProperties.flowProperty)).toBe(true);
      expect(result.flowProperties.flowProperty).toHaveLength(1);
    });

    it('should handle empty flow properties', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
          },
        },
        flowProperties: {},
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowFromData(data);

      expect(result.flowProperties.flowProperty).toEqual([]);
    });

    it('should set quantitativeReference flag based on referenceToReferenceFlowProperty', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
          },
          quantitativeReference: {
            referenceToReferenceFlowProperty: '1',
          },
        },
        flowProperties: {
          flowProperty: [
            {
              '@dataSetInternalID': '0',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-1',
              },
            },
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-id-2',
              },
            },
          ],
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowFromData(data);

      const flowProps = result.flowProperties.flowProperty as unknown as any[];
      expect(flowProps[0].quantitativeReference).toBe(false);
      expect(flowProps[1].quantitativeReference).toBe(true);
    });

    it('should handle Elementary flow classification', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
            classificationInformation: {
              'common:elementaryFlowCategorization': {
                'common:category': [
                  { '@level': '0', '#text': 'Emissions' },
                  { '@level': '1', '#text': 'Emissions to air' },
                ],
              },
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowFromData(data);

      expect(result.flowInformation.dataSetInformation.classificationInformation).toHaveProperty(
        'common:elementaryFlowCategorization',
      );
    });

    it('should handle Product flow classification', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
            classificationInformation: {
              'common:classification': {
                'common:class': [
                  { '@level': '0', '#text': 'Materials' },
                  { '@level': '1', '#text': 'Metals' },
                ],
              },
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Product flow',
          },
        },
      };

      const result = genFlowFromData(data);

      expect(result.flowInformation.dataSetInformation.classificationInformation).toHaveProperty(
        'common:classification',
      );
    });

    it('should handle missing dataSetInformation gracefully', () => {
      const data = {
        flowInformation: {},
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowFromData(data);

      expect(result).toBeDefined();
      expect(result.flowInformation).toBeDefined();
    });

    it('should handle complete flow property with all fields', () => {
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test' }],
            },
          },
          quantitativeReference: {
            referenceToReferenceFlowProperty: '0',
          },
        },
        flowProperties: {
          flowProperty: {
            '@dataSetInternalID': '0',
            referenceToFlowPropertyDataSet: {
              '@refObjectId': 'prop-id-1',
              '@type': 'flow property data set',
              '@uri': 'http://example.com',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
            },
            meanValue: '1',
            minimumValue: '0.9',
            maximumValue: '1.1',
            uncertaintyDistributionType: 'log-normal',
            relativeStandardDeviation95In: '0.1',
            dataDerivationTypeStatus: 'Measured',
            'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Comment' }],
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Elementary flow',
          },
        },
      };

      const result = genFlowFromData(data);

      const flowProps = result.flowProperties.flowProperty as unknown as any[];
      const prop = flowProps[0];
      expect(prop.meanValue).toBe('1');
      expect(prop.minimumValue).toBe('0.9');
      expect(prop.maximumValue).toBe('1.1');
      expect(prop.uncertaintyDistributionType).toBe('log-normal');
      expect(prop.relativeStandardDeviation95In).toBe('0.1');
      expect(prop.dataDerivationTypeStatus).toBe('Measured');
      expect(prop.quantitativeReference).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null input in genFlowJsonOrdered', () => {
      const result = genFlowJsonOrdered('test-id', null);
      expect(result).toBeDefined();
      expect(result.flowDataSet).toBeDefined();
    });

    it('should handle empty object in genFlowFromData', () => {
      const result = genFlowFromData({});
      expect(result).toBeDefined();
    });

    it('should handle undefined input in genFlowPropertyTabTableData', () => {
      const result = genFlowPropertyTabTableData(undefined, 'en');
      expect(result).toEqual([]);
    });

    it('should handle malformed flow property data', () => {
      const data = {
        '@dataSetInternalID': null,
        referenceToFlowPropertyDataSet: null,
        meanValue: undefined,
      };

      const result = genFlowPropertyTabTableData(data, 'en');
      expect(result).toHaveLength(1);
      expect(result[0].dataSetInternalID).toBe('-');
    });
  });

  /**
   * Known issues based on business usage analysis:
   *
   * Issue 1: genFlowName may return undefined instead of '-' when all components are missing
   * This test documents expected behavior that needs verification
   *
   * Issue 2: genFlowJsonOrdered does not handle single flow property object
   * The function expects flowProperty to be an array, but in some cases it may be a single object
   * This causes a TypeError when calling .map() on a non-array value
   * Business code may need to normalize data before calling this function
   *
   * Issue 3: genFlowFromData should keep general comments as language arrays
   * Flow property edit forms (LangTextItemForm) expect an array of { @xml:lang, #text }
   * but the current implementation collapses single-language comments into an object,
   * making the business UI crash when users edit properties with comments.
   */
  describe('Known issues from business usage', () => {
    it.skip('should handle edge case where genFlowName returns undefined', () => {
      // TODO: Verify this behavior in actual business scenarios
      // The function should always return a string, but may return undefined in some edge cases
      const name = {
        baseName: undefined,
        treatmentStandardsRoutes: undefined,
        mixAndLocationTypes: undefined,
        flowProperties: undefined,
      };

      const result = genFlowName(name, 'en');
      expect(typeof result).toBe('string');
      expect(result).toBeDefined();
    });

    it.skip('should handle deeply nested null references in genFlowJsonOrdered', () => {
      // TODO: Some business flows have deeply nested structures that may cause issues
      // Need to verify removeEmptyObjects handles all edge cases correctly
      const id = 'test-id';
      const data = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: null,
            },
            'common:other': {
              'ecn:ECNumber': undefined,
            },
          },
          technology: {
            referenceToTechnicalSpecification: {
              '@type': null,
              '@refObjectId': undefined,
            },
          },
        },
      };

      const result = genFlowJsonOrdered(id, data);
      // Should not throw and should remove empty nested objects
      expect(result).toBeDefined();
    });

    /**
     * FAILING TEST: Documents real bug in genFlowJsonOrdered
     *
     * The function does not handle single flow property objects (non-array).
     * When data.flowProperties.flowProperty is an object instead of an array,
     * calling .map() throws TypeError: "data?.flowProperties?.flowProperty?.map is not a function"
     *
     * This is a design flaw that affects business usage when:
     * 1. Creating flows with a single property
     * 2. Importing flow data from external sources with single properties
     * 3. Editing existing flows that have only one property
     *
     * Expected behavior: Should handle both array and single object cases
     * Actual behavior: Throws TypeError for single objects
     *
     * Fix needed: Add array normalization before calling .map()
     * Example: const flowPropertyArray = Array.isArray(data?.flowProperties?.flowProperty)
     *            ? data.flowProperties.flowProperty
     *            : data?.flowProperties?.flowProperty ? [data.flowProperties.flowProperty] : [];
     */
    it.failing('should handle single flow property object in genFlowJsonOrdered', () => {
      const id = 'test-product-flow-id';
      const data = {
        flowProperties: {
          flowProperty: {
            // Single object, not array
            '@dataSetInternalID': '0',
            referenceToFlowPropertyDataSet: {
              '@refObjectId': 'prop-id-1',
              '@type': 'flow property data set',
              '@uri': 'http://example.com',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
            },
            meanValue: '1',
            quantitativeReference: true,
          },
        },
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Steel' }],
            },
          },
        },
        modellingAndValidation: {
          LCIMethod: {
            typeOfDataSet: 'Product flow',
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2023-01-01T00:00:00',
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
          },
        },
      };

      // This currently throws: TypeError: data?.flowProperties?.flowProperty?.map is not a function
      const result = genFlowJsonOrdered(id, data);

      expect(result.flowDataSet).toBeDefined();
      expect(result.flowDataSet.flowProperties.flowProperty).toBeDefined();
      // Should convert single object to proper structure
      expect(result.flowDataSet.flowProperties.flowProperty['@dataSetInternalID']).toBe('0');
    });

    it.failing(
      'should expose general comments as arrays in genFlowFromData for form compatibility',
      () => {
        const generalUtil = jest.requireMock('@/services/general/util');
        const getLangJsonMock = generalUtil.getLangJson as jest.Mock;
        const originalImplementation = getLangJsonMock.getMockImplementation?.();
        getLangJsonMock.mockImplementation((incoming) => {
          if (!incoming) {
            return {};
          }
          if (Array.isArray(incoming) && incoming.length === 1) {
            return incoming[0];
          }
          return incoming;
        });

        const data = {
          flowInformation: {
            dataSetInformation: {
              name: {
                baseName: [{ '@xml:lang': 'en', '#text': 'Steel' }],
              },
            },
          },
          flowProperties: {
            flowProperty: [
              {
                '@dataSetInternalID': '0',
                referenceToFlowPropertyDataSet: {
                  '@refObjectId': 'prop-id-1',
                },
                'common:generalComment': [
                  { '@xml:lang': 'en', '#text': 'Comment used in edit drawer' },
                ],
              },
            ],
          },
          modellingAndValidation: {
            LCIMethod: {
              typeOfDataSet: 'Elementary flow',
            },
          },
        };

        try {
          const result = genFlowFromData(data);

          const flowProps = result.flowProperties.flowProperty as unknown as any[];
          const generalComment = flowProps[0]['common:generalComment'];

          expect(Array.isArray(generalComment)).toBe(true);
          expect(generalComment[0]['@xml:lang']).toBe('en');
          expect(generalComment[0]['#text']).toBe('Comment used in edit drawer');
        } finally {
          getLangJsonMock.mockImplementation(
            originalImplementation ?? ((incoming: any) => incoming),
          );
        }
      },
    );
  });
});
