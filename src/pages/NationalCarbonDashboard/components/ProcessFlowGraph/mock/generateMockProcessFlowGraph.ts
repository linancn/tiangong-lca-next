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

type Vec3 = [number, number, number];

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
const sphereRadius = 310;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const sphereFrontDirection: Vec3 = [0, 0, 1];
const clusterSphereDirections: Record<(typeof clusterIds)[number], Vec3> = {
  chemicals: normalizeVector([-0.72, 0.28, 0.64]),
  energy: normalizeVector([-0.58, -0.5, -0.64]),
  materials: normalizeVector([0.66, -0.28, 0.7]),
  metals: normalizeVector([0.74, 0.34, -0.58]),
  services: normalizeVector([0.08, 0.86, 0.5]),
  transport: normalizeVector([-0.18, 0.76, -0.62]),
  waste: normalizeVector([0.2, -0.86, 0.46]),
};

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

function groupByCluster(nodes: MutableNode[]) {
  return clusterIds.reduce(
    (groups, clusterId) => ({
      ...groups,
      [clusterId]: nodes.filter((node) => node.clusterId === clusterId),
    }),
    {} as Record<(typeof clusterIds)[number], MutableNode[]>,
  );
}

function getPreferredClusterNodes(
  nodes: MutableNode[],
  clusterId: (typeof clusterIds)[number],
  limit: number,
) {
  const preferredNodes = nodes.filter((node) => node.clusterId === clusterId);
  const fallbackNodes = nodes.filter((node) => node.clusterId !== clusterId);

  return [...preferredNodes, ...fallbackNodes].slice(0, limit);
}

function pickFlowForProcess({
  fallbackFlows,
  flowsByCluster,
  process,
  random,
  sharedFlows,
}: {
  fallbackFlows: MutableNode[];
  flowsByCluster: Record<(typeof clusterIds)[number], MutableNode[]>;
  process: MutableNode;
  random: () => number;
  sharedFlows: MutableNode[];
}) {
  if (sharedFlows.length && random() < 0.1) {
    return pick(sharedFlows, random);
  }

  const localFlows =
    flowsByCluster[process.clusterId as (typeof clusterIds)[number]] ?? fallbackFlows;

  return pick(random() < 0.86 && localFlows.length ? localFlows : fallbackFlows, random);
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

function normalizeVector(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function crossVector(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function createSphereBasis(center: Vec3): { tangentX: Vec3; tangentY: Vec3 } {
  const reference: Vec3 = Math.abs(center[1]) > 0.82 ? [1, 0, 0] : [0, 1, 0];
  const tangentX = normalizeVector(crossVector(reference, center));
  const tangentY = normalizeVector(crossVector(center, tangentX));

  return { tangentX, tangentY };
}

function getSphereCapDirection(center: Vec3, angle: number, theta: number): Vec3 {
  const { tangentX, tangentY } = createSphereBasis(center);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  return normalizeVector([
    center[0] * cosAngle + (tangentX[0] * cosTheta + tangentY[0] * sinTheta) * sinAngle,
    center[1] * cosAngle + (tangentX[1] * cosTheta + tangentY[1] * sinTheta) * sinAngle,
    center[2] * cosAngle + (tangentX[2] * cosTheta + tangentY[2] * sinTheta) * sinAngle,
  ]);
}

function getSpherePosition(direction: Vec3, radialJitter = 0): Vec3 {
  const radius = sphereRadius + radialJitter;
  return [direction[0] * radius, direction[1] * radius, direction[2] * radius];
}

function getFlowANeighborhood(edges: ProcessFlowGraphEdge[]) {
  const relatedProcessIds = new Set<string>();
  const relatedFlowIds = new Set<string>([demoFlowAId]);

  edges.forEach((edge) => {
    if (edge.flowId === demoFlowAId) {
      relatedProcessIds.add(edge.processId);
    }
  });
  edges.forEach((edge) => {
    if (relatedProcessIds.has(edge.processId)) {
      relatedFlowIds.add(edge.flowId);
    }
  });

  return { relatedFlowIds, relatedProcessIds };
}

function createSphereLayout(
  nodes: MutableNode[],
  edges: ProcessFlowGraphEdge[],
  random: () => number,
): ProcessFlowGraphLayout {
  const layout: ProcessFlowGraphLayout = {};
  const placedNodeIds = new Set<string>();
  const { relatedFlowIds, relatedProcessIds } = getFlowANeighborhood(edges);
  const relatedProcesses = nodes.filter((node) => relatedProcessIds.has(node.id));
  const relatedFlows = nodes.filter(
    (node) => relatedFlowIds.has(node.id) && node.id !== demoFlowAId,
  );

  layout[demoFlowAId] = getSpherePosition(sphereFrontDirection, 7);
  placedNodeIds.add(demoFlowAId);

  relatedProcesses.forEach((node, index) => {
    const ring = index % 2;
    const angle = 0.17 + ring * 0.08 + (random() - 0.5) * 0.028;
    const theta = index * goldenAngle + (random() - 0.5) * 0.2;
    const direction = getSphereCapDirection(sphereFrontDirection, angle, theta);

    layout[node.id] = getSpherePosition(direction, 5 + random() * 4);
    placedNodeIds.add(node.id);
  });

  relatedFlows.forEach((node, index) => {
    const angle = 0.34 + (index % 3) * 0.07 + (random() - 0.5) * 0.035;
    const theta = index * goldenAngle + Math.PI / 7 + (random() - 0.5) * 0.22;
    const direction = getSphereCapDirection(sphereFrontDirection, angle, theta);

    layout[node.id] = getSpherePosition(direction, 3 + random() * 6);
    placedNodeIds.add(node.id);
  });

  clusterIds.forEach((clusterId) => {
    const clusterNodes = nodes.filter(
      (node) => node.clusterId === clusterId && !placedNodeIds.has(node.id),
    );
    const center = clusterSphereDirections[clusterId];

    clusterNodes.forEach((node, index) => {
      const densityProgress = Math.sqrt((index + 0.5) / Math.max(1, clusterNodes.length));
      const angle =
        0.08 +
        densityProgress * 0.66 +
        (node.kind === 'process' ? 0.03 : 0) +
        (random() - 0.5) * 0.045;
      const theta = index * goldenAngle + random() * 0.24;
      const radialJitter = node.kind === 'process' ? random() * 5 : random() * 8;
      const direction = getSphereCapDirection(center, angle, theta);

      layout[node.id] = getSpherePosition(direction, radialJitter);
      placedNodeIds.add(node.id);
    });
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
  const flowsByCluster = groupByCluster(flows);
  const sharedFlows = (flowsByCluster.materials.length ? flowsByCluster.materials : flows).slice(
    0,
    18,
  );
  const flowAProcesses = getPreferredClusterNodes(
    processes,
    'materials',
    Math.min(14, processes.length),
  );
  const flowAProcessIds = new Set(flowAProcesses.map((process) => process.id));

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

  processes
    .filter((process) => !flowAProcessIds.has(process.id))
    .forEach((process, processIndex) => {
      const exchangeCount = 7 + Math.floor(random() * 8);

      for (let exchangeIndex = 0; exchangeIndex < exchangeCount; exchangeIndex += 1) {
        const flow =
          exchangeIndex % 6 === 0
            ? sharedFlows[processIndex % sharedFlows.length]
            : pickFlowForProcess({
                fallbackFlows: flows,
                flowsByCluster,
                process,
                random,
                sharedFlows,
              });

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
      sphere3d: createSphereLayout(nodes, edges, random),
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
