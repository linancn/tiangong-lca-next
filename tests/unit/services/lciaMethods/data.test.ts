/**
 * Tests for LCIA Methods data type definitions
 * Path: src/services/lciaMethods/data.ts
 */

import type { LCIAResultTable } from '@/services/lciaMethods/data';
import { createMockTableResponse } from '../../../helpers/testData';

describe('LCIA Methods Data Types (src/services/lciaMethods/data.ts)', () => {
  describe('LCIAResultTable type', () => {
    it('should have correct structure for LCIA results', () => {
      const mockResult: LCIAResultTable = {
        key: 'result-123',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'method-456',
          '@type': 'LCIA method data set',
          '@uri': '../lciamethods/method-456.xml',
          '@version': '01.00.000',
          'common:shortDescription': [
            {
              '@xml:lang': 'en',
              '#text': 'Climate change',
            },
          ],
        },
        meanAmount: 123.45,
      };

      expect(mockResult.key).toBe('result-123');
      expect(mockResult.meanAmount).toBe(123.45);
      expect(mockResult.referenceToLCIAMethodDataSet['@refObjectId']).toBe('method-456');
    });

    it('should support short descriptions in different languages', () => {
      const mockResult: LCIAResultTable = {
        key: 'result-456',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'method-789',
          '@type': 'LCIA method data set',
          '@uri': '../lciamethods/method-789.xml',
          '@version': '02.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Acidification' }],
        },
        meanAmount: 0.0567,
      };

      expect(mockResult.referenceToLCIAMethodDataSet['common:shortDescription']).toHaveLength(1);
      expect(mockResult.referenceToLCIAMethodDataSet['common:shortDescription'][0]['#text']).toBe(
        'Acidification',
      );
    });

    it('should handle zero and negative mean amounts', () => {
      const zeroResult: LCIAResultTable = {
        key: 'zero',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'method-1',
          '@type': 'LCIA method data set',
          '@uri': '../lciamethods/method-1.xml',
          '@version': '01.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Test' }],
        },
        meanAmount: 0,
      };

      const negativeResult: LCIAResultTable = {
        key: 'negative',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'method-2',
          '@type': 'LCIA method data set',
          '@uri': '../lciamethods/method-2.xml',
          '@version': '01.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Test' }],
        },
        meanAmount: -10.5,
      };

      expect(zeroResult.meanAmount).toBe(0);
      expect(negativeResult.meanAmount).toBe(-10.5);
    });

    it('should integrate with shared table response helper', () => {
      const row: LCIAResultTable = {
        key: 'summary',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'method-aggregate',
          '@type': 'LCIA method data set',
          '@uri': '../lciamethods/method-aggregate.xml',
          '@version': '03.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Aggregate impact' }],
        },
        meanAmount: 12.34,
      };

      const response = createMockTableResponse<LCIAResultTable>([row], 1);

      expect(response.success).toBe(true);
      expect(response.data[0].key).toBe('summary');
    });

    it('should match structure used in LCIA results display', () => {
      // Simulating real usage in life cycle assessment results
      const results: LCIAResultTable[] = [
        {
          key: '1',
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'gwp-method',
            '@type': 'LCIA method data set',
            '@uri': '../lciamethods/gwp-method.xml',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'GWP 100a' }],
          },
          meanAmount: 50.2,
        },
        {
          key: '2',
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'ap-method',
            '@type': 'LCIA method data set',
            '@uri': '../lciamethods/ap-method.xml',
            '@version': '01.00.000',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Acidification Potential' }],
          },
          meanAmount: 0.123,
        },
      ];

      expect(results).toHaveLength(2);
      expect(results[0].meanAmount).toBeGreaterThan(results[1].meanAmount);
    });
  });
});
