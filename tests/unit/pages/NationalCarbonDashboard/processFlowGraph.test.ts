import { getProcessFlowGraphSelection } from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphSelection';
import { demoFlowAId } from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphTypes';
import { generateMockProcessFlowGraph } from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/mock/generateMockProcessFlowGraph';

describe('NationalCarbonDashboard process-flow graph mock', () => {
  it('builds a deterministic graph with Flow A and two layouts', () => {
    const graph = generateMockProcessFlowGraph('small');

    expect(graph.schemaVersion).toBe('process_flow_graph_mock_v1');
    expect(graph.indexes.flowById[demoFlowAId]).toBeDefined();
    expect(graph.layouts.sphere3d[demoFlowAId]).toHaveLength(3);
    expect(graph.layouts.expanded2d[demoFlowAId]).toHaveLength(3);
    expect(graph.stats.flowCount).toBeGreaterThan(100);
    expect(graph.stats.processCount).toBeGreaterThan(40);
    expect(graph.stats.edgeCount).toBeGreaterThan(300);
  });

  it('highlights Flow A processes and their other non-basic flow outputs', () => {
    const graph = generateMockProcessFlowGraph('small');
    const selection = getProcessFlowGraphSelection(graph, demoFlowAId);
    const directFlowAEdges = (graph.adjacency[demoFlowAId] ?? [])
      .map((edgeId) => graph.edges[graph.indexes.edgeById[edgeId]])
      .filter(Boolean);
    const processOutputEdges = Array.from(selection.relatedProcessIds).flatMap((processId) =>
      (graph.adjacency[processId] ?? [])
        .map((edgeId) => graph.edges[graph.indexes.edgeById[edgeId]])
        .filter((edge) => edge?.direction === 'output'),
    );
    const otherOutputFlowIds = processOutputEdges
      .map((edge) => edge.flowId)
      .filter((flowId) => flowId !== demoFlowAId);

    expect(directFlowAEdges.length).toBeGreaterThanOrEqual(8);
    expect(selection.relatedProcessIds.size).toBeGreaterThanOrEqual(8);
    expect(otherOutputFlowIds.length).toBeGreaterThan(0);
    otherOutputFlowIds.forEach((flowId) => {
      expect(selection.relatedFlowIds.has(flowId)).toBe(true);
    });
  });
});
