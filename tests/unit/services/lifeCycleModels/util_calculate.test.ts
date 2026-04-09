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

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-secondary-id'),
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
                'common:shortDescription': [
                  { '@xml:lang': 'en', '#text': 'Process A' },
                  { '@xml:lang': 'zh', '#text': '过程A' },
                ],
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
                'common:shortDescription': [
                  { '@xml:lang': 'en', '#text': 'Process B' },
                  { '@xml:lang': 'zh', '#text': '过程B' },
                ],
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
                'common:shortDescription': [
                  { '@xml:lang': 'en', '#text': 'Process C' },
                  { '@xml:lang': 'zh', '#text': '过程C' },
                ],
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

const createSelectionFallbackModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Selection Model' }],
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
                  '@flowUUID': 'flow-A-final',
                  downstreamProcess: [],
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
                outputExchange: [
                  {
                    '@flowUUID': 'flow-B-to-A',
                    downstreamProcess: {
                      '@id': 'nodeA',
                    },
                  },
                  {
                    '@flowUUID': 'flow-B-extra',
                    downstreamProcess: [],
                  },
                ],
              },
            },
            {
              '@dataSetInternalID': 'nodeD',
              referenceToProcess: {
                '@refObjectId': 'procD',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process D' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-D-to-A',
                  downstreamProcess: {
                    '@id': 'nodeA',
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
});

const createSelectionFallbackSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-A',
        },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exA_in_D',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-D-to-A',
        },
        meanAmount: '3',
        resultingAmount: '3',
      },
      {
        '@dataSetInternalID': 'exA_out',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-final',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'A final' }],
        },
        meanAmount: '5',
        resultingAmount: '5',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exA_in_B',
    },
  },
  {
    id: 'procB',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exB_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-A',
        },
        meanAmount: '2',
        resultingAmount: '2',
        allocations: {
          allocation: {
            '@allocatedFraction': '40%',
          },
        },
      },
      {
        '@dataSetInternalID': 'exB_out_extra',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-extra',
        },
        meanAmount: '6',
        resultingAmount: '6',
        allocations: {
          allocation: {
            '@allocatedFraction': '60%',
          },
        },
      },
      {
        '@dataSetInternalID': 'exB_ref_other',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-ref-other',
        },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_ref_other',
    },
  },
  {
    id: 'procD',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exD_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-D-to-A',
        },
        meanAmount: '3',
        resultingAmount: '3',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exD_out_A',
    },
  },
];

const createCycleModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Cycle Model' }],
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
                outputExchange: [
                  {
                    '@flowUUID': 'flow-A-to-B',
                    downstreamProcess: {
                      '@id': 'nodeB',
                    },
                  },
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
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process B' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-B-to-A',
                  downstreamProcess: {
                    '@id': 'nodeA',
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
});

const createCycleSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-A',
        },
        meanAmount: '1',
        resultingAmount: '1',
      },
      {
        '@dataSetInternalID': 'exA_out_B',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-to-B',
        },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exA_out_final',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-final',
        },
        meanAmount: '5',
        resultingAmount: '5',
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
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exB_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-to-A',
        },
        meanAmount: '1',
        resultingAmount: '1',
      },
      {
        '@dataSetInternalID': 'exB_ref_other',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-B-final',
        },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_ref_other',
    },
  },
];

const createDownstreamPruneModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Downstream Prune Model' }],
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
                  '@flowUUID': 'flow-A-final',
                  downstreamProcess: [],
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
                outputExchange: [
                  {
                    '@flowUUID': 'flow-B-to-A',
                    downstreamProcess: { '@id': 'nodeA' },
                  },
                  {
                    '@flowUUID': 'flow-B-to-C',
                    downstreamProcess: { '@id': 'nodeC' },
                  },
                ],
              },
            },
            {
              '@dataSetInternalID': 'nodeC',
              referenceToProcess: {
                '@refObjectId': 'procC',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process C' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-C-to-A',
                  downstreamProcess: { '@id': 'nodeA' },
                },
              },
            },
          ],
        },
      },
    },
  },
});

const createDownstreamPruneSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exA_in_C',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-A' },
        meanAmount: '3',
        resultingAmount: '3',
      },
      {
        '@dataSetInternalID': 'exA_out',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-A-final' },
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
        '@dataSetInternalID': 'exB_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
        meanAmount: '2',
        resultingAmount: '2',
        allocations: { allocation: { '@allocatedFraction': '40%' } },
      },
      {
        '@dataSetInternalID': 'exB_out_C',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-C' },
        meanAmount: '3',
        resultingAmount: '3',
        allocations: { allocation: { '@allocatedFraction': '60%' } },
      },
      {
        '@dataSetInternalID': 'exB_ref_other',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-other' },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_ref_other',
    },
  },
  {
    id: 'procC',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exC_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-A' },
        meanAmount: '3',
        resultingAmount: '3',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exC_out_A',
    },
  },
];

const createUpstreamPruneModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Upstream Prune Model' }],
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
                  '@flowUUID': 'flow-A-final',
                  downstreamProcess: [],
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
                outputExchange: [
                  {
                    '@flowUUID': 'flow-B-to-A',
                    downstreamProcess: { '@id': 'nodeA' },
                  },
                  {
                    '@flowUUID': 'flow-B-to-D',
                    downstreamProcess: { '@id': 'nodeD' },
                  },
                ],
              },
            },
            {
              '@dataSetInternalID': 'nodeC',
              referenceToProcess: {
                '@refObjectId': 'procC',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process C' }],
              },
              connections: {
                outputExchange: [
                  {
                    '@flowUUID': 'flow-C-to-A',
                    downstreamProcess: { '@id': 'nodeA' },
                  },
                  {
                    '@flowUUID': 'flow-C-to-D',
                    downstreamProcess: { '@id': 'nodeD' },
                  },
                ],
              },
            },
            {
              '@dataSetInternalID': 'nodeD',
              referenceToProcess: {
                '@refObjectId': 'procD',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process D' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-D-final',
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

const createUpstreamPruneSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exA_in_C',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-A' },
        meanAmount: '3',
        resultingAmount: '3',
      },
      {
        '@dataSetInternalID': 'exA_out',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-final',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'A final' }],
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
        '@dataSetInternalID': 'exB_in_raw',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-shared-raw' },
        meanAmount: '10',
        resultingAmount: '10',
      },
      {
        '@dataSetInternalID': 'exB_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exB_out_D',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-D' },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_in_raw',
    },
  },
  {
    id: 'procC',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exC_in_raw',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-shared-raw' },
        meanAmount: '20',
        resultingAmount: '20',
      },
      {
        '@dataSetInternalID': 'exC_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-A' },
        meanAmount: '3',
        resultingAmount: '3',
      },
      {
        '@dataSetInternalID': 'exC_out_D',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-D' },
        meanAmount: '1.5',
        resultingAmount: '1.5',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exC_in_raw',
    },
  },
  {
    id: 'procD',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exD_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-D' },
        meanAmount: '1',
        resultingAmount: '1',
        allocations: { allocation: { '@allocatedFraction': '40%' } },
      },
      {
        '@dataSetInternalID': 'exD_in_C',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-D' },
        meanAmount: '1.5',
        resultingAmount: '1.5',
        allocations: { allocation: { '@allocatedFraction': '60%' } },
      },
      {
        '@dataSetInternalID': 'exD_out',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-D-final' },
        meanAmount: '2.5',
        resultingAmount: '2.5',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'missing-input-ref',
    },
  },
];

const createUpstreamCycleModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Upstream Cycle Model' }],
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
                  downstreamProcess: { '@id': 'nodeB' },
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
                  '@flowUUID': 'flow-B-to-C',
                  downstreamProcess: { '@id': 'nodeC' },
                },
              },
            },
            {
              '@dataSetInternalID': 'nodeC',
              referenceToProcess: {
                '@refObjectId': 'procC',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process C' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-C-to-B',
                  downstreamProcess: { '@id': 'nodeB' },
                },
              },
            },
          ],
        },
      },
    },
  },
});

const createUpstreamCycleSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_out_B',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-A-to-B' },
        meanAmount: '5',
        resultingAmount: '5',
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
        referenceToFlowDataSet: { '@refObjectId': 'flow-A-to-B' },
        meanAmount: '5',
        resultingAmount: '5',
      },
      {
        '@dataSetInternalID': 'exB_out_C',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-C' },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_out_C',
    },
  },
  {
    id: 'procC',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exC_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-C' },
        meanAmount: '1',
        resultingAmount: '1',
      },
      {
        '@dataSetInternalID': 'exC_out_B',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-B' },
        meanAmount: '1',
        resultingAmount: '1',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exC_in_B',
    },
  },
];

const createInputReferenceModelData = () => ({
  lifeCycleModelDataSet: {
    lifeCycleModelInformation: {
      quantitativeReference: {
        referenceToReferenceProcess: 'nodeA',
      },
      dataSetInformation: {
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Input Reference Model' }],
        },
      },
      geography: {
        locationOfOperationSupplyOrProduction: {
          '@location': 'NULL',
        },
        subLocationOfOperationSupplyOrProduction: {
          '@subLocation': 'NULL',
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
                  '@flowUUID': 'flow-A-final',
                  downstreamProcess: [],
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
                  '@flowUUID': 'flow-B-to-A',
                  downstreamProcess: { '@id': 'nodeA' },
                },
              },
            },
            {
              '@dataSetInternalID': 'nodeC',
              referenceToProcess: {
                '@refObjectId': 'procC',
                '@version': '1',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process C' }],
              },
              connections: {
                outputExchange: {
                  '@flowUUID': 'flow-C-to-A',
                  downstreamProcess: { '@id': 'nodeA' },
                },
              },
            },
          ],
        },
      },
    },
  },
});

const createInputReferenceSupabaseProcesses = () => [
  {
    id: 'procA',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exA_in_B',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
        meanAmount: '2',
        resultingAmount: '2',
      },
      {
        '@dataSetInternalID': 'exA_in_C',
        exchangeDirection: 'INPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-A' },
        meanAmount: '3',
        resultingAmount: '3',
      },
      {
        '@dataSetInternalID': 'exA_out_final',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-A-final',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'A final' }],
        },
        meanAmount: '5',
        resultingAmount: '5',
        allocations: { allocation: { '@allocatedFraction': '100%' } },
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exA_in_C',
    },
  },
  {
    id: 'procB',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exB_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
        meanAmount: '2',
        resultingAmount: '2',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exB_out_A',
    },
  },
  {
    id: 'procC',
    version: '1',
    exchange: [
      {
        '@dataSetInternalID': 'exC_out_A',
        exchangeDirection: 'OUTPUT',
        referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-A' },
        meanAmount: '3',
        resultingAmount: '3',
      },
    ],
    quantitativeReference: {
      referenceToReferenceFlow: 'exC_out_A',
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

  it('treats a missing Supabase data payload as an empty process list', async () => {
    const data = createLifeCycleModelData();
    mockOr.mockResolvedValue({});

    await expect(
      genLifeCycleModelProcesses('model-no-data-payload', null, data, []),
    ).rejects.toThrow('Reference process not found in database');

    expect(mockFrom).toHaveBeenCalledWith('processes');
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
    expect(primary?.refProcesses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'procA',
          version: '1',
          'common:shortDescription': [
            { '@xml:lang': 'en', '#text': 'Process A' },
            { '@xml:lang': 'zh', '#text': '过程A' },
          ],
        }),
      ]),
    );
    expect(secondary?.refProcesses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'procC',
          version: '1',
          'common:shortDescription': [
            { '@xml:lang': 'en', '#text': 'Process C' },
            { '@xml:lang': 'zh', '#text': '过程C' },
          ],
        }),
      ]),
    );

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

  it('creates a new secondary id and falls back to database reference amount when target amount is missing', async () => {
    const data = createLifeCycleModelData();
    mockOr.mockResolvedValue({ data: clone(createSupabaseProcesses()) });

    mockLCIAResultCalculation
      .mockResolvedValueOnce([{ '@id': 'LCIA_PRIMARY' }])
      .mockResolvedValueOnce([{ '@id': 'LCIA_SECONDARY' }]);

    const modelNodes = [
      {
        '@dataSetInternalID': 'nodeA',
        id: 'graph-node-a',
      },
      {
        '@dataSetInternalID': 'nodeB',
        id: 'graph-node-b',
      },
      {
        '@dataSetInternalID': 'nodeC',
        id: 'graph-node-c',
      },
    ];

    const { lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-999',
      modelNodes as any,
      data,
      [],
    );

    const primary = lifeCycleModelProcesses.find((item) => item?.modelInfo?.type === 'primary');
    const secondary = lifeCycleModelProcesses.find((item) => item?.modelInfo?.type === 'secondary');

    expect(primary?.option).toBe('update');
    expect(primary?.modelInfo?.id).toBe('model-999');
    expect(
      primary?.data?.processDataSet?.exchanges?.exchange?.find(
        (exchange: any) => exchange?.quantitativeReference,
      )?.meanAmount,
    ).toBe(5);

    expect(secondary?.option).toBe('create');
    expect(secondary?.modelInfo?.id).toBe('generated-secondary-id');
    expect(secondary?.modelInfo?.finalId).toEqual(
      expect.objectContaining({
        nodeId: 'nodeC',
        processId: 'procC',
        allocatedExchangeFlowId: 'flow-C-final',
        allocatedExchangeDirection: 'OUTPUT',
      }),
    );
  });

  it('uses model node data.index mapping for graph ids and reference target amount', async () => {
    const data = createLifeCycleModelData();
    mockOr.mockResolvedValue({ data: clone(createSupabaseProcesses()) });

    mockLCIAResultCalculation
      .mockResolvedValueOnce([{ '@id': 'LCIA_PRIMARY' }])
      .mockResolvedValueOnce([{ '@id': 'LCIA_SECONDARY' }]);

    const modelNodes = [
      {
        id: 'graph-node-a',
        data: {
          index: 'nodeA',
          quantitativeReference: '1',
          targetAmount: 12,
        },
      },
      {
        id: 'graph-node-b',
        data: {
          index: 'nodeB',
        },
      },
      {
        id: 'graph-node-c',
        data: {
          index: 'nodeC',
        },
      },
    ];

    const { lifeCycleModelProcesses, up2DownEdges } = await genLifeCycleModelProcesses(
      'model-indexed',
      modelNodes as any,
      data,
      [],
    );

    const primary = lifeCycleModelProcesses.find((item) => item?.modelInfo?.type === 'primary');

    expect(
      primary?.data?.processDataSet?.exchanges?.exchange?.find(
        (exchange: any) => exchange?.quantitativeReference,
      )?.meanAmount,
    ).toBe(12);

    expect(up2DownEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          upstreamId: 'nodeB',
          upstreamNodeId: 'graph-node-b',
          downstreamId: 'nodeA',
          downstreamNodeId: 'graph-node-a',
        }),
      ]),
    );
  });

  it('creates a new secondary id when the matched previous secondary has an empty id', async () => {
    const data = createLifeCycleModelData();
    mockOr.mockResolvedValue({ data: clone(createSupabaseProcesses()) });

    mockLCIAResultCalculation
      .mockResolvedValueOnce([{ '@id': 'LCIA_PRIMARY' }])
      .mockResolvedValueOnce([{ '@id': 'LCIA_SECONDARY' }]);

    const oldSubmodels = [
      {
        id: '',
        type: 'secondary',
        finalId: {
          nodeId: 'nodeC',
          processId: 'procC',
          allocatedExchangeFlowId: 'flow-C-final',
          allocatedExchangeDirection: 'OUTPUT',
        },
      },
    ];

    const modelNodes = [
      {
        '@dataSetInternalID': 'nodeA',
        id: 'graph-node-a',
      },
      {
        '@dataSetInternalID': 'nodeB',
        id: 'graph-node-b',
      },
      {
        '@dataSetInternalID': 'nodeC',
        id: 'graph-node-c',
      },
    ];

    const { lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-empty-old-id',
      modelNodes as any,
      data,
      oldSubmodels,
    );

    const secondary = lifeCycleModelProcesses.find((item) => item?.modelInfo?.type === 'secondary');

    expect(secondary?.option).toBe('create');
    expect(secondary?.modelInfo?.id).toBe('generated-secondary-id');
  });

  it('treats output allocations without allocatedFraction as non-allocated exchanges', async () => {
    const data = createLifeCycleModelData();
    const dbProcesses = clone(createSupabaseProcesses()) as any[];
    const procB = dbProcesses.find((process) => process.id === 'procB');
    procB.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exB_out_toC',
    ).allocations = {
      allocation: {},
    };

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation
      .mockResolvedValueOnce([{ '@id': 'LCIA_PRIMARY' }])
      .mockResolvedValueOnce([{ '@id': 'LCIA_SECONDARY' }]);

    const { lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-empty-allocation-fraction',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 10 },
        },
        { id: 'graph-node-b', data: { index: 'nodeB' } },
        { id: 'graph-node-c', data: { index: 'nodeC' } },
      ] as any,
      data,
      [],
    );

    expect(
      lifeCycleModelProcesses.find((process) => process?.modelInfo?.type === 'primary'),
    ).toBeDefined();
    expect(
      lifeCycleModelProcesses.find(
        (process) =>
          process?.modelInfo?.type === 'secondary' &&
          process?.modelInfo?.finalId?.allocatedExchangeFlowId === 'flow-C-final',
      ),
    ).toBeDefined();
  });

  it('skips model processes whose connected database process is missing', async () => {
    const data = createLifeCycleModelData();
    const dbProcesses = clone(createSupabaseProcesses()).filter(
      (process: any) => process.id !== 'procB',
    );
    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const result = await genLifeCycleModelProcesses(
      'model-missing-adjacent-db-process',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 },
        },
        { id: 'graph-node-b', data: { index: 'nodeB' } },
        { id: 'graph-node-c', data: { index: 'nodeC' } },
      ] as any,
      data,
      [],
    );

    expect(result.lifeCycleModelProcesses).toHaveLength(1);
    expect(
      result.lifeCycleModelProcesses.find((process) => process?.modelInfo?.type === 'primary'),
    ).toBeDefined();
  });

  it('treats zero current exchange amounts as zero scaling for connected child processes', async () => {
    const data = createLifeCycleModelData();
    const dbProcesses = clone(createSupabaseProcesses()) as any[];
    const procA = dbProcesses.find((process) => process.id === 'procA');
    procA.exchange.find((exchange: any) => exchange['@dataSetInternalID'] === 'exA_in').meanAmount =
      '0';
    procA.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exA_in',
    ).resultingAmount = '0';

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const result = await genLifeCycleModelProcesses(
      'model-zero-current-amount',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 },
        },
        { id: 'graph-node-b', data: { index: 'nodeB' } },
        { id: 'graph-node-c', data: { index: 'nodeC' } },
      ] as any,
      data,
      [],
    );

    expect(result.lifeCycleModelProcesses).toHaveLength(1);
    expect(
      result.lifeCycleModelProcesses.find((process) => process?.modelInfo?.type === 'secondary'),
    ).toBeUndefined();
  });

  it('uses INPUT quantitative references to choose the main input flow and strips NULL geography placeholders', async () => {
    mockOr.mockResolvedValue({ data: clone(createInputReferenceSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      {
        id: 'graph-node-a',
        data: {
          index: 'nodeA',
          quantitativeReference: '1',
          targetAmount: 5,
        },
      },
      {
        id: 'graph-node-b',
        data: {
          index: 'nodeB',
        },
      },
      {
        id: 'graph-node-c',
        data: {
          index: 'nodeC',
        },
      },
    ];

    const { up2DownEdges, lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-input-reference',
      modelNodes as any,
      createInputReferenceModelData(),
      [],
    );

    const edgeBToA = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeA:flow-B-to-A');
    const edgeCToA = up2DownEdges.find((edge) => edge.id === 'nodeC->nodeA:flow-C-to-A');
    const primary = lifeCycleModelProcesses.find(
      (process) => process?.modelInfo?.type === 'primary',
    );

    expect(edgeBToA?.mainInputFlowUUID).toBe('flow-C-to-A');
    expect(edgeCToA?.mainInputFlowUUID).toBe('flow-C-to-A');
    expect(edgeBToA?.dependence).toBe('downstream');
    expect(edgeCToA?.dependence).toBe('downstream');
    expect(
      primary?.data?.processDataSet?.processInformation?.geography
        ?.locationOfOperationSupplyOrProduction?.['@location'],
    ).toBeUndefined();
    expect(
      primary?.data?.processDataSet?.processInformation?.geography
        ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'],
    ).toBeUndefined();
  });

  it('selects reference input flows and max allocated output flows when reference outputs do not match model edges', async () => {
    mockOr.mockResolvedValue({ data: clone(createSelectionFallbackSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      {
        id: 'graph-node-a',
        data: {
          index: 'nodeA',
          quantitativeReference: '1',
          targetAmount: 5,
        },
      },
      {
        id: 'graph-node-b',
        data: {
          index: 'nodeB',
        },
      },
      {
        id: 'graph-node-d',
        data: {
          index: 'nodeD',
        },
      },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-selection-fallback',
      modelNodes as any,
      createSelectionFallbackModelData(),
      [],
    );

    const fromBToA = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeA:flow-B-to-A');
    const fromDToA = up2DownEdges.find((edge) => edge.id === 'nodeD->nodeA:flow-D-to-A');

    expect(fromBToA).toEqual(
      expect.objectContaining({
        mainOutputFlowUUID: 'flow-B-extra',
        mainInputFlowUUID: 'flow-B-to-A',
      }),
    );
    expect(fromDToA).toEqual(
      expect.objectContaining({
        mainInputFlowUUID: 'flow-B-to-A',
      }),
    );
  });

  it('ignores malformed model output exchanges without flow ids when choosing the main output flow', async () => {
    const data = createSelectionFallbackModelData();
    const nodeB: any =
      data.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance.find(
        (process: any) => process['@dataSetInternalID'] === 'nodeB',
      );
    (nodeB.connections.outputExchange as any[]).unshift({
      downstreamProcess: [],
    });

    mockOr.mockResolvedValue({ data: clone(createSelectionFallbackSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-selection-fallback-missing-flow-id',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 },
        },
        { id: 'graph-node-b', data: { index: 'nodeB' } },
        { id: 'graph-node-d', data: { index: 'nodeD' } },
      ] as any,
      data,
      [],
    );

    expect(up2DownEdges.find((edge) => edge.id === 'nodeB->nodeA:flow-B-to-A')).toEqual(
      expect.objectContaining({
        mainOutputFlowUUID: 'flow-B-extra',
        mainInputFlowUUID: 'flow-B-to-A',
      }),
    );
  });

  it('breaks mixed-priority cycles by cutting the non-reference edge', async () => {
    mockOr.mockResolvedValue({ data: clone(createCycleSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      {
        id: 'graph-node-a',
        data: {
          index: 'nodeA',
          quantitativeReference: '1',
          targetAmount: 2,
        },
      },
      {
        id: 'graph-node-b',
        data: {
          index: 'nodeB',
        },
      },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-cycle',
      modelNodes as any,
      createCycleModelData(),
      [],
    );

    const cutEdge = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeA:flow-B-to-A');
    const keptEdge = up2DownEdges.find((edge) => edge.id === 'nodeA->nodeB:flow-A-to-B');

    expect(cutEdge).toEqual(
      expect.objectContaining({
        isCycle: true,
        dependence: 'none',
        mainDependence: 'downstream',
      }),
    );
    expect(keptEdge?.flowIsRef).toBe(true);
  });

  it('falls back to the max allocated input flow when the database reference input is missing from model edges', async () => {
    const data = createSelectionFallbackModelData();
    const dbProcesses = clone(createSelectionFallbackSupabaseProcesses()) as any[];
    dbProcesses[0].quantitativeReference.referenceToReferenceFlow = 'missing-input-ref';
    dbProcesses[0].exchange[0].allocations = {
      allocation: {
        '@allocatedFraction': '40%',
      },
    };
    dbProcesses[0].exchange[1].allocations = {
      allocation: {
        '@allocatedFraction': '60%',
      },
    };

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      {
        id: 'graph-node-a',
        data: {
          index: 'nodeA',
          quantitativeReference: '1',
          targetAmount: 5,
        },
      },
      {
        id: 'graph-node-b',
        data: {
          index: 'nodeB',
        },
      },
      {
        id: 'graph-node-d',
        data: {
          index: 'nodeD',
        },
      },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-input-fallback',
      modelNodes as any,
      data,
      [],
    );

    const fromBToA = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeA:flow-B-to-A');
    const fromDToA = up2DownEdges.find((edge) => edge.id === 'nodeD->nodeA:flow-D-to-A');

    expect(fromBToA?.mainInputFlowUUID).toBe('flow-D-to-A');
    expect(fromDToA?.mainInputFlowUUID).toBe('flow-D-to-A');
  });

  it('prunes non-main downstream edges when one upstream node feeds multiple downstream nodes in the output phase', async () => {
    mockOr.mockResolvedValue({ data: clone(createDownstreamPruneSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      { id: 'graph-node-a', data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 } },
      { id: 'graph-node-b', data: { index: 'nodeB' } },
      { id: 'graph-node-c', data: { index: 'nodeC' } },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-downstream-prune',
      modelNodes as any,
      createDownstreamPruneModelData(),
      [],
    );

    const edgeBToA = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeA:flow-B-to-A');
    const edgeBToC = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeC:flow-B-to-C');

    expect(edgeBToA).toEqual(
      expect.objectContaining({
        dependence: 'none',
        mainDependence: 'downstream',
      }),
    );
    expect(edgeBToC).toEqual(
      expect.objectContaining({
        dependence: 'downstream',
      }),
    );
  });

  it('keeps a non-main downstream edge when the reverse local-loop edge is the one cut as a cycle', async () => {
    const data = clone(createDownstreamPruneModelData());
    const dbProcesses = clone(createDownstreamPruneSupabaseProcesses()) as any[];

    const nodeC: any =
      data.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance.find(
        (process: any) => process['@dataSetInternalID'] === 'nodeC',
      );
    nodeC.connections.outputExchange = [
      {
        '@flowUUID': 'flow-C-to-A',
        downstreamProcess: { '@id': 'nodeA' },
      },
      {
        '@flowUUID': 'flow-C-to-B',
        downstreamProcess: { '@id': 'nodeB' },
      },
    ];

    const procB = dbProcesses.find((process) => process.id === 'procB');
    procB.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exB_out_A',
    ).allocations.allocation['@allocatedFraction'] = '60%';
    procB.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exB_out_C',
    ).allocations.allocation['@allocatedFraction'] = '40%';

    const procC = dbProcesses.find((process) => process.id === 'procC');
    procC.exchange.unshift({
      '@dataSetInternalID': 'exC_in_B',
      exchangeDirection: 'INPUT',
      referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-C' },
      meanAmount: '1',
      resultingAmount: '1',
    });
    procC.exchange.push({
      '@dataSetInternalID': 'exC_out_B',
      exchangeDirection: 'OUTPUT',
      referenceToFlowDataSet: { '@refObjectId': 'flow-C-to-B' },
      meanAmount: '1',
      resultingAmount: '1',
    });
    procC.quantitativeReference.referenceToReferenceFlow = 'exC_in_B';

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      { id: 'graph-node-a', data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 } },
      { id: 'graph-node-b', data: { index: 'nodeB' } },
      { id: 'graph-node-c', data: { index: 'nodeC' } },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-downstream-reverse-edge-guard',
      modelNodes as any,
      data,
      [],
    );

    const edgeBToC = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeC:flow-B-to-C');
    const reverseEdge = up2DownEdges.find((edge) => edge.id === 'nodeC->nodeB:flow-C-to-B');

    expect(reverseEdge).toEqual(
      expect.objectContaining({
        dependence: 'none',
        isCycle: true,
      }),
    );
    expect(edgeBToC).toEqual(
      expect.objectContaining({
        dependence: 'downstream',
      }),
    );
  });

  it('prunes non-main upstream edges and carries unallocated child processes through recursion', async () => {
    mockOr.mockResolvedValue({ data: clone(createUpstreamPruneSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      { id: 'graph-node-a', data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 } },
      { id: 'graph-node-b', data: { index: 'nodeB' } },
      { id: 'graph-node-c', data: { index: 'nodeC' } },
      { id: 'graph-node-d', data: { index: 'nodeD' } },
    ];

    const { up2DownEdges, lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-upstream-prune',
      modelNodes as any,
      createUpstreamPruneModelData(),
      [],
    );

    const edgeBToD = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeD:flow-B-to-D');
    const edgeCToD = up2DownEdges.find((edge) => edge.id === 'nodeC->nodeD:flow-C-to-D');

    expect(edgeBToD).toEqual(
      expect.objectContaining({
        dependence: 'none',
        mainDependence: 'upstream',
      }),
    );
    expect(edgeCToD).toEqual(
      expect.objectContaining({
        dependence: 'upstream',
      }),
    );

    const primary = lifeCycleModelProcesses.find(
      (process) => process?.modelInfo?.type === 'primary',
    );
    const mergedSharedRaw = primary?.data?.processDataSet?.exchanges?.exchange?.find(
      (exchange: any) =>
        exchange?.referenceToFlowDataSet?.['@refObjectId'] === 'flow-shared-raw' &&
        exchange?.exchangeDirection === 'INPUT',
    );

    expect(mergedSharedRaw?.meanAmount).toBeGreaterThan(20);
  });

  it('breaks upstream cycles by cutting the non-reference edge in the cycle', async () => {
    mockOr.mockResolvedValue({ data: clone(createUpstreamCycleSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      { id: 'graph-node-a', data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 } },
      { id: 'graph-node-b', data: { index: 'nodeB' } },
      { id: 'graph-node-c', data: { index: 'nodeC' } },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-upstream-cycle',
      modelNodes as any,
      createUpstreamCycleModelData(),
      [],
    );

    const edgeCToB = up2DownEdges.find((edge) => edge.id === 'nodeC->nodeB:flow-C-to-B');
    const edgeBToC = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeC:flow-B-to-C');

    expect(edgeCToB).toEqual(
      expect.objectContaining({
        isCycle: true,
        dependence: 'none',
        mainDependence: 'upstream',
      }),
    );
    expect(edgeBToC?.flowIsRef).toBe(true);
  });

  it('keeps a non-main upstream edge when a reverse edge exists on the local loop', async () => {
    const data = clone(createUpstreamPruneModelData());
    const nodeD: any =
      data.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance.find(
        (process: any) => process['@dataSetInternalID'] === 'nodeD',
      );
    nodeD.connections.outputExchange = {
      '@flowUUID': 'flow-D-to-B',
      downstreamProcess: { '@id': 'nodeB' },
    };

    const dbProcesses = clone(createUpstreamPruneSupabaseProcesses()) as any[];
    const procD = dbProcesses.find((process) => process.id === 'procD');
    procD.exchange.push({
      '@dataSetInternalID': 'exD_out_B',
      exchangeDirection: 'OUTPUT',
      referenceToFlowDataSet: { '@refObjectId': 'flow-D-to-B' },
      meanAmount: '1',
      resultingAmount: '1',
    });

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      { id: 'graph-node-a', data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 } },
      { id: 'graph-node-b', data: { index: 'nodeB' } },
      { id: 'graph-node-c', data: { index: 'nodeC' } },
      { id: 'graph-node-d', data: { index: 'nodeD' } },
    ];

    const { up2DownEdges } = await genLifeCycleModelProcesses(
      'model-reverse-edge-guard',
      modelNodes as any,
      data,
      [],
    );

    const edgeBToD = up2DownEdges.find((edge) => edge.id === 'nodeB->nodeD:flow-B-to-D');
    const reverseEdge = up2DownEdges.find((edge) => edge.id === 'nodeD->nodeB:flow-D-to-B');
    expect(edgeBToD?.mainInputFlowUUID).toBe('flow-C-to-D');
    expect(reverseEdge).toBeDefined();
    expect(['upstream', 'none']).toContain(edgeBToD?.dependence);
  });

  it('carries upstream non-final child processes into subproduct groups for allocated upstream branches', async () => {
    const data = clone(createUpstreamPruneModelData());
    const nodeD: any =
      data.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance.find(
        (process: any) => process['@dataSetInternalID'] === 'nodeD',
      );
    nodeD.connections.outputExchange = [
      {
        '@flowUUID': 'flow-D-to-B',
        downstreamProcess: { '@id': 'nodeB' },
      },
      {
        '@flowUUID': 'flow-D-final',
        downstreamProcess: [],
      },
    ];

    const dbProcesses = clone(createUpstreamPruneSupabaseProcesses()) as any[];
    const procB = dbProcesses.find((process) => process.id === 'procB');
    const procD = dbProcesses.find((process) => process.id === 'procD');

    procB.quantitativeReference.referenceToReferenceFlow = 'exB_out_D';
    procB.exchange.unshift({
      '@dataSetInternalID': 'exB_in_D',
      exchangeDirection: 'INPUT',
      referenceToFlowDataSet: { '@refObjectId': 'flow-D-to-B' },
      meanAmount: '1',
      resultingAmount: '1',
    });
    procD.exchange.push({
      '@dataSetInternalID': 'exD_out_B',
      exchangeDirection: 'OUTPUT',
      referenceToFlowDataSet: { '@refObjectId': 'flow-D-to-B' },
      meanAmount: '1',
      resultingAmount: '1',
    });

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const { lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
      'model-upstream-subproduct-group',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 },
        },
        { id: 'graph-node-b', data: { index: 'nodeB' } },
        { id: 'graph-node-c', data: { index: 'nodeC' } },
        { id: 'graph-node-d', data: { index: 'nodeD' } },
      ] as any,
      data,
      [],
    );

    expect(
      lifeCycleModelProcesses.find(
        (process) => process?.modelInfo?.type === 'primary' && process?.refProcesses?.length === 3,
      ),
    ).toBeDefined();
  });

  it('merges duplicate process exchange entries when one downstream node is reached twice via the same flow', async () => {
    const data = clone(createUpstreamPruneModelData());
    const dbProcesses = clone(createUpstreamPruneSupabaseProcesses()) as any[];

    const nodeB: any =
      data.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance.find(
        (process: any) => process['@dataSetInternalID'] === 'nodeB',
      );
    const nodeC: any =
      data.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance.find(
        (process: any) => process['@dataSetInternalID'] === 'nodeC',
      );
    (nodeB.connections.outputExchange as any[])[1]['@flowUUID'] = 'flow-shared-to-D';
    (nodeC.connections.outputExchange as any[])[1]['@flowUUID'] = 'flow-shared-to-D';

    const procB = dbProcesses.find((process) => process.id === 'procB');
    const procC = dbProcesses.find((process) => process.id === 'procC');
    const procD = dbProcesses.find((process) => process.id === 'procD');
    procB.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exB_out_D',
    ).referenceToFlowDataSet['@refObjectId'] = 'flow-shared-to-D';
    procC.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exC_out_D',
    ).referenceToFlowDataSet['@refObjectId'] = 'flow-shared-to-D';
    procD.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exD_in_B',
    ).referenceToFlowDataSet['@refObjectId'] = 'flow-shared-to-D';
    procD.exchange.find(
      (exchange: any) => exchange['@dataSetInternalID'] === 'exD_in_C',
    ).referenceToFlowDataSet['@refObjectId'] = 'flow-shared-to-D';

    mockOr.mockResolvedValue({ data: dbProcesses });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const modelNodes = [
      { id: 'graph-node-a', data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 } },
      { id: 'graph-node-b', data: { index: 'nodeB' } },
      { id: 'graph-node-c', data: { index: 'nodeC' } },
      { id: 'graph-node-d', data: { index: 'nodeD' } },
    ];

    const { lifeCycleModelProcesses, up2DownEdges } = await genLifeCycleModelProcesses(
      'model-duplicate-merge',
      modelNodes as any,
      data,
      [],
    );

    const primary = lifeCycleModelProcesses.find(
      (process) => process?.modelInfo?.type === 'primary',
    );
    expect(up2DownEdges.filter((edge) => edge?.flowUUID === 'flow-shared-to-D')).toHaveLength(2);
    expect(primary?.refProcesses).toHaveLength(3);
  });

  it('throws without querying Supabase when the model contains no process instances', async () => {
    const data = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          quantitativeReference: {
            referenceToReferenceProcess: 'nodeA',
          },
          technology: {
            processes: {
              processInstance: [],
            },
          },
        },
      },
    };

    await expect(genLifeCycleModelProcesses('model-empty-processes', [], data, [])).rejects.toThrow(
      'Reference process not found in database',
    );

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockOr).not.toHaveBeenCalled();
  });

  it('returns no submodels when the reference process has no output exchanges', async () => {
    const data = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          quantitativeReference: {
            referenceToReferenceProcess: 'nodeA',
          },
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'No Output Model' }],
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
                    outputExchange: [],
                  },
                },
              ],
            },
          },
        },
      },
    };

    mockOr.mockResolvedValue({
      data: [
        {
          id: 'procA',
          version: '1',
          exchange: [
            {
              '@dataSetInternalID': 'exA_in_raw',
              exchangeDirection: 'INPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-raw' },
              meanAmount: '5',
              resultingAmount: '5',
            },
          ],
          quantitativeReference: {
            referenceToReferenceFlow: 'exA_in_raw',
          },
        },
      ],
    });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const result = await genLifeCycleModelProcesses('model-no-output', [], data, []);

    expect(result.up2DownEdges).toEqual([]);
    expect(result.lifeCycleModelProcesses).toEqual([]);
  });

  it('re-applies a fallback empty connections array after rebuilding process instances', async () => {
    const data = createLifeCycleModelData();
    const processInstances = data.lifeCycleModelDataSet.lifeCycleModelInformation.technology
      .processes.processInstance as any[];
    delete processInstances[2].connections;

    mockOr.mockResolvedValue({ data: clone(createSupabaseProcesses()) });
    mockLCIAResultCalculation.mockResolvedValue([]);

    await genLifeCycleModelProcesses('model-missing-connections', [], data, []);

    const updatedProcessInstances = data.lifeCycleModelDataSet.lifeCycleModelInformation.technology
      .processes.processInstance as any[];

    expect(updatedProcessInstances[0].connections.outputExchange[0]['@flowUUID']).toBe(
      'flow-A-final',
    );
    expect(updatedProcessInstances[1].connections).toEqual({
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
    });
    expect(updatedProcessInstances[2].connections).toEqual([]);
  });

  it('marks disconnected component edges as none and keeps their single input flow as mainInputFlowUUID', async () => {
    const data = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          quantitativeReference: {
            referenceToReferenceProcess: 'nodeA',
          },
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Disconnected Component Model' }],
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
                      '@flowUUID': 'flow-A-final',
                      downstreamProcess: [],
                    },
                  },
                },
                {
                  '@dataSetInternalID': 'nodeC',
                  referenceToProcess: {
                    '@refObjectId': 'procC',
                    '@version': '1',
                    'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process C' }],
                  },
                  connections: {
                    outputExchange: {
                      '@flowUUID': 'flow-C-final',
                      downstreamProcess: [],
                    },
                  },
                },
                {
                  '@dataSetInternalID': 'nodeD',
                  referenceToProcess: {
                    '@refObjectId': 'procD',
                    '@version': '1',
                    'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Process D' }],
                  },
                  connections: {
                    outputExchange: {
                      '@flowUUID': 'flow-D-to-C',
                      downstreamProcess: { '@id': 'nodeC' },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    mockOr.mockResolvedValue({
      data: [
        {
          id: 'procA',
          version: '1',
          exchange: [
            {
              '@dataSetInternalID': 'exA_out_final',
              exchangeDirection: 'OUTPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-A-final' },
              meanAmount: '5',
              resultingAmount: '5',
            },
          ],
          quantitativeReference: {
            referenceToReferenceFlow: 'exA_out_final',
          },
        },
        {
          id: 'procC',
          version: '1',
          exchange: [
            {
              '@dataSetInternalID': 'exC_in_D',
              exchangeDirection: 'INPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-D-to-C' },
              meanAmount: '2',
              resultingAmount: '2',
            },
            {
              '@dataSetInternalID': 'exC_out_final',
              exchangeDirection: 'OUTPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-C-final' },
              meanAmount: '2',
              resultingAmount: '2',
            },
          ],
          quantitativeReference: {
            referenceToReferenceFlow: 'exC_out_final',
          },
        },
        {
          id: 'procD',
          version: '1',
          exchange: [
            {
              '@dataSetInternalID': 'exD_out_C',
              exchangeDirection: 'OUTPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-D-to-C' },
              meanAmount: '2',
              resultingAmount: '2',
            },
          ],
          quantitativeReference: {
            referenceToReferenceFlow: 'exD_out_C',
          },
        },
      ],
    });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const result = await genLifeCycleModelProcesses(
      'model-disconnected-component',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 },
        },
        { id: 'graph-node-c', data: { index: 'nodeC' } },
        { id: 'graph-node-d', data: { index: 'nodeD' } },
      ] as any,
      data,
      [],
    );

    const disconnectedEdge = result.up2DownEdges.find(
      (edge) => edge.id === 'nodeD->nodeC:flow-D-to-C',
    );

    expect(disconnectedEdge).toEqual(
      expect.objectContaining({
        dependence: 'none',
        mainInputFlowUUID: 'flow-D-to-C',
      }),
    );
    expect(result.lifeCycleModelProcesses).toHaveLength(1);
  });

  it('skips dangling downstream nodes, malformed exchanges, and zero-base scaling paths', async () => {
    const data = {
      lifeCycleModelDataSet: {
        lifeCycleModelInformation: {
          quantitativeReference: {
            referenceToReferenceProcess: 'nodeA',
          },
          dataSetInformation: {
            name: {
              baseName: [{ '@xml:lang': 'en', '#text': 'Sparse Graph Model' }],
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
                    outputExchange: [
                      {
                        '@flowUUID': 'flow-A-final',
                        downstreamProcess: [],
                      },
                      {
                        '@flowUUID': 'flow-A-to-missing',
                        downstreamProcess: { '@id': 'nodeMissing' },
                      },
                    ],
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
                      '@flowUUID': 'flow-B-to-A',
                      downstreamProcess: { '@id': 'nodeA' },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    mockOr.mockResolvedValue({
      data: [
        {
          id: 'procA',
          version: '1',
          exchange: [
            {
              '@dataSetInternalID': 'exA_in_B',
              exchangeDirection: 'INPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
              meanAmount: '2',
              resultingAmount: '2',
            },
            {
              '@dataSetInternalID': 'exA_out_final',
              exchangeDirection: 'OUTPUT',
              referenceToFlowDataSet: {
                '@refObjectId': 'flow-A-final',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'A final' }],
              },
              meanAmount: '5',
              resultingAmount: '5',
            },
            {
              '@dataSetInternalID': 'exA_out_missing',
              exchangeDirection: 'OUTPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-A-to-missing' },
              meanAmount: '1',
              resultingAmount: '1',
            },
            {
              '@dataSetInternalID': 'exA_no_flow',
              exchangeDirection: 'OUTPUT',
              meanAmount: '1',
              resultingAmount: '1',
            },
            {
              '@dataSetInternalID': 'exA_no_direction',
              referenceToFlowDataSet: { '@refObjectId': 'flow-no-direction' },
              meanAmount: '1',
              resultingAmount: '1',
            },
          ],
          quantitativeReference: {
            referenceToReferenceFlow: 'exA_out_final',
          },
        },
        {
          id: 'procB',
          version: '1',
          exchange: [
            {
              '@dataSetInternalID': 'exB_out_A',
              exchangeDirection: 'OUTPUT',
              referenceToFlowDataSet: { '@refObjectId': 'flow-B-to-A' },
              meanAmount: '0',
              resultingAmount: '0',
            },
          ],
          quantitativeReference: {
            referenceToReferenceFlow: 'exB_out_A',
          },
        },
      ],
    });
    mockLCIAResultCalculation.mockResolvedValue([]);

    const { lifeCycleModelProcesses, up2DownEdges } = await genLifeCycleModelProcesses(
      'model-sparse-graph',
      [
        {
          id: 'graph-node-a',
          data: { index: 'nodeA', quantitativeReference: '1', targetAmount: 5 },
        },
        { id: 'graph-node-b', data: { index: 'nodeB' } },
      ] as any,
      data,
      [],
    );

    const primary = lifeCycleModelProcesses.find(
      (process) => process?.modelInfo?.type === 'primary',
    );

    expect(primary).toBeDefined();
    expect(lifeCycleModelProcesses).toHaveLength(1);
    expect(
      up2DownEdges.find((edge) => edge.id === 'nodeA->nodeMissing:flow-A-to-missing'),
    ).toBeDefined();
    expect(primary?.refProcesses).toEqual([
      expect.objectContaining({
        id: 'procA',
        version: '1',
      }),
    ]);
  });
});
