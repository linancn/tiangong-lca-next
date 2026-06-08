import {
  createEmptyProcessFlowGraphSelection,
  getProcessFlowGraphNode,
  getProcessFlowGraphSelection,
  summarizeProcessFlowSelection,
} from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphSelection';
import type {
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
} from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphTypes';

const flowAId = 'flow:A@v1';
const processOneId = 'process:one@v1';
const processTwoId = 'process:two@v1';
const byproductFlowId = 'flow:byproduct@v1';
const outputFlowId = 'flow:output@v1';

const nodes: ProcessFlowGraphData['nodes'] = [
  {
    category: '能源',
    clusterId: 'energy',
    degree: 2,
    flowType: 'Product flow',
    id: flowAId,
    kind: 'flow',
    location: 'CN',
    name: '交流电',
    version: '01.00.000',
  },
  {
    category: '能源',
    clusterId: 'energy',
    degree: 2,
    id: processOneId,
    kind: 'process',
    location: 'CN',
    name: '电力生产一',
    version: '01.00.000',
  },
  {
    category: '能源',
    clusterId: 'energy',
    degree: 2,
    id: processTwoId,
    kind: 'process',
    location: 'CN',
    name: '电力生产二',
    version: '01.00.000',
  },
  {
    category: '材料',
    clusterId: 'materials',
    degree: 1,
    flowType: 'Product flow',
    id: byproductFlowId,
    kind: 'flow',
    location: 'CN',
    name: '副产物流',
    version: '01.00.000',
  },
  {
    category: '能源',
    clusterId: 'energy',
    degree: 1,
    flowType: 'Product flow',
    id: outputFlowId,
    kind: 'flow',
    location: 'CN',
    name: '外供电',
    version: '01.00.000',
  },
];

const edges: ProcessFlowGraphEdge[] = [
  {
    amount: 1,
    direction: 'input',
    exchangeId: 'exchange:0',
    flowId: flowAId,
    id: 'exchange:0',
    processId: processOneId,
    source: flowAId,
    target: processOneId,
    unit: 'kWh',
  },
  {
    amount: 2,
    direction: 'output',
    exchangeId: 'exchange:1',
    flowId: byproductFlowId,
    id: 'exchange:1',
    processId: processOneId,
    source: processOneId,
    target: byproductFlowId,
    unit: 'kg',
  },
  {
    amount: 3,
    direction: 'input',
    exchangeId: 'exchange:2',
    flowId: flowAId,
    id: 'exchange:2',
    processId: processTwoId,
    source: flowAId,
    target: processTwoId,
    unit: 'kWh',
  },
  {
    amount: 4,
    direction: 'output',
    exchangeId: 'exchange:3',
    flowId: outputFlowId,
    id: 'exchange:3',
    processId: processTwoId,
    source: processTwoId,
    target: outputFlowId,
    unit: 'kWh',
  },
];

function createProcessFlowGraphFixture(): ProcessFlowGraphData {
  return {
    adjacency: {
      [byproductFlowId]: ['exchange:1'],
      [flowAId]: ['exchange:0', 'exchange:missing-direct', 'exchange:2'],
      [outputFlowId]: ['exchange:3'],
      [processOneId]: ['exchange:0', 'exchange:1'],
      [processTwoId]: ['exchange:2', 'exchange:3'],
    },
    buildId: 'worker-fixture',
    clusters: [
      { count: 4, id: 'energy', label: '能源' },
      { count: 1, id: 'materials', label: '材料' },
    ],
    edges,
    indexes: {
      edgeById: {
        'exchange:0': 0,
        'exchange:1': 1,
        'exchange:2': 2,
        'exchange:3': 3,
      },
      flowById: {
        [byproductFlowId]: 3,
        [flowAId]: 0,
        [outputFlowId]: 4,
      },
      nodeById: {
        [byproductFlowId]: 3,
        [flowAId]: 0,
        [outputFlowId]: 4,
        [processOneId]: 1,
        [processTwoId]: 2,
      },
      processById: {
        [processOneId]: 1,
        [processTwoId]: 2,
      },
      searchFlows: [
        {
          degree: 2,
          flowType: 'Product flow',
          id: flowAId,
          name: '交流电',
          version: '01.00.000',
        },
      ],
    },
    layouts: {
      expanded2d: {
        [byproductFlowId]: [120, 80, 0],
        [flowAId]: [0, 0, 0],
        [outputFlowId]: [120, -80, 0],
        [processOneId]: [60, 40, 6],
        [processTwoId]: [60, -40, 6],
      },
      sphere3d: {
        [byproductFlowId]: [40, 80, 300],
        [flowAId]: [0, 0, 310],
        [outputFlowId]: [40, -80, 300],
        [processOneId]: [20, 40, 306],
        [processTwoId]: [20, -40, 306],
      },
    },
    nodes,
    schemaVersion: 'process_flow_graph_v1',
    stats: {
      edgeCount: edges.length,
      flowCount: 3,
      maxDegree: 2,
      processCount: 2,
    },
  };
}

describe('NationalCarbonDashboard process-flow graph', () => {
  it('uses worker cache schema with global sphere and expanded layouts', () => {
    const graph = createProcessFlowGraphFixture();

    expect(graph.schemaVersion).toBe('process_flow_graph_v1');
    expect(graph.indexes.flowById[flowAId]).toBeDefined();
    expect(graph.layouts.sphere3d[flowAId]).toHaveLength(3);
    expect(graph.layouts.expanded2d[flowAId]).toHaveLength(3);
    expect(graph.clusters).toHaveLength(2);
    expect(graph.stats.edgeCount).toBe(4);
  });

  it('highlights selected flow processes and their other non-basic output flows', () => {
    const graph = createProcessFlowGraphFixture();
    const selection = getProcessFlowGraphSelection(graph, flowAId);
    const directFlowAEdges = (graph.adjacency[flowAId] ?? [])
      .map((edgeId) => graph.edges[graph.indexes.edgeById[edgeId]])
      .filter((edge): edge is ProcessFlowGraphEdge => Boolean(edge));
    const processOutputEdges = Array.from(selection.relatedProcessIds).flatMap((processId) =>
      (graph.adjacency[processId] ?? [])
        .map((edgeId) => graph.edges[graph.indexes.edgeById[edgeId]])
        .filter(
          (edge): edge is ProcessFlowGraphEdge => Boolean(edge) && edge.direction === 'output',
        ),
    );
    const otherOutputFlowIds = processOutputEdges
      .map((edge) => edge.flowId)
      .filter((flowId) => flowId !== flowAId);

    expect(directFlowAEdges).toHaveLength(2);
    expect(selection.relatedProcessIds).toEqual(new Set([processOneId, processTwoId]));
    expect(otherOutputFlowIds).toEqual([byproductFlowId, outputFlowId]);
    otherOutputFlowIds.forEach((flowId) => {
      expect(selection.relatedFlowIds.has(flowId)).toBe(true);
    });
  });

  it('returns an empty selection for missing nodes and exposes node lookup fallbacks', () => {
    const graph = createProcessFlowGraphFixture();
    const emptySelection = getProcessFlowGraphSelection(graph);
    const missingSelection = getProcessFlowGraphSelection(graph, 'flow:missing@v1');

    expect(emptySelection).toEqual(createEmptyProcessFlowGraphSelection());
    expect(missingSelection).toEqual(createEmptyProcessFlowGraphSelection());
    expect(getProcessFlowGraphNode(graph)).toBeUndefined();
    expect(getProcessFlowGraphNode(graph, 'flow:missing@v1')).toBeUndefined();
    expect(getProcessFlowGraphNode(graph, flowAId)?.name).toBe('交流电');
  });

  it('highlights process selections and summarizes input and output exchanges', () => {
    const graph = createProcessFlowGraphFixture();
    const selection = getProcessFlowGraphSelection(graph, processOneId);

    expect(selection.selectedNodeId).toBe(processOneId);
    expect(selection.highlightedEdgeIds).toEqual(new Set(['exchange:0', 'exchange:1']));
    expect(selection.inputFlowIds).toEqual(new Set([flowAId]));
    expect(selection.outputFlowIds).toEqual(new Set([byproductFlowId]));
    expect(selection.relatedFlowIds).toEqual(new Set([flowAId, byproductFlowId]));
    expect(selection.relatedProcessIds).toEqual(new Set([processOneId]));
    expect(summarizeProcessFlowSelection(graph, selection)).toEqual({
      highlightedEdges: 2,
      inputEdges: 1,
      outputEdges: 1,
      relatedFlows: 2,
      relatedProcesses: 1,
    });
  });

  it('ignores missing edge ids while keeping highlighted edge counts stable', () => {
    const graph = createProcessFlowGraphFixture();
    const selection = getProcessFlowGraphSelection(graph, processOneId);
    selection.highlightedEdgeIds.add('exchange:missing-summary');

    expect(summarizeProcessFlowSelection(graph, selection)).toEqual({
      highlightedEdges: 3,
      inputEdges: 1,
      outputEdges: 1,
      relatedFlows: 2,
      relatedProcesses: 1,
    });
  });

  it('handles nodes and related processes without adjacency entries', () => {
    const graph = createProcessFlowGraphFixture();
    delete graph.adjacency[outputFlowId];
    delete graph.adjacency[processTwoId];

    const orphanFlowSelection = getProcessFlowGraphSelection(graph, outputFlowId);
    const flowSelection = getProcessFlowGraphSelection(graph, flowAId);

    expect(orphanFlowSelection.selectedFlowId).toBe(outputFlowId);
    expect(orphanFlowSelection.highlightedEdgeIds.size).toBe(0);
    expect(flowSelection.relatedProcessIds).toEqual(new Set([processOneId, processTwoId]));
    expect(flowSelection.highlightedEdgeIds).toEqual(
      new Set(['exchange:0', 'exchange:2', 'exchange:1']),
    );

    delete graph.adjacency[processOneId];

    const orphanProcessSelection = getProcessFlowGraphSelection(graph, processOneId);
    expect(orphanProcessSelection.selectedNodeId).toBe(processOneId);
    expect(orphanProcessSelection.highlightedEdgeIds.size).toBe(0);
  });
});
