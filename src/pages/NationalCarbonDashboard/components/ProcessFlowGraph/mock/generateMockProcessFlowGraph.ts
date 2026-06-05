import { getProcessFlowGraphSelection } from '../graphSelection';
import {
  demoFlowAId,
  type ProcessFlowGraphData,
  type ProcessFlowGraphEdge,
  type ProcessFlowGraphFlowType,
  type ProcessFlowGraphLayout,
  type ProcessFlowGraphNode,
  type ProcessFlowGraphPreset,
} from '../graphTypes';

type MockGraphConfig = {
  flowCount: number;
  processCount: number;
  seed: number;
};

type MutableNode = ProcessFlowGraphNode & {
  degree: number;
};

const clusterIds = [
  'chemicals',
  'metals',
  'energy',
  'materials',
  'transport',
  'services',
  'waste',
] as const;

const clusterLabels: Record<(typeof clusterIds)[number], string> = {
  chemicals: '化工',
  energy: '能源',
  materials: '材料',
  metals: '金属',
  services: '服务',
  transport: '运输',
  waste: '废物流',
};

const flowTypes: ProcessFlowGraphFlowType[] = ['Product flow', 'Waste flow', 'Other flow'];
const locations = ['CN', 'CN-HB', 'CN-GD', 'CN-JS', 'CN-SD', 'CN-ZJ', 'GLO', 'RER'];
const units = ['kg', 'MJ', 't*km', 'm3', 'kWh'];

function getPresetConfig(preset: ProcessFlowGraphPreset): MockGraphConfig {
  if (preset === 'small') {
    return { flowCount: 120, processCount: 48, seed: 25101 };
  }
  if (preset === 'stress') {
    return { flowCount: 8000, processCount: 2400, seed: 25103 };
  }
  return { flowCount: 720, processCount: 260, seed: 25102 };
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function createFlow(index: number, random: () => number): MutableNode {
  const clusterId = pick([...clusterIds], random);
  const flowType = pick(flowTypes, random);

  return {
    category: clusterLabels[clusterId],
    clusterId,
    degree: 0,
    flowType,
    id: `flow:${String(index).padStart(4, '0')}@v1`,
    kind: 'flow',
    location: pick(locations, random),
    name: `${clusterLabels[clusterId]}非基础流 ${String(index).padStart(4, '0')}`,
    version: '01.00.000',
  };
}

function createProcess(index: number, random: () => number): MutableNode {
  const clusterId = pick([...clusterIds], random);

  return {
    category: clusterLabels[clusterId],
    clusterId,
    degree: 0,
    id: `process:${String(index).padStart(4, '0')}@v1`,
    kind: 'process',
    location: pick(locations, random),
    name: `${clusterLabels[clusterId]}过程 ${String(index).padStart(4, '0')}`,
    version: '01.00.000',
  };
}

function addAdjacency(adjacency: Record<string, string[]>, nodeId: string, edgeId: string) {
  adjacency[nodeId] = [...(adjacency[nodeId] ?? []), edgeId];
}

function addExchangeEdge({
  adjacency,
  edges,
  flow,
  process,
  direction,
  random,
}: {
  adjacency: Record<string, string[]>;
  direction: 'input' | 'output';
  edges: ProcessFlowGraphEdge[];
  flow: MutableNode;
  process: MutableNode;
  random: () => number;
}) {
  const edgeId = `exchange:${String(edges.length + 1).padStart(6, '0')}`;
  const edge: ProcessFlowGraphEdge = {
    amount: Number((0.05 + random() * 240).toFixed(3)),
    direction,
    exchangeId: edgeId,
    flowId: flow.id,
    id: edgeId,
    processId: process.id,
    source: direction === 'input' ? flow.id : process.id,
    target: direction === 'input' ? process.id : flow.id,
    unit: pick(units, random),
  };

  edges.push(edge);
  process.degree += 1;
  flow.degree += 1;
  addAdjacency(adjacency, process.id, edgeId);
  addAdjacency(adjacency, flow.id, edgeId);
}

function createSphereLayout(nodes: MutableNode[], random: () => number): ProcessFlowGraphLayout {
  const layout: ProcessFlowGraphLayout = {};
  const radius = 310;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  nodes.forEach((node, index) => {
    const y = 1 - (index / Math.max(1, nodes.length - 1)) * 2;
    const projectionRadius = Math.sqrt(1 - y * y);
    const theta = index * goldenAngle;
    const jitter = node.kind === 'process' ? 10 : 22;
    const x = Math.cos(theta) * projectionRadius * radius + (random() - 0.5) * jitter;
    const z = Math.sin(theta) * projectionRadius * radius + (random() - 0.5) * jitter;

    layout[node.id] = [x, y * radius + (random() - 0.5) * jitter, z];
  });

  return layout;
}

function createExpandedLayout(nodes: MutableNode[], random: () => number): ProcessFlowGraphLayout {
  const layout: ProcessFlowGraphLayout = {};
  const clusterCenters: Record<string, [number, number]> = {};
  const columns = 4;
  const spacingX = 270;
  const spacingY = 205;

  clusterIds.forEach((clusterId, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    clusterCenters[clusterId] = [(column - (columns - 1) / 2) * spacingX, (row - 0.5) * spacingY];
  });

  const clusterCounts = new Map<string, number>();

  nodes.forEach((node) => {
    const clusterIndex = clusterCounts.get(node.clusterId) ?? 0;
    clusterCounts.set(node.clusterId, clusterIndex + 1);

    const center = clusterCenters[node.clusterId] ?? [0, 0];
    const ring = 22 + (clusterIndex % 9) * 12 + (node.kind === 'process' ? 24 : 0);
    const theta = clusterIndex * 2.399963229728653;
    const x = center[0] + Math.cos(theta) * ring + (random() - 0.5) * 24;
    const y = center[1] + Math.sin(theta) * ring + (random() - 0.5) * 24;
    const z = node.kind === 'process' ? 16 + random() * 26 : random() * 18;

    layout[node.id] = [x, y, z];
  });

  return layout;
}

function buildIndexes(nodes: MutableNode[], edges: ProcessFlowGraphEdge[]) {
  const nodeById: Record<string, number> = {};
  const flowById: Record<string, number> = {};
  const processById: Record<string, number> = {};
  const edgeById: Record<string, number> = {};

  nodes.forEach((node, index) => {
    nodeById[node.id] = index;
    if (node.kind === 'flow') {
      flowById[node.id] = index;
    } else {
      processById[node.id] = index;
    }
  });
  edges.forEach((edge, index) => {
    edgeById[edge.id] = index;
  });

  const searchFlows = nodes
    .filter((node) => node.kind === 'flow')
    .sort(
      (left, right) => right.degree - left.degree || left.name.localeCompare(right.name, 'zh-CN'),
    )
    .slice(0, 80)
    .map((node) => ({
      degree: node.degree,
      flowType: node.flowType,
      id: node.id,
      name: node.name,
      version: node.version,
    }));

  return {
    edgeById,
    flowById,
    nodeById,
    processById,
    searchFlows,
  };
}

export function generateMockProcessFlowGraph(
  preset: ProcessFlowGraphPreset = 'demo',
): ProcessFlowGraphData {
  const config = getPresetConfig(preset);
  const random = createSeededRandom(config.seed);
  const flows = Array.from({ length: config.flowCount }, (_, index) =>
    createFlow(index + 1, random),
  );
  const processes = Array.from({ length: config.processCount }, (_, index) =>
    createProcess(index + 1, random),
  );
  const flowA: MutableNode = {
    category: '材料',
    clusterId: 'materials',
    degree: 0,
    flowType: 'Product flow',
    id: demoFlowAId,
    kind: 'flow',
    location: 'CN',
    name: 'Flow A',
    version: '01.00.000',
  };
  const nodes = [flowA, ...flows, ...processes];
  const edges: ProcessFlowGraphEdge[] = [];
  const adjacency: Record<string, string[]> = {};
  const sharedFlows = flows.slice(0, 18);
  const flowAProcesses = processes.slice(0, Math.min(14, processes.length));

  flowAProcesses.forEach((process, index) => {
    addExchangeEdge({
      adjacency,
      direction: index % 2 === 0 ? 'input' : 'output',
      edges,
      flow: flowA,
      process,
      random,
    });

    const exchangeCount = 9 + Math.floor(random() * 5);
    for (let exchangeIndex = 0; exchangeIndex < exchangeCount; exchangeIndex += 1) {
      const sharedFlow = sharedFlows[(index * 3 + exchangeIndex) % sharedFlows.length];
      addExchangeEdge({
        adjacency,
        direction: exchangeIndex % 3 === 0 ? 'output' : 'input',
        edges,
        flow: sharedFlow,
        process,
        random,
      });
    }
  });

  processes.slice(flowAProcesses.length).forEach((process, processIndex) => {
    const exchangeCount = 7 + Math.floor(random() * 8);

    for (let exchangeIndex = 0; exchangeIndex < exchangeCount; exchangeIndex += 1) {
      const flowIndex =
        exchangeIndex % 5 === 0
          ? processIndex % sharedFlows.length
          : Math.floor(random() * flows.length);
      const flow = exchangeIndex % 5 === 0 ? sharedFlows[flowIndex] : flows[flowIndex];

      addExchangeEdge({
        adjacency,
        direction: random() > 0.54 ? 'output' : 'input',
        edges,
        flow,
        process,
        random,
      });
    }
  });

  const indexes = buildIndexes(nodes, edges);
  const selection = getProcessFlowGraphSelection(
    {
      adjacency,
      buildId: 'mock-prebuild',
      edges,
      indexes,
      layouts: { expanded2d: {}, sphere3d: {} },
      nodes,
      schemaVersion: 'process_flow_graph_mock_v1',
      stats: {
        edgeCount: edges.length,
        flowCount: flows.length + 1,
        highlightedDemoEdges: 0,
        maxDegree: 0,
        processCount: processes.length,
      },
    },
    demoFlowAId,
  );

  return {
    adjacency,
    buildId: `mock-${preset}-20260605`,
    edges,
    indexes,
    layouts: {
      expanded2d: createExpandedLayout(nodes, random),
      sphere3d: createSphereLayout(nodes, random),
    },
    nodes,
    schemaVersion: 'process_flow_graph_mock_v1',
    stats: {
      edgeCount: edges.length,
      flowCount: flows.length + 1,
      highlightedDemoEdges: selection.highlightedEdgeIds.size,
      maxDegree: nodes.reduce((maxDegree, node) => Math.max(maxDegree, node.degree), 0),
      processCount: processes.length,
    },
  };
}
