import { captureNodePositions, pushAutoLayoutHistoryCommand } from '@/components/X6Graph/history';
import type { Graph } from '@antv/x6';
import dagre from '@dagrejs/dagre';

type DagreRankDir = 'LR' | 'TB';

const MIN_NODE_SIZE = 1;

export const applyDagreLayout = (
  graph: Graph,
  rankdir: DagreRankDir = 'LR',
  options: Record<string, any> = {},
) => {
  const nodes = graph.getNodes();
  if (nodes.length === 0) {
    return false;
  }

  const edges = graph.getEdges();
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: true });
  dagreGraph.setGraph({
    rankdir,
    nodesep: 88,
    edgesep: 24,
    ranksep: 170,
    marginx: 36,
    marginy: 36,
    acyclicer: 'greedy',
    ranker: 'network-simplex',
  });

  nodes.forEach((node) => {
    const size = node.getSize();
    dagreGraph.setNode(node.id, {
      width: Math.max(size.width, MIN_NODE_SIZE),
      height: Math.max(size.height, MIN_NODE_SIZE),
    });
  });

  edges.forEach((edge) => {
    const source = edge.getSourceCellId();
    const target = edge.getTargetCellId();
    if (!source || !target || source === target) {
      return;
    }
    if (!dagreGraph.hasNode(source) || !dagreGraph.hasNode(target)) {
      return;
    }
    dagreGraph.setEdge(
      source,
      target,
      {
        minlen: 1,
        weight: 2,
      },
      edge.id,
    );
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const layoutNode = dagreGraph.node(node.id) as {
      x: number;
      y: number;
      width: number;
      height: number;
    };

    node.position(
      layoutNode.x - layoutNode.width / 2,
      layoutNode.y - layoutNode.height / 2,
      options,
    );
  });

  return true;
};

export const applyDagreLayoutWithHistory = (graph: Graph, rankdir: DagreRankDir = 'LR') => {
  const before = captureNodePositions(graph);
  const didLayout = applyDagreLayout(graph, rankdir, {
    ignoreHistory: true,
  });

  if (!didLayout) {
    return false;
  }

  const after = captureNodePositions(graph);
  pushAutoLayoutHistoryCommand(graph, before, after, {
    reason: 'auto-layout',
  });

  return true;
};
