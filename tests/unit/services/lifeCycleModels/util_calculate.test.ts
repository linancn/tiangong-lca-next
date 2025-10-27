/**
 * Tests for genLifeCycleModelProcesses
 * Path: src/services/lifeCycleModels/util_calculate.ts
 */

import { genLifeCycleModelProcesses } from '@/services/lifeCycleModels/util_calculate';

jest.mock('@/services/supabase', () => {
  const mockOr = jest.fn();
  const mockSelect = jest.fn(() => ({ or: mockOr }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    supabase: {
      from: mockFrom,
    },
    __mock: {
      mockOr,
      mockSelect,
      mockFrom,
    },
  };
});

const {
  __mock: { mockOr, mockSelect, mockFrom },
} = jest.requireMock('@/services/supabase') as {
  __mock: {
    mockOr: jest.Mock;
    mockSelect: jest.Mock;
    mockFrom: jest.Mock;
  };
};

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockLCIAResultCalculation = jest.requireMock('@/services/lciaMethods/util')
  .default as jest.Mock;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createLifeCycleModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [
            { '@xml:lang': 'en', '#text': 'Reference Process' },
            { '@xml:lang': 'zh', '#text': '参考过程' },
          ],
        },
      },
      technology: {
        processes: {
          processInstance: [
            {
              '@dataSetInternalID': 'nodeA',
              referenceToProcess: {
                '@refObjectId': 'procA',
                '@version': '1',
              },
              connections: {
                outputExchange: [
                  {
                    '@flowUUID': 'flow-A-final',
                    downstreamProcess: [],
                  },
                ],
              },
            },
            {
              '@dataSetInternalID': 'nodeB',
              referenceToProcess: {
                '@refObjectId': 'procB',
                '@version': '1',
              },
              connections: {
                outputExchange: [
                  {
                    '@flowUUID': 'flow-B-to-A',
                    downstreamProcess: {
                      '@id': 'nodeA',
                    },
                  },
                  {
                    '@flowUUID': 'flow-B-to-C',
                    downstreamProcess: {
                      '@id': 'nodeC',
                    },
                  },
                ],
              },
            },
            {
              '@dataSetInternalID': 'nodeC',
              referenceToProcess: {
                '@refObjectId': 'procC',
                '@version': '1',
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-C-final',
                  downstreamProcess: [],
                },
              },
            },
          ],
        },
      },
    },
  },
});

const createSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-A',
        },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exA_out',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-final',
          'common:shortDescription': [
            { '@xml:lang': 'en', '#text': 'A final' },
            { '@xml:lang': 'zh', '#text': 'A终' },
          ],
        },
        meanAmount: '5',
        resultingAmount: '5',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exA_out',
    },
  },
  {
    id: 'procB',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exB_out_toA',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-A',
        },
        meanAmount: '3',
        resultingAmount: '3',
        allocations: {
          allocation: {
            '@allocatedFraction': '60%',
          },
        },
      },
      {
        '@dataSetInternalID': 'exB_out_toC',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-C',
        },
        meanAmount: '4',
        resultingAmount: '4',
        allocations: {
          allocation: {
            '@allocatedFraction': '40%',
          },
        },
      },
      {
        '@dataSetInternalID': 'exB_in',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-raw',
        },
        meanAmount: '7',
        resultingAmount: '7',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_out_toA',
    },
  },
  {
    id: 'procC',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exC_in',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-C',
        },
        meanAmount: '1',
        resultingAmount: '1',
      },
      {
        '@dataSetInternalID': 'exC_out',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-C-final',
          'common:shortDescription': [
            { '@xml:lang': 'en', '#text': 'C Product' },
            { '@xml:lang': 'zh', '#text': 'C产品' },
          ],
        },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exC_out',
    },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockSelect.mockImplementation(() => ({ or: mockOr }));
  mockFrom.mockImplementation(() => ({ select: mockSelect }));
});

describe('genLifeCycleModelProcesses', () => {
  it('throws when reference process is missing', async () => {
    await expect(genLifeCycleModelProcesses('model-1', null, {}, [])).rejects.toThrow(
      'No referenceToReferenceProcess found in lifeCycleModelInformation',
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws when reference process cannot be found in database', async () => {
    const data = createLifeCycleModelData();
    mockOr.mockResolvedValue({ data: [] });

    await expect(genLifeCycleModelProcesses('model-2', null, data, [])).rejects.toThrow(
      'Reference process not found in database',
    );

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('json->processDataSet->processInformation->quantitativeReference'),
    );
  });

  it('generates primary and secondary process payloads and reuses existing secondary id', async () => {
    const data = createLifeCycleModelData();
    mockOr.mockResolvedValue({ data: clone(createSupabaseProcesses()) });

    mockLCIAResultCalculation
      .mockResolvedValueOnce([{ '@id': 'LCIA_PRIMARY' }])
      .mockResolvedValueOnce([{ '@id': 'LCIA_SECONDARY' }]);

    const oldSubmodels = [
      {
        id: 'existing-secondary',
        type: 'secondary',
        finalId: {
          nodeId: 'nodeC',
          processId: 'procC',
          allocatedExchangeFlowId: 'flow-C-final',
          allocatedExchangeDirection: 'OUTPUT',
        },
      },
    ];

    const modelGraph = {
      nodes: [
        {
          data: {
            quantitativeReference: '1',
            targetAmount: 10,
          },
        },
      ],
    };

    const { lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-123',
      modelGraph.nodes,
      data,
      oldSubmodels,
    );

    expect(lifeCycleModelProcesses).toHaveLength(2);

    const primary = lifeCycleModelProcesses.find((item) => item?.modelInfo?.type === 'primary');
    const secondary = lifeCycleModelProcesses.find((item) => item?.modelInfo?.type === 'secondary');

    expect(primary).toBeDefined();
    expect(primary?.option).toBe('update');
    expect(primary?.modelInfo?.id).toBe('model-123');

    const primaryRefExchange = primary?.data?.processDataSet?.exchanges?.exchange?.find(
      (exchange: any) => exchange?.quantitativeReference,
    );
    expect(primaryRefExchange?.meanAmount).toBe(10);

    expect(secondary).toBeDefined();
    expect(secondary?.option).toBe('update');
    expect(secondary?.modelInfo?.id).toBe('existing-secondary');
    expect(secondary?.modelInfo?.finalId?.allocatedExchangeFlowId).toBe('flow-C-final');

    expect(mockLCIAResultCalculation).toHaveBeenCalledTimes(2);
    expect(mockLCIAResultCalculation).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({ quantitativeReference: true, meanAmount: 10 }),
      ]),
    );
    expect(mockLCIAResultCalculation).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          referenceToFlowDataSet: expect.objectContaining({ '@refObjectId': 'flow-C-final' }),
        }),
      ]),
    );
  });
});
