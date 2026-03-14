/**
 * Targeted allocation-path tests for genLifeCycleModelProcesses
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

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/services/lifeCycleModels/util_allocate_supply_demand', () => ({
  __esModule: true,
  allocateSupplyToDemand: jest.fn(),
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-secondary-id'),
}));

const {
  __mock: { mockOr, mockSelect, mockFrom },
} = jest.requireMock('@/services/supabase') as {
  __mock: {
    mockOr: jest.Mock;
    mockSelect: jest.Mock;
    mockFrom: jest.Mock;
  };
};

const mockLCIAResultCalculation = jest.requireMock('@/services/lciaMethods/util')
  .default as jest.Mock;
const { allocateSupplyToDemand: mockAllocateSupplyToDemand } = jest.requireMock(
  '@/services/lifeCycleModels/util_allocate_supply_demand',
) as {
  allocateSupplyToDemand: jest.Mock;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createAllocationModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Allocation Model' }],
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
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process A' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-A-to-B',
                  downstreamProcess: {
                    '@id': 'nodeB',
                  },
                },
              },
            },
            {
              '@dataSetInternalID': 'nodeB',
              referenceToProcess: {
                '@refObjectId': 'procB',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process B' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-B-final',
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

const createAllocationSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in_raw',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-raw',
        },
        meanAmount: '5',
        resultingAmount: '5',
      },
      {
        '@dataSetInternalID': 'exA_out_B',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-to-B',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'A to B' }],
        },
        meanAmount: '10',
        resultingAmount: '10',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exA_out_B',
    },
  },
  {
    id: 'procB',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exB_in_A',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-to-B',
        },
        meanAmount: '4',
        resultingAmount: '4',
      },
      {
        '@dataSetInternalID': 'exB_out_final',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-final',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'B final' }],
        },
        meanAmount: '4',
        resultingAmount: '4',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_out_final',
    },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockSelect.mockImplementation(() => ({ or: mockOr }));
  mockFrom.mockImplementation(() => ({ select: mockSelect }));
});

describe('genLifeCycleModelProcesses allocation-heavy paths', () => {
  it('marks connected edges as unbalanced and rescales primary exchanges and LCIA results when the reference output is partially remaining', async () => {
    mockOr.mockResolvedValue({ data: clone(createAllocationSupabaseProcesses()) });
    mockAllocateSupplyToDemand
      .mockReturnValueOnce({
        allocations: {
          'nodeA:flow-A-to-B': {
            'nodeB:flow-A-to-B': 2,
          },
        },
        remaining_supply: {
          'nodeA:flow-A-to-B': 2,
        },
        remaining_demand: {
          'nodeB:flow-A-to-B': 0,
        },
      })
      .mockReturnValueOnce({
        allocations: {},
        remaining_supply: {},
        remaining_demand: {},
      });
    mockLCIAResultCalculation.mockResolvedValue([
      {
        '@id': 'LCIA-1',
        meanAmount: '4',
      },
    ]);

    const modelNodes = [
      {
        id: 'graph-node-a',
        data: {
          index: 'nodeA',
          quantitativeReference: '1',
          targetAmount: 8,
        },
      },
      {
        id: 'graph-node-b',
        data: {
          index: 'nodeB',
        },
      },
    ];

    const { up2DownEdges, lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'allocation-model',
      modelNodes as any,
      createAllocationModelData(),
      [],
    );

    expect(mockAllocateSupplyToDemand).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      {},
      { prioritizeBalance: true },
    );

    expect(up2DownEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'nodeA->nodeB:flow-A-to-B',
          exchangeAmount: 2,
          isBalanced: false,
          unbalancedAmount: 2,
        }),
      ]),
    );

    const primary = lifeCycleModelProcesses.find(
      (process) => process?.modelInfo?.type === 'primary',
    );
    const refExchange = primary?.data?.processDataSet?.exchanges?.exchange?.find(
      (exchange: any) => exchange?.quantitativeReference === true,
    );

    expect(refExchange?.meanAmount).toBe('8');
    expect(refExchange?.resultingAmount).toBe('8');
    expect(primary?.data?.processDataSet?.LCIAResults?.LCIAResult).toEqual([
      expect.objectContaining({
        '@id': 'LCIA-1',
      }),
    ]);
    expect(
      Number(primary?.data?.processDataSet?.LCIAResults?.LCIAResult?.[0]?.meanAmount),
    ).toBeGreaterThan(4);
  });
});
