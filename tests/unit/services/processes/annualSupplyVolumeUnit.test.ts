import { getAnnualSupplyVolumeUnitRows } from '@/services/processes/annualSupplyVolumeUnit';
jest.mock('@/services/flows/api', () => ({ getFlowDetail: jest.fn() }));
jest.mock('@/services/flowproperties/api', () => ({ getFlowpropertyDetail: jest.fn() }));
jest.mock('@/services/unitgroups/api', () => ({ getUnitGroupDetail: jest.fn() }));

import { getFlowDetail } from '@/services/flows/api';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { getUnitGroupDetail } from '@/services/unitgroups/api';

describe('exact annual supply unit lookup', () => {
  const detailMetadata = {
    modifiedAt: '2026-10-14T00:00:00Z',
    stateCode: 100,
    ruleVerification: true,
    userId: 'test-user',
  };
  const exchange = {
    referenceToFlowDataSet: { '@refObjectId': 'flow', '@version': '01.00.000' },
    quantitativeReference: true,
  };
  beforeEach(() => jest.resetAllMocks());
  const mockChain = () => {
    jest.mocked(getFlowDetail).mockResolvedValue({
      success: true,
      data: {
        ...detailMetadata,
        id: 'flow',
        version: '01.00.000',
        json: {
          flowDataSet: {
            flowInformation: { quantitativeReference: { referenceToReferenceFlowProperty: '0' } },
            flowProperties: {
              flowProperty: {
                '@dataSetInternalID': '0',
                referenceToFlowPropertyDataSet: {
                  '@refObjectId': 'property',
                  '@version': '02.00.000',
                },
              },
            },
          },
        },
      },
    });
    jest.mocked(getFlowpropertyDetail).mockResolvedValue({
      success: true,
      data: {
        ...detailMetadata,
        id: 'property',
        version: '02.00.000',
        json: {
          flowPropertyDataSet: {
            flowPropertiesInformation: {
              quantitativeReference: {
                referenceToReferenceUnitGroup: { '@refObjectId': 'group', '@version': '03.00.000' },
              },
            },
          },
        },
      },
    });
    jest.mocked(getUnitGroupDetail).mockResolvedValue({
      success: true,
      data: {
        ...detailMetadata,
        id: 'group',
        version: '03.00.000',
        json: {
          unitGroupDataSet: {
            unitGroupInformation: { quantitativeReference: { referenceToReferenceUnit: '0' } },
            units: { unit: { '@dataSetInternalID': '0', name: 'kg' } },
          },
        },
      },
    });
  };
  it('reads each exact referenced version and selects its quantitative unit', async () => {
    mockChain();
    expect(await getAnnualSupplyVolumeUnitRows([exchange])).toEqual([
      {
        referenceToFlowDataSetId: 'flow',
        referenceToFlowDataSetVersion: '01.00.000',
        refUnitRes: { refUnitName: 'kg' },
      },
    ]);
    expect(getFlowDetail).toHaveBeenCalledWith('flow', '01.00.000');
    expect(getFlowpropertyDetail).toHaveBeenCalledWith('property', '02.00.000');
    expect(getUnitGroupDetail).toHaveBeenCalledWith('group', '03.00.000');
  });
  it.each(['flow', 'property', 'group'])('rejects a wrong %s version', async (level) => {
    mockChain();
    const mock =
      level === 'flow'
        ? getFlowDetail
        : level === 'property'
          ? getFlowpropertyDetail
          : getUnitGroupDetail;
    jest.mocked(mock).mockResolvedValueOnce({
      success: true,
      data: { ...detailMetadata, id: level, version: '99.00.000', json: {} },
    });
    expect(await getAnnualSupplyVolumeUnitRows([exchange])).toEqual([
      {
        referenceToFlowDataSetId: 'flow',
        referenceToFlowDataSetVersion: '01.00.000',
      },
    ]);
  });
  it.each(['flow', 'property', 'group'])('rejects a mismatched %s identity', async (level) => {
    mockChain();
    const mock =
      level === 'flow'
        ? getFlowDetail
        : level === 'property'
          ? getFlowpropertyDetail
          : getUnitGroupDetail;
    const version =
      level === 'flow' ? '01.00.000' : level === 'property' ? '02.00.000' : '03.00.000';
    jest.mocked(mock).mockResolvedValueOnce({
      success: true,
      data: { ...detailMetadata, id: 'different', version, json: {} },
    });
    expect(await getAnnualSupplyVolumeUnitRows([exchange])).toEqual([
      {
        referenceToFlowDataSetId: 'flow',
        referenceToFlowDataSetVersion: '01.00.000',
      },
    ]);
  });
  it('does not guess a missing reference-property version', async () => {
    mockChain();
    jest.mocked(getFlowDetail).mockResolvedValueOnce({
      success: true,
      data: {
        ...detailMetadata,
        id: 'flow',
        version: '01.00.000',
        json: {
          flowDataSet: {
            flowInformation: { quantitativeReference: { referenceToReferenceFlowProperty: '0' } },
            flowProperties: {
              flowProperty: {
                '@dataSetInternalID': '0',
                referenceToFlowPropertyDataSet: { '@refObjectId': 'property' },
              },
            },
          },
        },
      },
    });
    expect(await getAnnualSupplyVolumeUnitRows([exchange])).toEqual([
      {
        referenceToFlowDataSetId: 'flow',
        referenceToFlowDataSetVersion: '01.00.000',
      },
    ]);
    expect(getFlowpropertyDetail).not.toHaveBeenCalled();
  });
  it('retains unresolved rows on an exact read failure', async () => {
    mockChain();
    jest.mocked(getFlowDetail).mockRejectedValueOnce(new Error('read failed'));
    expect(await getAnnualSupplyVolumeUnitRows([exchange])).toEqual([
      {
        referenceToFlowDataSetId: 'flow',
        referenceToFlowDataSetVersion: '01.00.000',
      },
    ]);
    expect(getFlowpropertyDetail).not.toHaveBeenCalled();
  });
  it('does not query an unversioned flow or an unrelated exchange', async () => {
    expect(
      await getAnnualSupplyVolumeUnitRows([
        { quantitativeReference: true, referenceToFlowDataSet: { '@refObjectId': 'flow' } },
        { ...exchange, quantitativeReference: false },
      ]),
    ).toEqual([{ referenceToFlowDataSetId: 'flow', referenceToFlowDataSetVersion: '' }]);
    expect(getFlowDetail).not.toHaveBeenCalled();
  });
});
