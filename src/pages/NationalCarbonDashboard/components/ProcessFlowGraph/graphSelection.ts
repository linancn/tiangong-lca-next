import type {
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
  ProcessFlowGraphNode,
  ProcessFlowGraphNodeSummary,
  ProcessFlowGraphSelection,
} from './graphTypes';

export function createEmptyProcessFlowGraphSelection(): ProcessFlowGraphSelection {
  return {
    highlightedEdgeIds: new Set<string>(),
    highlightedNodeIds: new Set<string>(),
    inputFlowIds: new Set<string>(),
    outputFlowIds: new Set<string>(),
    relatedFlowIds: new Set<string>(),
    relatedProcessIds: new Set<string>(),
  };
}

function getNode(data: ProcessFlowGraphData, nodeId?: string): ProcessFlowGraphNode | undefined {
  if (!nodeId) {
    return undefined;
  }
  const nodeIndex = data.indexes.nodeById[nodeId];
  return nodeIndex === undefined ? undefined : data.nodes[nodeIndex];
}

function getEdge(data: ProcessFlowGraphData, edgeId: string): ProcessFlowGraphEdge | undefined {
  const edgeIndex = data.indexes.edgeById[edgeId];
  return edgeIndex === undefined ? undefined : data.edges[edgeIndex];
}

function addEdgeToSelection(
  data: ProcessFlowGraphData,
  edge: ProcessFlowGraphEdge,
  selection: ProcessFlowGraphSelection,
) {
  selection.highlightedEdgeIds.add(edge.id);
  selection.highlightedNodeIds.add(edge.source);
  selection.highlightedNodeIds.add(edge.target);
  selection.relatedFlowIds.add(edge.flowId);
  selection.relatedProcessIds.add(edge.processId);

  if (edge.direction === 'input') {
    selection.inputFlowIds.add(edge.flowId);
  } else {
    selection.outputFlowIds.add(edge.flowId);
  }

  const sourceNode = getNode(data, edge.source);
  const targetNode = getNode(data, edge.target);

  if (sourceNode?.kind === 'process') {
    selection.relatedProcessIds.add(sourceNode.id);
  }
  if (targetNode?.kind === 'process') {
    selection.relatedProcessIds.add(targetNode.id);
  }
}

export function getProcessFlowGraphSelection(
  data: ProcessFlowGraphData,
  selectedNodeId?: string,
): ProcessFlowGraphSelection {
  const selection = createEmptyProcessFlowGraphSelection();
  const selectedNode = getNode(data, selectedNodeId);

  if (!selectedNode) {
    return selection;
  }

  selection.selectedNodeId = selectedNode.id;
  selection.highlightedNodeIds.add(selectedNode.id);

  if (selectedNode.kind === 'flow') {
    selection.selectedFlowId = selectedNode.id;
    selection.relatedFlowIds.add(selectedNode.id);

    const directEdgeIds = data.adjacency[selectedNode.id] ?? [];
    const relatedProcessIds = new Set<string>();

    directEdgeIds.forEach((edgeId) => {
      const edge = getEdge(data, edgeId);
      if (!edge) {
        return;
      }
      relatedProcessIds.add(edge.processId);
      addEdgeToSelection(data, edge, selection);
    });

    relatedProcessIds.forEach((processId) => {
      const processEdgeIds = data.adjacency[processId] ?? [];
      processEdgeIds.forEach((edgeId) => {
        const edge = getEdge(data, edgeId);
        if (edge) {
          addEdgeToSelection(data, edge, selection);
        }
      });
    });

    return selection;
  }

  const processEdgeIds = data.adjacency[selectedNode.id] ?? [];
  processEdgeIds.forEach((edgeId) => {
    const edge = getEdge(data, edgeId);
    if (edge) {
      addEdgeToSelection(data, edge, selection);
    }
  });

  return selection;
}

export function summarizeProcessFlowSelection(
  data: ProcessFlowGraphData,
  selection: ProcessFlowGraphSelection,
): ProcessFlowGraphNodeSummary {
  let inputEdges = 0;
  let outputEdges = 0;

  selection.highlightedEdgeIds.forEach((edgeId) => {
    const edge = getEdge(data, edgeId);
    if (!edge) {
      return;
    }
    if (edge.direction === 'input') {
      inputEdges += 1;
    } else {
      outputEdges += 1;
    }
  });

  return {
    highlightedEdges: selection.highlightedEdgeIds.size,
    inputEdges,
    outputEdges,
    relatedFlows: selection.relatedFlowIds.size,
    relatedProcesses: selection.relatedProcessIds.size,
  };
}

export function getProcessFlowGraphNode(
  data: ProcessFlowGraphData,
  nodeId?: string,
): ProcessFlowGraphNode | undefined {
  return getNode(data, nodeId);
}
