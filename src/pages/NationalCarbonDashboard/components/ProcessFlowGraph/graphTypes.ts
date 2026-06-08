export type ProcessFlowGraphNodeKind = 'flow' | 'process';

export type ProcessFlowGraphLayoutName = 'sphere3d' | 'expanded2d';

export type ProcessFlowGraphInteractionMode = 'pan' | 'select';

export type ProcessFlowGraphFlowType = string;

export type ProcessFlowGraphEdgeDirection = 'input' | 'output';

export type ProcessFlowGraphCluster = {
  color?: string;
  colorIndex?: number;
  count?: number;
  id: string;
  label: string;
};

export type ProcessFlowGraphNode = {
  category: string;
  clusterId: string;
  degree: number;
  flowType?: ProcessFlowGraphFlowType;
  id: string;
  kind: ProcessFlowGraphNodeKind;
  location?: string;
  name: string;
  version: string;
};

export type ProcessFlowGraphEdge = {
  amount?: number;
  direction: ProcessFlowGraphEdgeDirection;
  exchangeId: string;
  flowId: string;
  id: string;
  processId: string;
  source: string;
  target: string;
  unit?: string;
};

export type ProcessFlowGraphLayout = Record<string, [number, number, number]>;

export type ProcessFlowGraphSearchItem = {
  degree: number;
  flowType?: ProcessFlowGraphFlowType;
  id: string;
  name: string;
  version: string;
};

export type ProcessFlowGraphData = {
  adjacency: Record<string, string[]>;
  buildId: string;
  clusters: ProcessFlowGraphCluster[];
  edges: ProcessFlowGraphEdge[];
  indexes: {
    edgeById: Record<string, number>;
    flowById: Record<string, number>;
    nodeById: Record<string, number>;
    processById: Record<string, number>;
    searchFlows: ProcessFlowGraphSearchItem[];
  };
  layouts: Record<ProcessFlowGraphLayoutName, ProcessFlowGraphLayout>;
  nodes: ProcessFlowGraphNode[];
  schemaVersion: 'process_flow_graph_v1';
  stats: {
    edgeCount: number;
    flowCount: number;
    maxDegree: number;
    processCount: number;
  };
};

export type ProcessFlowGraphSelection = {
  highlightedEdgeIds: Set<string>;
  highlightedNodeIds: Set<string>;
  inputFlowIds: Set<string>;
  outputFlowIds: Set<string>;
  relatedFlowIds: Set<string>;
  relatedProcessIds: Set<string>;
  selectedFlowId?: string;
  selectedNodeId?: string;
};

export type ProcessFlowGraphNodeSummary = {
  highlightedEdges: number;
  inputEdges: number;
  outputEdges: number;
  relatedFlows: number;
  relatedProcesses: number;
};
