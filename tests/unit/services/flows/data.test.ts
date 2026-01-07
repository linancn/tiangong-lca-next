/**
 * Tests for flows data type definitions
 * Path: src/services/flows/data.ts
 */

import type {
  FlowDataSetObjectKeys,
  FlowModelTable,
  FlowpropertyTabTable,
  FlowTable,
  FormFlow,
} from '@/services/flows/data';
import { genFlowPropertyTabTableData } from '@/services/flows/util';
import { createMockTableResponse } from '../../../helpers/testData';
import type { Equal, ExpectTrue } from '../../../helpers/typeAssertions';

type FlowDataSetKeys =
  | 'flowInformation'
  | 'modellingAndValidation'
  | 'administrativeInformation'
  | 'flowProperties';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AssertFlowDataSetKeys = ExpectTrue<Equal<FlowDataSetObjectKeys, FlowDataSetKeys>>;

describe('Flows Data Types (src/services/flows/data.ts)', () => {
  describe('FlowTable type', () => {
    it('should have correct structure for table display', () => {
      const mockFlow: FlowTable = {
        id: 'flow-123',
        version: '1.0.0',
        name: 'Water',
        synonyms: 'H2O',
        classification: 'Elementary flows',
        flowType: 'Product flow',
        CASNumber: '7732-18-5',
        locationOfSupply: 'GLO',
        refFlowPropertyId: 'prop-456',
        modifiedAt: new Date('2024-01-01'),
        teamId: 'team-789',
      };

      expect(mockFlow.id).toBe('flow-123');
      expect(mockFlow.CASNumber).toBe('7732-18-5');
      expect(mockFlow.modifiedAt).toBeInstanceOf(Date);
    });

    it('should wrap flow rows with shared table response helper', () => {
      const flowRow: FlowTable = {
        id: 'flow-respond-1',
        version: '02.00.000',
        name: 'Electricity, medium voltage',
        synonyms: 'Electric power',
        classification: 'Product flows',
        flowType: 'Product flow',
        CASNumber: '-',
        locationOfSupply: 'CN',
        refFlowPropertyId: 'flowprop-123',
        modifiedAt: new Date('2024-03-15T12:00:00Z'),
        teamId: 'team-ct',
      };

      const response = createMockTableResponse<FlowTable>([flowRow], 1, 3);

      expect(response.success).toBe(true);
      expect(response.page).toBe(3);
      expect(response.data[0].name).toBe('Electricity, medium voltage');
    });
  });

  describe('FlowModelTable type', () => {
    it('should have correct structure for flow models', () => {
      const mockFlowModel: FlowModelTable = {
        id: 'model-123',
        name: 'Flow Model 1',
        description: 'Test flow model',
        modifiedAt: new Date('2024-01-01'),
      };

      expect(mockFlowModel.id).toBe('model-123');
      expect(mockFlowModel.modifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('FlowpropertyTabTable type', () => {
    it('should have correct structure for flow property tabs', () => {
      const mockFlowProp: FlowpropertyTabTable = {
        id: 'prop-123',
        version: '1.0',
        dataSetInternalID: 'internal-456',
        meanValue: '1.5',
        referenceToFlowPropertyDataSetId: 'flowprop-789',
        referenceToFlowPropertyDataSetVersion: '2.0',
        referenceToFlowPropertyDataSet: 'Mass',
        quantitativeReference: true,
        refUnitRes: { kg: 1, g: 0.001 },
      };

      expect(mockFlowProp.quantitativeReference).toBe(true);
      expect(mockFlowProp.refUnitRes).toBeDefined();
    });

    it('should allow optional refUnitRes', () => {
      const mockFlowProp: FlowpropertyTabTable = {
        id: 'prop-123',
        version: '1.0',
        dataSetInternalID: 'internal-456',
        meanValue: '1.0',
        referenceToFlowPropertyDataSetId: 'flowprop-789',
        referenceToFlowPropertyDataSetVersion: '2.0',
        referenceToFlowPropertyDataSet: 'Mass',
        quantitativeReference: false,
      };

      expect(mockFlowProp.refUnitRes).toBeUndefined();
    });
  });

  describe('FlowDataSetObjectKeys type', () => {
    it('should extract object keys from Flow flowDataSet', () => {
      const validKey: FlowDataSetObjectKeys = 'flowInformation';
      const validKey2: FlowDataSetObjectKeys = 'modellingAndValidation';
      const validKey3: FlowDataSetObjectKeys = 'administrativeInformation';
      const validKey4: FlowDataSetObjectKeys = 'flowProperties';

      expect(validKey).toBe('flowInformation');
      expect(validKey2).toBe('modellingAndValidation');
      expect(validKey3).toBe('administrativeInformation');
      expect(validKey4).toBe('flowProperties');
    });
  });

  describe('FormFlow type', () => {
    it('should support correct properties from Flow flowDataSet', () => {
      // Since FormFlow has strict type requirements from TIDAS SDK,
      // we verify that the type correctly picks object keys
      const keys: FlowDataSetObjectKeys[] = [
        'flowInformation',
        'modellingAndValidation',
        'administrativeInformation',
        'flowProperties',
      ];

      expect(keys).toContain('flowInformation');
      expect(keys).toContain('modellingAndValidation');
      expect(keys).toContain('administrativeInformation');
      expect(keys).toContain('flowProperties');
    });

    it('should accept flowProperties content for form editing scenarios', () => {
      const formFlow: Partial<FormFlow> = {
        flowInformation: {
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Electricity' }] as any,
              treatmentStandardsRoutes: [{ '@xml:lang': 'en', '#text': '-' }] as any,
              mixAndLocationTypes: [{ '@xml:lang': 'en', '#text': 'Grid' }] as any,
            },
          },
        } as any,
        flowProperties: {
          flowProperty: {
            '@dataSetInternalID': 1,
            referenceToFlowPropertyDataSet: {
              '@refObjectId': 'flowprop-123',
              '@type': 'flow property data set',
              '@uri': '../flowproperties/flowprop-123.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
            },
            meanValue: 1,
          },
        } as any,
      };

      expect(formFlow.flowProperties).toBeDefined();
      expect(formFlow.flowProperties?.flowProperty).toBeDefined();
    });
  });

  describe('Known issues', () => {
    it('should align FlowpropertyTabTable with generated tab data', () => {
      // genFlowPropertyTabTableData returns objects with fields that should match FlowpropertyTabTable type
      const sample = {
        flowProperty: {
          '@dataSetInternalID': '1',
          referenceToFlowPropertyDataSet: {
            '@refObjectId': 'flowprop-123',
            '@version': '01.00.000',
            '@type': 'flow property data set',
            '@uri': '../flowproperties/flowprop-123.xml',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Mass' }],
          },
          meanValue: '1.23',
          quantitativeReference: true,
          minimumValue: '1.0',
          maximumValue: '1.5',
          uncertaintyDistributionType: 'log-normal',
          relativeStandardDeviation95In: '0.1',
          dataDerivationTypeStatus: 'Measured',
          locationOfSupply: 'GLO',
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Test comment' }],
        },
      };

      const rows = genFlowPropertyTabTableData(sample.flowProperty, 'en');
      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toHaveLength(1);

      const row = rows[0];
      // Verify all fields that FlowpropertyTabTable type should have
      expect(row).toHaveProperty('key');
      expect(row).toHaveProperty('dataSetInternalID');
      expect(row).toHaveProperty('referenceToFlowPropertyDataSetId');
      expect(row).toHaveProperty('referenceToFlowPropertyDataSetVersion');
      expect(row).toHaveProperty('referenceToFlowPropertyDataSet');
      expect(row).toHaveProperty('meanValue');
      expect(row).toHaveProperty('quantitativeReference');
      expect(row).toHaveProperty('location');
      expect(row).toHaveProperty('minimumValue');
      expect(row).toHaveProperty('maximumValue');
      expect(row).toHaveProperty('uncertaintyDistributionType');
      expect(row).toHaveProperty('relativeStandardDeviation95In');
      expect(row).toHaveProperty('dataDerivationTypeStatus');
      expect(row).toHaveProperty('common:generalComment');

      // Verify values
      expect(row.key).toBe('1');
      expect(row.meanValue).toBe('1.23');
      expect(row.quantitativeReference).toBe(true);
      expect(row.location).toBe('GLO');
    });
  });
});
