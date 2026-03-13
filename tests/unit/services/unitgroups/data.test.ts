import type {
  FlowPropertyUnitGroupData,
  UnitGroupDetailResponse,
  UnitGroupRefFormValue,
  UnitGroupTable,
  UnitReferenceData,
  UnitTable,
} from '@/services/unitgroups/data';

describe('unitgroups data shapes', () => {
  it('supports unit group table rows and unit table rows', () => {
    const group: UnitGroupTable = {
      id: 'ug-1',
      lang: 'en',
      name: 'Mass units',
      classification: 'Physical quantity',
      refUnitId: 'unit-kg',
      refUnitName: 'kg',
      refUnitGeneralComment: 'Reference unit',
      version: '01.00.000',
      modifiedAt: new Date('2026-03-13T00:00:00Z'),
      teamId: 'team-1',
    };
    const unit: UnitTable = {
      id: 'unit-kg',
      dataSetInternalID: '1',
      name: 'kg',
      meanValue: '1',
      generalComment: [{ '@xml:lang': 'en', '#text': 'Kilogram' }],
      quantitativeReference: true,
    };

    expect(group.refUnitName).toBe('kg');
    expect(unit.quantitativeReference).toBe(true);
  });

  it('supports unit reference payloads and detail responses', () => {
    const refData: UnitReferenceData = {
      id: 'ug-2',
      version: '02.00.000',
      name: [{ '@xml:lang': 'en', '#text': 'Energy units' }],
      refUnitId: 'unit-mj',
      refUnitName: 'MJ',
      refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'Megajoule' }],
      unit: [
        { '@dataSetInternalID': '1', name: 'MJ', meanValue: '1', quantitativeReference: true },
      ],
    };
    const refForm: UnitGroupRefFormValue = {
      '@refObjectId': 'ug-2',
      '@type': 'unit group data set',
      '@uri': '../unitgroups/ug-2.xml',
      '@version': '02.00.000',
      'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Energy units' }],
      refUnit: { name: 'MJ' },
    };
    const flowPropUnitGroup: FlowPropertyUnitGroupData = {
      id: 'fp-1',
      version: '01.00.000',
      refUnitGroupId: 'ug-2',
      refUnitGroupShortDescription: [{ '@xml:lang': 'en', '#text': 'Energy units' }],
    };
    const response: UnitGroupDetailResponse = {
      success: true,
      data: {
        id: 'ug-2',
        version: '02.00.000',
        modifiedAt: '2026-03-13T00:00:00Z',
        stateCode: 20,
        ruleVerification: true,
        userId: 'user-1',
      },
    };

    expect(refData.unit?.[0].name).toBe('MJ');
    expect(refForm.refUnit?.name).toBe('MJ');
    expect(flowPropUnitGroup.refUnitGroupId).toBe('ug-2');
    expect(response.data?.ruleVerification).toBe(true);
  });
});
