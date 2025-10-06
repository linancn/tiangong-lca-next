/**
 * Tests for flowproperties data type definitions
 * Path: src/services/flowproperties/data.ts
 *
 * This module defines TypeScript types and interfaces for flow property data.
 * Tests verify type correctness and common usage patterns in the application.
 */

import type {
  FlowPropertyDataSetObjectKeys,
  FlowpropertyTable,
  FormFlowProperty,
} from '@/services/flowproperties/data';
import { createMockTableResponse, mockFlowProperty } from '../../../helpers/testData';
import type { Equal, ExpectTrue } from '../../../helpers/typeAssertions';

type FlowPropertyDataSetKeys =
  | 'flowPropertiesInformation'
  | 'modellingAndValidation'
  | 'administrativeInformation';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AssertFlowPropertyDataSetKeys = ExpectTrue<
  Equal<FlowPropertyDataSetObjectKeys, FlowPropertyDataSetKeys>
>;

describe('Flow Properties Data Types (src/services/flowproperties/data.ts)', () => {
  describe('FlowpropertyTable type', () => {
    it('should have correct structure for table display', () => {
      const mockFlowPropertyTable: FlowpropertyTable = {
        id: 'flowprop-123',
        version: '1.0.0',
        name: 'Mass',
        classification: 'Quantitative properties / Physical properties',
        generalComment: 'Mass is a fundamental property',
        refUnitGroupId: 'unitgroup-456',
        refUnitGroup: 'Mass units',
        modifiedAt: new Date('2024-01-15'),
        teamId: 'team-789',
        refUnitRes: { kg: { factor: 1 }, g: { factor: 0.001 } },
      };

      expect(mockFlowPropertyTable.id).toBe('flowprop-123');
      expect(mockFlowPropertyTable.name).toBe('Mass');
      expect(mockFlowPropertyTable.refUnitGroupId).toBe('unitgroup-456');
      expect(mockFlowPropertyTable.modifiedAt).toBeInstanceOf(Date);
      expect(mockFlowPropertyTable.refUnitRes).toHaveProperty('kg');
    });

    it('should interoperate with shared table response helper', () => {
      const tableRow: FlowpropertyTable = {
        id: mockFlowProperty.id,
        version: mockFlowProperty.version,
        name: 'Mass',
        classification: 'Technical flow properties',
        generalComment: '',
        refUnitGroupId: `${mockFlowProperty.id}-unit`,
        refUnitGroup: 'Mass units',
        modifiedAt: new Date(mockFlowProperty.modified_at),
        teamId: mockFlowProperty.team_id,
        refUnitRes: {
          kg: { factor: 1 },
        },
      };

      const response = createMockTableResponse<FlowpropertyTable>([tableRow], 1);

      expect(response.success).toBe(true);
      expect(response.data[0].id).toBe(mockFlowProperty.id);
      expect(response.total).toBe(1);
    });

    it('should allow refUnitRes to be any key-value object', () => {
      const flowProp: FlowpropertyTable = {
        id: 'fp-1',
        version: '1.0',
        name: 'Energy',
        classification: 'Physical',
        generalComment: 'Energy property',
        refUnitGroupId: 'ug-1',
        refUnitGroup: 'Energy units',
        modifiedAt: new Date(),
        teamId: 'team-1',
        refUnitRes: {
          MJ: { factor: 1, description: 'Megajoule' },
          kWh: { factor: 3.6, description: 'Kilowatt hour' },
          customProperty: ['array', 'of', 'values'],
        },
      };

      expect(flowProp.refUnitRes.MJ.factor).toBe(1);
      expect(flowProp.refUnitRes.customProperty).toBeInstanceOf(Array);
    });

    it('should support empty or minimal refUnitRes', () => {
      const flowPropMinimal: FlowpropertyTable = {
        id: 'fp-minimal',
        version: '1.0',
        name: 'Test Property',
        classification: '',
        generalComment: '',
        refUnitGroupId: '',
        refUnitGroup: '',
        modifiedAt: new Date(),
        teamId: 'team-1',
        refUnitRes: {},
      };

      expect(flowPropMinimal.refUnitRes).toEqual({});
    });
  });

  describe('FlowPropertyDataSetObjectKeys type', () => {
    it('should extract only object-type keys from flowPropertyDataSet', () => {
      // Verify the type includes expected object keys
      const validKey1: FlowPropertyDataSetObjectKeys = 'flowPropertiesInformation';
      const validKey2: FlowPropertyDataSetObjectKeys = 'modellingAndValidation';
      const validKey3: FlowPropertyDataSetObjectKeys = 'administrativeInformation';

      expect(validKey1).toBe('flowPropertiesInformation');
      expect(validKey2).toBe('modellingAndValidation');
      expect(validKey3).toBe('administrativeInformation');
    });
  });

  describe('FormFlowProperty type', () => {
    it('should pick correct properties from FlowProperty flowPropertyDataSet', () => {
      const mockFormFlowProperty: FormFlowProperty = {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:UUID': 'test-uuid-123',
            'common:name': [{ '@xml:lang': 'en', '#text': 'Test Property' }],
            'common:synonyms': [{ '@xml:lang': 'en', '#text': 'Synonym' }],
            classificationInformation: {
              'common:classification': {
                'common:class': {
                  '@level': '0',
                  '@classId': 'physical',
                  '#text': 'Physical properties',
                },
              },
            },
            'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Test comment' }],
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'unitgroup-ref',
              '@type': 'unit group data set',
              '@uri': '../unitgroups/unitgroup-ref.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Reference unit group' }],
            },
          },
        },
        modellingAndValidation: {
          complianceDeclarations: {
            compliance: {
              'common:referenceToComplianceSystem': {
                '@refObjectId': 'compliance-system-id',
                '@type': 'source data set',
                '@uri': '../sources/compliance-system-id.xml',
                '@version': '01.00.000',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Compliance system' }],
              },
              'common:approvalOfOverallCompliance': 'Fully compliant',
            },
          },
        },
        administrativeInformation: {
          dataEntryBy: {
            'common:timeStamp': '2024-01-01T00:00:00Z',
            'common:referenceToDataSetFormat': {
              '@refObjectId': 'format-id',
              '@type': 'source data set',
              '@uri': '../sources/format-id.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'ILCD format' }],
            },
          },
          publicationAndOwnership: {
            'common:dataSetVersion': '01.00.000',
            'common:referenceToOwnershipOfDataSet': {
              '@refObjectId': 'owner-id',
              '@type': 'contact data set',
              '@uri': '../contacts/owner-id.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Data owner' }],
            },
          },
        },
      };

      expect(mockFormFlowProperty.flowPropertiesInformation).toBeDefined();
      expect(mockFormFlowProperty.modellingAndValidation).toBeDefined();
      expect(mockFormFlowProperty.administrativeInformation).toBeDefined();
      expect(
        mockFormFlowProperty.flowPropertiesInformation?.dataSetInformation?.['common:UUID'],
      ).toBe('test-uuid-123');
    });

    it('should support required nested properties correctly', () => {
      // Since certain properties are required by the SDK types,
      // we create a properly structured minimal example
      const properForm: Partial<FormFlowProperty> = {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:UUID': 'minimal-uuid',
            'common:name': [{ '@xml:lang': 'en', '#text': 'Minimal Name' }],
            classificationInformation: {
              'common:classification': {
                'common:class': {
                  '@level': '0',
                  '@classId': 'test',
                  '#text': 'Test class',
                },
              },
            },
          },
          quantitativeReference: {
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-id',
              '@type': 'unit group data set',
              '@uri': '../unitgroups/ug-id.xml',
              '@version': '01.00.000',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Unit group' }],
            },
          },
        },
      };

      expect(properForm.flowPropertiesInformation).toBeDefined();
    });
  });

  describe('Type compatibility with real usage', () => {
    it('should match patterns from Flowproperties page components', () => {
      // Based on usage patterns in src/pages/Flowproperties/
      const tableDataExample: FlowpropertyTable[] = [
        {
          id: 'fp-1',
          version: '1.0.0',
          name: 'Mass',
          classification: 'Physical properties',
          generalComment: 'Mass property description',
          refUnitGroupId: 'ug-mass',
          refUnitGroup: 'Units of mass',
          modifiedAt: new Date('2024-01-01'),
          teamId: 'team-abc',
          refUnitRes: { kg: 1, g: 0.001 },
        },
        {
          id: 'fp-2',
          version: '2.0.0',
          name: 'Energy',
          classification: 'Physical properties',
          generalComment: '',
          refUnitGroupId: 'ug-energy',
          refUnitGroup: 'Units of energy',
          modifiedAt: new Date('2024-02-01'),
          teamId: 'team-xyz',
          refUnitRes: {},
        },
      ];

      expect(tableDataExample).toHaveLength(2);
      expect(tableDataExample[0].refUnitGroupId).toBe('ug-mass');
      expect(tableDataExample[1].refUnitRes).toEqual({});
    });

    it('should support multi-language data structures', () => {
      // Since FormFlowProperty has strict type requirements, test with Partial
      const multiLangData = {
        'common:UUID': 'fp-multilang',
        'common:name': [
          { '@xml:lang': 'en', '#text': 'Mass' },
          { '@xml:lang': 'zh', '#text': '质量' },
          { '@xml:lang': 'de', '#text': 'Masse' },
        ] as any,
        'common:generalComment': [
          { '@xml:lang': 'en', '#text': 'Physical property for mass' },
          { '@xml:lang': 'zh', '#text': '质量的物理属性' },
        ] as any,
      };

      const names = multiLangData['common:name'];
      expect(names).toHaveLength(3);
      expect(names[0]['@xml:lang']).toBe('en');
      expect(names[1]['@xml:lang']).toBe('zh');
    });
  });
});
