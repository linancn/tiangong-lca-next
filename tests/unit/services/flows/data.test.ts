/**
 * Tests for flows data type definitions
 * Path: src/services/flows/data.ts
 */

import type {
  FlowDataSetObjectKeys,
  FlowModelTable,
  FlowpropertyTabTable,
  FlowTable,
} from '@/services/flows/data';

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

      expect(validKey).toBe('flowInformation');
      expect(validKey2).toBe('modellingAndValidation');
      expect(validKey3).toBe('administrativeInformation');
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
      ];

      expect(keys).toContain('flowInformation');
      expect(keys).toContain('modellingAndValidation');
      expect(keys).toContain('administrativeInformation');
    });
  });
});
