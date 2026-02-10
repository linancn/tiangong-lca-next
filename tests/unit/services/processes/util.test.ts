/**
 * Tests for process utility functions
 * Path: src/services/processes/util.ts
 */

import {
  genProcessExchangeTableData,
  genProcessFromData,
  genProcessJsonOrdered,
  genProcessName,
  genProcessNameJson,
} from '@/services/processes/util';

// Mock dependencies
jest.mock('@/services/general/util', () => ({
  capitalize: jest.fn((str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }),
  classificationToJsonList: jest.fn((data) => data),
  classificationToStringList: jest.fn((data) => data),
  convertCopyrightToBoolean: jest.fn((value: 'Yes' | 'No') => {
    if (value === 'Yes') return 'true';
    if (value === 'No') return 'false';
    return value;
  }),
  convertToUTCISOString: jest.fn((dateStr) => dateStr || ''),
  formatDateTime: jest.fn((date) => date.toISOString()),
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
  listToJson: jest.fn((data) => {
    if (!data || data.length === 0) return {};
    if (data.length === 1) return data[0];
    return data;
  }),
  removeEmptyObjects: jest.fn((obj) => obj),
  toAmountNumber: jest.fn((val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }),
}));

// Mock tidas-sdk module
jest.mock('@tiangong-lca/tidas-sdk', () => ({
  createProcess: jest.fn((data) => data),
}));

describe('Process Utility Functions', () => {
  describe('genProcessName', () => {
    it('should generate process name from all name components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'hot rolling' }],
        mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'production mix' }],
        functionalUnitFlowProperties: [{ '@xml:lang': 'en', '#text': '1 kg' }],
      };

      const result = genProcessName(name, 'en');
      expect(result).toBe('Steel production; hot rolling; production mix; 1 kg');
    });

    it('should handle missing name components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const result = genProcessName(name, 'en');
      expect(result).toBe('Steel production');
    });

    it('should remove trailing semicolons', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'hot rolling' }],
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const result = genProcessName(name, 'en');
      expect(result).toBe('Steel production; hot rolling');
    });

    it('should return "-" for empty name', () => {
      const name = {
        baseName: null,
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const result = genProcessName(name, 'en');
      expect(result).toBe('-');
    });

    it('should handle multiple language versions', () => {
      const name = {
        baseName: [
          { '@xml:lang': 'en', '#text': 'Steel production' },
          { '@xml:lang': 'zh', '#text': '钢铁生产' },
        ],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const resultEn = genProcessName(name, 'en');
      const resultZh = genProcessName(name, 'zh');

      expect(resultEn).toBe('Steel production');
      expect(resultZh).toBe('钢铁生产');
    });

    it('should skip dashes in name components', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
        treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': '-' }],
        mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'production mix' }],
        functionalUnitFlowProperties: null,
      };

      const result = genProcessName(name, 'en');
      expect(result).toBe('Steel production; production mix');
    });
  });

  describe('genProcessNameJson', () => {
    it('should generate name JSON for all languages', () => {
      const name = {
        baseName: [
          { '@xml:lang': 'en', '#text': 'Steel production' },
          { '@xml:lang': 'zh', '#text': '钢铁生产' },
        ],
        treatmentStandardsRoutes: [
          { '@xml:lang': 'en', '#text': 'hot rolling' },
          { '@xml:lang': 'zh', '#text': '热轧' },
        ],
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const result = genProcessNameJson(name);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]['@xml:lang']).toBe('en');
      expect(result[0]['#text']).toBe('Steel production; hot rolling');
      expect(result[1]['@xml:lang']).toBe('zh');
      expect(result[1]['#text']).toBe('钢铁生产; 热轧');
    });

    it('should handle single language', () => {
      const name = {
        baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const result = genProcessNameJson(name);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]['@xml:lang']).toBe('en');
    });

    it('should handle null baseName', () => {
      const name = {
        baseName: null,
        treatmentStandardsRoutes: null,
        mixAndLocationTypes: null,
        functionalUnitFlowProperties: null,
      };

      const result = genProcessNameJson(name);
      expect(result).toEqual([]);
    });
  });

  describe('genProcessExchangeTableData', () => {
    it('should convert exchange array to table data', () => {
      const data = [
        {
          '@dataSetInternalID': '1',
          exchangeDirection: 'input',
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-id-1',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Iron ore' }],
          },
          meanAmount: '10',
          resultingAmount: '10',
          quantitativeReference: false,
        },
        {
          '@dataSetInternalID': '2',
          exchangeDirection: 'output',
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-id-2',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel' }],
          },
          meanAmount: '1',
          resultingAmount: '1',
          quantitativeReference: true,
          functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': '1 kg steel' }],
        },
      ];

      const result = genProcessExchangeTableData(data, 'en');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('INPUT:flow-id-1');
      expect(result[0].dataSetInternalID).toBe('1');
      expect(result[0].exchangeDirection).toBe('input');
      expect(result[0].quantitativeReference).toBe(false);
      expect(result[1].key).toBe('OUTPUT:flow-id-2');
      expect(result[1].quantitativeReference).toBe(true);
    });

    it('should handle single exchange object', () => {
      const data = {
        '@dataSetInternalID': '1',
        exchangeDirection: 'input',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
          '@version': '01.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Iron ore' }],
        },
        meanAmount: '10',
        resultingAmount: '10',
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].dataSetInternalID).toBe('1');
    });

    it('should return empty array for null data', () => {
      const result = genProcessExchangeTableData(null, 'en');
      expect(result).toEqual([]);
    });

    it('should handle missing optional fields', () => {
      const data = {
        '@dataSetInternalID': '1',
        exchangeDirection: 'input',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
        },
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(result[0].dataSetInternalID).toBe('1');
      expect(result[0].referenceToFlowDataSetVersion).toBe('-');
      expect(result[0].meanAmount).toBe('-');
      expect(result[0].resultingAmount).toBe('-');
      expect(result[0].quantitativeReference).toBe(false);
    });

    it('should handle undefined dataSetInternalID', () => {
      const data = {
        exchangeDirection: 'input',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
        },
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(result[0].dataSetInternalID).toBe('-');
      expect(result[0].key).toBe('INPUT:flow-id-1');
      expect(result[0].referenceToFlowDataSetId).toBe('flow-id-1');
    });

    it('should handle missing exchangeDirection', () => {
      const data = {
        '@dataSetInternalID': '1',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
        },
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(result[0].exchangeDirection).toBe('-');
      expect(result[0].key).toBe('-:flow-id-1');
    });

    it('should handle missing referenceToFlowDataSet', () => {
      const data = {
        '@dataSetInternalID': '1',
        exchangeDirection: 'input',
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(result[0].referenceToFlowDataSetId).toBe('-');
      expect(result[0].key).toBe('INPUT:-');
    });

    it('should convert exchangeDirection to uppercase in key', () => {
      const data = {
        '@dataSetInternalID': '1',
        exchangeDirection: 'input',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
        },
      };

      const result = genProcessExchangeTableData(data, 'en');
      expect(result[0].key).toBe('INPUT:flow-id-1');
    });

    it('should include referencesToDataSource', () => {
      const data = {
        '@dataSetInternalID': '1',
        exchangeDirection: 'input',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
        },
        referencesToDataSource: {
          referenceToDataSource: {
            '@type': 'source data set',
            '@refObjectId': 'source-id-1',
            '@uri': 'http://example.com',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Data source' }],
          },
        },
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(result[0].referencesToDataSource).toBeDefined();
      expect(result[0].referencesToDataSource.referenceToDataSource['@refObjectId']).toBe(
        'source-id-1',
      );
    });

    it('should handle allocations', () => {
      const data = {
        '@dataSetInternalID': '1',
        exchangeDirection: 'output',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-id-1',
        },
        allocations: {
          allocation: {
            '@internalReferenceToCoProduct': 'co-product-1',
            '@allocatedFraction': '0.5',
          },
        },
      };

      const result = genProcessExchangeTableData(data, 'en');

      expect(result[0].allocations).toBeDefined();
      expect(result[0].allocations.allocation?.['@allocatedFraction']).toBe('0.5');
    });
  });

  describe('genProcessJsonOrdered', () => {
    const mockProcessData = {
      processInformation: {
        dataSetInformation: {
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
            treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': 'hot rolling' }],
            mixAndLocationTypes: null,
            functionalUnitFlowProperties: null,
          },
          identifierOfSubDataSet: 'sub-1',
          'common:synonyms': [{ '@xml:lang': 'en', '#text': 'Steel manufacturing' }],
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '@level': '0', '@classId': 'class-1', '#text': 'Materials' }],
            },
          },
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'General comment' }],
        },
        time: {
          'common:referenceYear': '2024',
          'common:timeRepresentativenessDescription': [
            { '@xml:lang': 'en', '#text': 'Time description' },
          ],
        },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location': 'CN',
            descriptionOfRestrictions: [{ '@xml:lang': 'en', '#text': 'Location description' }],
          },
        },
        technology: {
          technologyDescriptionAndIncludedProcesses: [
            { '@xml:lang': 'en', '#text': 'Technology description' },
          ],
        },
      },
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': '1',
            referenceToFlowDataSet: {
              '@type': 'flow data set',
              '@refObjectId': 'flow-id-1',
              '@uri': 'http://example.com/flow',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Iron ore' }],
            },
            exchangeDirection: 'Input',
            meanAmount: '10',
            resultingAmount: '10',
            quantitativeReference: false,
          },
          {
            '@dataSetInternalID': '2',
            referenceToFlowDataSet: {
              '@type': 'flow data set',
              '@refObjectId': 'flow-id-2',
              '@uri': 'http://example.com/flow2',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel' }],
            },
            exchangeDirection: 'Output',
            meanAmount: '1',
            resultingAmount: '1',
            quantitativeReference: true,
            functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': '1 kg steel' }],
          },
        ],
      },
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          typeOfDataSet: 'Unit process, single operation',
          LCIMethodPrinciple: 'Attributional',
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': '2024-01-01T00:00:00+00:00',
        },
        publicationAndOwnership: {
          'common:dateOfLastRevision': '2024-01-01T00:00:00+00:00',
          'common:copyright': true,
        },
      },
    };

    it('should generate ordered process JSON with all sections', () => {
      const id = 'test-process-id';
      const result = genProcessJsonOrdered(id, mockProcessData);

      expect(result.processDataSet).toBeDefined();
      expect(result.processDataSet.processInformation).toBeDefined();
      expect(result.processDataSet.processInformation.dataSetInformation['common:UUID']).toBe(id);
    });

    it('should extract quantitative reference from exchanges', () => {
      const id = 'test-process-id';
      const result = genProcessJsonOrdered(id, mockProcessData);

      expect(result.processDataSet.processInformation.quantitativeReference).toBeDefined();
      expect(result.processDataSet.processInformation.quantitativeReference['@type']).toBe(
        'Reference flow(s)',
      );
      expect(
        result.processDataSet.processInformation.quantitativeReference.referenceToReferenceFlow,
      ).toBe('2');
    });

    it('should handle process with no quantitative reference', () => {
      const dataWithoutRef = {
        ...mockProcessData,
        exchanges: {
          exchange: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowDataSet: {
                '@refObjectId': 'flow-id-1',
              },
              exchangeDirection: 'Input',
              meanAmount: '10',
              quantitativeReference: false,
            },
          ],
        },
      };

      const result = genProcessJsonOrdered('test-id', dataWithoutRef);

      expect(result.processDataSet.processInformation.quantitativeReference).toEqual({});
    });

    it('should use resultingAmount if not zero, otherwise use meanAmount', () => {
      const dataWithZeroResulting = {
        ...mockProcessData,
        exchanges: {
          exchange: [
            {
              '@dataSetInternalID': '1',
              meanAmount: '10',
              resultingAmount: '0',
              exchangeDirection: 'Input',
              referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
            },
            {
              '@dataSetInternalID': '2',
              meanAmount: '5',
              resultingAmount: '8',
              exchangeDirection: 'Input',
              referenceToFlowDataSet: { '@refObjectId': 'flow-2' },
            },
          ],
        },
      };

      const result = genProcessJsonOrdered('test-id', dataWithZeroResulting);

      // When resultingAmount is 0, should use meanAmount
      expect(result.processDataSet.exchanges.exchange[0].resultingAmount).toBe('10');
      // When resultingAmount is non-zero, should use resultingAmount
      expect(result.processDataSet.exchanges.exchange[1].resultingAmount).toBe('8');
    });

    it('should handle NULL location', () => {
      const dataWithNullLocation = {
        ...mockProcessData,
        processInformation: {
          ...mockProcessData.processInformation,
          geography: {
            locationOfOperationSupplyOrProduction: {
              '@location': 'NULL',
            },
          },
        },
      };

      const result = genProcessJsonOrdered('test-id', dataWithNullLocation);

      expect(
        result.processDataSet.processInformation.geography.locationOfOperationSupplyOrProduction[
          '@location'
        ],
      ).toEqual({});
    });

    it('should include xmlns attributes', () => {
      const result = genProcessJsonOrdered('test-id', mockProcessData);

      expect(result.processDataSet['@xmlns:common']).toBe('http://lca.jrc.it/ILCD/Common');
      expect(result.processDataSet['@xmlns']).toBe('http://lca.jrc.it/ILCD/Process');
      expect(result.processDataSet['@xmlns:xsi']).toBe('http://www.w3.org/2001/XMLSchema-instance');
      expect(result.processDataSet['@version']).toBe('1.1');
    });

    it('should handle single exchange object', () => {
      const dataWithSingleExchange = {
        ...mockProcessData,
        exchanges: {
          exchange: {
            '@dataSetInternalID': '1',
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-id-1',
            },
            exchangeDirection: 'Input',
            meanAmount: '10',
          },
        },
      };

      let result: any;

      expect(() => {
        result = genProcessJsonOrdered('test-id', dataWithSingleExchange);
      }).not.toThrow();

      expect(Array.isArray(result?.processDataSet.exchanges.exchange)).toBe(true);
    });

    it('should derive permanentDataSetURI from id and version', () => {
      const id = 'process-123';
      const dataWithVersion = {
        ...mockProcessData,
        administrativeInformation: {
          ...mockProcessData.administrativeInformation,
          publicationAndOwnership: {
            ...mockProcessData.administrativeInformation?.publicationAndOwnership,
            'common:dataSetVersion': '01.02.003',
          },
        },
      };

      const result = genProcessJsonOrdered(id, dataWithVersion);

      expect(
        result.processDataSet.administrativeInformation.publicationAndOwnership[
          'common:permanentDataSetURI'
        ],
      ).toBe(
        'https://lcdn.tiangong.earth/datasetdetail/process.xhtml?uuid=process-123&version=01.02.003',
      );
    });

    it('should handle missing exchanges', () => {
      const dataWithoutExchanges = {
        ...mockProcessData,
        exchanges: {},
      };

      const result = genProcessJsonOrdered('test-id', dataWithoutExchanges);

      expect(result.processDataSet.exchanges.exchange).toEqual([]);
    });

    it('should include allocations in exchanges', () => {
      const dataWithAllocations = {
        ...mockProcessData,
        exchanges: {
          exchange: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
              exchangeDirection: 'Output',
              meanAmount: '1',
              allocations: {
                allocation: {
                  '@internalReferenceToCoProduct': 'co-product-1',
                  '@allocatedFraction': '0.5',
                },
              },
            },
          ],
        },
      };

      const result = genProcessJsonOrdered('test-id', dataWithAllocations);

      expect(result.processDataSet.exchanges.exchange[0].allocations).toBeDefined();
      expect(
        result.processDataSet.exchanges.exchange[0].allocations.allocation[
          '@internalReferenceToCoProduct'
        ],
      ).toBe('co-product-1');
    });
  });

  describe('genProcessFromData', () => {
    const mockRawData = {
      processInformation: {
        dataSetInformation: {
          'common:UUID': 'process-uuid-123',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Steel production' }],
          },
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '@level': '0', '@classId': 'class-1', '#text': 'Materials' }],
            },
          },
        },
        quantitativeReference: {
          '@type': 'Reference flow(s)',
          referenceToReferenceFlow: '2',
          functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': '1 kg steel' }],
        },
        time: {
          'common:referenceYear': '2024',
        },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location': 'CN',
          },
        },
      },
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': '1',
            referenceToFlowDataSet: {
              '@type': 'flow data set',
              '@refObjectId': 'flow-id-1',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Iron ore' }],
            },
            exchangeDirection: 'Input',
            meanAmount: '10',
            resultingAmount: '10',
          },
          {
            '@dataSetInternalID': '2',
            referenceToFlowDataSet: {
              '@type': 'flow data set',
              '@refObjectId': 'flow-id-2',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel' }],
            },
            exchangeDirection: 'Output',
            meanAmount: '1',
            resultingAmount: '1',
          },
        ],
      },
      modellingAndValidation: {
        LCIMethodAndAllocation: {
          typeOfDataSet: 'Unit process, single operation',
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': '2024-01-01T00:00:00+00:00',
        },
      },
    };

    it('should convert raw process data to form structure', () => {
      const result = genProcessFromData(mockRawData);

      expect(result).toBeDefined();
      expect(result.processInformation).toBeDefined();
      expect(result.exchanges).toBeDefined();
    });

    it('should handle single exchange object', () => {
      const dataWithSingleExchange = {
        ...mockRawData,
        exchanges: {
          exchange: {
            '@dataSetInternalID': '1',
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-id-1',
            },
            exchangeDirection: 'Input',
            meanAmount: '10',
          },
        },
      };

      const result = genProcessFromData(dataWithSingleExchange);

      expect(Array.isArray(result.exchanges.exchange)).toBe(true);
      expect(result.exchanges.exchange).toHaveLength(1);
    });

    it('should handle missing exchanges', () => {
      const dataWithoutExchanges = {
        ...mockRawData,
        exchanges: {},
      };

      const result = genProcessFromData(dataWithoutExchanges);

      expect(result.exchanges.exchange).toEqual([]);
    });

    it('should mark quantitative reference exchange', () => {
      const result = genProcessFromData(mockRawData);

      const exchanges = result.exchanges.exchange;
      const refExchange = exchanges.find((e: any) => e['@dataSetInternalID'] === '2');
      const nonRefExchange = exchanges.find((e: any) => e['@dataSetInternalID'] === '1');

      expect(refExchange).toBeDefined();
      expect(nonRefExchange).toBeDefined();
      expect((refExchange as any).quantitativeReference).toBe(true);
      expect((nonRefExchange as any).quantitativeReference).toBe(false);
    });

    it('should include functionalUnitOrOther in quantitative reference exchange', () => {
      const result = genProcessFromData(mockRawData);

      const refExchange = result.exchanges.exchange.find(
        (e: any) => e['@dataSetInternalID'] === '2',
      );

      expect(refExchange).toBeDefined();
      expect((refExchange as any).functionalUnitOrOther).toBeDefined();
      expect(Array.isArray((refExchange as any).functionalUnitOrOther)).toBe(true);
    });

    it('should handle process without quantitative reference', () => {
      const dataWithoutRef = {
        ...mockRawData,
        processInformation: {
          ...mockRawData.processInformation,
          quantitativeReference: {},
        },
      };

      const result = genProcessFromData(dataWithoutRef);

      const exchanges = result.exchanges.exchange;
      exchanges.forEach((e: any) => {
        expect(e.quantitativeReference).toBe(false);
      });
    });

    it('should preserve exchange allocations', () => {
      const dataWithAllocations = {
        ...mockRawData,
        exchanges: {
          exchange: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowDataSet: { '@refObjectId': 'flow-1' },
              exchangeDirection: 'Output',
              meanAmount: '1',
              allocations: {
                allocation: {
                  '@internalReferenceToCoProduct': 'co-product-1',
                  '@allocatedFraction': '0.5',
                },
              },
            },
          ],
        },
      };

      const result = genProcessFromData(dataWithAllocations);

      expect(result.exchanges.exchange[0].allocations).toBeDefined();
      expect(
        (result.exchanges.exchange[0] as any).allocations?.allocation?.['@allocatedFraction'],
      ).toBe('0.5');
    });

    it('should handle missing UUID with fallback', () => {
      const dataWithoutUUID = {
        ...mockRawData,
        processInformation: {
          ...mockRawData.processInformation,
          dataSetInformation: {
            ...mockRawData.processInformation.dataSetInformation,
            'common:UUID': undefined,
          },
        },
      };

      const result = genProcessFromData(dataWithoutUUID);

      expect(result.processInformation.dataSetInformation['common:UUID']).toBe('-');
    });

    it('should handle LCIA results', () => {
      const dataWithLCIA = {
        ...mockRawData,
        LCIAResults: {
          LCIAResult: [
            {
              referenceToLCIAMethodDataSet: {
                '@refObjectId': 'method-1',
              },
              meanAmount: '100',
            },
          ],
        },
      };

      const result = genProcessFromData(dataWithLCIA);

      expect(result.LCIAResults).toBeDefined();
      expect(result.LCIAResults?.LCIAResult ?? []).toHaveLength(1);
    });

    it('should include all major sections', () => {
      const result = genProcessFromData(mockRawData);

      expect(result.processInformation).toBeDefined();
      expect(result.exchanges).toBeDefined();
      expect(result.modellingAndValidation).toBeDefined();
      expect(result.administrativeInformation).toBeDefined();
    });

    it('should handle mathematical relations', () => {
      const dataWithMath = {
        ...mockRawData,
        processInformation: {
          ...mockRawData.processInformation,
          mathematicalRelations: {
            modelDescription: [{ '@xml:lang': 'en', '#text': 'Mathematical model' }],
            variableParameter: {
              '@name': 'param1',
              formula: 'x + y',
              meanValue: '10',
            },
          },
        },
      };

      const result = genProcessFromData(dataWithMath);

      expect(result.processInformation.mathematicalRelations).toBeDefined();
      expect(
        (result.processInformation.mathematicalRelations as any)?.variableParameter?.['@name'],
      ).toBe('param1');
    });

    it('should handle technology section', () => {
      const dataWithTechnology = {
        ...mockRawData,
        processInformation: {
          ...mockRawData.processInformation,
          technology: {
            technologyDescriptionAndIncludedProcesses: [
              { '@xml:lang': 'en', '#text': 'Technology description' },
            ],
            technologicalApplicability: [
              { '@xml:lang': 'en', '#text': 'Applicability description' },
            ],
          },
        },
      };

      const result = genProcessFromData(dataWithTechnology);

      expect(result.processInformation.technology).toBeDefined();
      expect(
        Array.isArray(
          (result.processInformation.technology as any)?.technologyDescriptionAndIncludedProcesses,
        ),
      ).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined inputs gracefully', () => {
      expect(genProcessName(undefined as any, 'en')).toBe('-');
      expect(genProcessExchangeTableData(undefined, 'en')).toEqual([]);
    });

    it('should handle null inputs gracefully', () => {
      expect(genProcessName(null as any, 'en')).toBe('-');
      expect(genProcessExchangeTableData(null, 'en')).toEqual([]);
    });

    it('should handle empty objects', () => {
      expect(genProcessName({}, 'en')).toBe('-');
      expect(genProcessExchangeTableData({}, 'en')).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      expect(genProcessExchangeTableData([], 'en')).toEqual([]);
    });

    it('should handle malformed exchange data', () => {
      const malformedData = {
        '@dataSetInternalID': null,
        exchangeDirection: undefined,
        referenceToFlowDataSet: null,
      };

      const result = genProcessExchangeTableData(malformedData, 'en');

      expect(result[0].dataSetInternalID).toBe('-');
      expect(result[0].exchangeDirection).toBe('-');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency through genProcessJsonOrdered and genProcessFromData', () => {
      const originalData = {
        processInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Test Process' }],
            },
          },
          time: {
            'common:referenceYear': '2024',
          },
        },
        exchanges: {
          exchange: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowDataSet: {
                '@refObjectId': 'flow-1',
              },
              exchangeDirection: 'Input',
              meanAmount: '10',
            },
          ],
        },
      };

      // Generate JSON
      const jsonData = genProcessJsonOrdered('test-id', originalData);

      // Convert back to form
      const formData = genProcessFromData(jsonData.processDataSet);

      // Verify key data is preserved
      expect(formData.processInformation).toBeDefined();
      expect(formData.exchanges).toBeDefined();
      expect(formData.exchanges.exchange).toHaveLength(1);
    });
  });
});
