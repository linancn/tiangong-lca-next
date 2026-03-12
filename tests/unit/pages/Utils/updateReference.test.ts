// @ts-nocheck
import {
  getNewVersionShortDescription,
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';

const mockGetAllRefObj = jest.fn();
const mockGetRefTableName = jest.fn();
const mockGenFlowNameJson = jest.fn();
const mockGetDataDetail = jest.fn();
const mockGetDataDetailById = jest.fn();
const mockGetLangList = jest.fn((data) => (Array.isArray(data) ? data : data ? [data] : []));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getRefTableName: (...args: any[]) => mockGetRefTableName(...args),
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowNameJson: (...args: any[]) => mockGenFlowNameJson(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getDataDetail: (...args: any[]) => mockGetDataDetail(...args),
  getDataDetailById: (...args: any[]) => mockGetDataDetailById(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangList: (...args: any[]) => mockGetLangList(...args),
}));

describe('updateReference helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLangList.mockImplementation((data) => (Array.isArray(data) ? data : data ? [data] : []));
  });

  it('builds short descriptions for supported dataset types and falls back safely', () => {
    mockGenFlowNameJson.mockReturnValue([{ value: 'Flow Name' }]);

    expect(
      getNewVersionShortDescription(
        {
          flowDataSet: {
            flowInformation: {
              dataSetInformation: {
                name: { baseName: [{ '#text': 'Flow Name' }] },
              },
            },
          },
        },
        'flow data set',
      ),
    ).toEqual([{ value: 'Flow Name' }]);

    expect(
      getNewVersionShortDescription(
        {
          processDataSet: {
            processInformation: {
              dataSetInformation: {
                name: { baseName: ['Process Name'] },
              },
            },
          },
        },
        'process data set',
      ),
    ).toEqual(['Process Name']);

    expect(
      getNewVersionShortDescription(
        {
          contactDataSet: {
            contactInformation: {
              dataSetInformation: {
                'common:shortName': ['Contact Name'],
              },
            },
          },
        },
        'contact data set',
      ),
    ).toEqual(['Contact Name']);

    expect(
      getNewVersionShortDescription(
        {
          sourceDataSet: {
            sourceInformation: {
              dataSetInformation: {
                'common:shortName': ['Source Name'],
              },
            },
          },
        },
        'source data set',
      ),
    ).toEqual(['Source Name']);

    expect(
      getNewVersionShortDescription(
        {
          flowPropertyDataSet: {
            flowPropertyInformation: {
              dataSetInformation: {
                'common:shortName': ['Flow Property Name'],
              },
            },
          },
        },
        'flow property data set',
      ),
    ).toEqual(['Flow Property Name']);

    expect(
      getNewVersionShortDescription(
        {
          unitGroupDataSet: {
            unitGroupInformation: {
              dataSetInformation: {
                'common:shortName': ['Unit Group Name'],
              },
            },
          },
        },
        'unit group data set',
      ),
    ).toEqual(['Unit Group Name']);

    expect(
      getNewVersionShortDescription(
        {
          lciaMethodDataSet: {
            LCIAMethodInformation: {
              dataSetInformation: {
                'common:shortName': ['Method Name'],
              },
            },
          },
        },
        'LCIA method data set',
      ),
    ).toEqual(['Method Name']);

    expect(getNewVersionShortDescription({}, 'unknown data set')).toEqual([]);
    expect(getNewVersionShortDescription(undefined, 'flow data set')).toEqual([]);
  });

  it('falls back to an empty description when description parsing throws', () => {
    mockGenFlowNameJson.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = getNewVersionShortDescription(
      {
        flowDataSet: {
          flowInformation: {
            dataSetInformation: {
              name: { baseName: [{ '#text': 'Broken Flow' }] },
            },
          },
        },
      },
      'flow data set',
    );

    expect(result).toEqual([]);
    expect(mockGetLangList).toHaveBeenCalledWith([]);
  });

  it('collects current and newer reference versions while de-duplicating repeated refs', async () => {
    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'flow-1',
        '@version': '01.00.000',
        '@type': 'flow data set',
        'common:shortDescription': ['Current description'],
      },
      {
        '@refObjectId': 'flow-1',
        '@version': '01.00.000',
        '@type': 'flow data set',
        'common:shortDescription': ['Current description'],
      },
      {
        '@refObjectId': 'broken-1',
        '@version': '01.00.000',
        '@type': 'source data set',
        'common:shortDescription': ['Broken description'],
      },
      {
        '@refObjectId': 'skip-1',
        '@version': '01.00.000',
        '@type': 'unknown data set',
      },
    ]);
    mockGetRefTableName.mockImplementation((type) => {
      if (type === 'flow data set') return 'flows';
      if (type === 'source data set') return 'sources';
      return undefined;
    });
    mockGenFlowNameJson.mockImplementation((name) => [name?.baseName?.[0]?.['#text'] ?? '']);
    mockGetDataDetailById.mockImplementation(async (id) => {
      if (id === 'flow-1') {
        return {
          data: [
            {
              id: 'flow-1',
              version: '01.00.000',
              json: {
                flowDataSet: {
                  flowInformation: {
                    dataSetInformation: {
                      name: { baseName: [{ '#text': 'Current Flow' }] },
                    },
                  },
                },
              },
            },
            {
              id: 'flow-1',
              version: '02.00.000',
              json: {
                flowDataSet: {
                  flowInformation: {
                    dataSetInformation: {
                      name: { baseName: [{ '#text': 'Next Flow' }] },
                    },
                  },
                },
              },
            },
          ],
        };
      }
      throw new Error('ignore single ref error');
    });

    const result = await getRefsOfNewVersion({ any: 'value' });

    expect(mockGetDataDetailById).toHaveBeenCalledTimes(2);
    expect(result.oldRefs).toEqual([
      expect.objectContaining({
        id: 'flow-1',
        type: 'flow data set',
        currentVersion: '01.00.000',
        newVersion: '01.00.000',
        description: ['Current description'],
        newDescription: ['Current Flow'],
      }),
    ]);
    expect(result.newRefs).toEqual([
      expect.objectContaining({
        id: 'flow-1',
        type: 'flow data set',
        currentVersion: '01.00.000',
        newVersion: '02.00.000',
        description: ['Current description'],
        newDescription: ['Next Flow'],
      }),
    ]);
  });

  it('returns empty arrays when there is no initial data for new-version lookup', async () => {
    await expect(getRefsOfNewVersion(undefined)).resolves.toEqual({ newRefs: [], oldRefs: [] });
  });

  it('collects current-version reference details and ignores missing rows or lookup failures', async () => {
    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'process-1',
        '@version': '01.00.000',
        '@type': 'process data set',
        'common:shortDescription': ['Current process description'],
      },
      {
        '@refObjectId': 'process-1',
        '@version': '01.00.000',
        '@type': 'process data set',
        'common:shortDescription': ['Current process description'],
      },
      {
        '@refObjectId': 'missing-1',
        '@version': '01.00.000',
        '@type': 'source data set',
      },
    ]);
    mockGetRefTableName.mockImplementation((type) => {
      if (type === 'process data set') return 'processes';
      if (type === 'source data set') return 'sources';
      return undefined;
    });
    mockGetDataDetail.mockImplementation(async (id) => {
      if (id === 'process-1') {
        return {
          data: {
            json: {
              processDataSet: {
                processInformation: {
                  dataSetInformation: {
                    name: { baseName: ['Current Process'] },
                  },
                },
              },
            },
          },
        };
      }
      throw new Error('ignore single ref error');
    });

    const result = await getRefsOfCurrentVersion({ any: 'value' });

    expect(mockGetDataDetail).toHaveBeenCalledTimes(2);
    expect(result.oldRefs).toEqual([
      expect.objectContaining({
        id: 'process-1',
        type: 'process data set',
        currentVersion: '01.00.000',
        newVersion: '01.00.000',
        description: ['Current process description'],
        newDescription: ['Current Process'],
      }),
    ]);
  });

  it('returns an empty current-version payload when initial data is missing', async () => {
    await expect(getRefsOfCurrentVersion(undefined)).resolves.toEqual({ oldRefs: [] });
  });

  it('updates matching references recursively and safely handles cycles', () => {
    const sharedRef: any = {
      '@refObjectId': 'flow-1',
      '@version': '01.00.000',
      '@type': 'flow data set',
      'common:shortDescription': ['Old description'],
    };
    sharedRef.self = sharedRef;

    const untouchedRef = {
      '@refObjectId': 'process-1',
      '@version': '01.00.000',
      '@type': 'process data set',
      'common:shortDescription': ['Keep me'],
    };
    const data = {
      primary: sharedRef,
      nested: [sharedRef, untouchedRef],
    };

    const result = updateRefsData(
      data,
      [
        {
          id: 'flow-1',
          type: 'flow data set',
          newVersion: '02.00.000',
          newDescription: ['New description'],
        },
      ],
      true,
    );

    expect(result).toBe(data);
    expect(sharedRef['@version']).toBe('02.00.000');
    expect(sharedRef['common:shortDescription']).toEqual(['New description']);
    expect(untouchedRef['@version']).toBe('01.00.000');
    expect(untouchedRef['common:shortDescription']).toEqual(['Keep me']);
  });

  it('does not change version when updateVersion is false and ignores empty descriptions', () => {
    const data: any = {
      '@refObjectId': 'flow-1',
      '@version': '01.00.000',
      '@type': 'flow data set',
      'common:shortDescription': ['Old description'],
    };

    updateRefsData(
      data,
      [
        {
          id: 'flow-1',
          type: 'flow data set',
          newVersion: '02.00.000',
          newDescription: [],
        },
      ],
      false,
    );

    expect(data['@version']).toBe('01.00.000');
    expect(data['common:shortDescription']).toEqual(['Old description']);
    expect(updateRefsData(null, [], true)).toBeNull();
  });
});
