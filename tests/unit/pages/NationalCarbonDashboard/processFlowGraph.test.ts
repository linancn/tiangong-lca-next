import {
  buildProcessFlowGraphGeoMapView,
  isChinaProcessFlowLocation,
  loadProcessFlowGeoMapAssets,
} from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/geoMapLayout';
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
import { shouldRenderProcessFlowBaseEdges } from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphVisibility';
import type { FeatureCollection, Geometry } from 'geojson';

const flowAId = 'flow:A@v1';
const processOneId = 'process:one@v1';
const processTwoId = 'process:two@v1';
const byproductFlowId = 'flow:byproduct@v1';
const outputFlowId = 'flow:output@v1';
const foreignFlowId = 'flow:foreign@v1';
const foreignProcessId = 'process:foreign@v1';
const regionalFlowId = 'flow:regional@v1';
const unknownCountryFlowId = 'flow:unknown-country@v1';
const noLocationProcessId = 'process:no-location@v1';
const malformedChinaFlowId = 'flow:malformed-china@v1';
const zhejiangFlowId = 'flow:zhejiang@v1';
const hongKongProcessId = 'process:hong-kong@v1';

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

function createGeoMapAssets(): {
  china: FeatureCollection<Geometry, Record<string, unknown>>;
  world: FeatureCollection<Geometry, Record<string, unknown>>;
} {
  return {
    china: {
      features: [
        {
          geometry: {
            coordinates: [
              [
                [109, 20],
                [118, 20],
                [118, 26],
                [109, 26],
                [109, 20],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            adcode: 440000,
            center: [113.280637, 23.125178],
            centroid: [113.429919, 23.334643],
            name: '广东省',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [
                  [118, 27],
                  [123, 27],
                  [123, 31],
                  [118, 31],
                  [118, 27],
                ],
              ],
            ],
            type: 'MultiPolygon',
          },
          properties: {
            adcode: '330000',
            center: [120.153576, 30.287459],
            name: '浙江省',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [117.190182, 39.125596],
            type: 'Point',
          },
          properties: {
            adcode: '120000',
            center: [117.190182, 39.125596],
            name: '天津市',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [113, 21],
                [116, 21],
                [116, 24],
                [113, 24],
                [113, 21],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            adcode: 810000,
            name: '香港特别行政区',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [90, 30],
                [96, 30],
                [96, 36],
                [90, 36],
                [90, 30],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            adcode: 100000,
            center: [104, 35],
            name: '中国',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [10, 10],
                [11, 10],
                [11, 11],
                [10, 11],
                [10, 10],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            adcode: 999999,
            center: [10.5, 10.5],
            name: '未知省份',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [12, 12],
                [13, 12],
                [13, 13],
                [12, 13],
                [12, 12],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            adcode: 999998,
            center: [12.5, 12.5],
            name: ' ',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [1, 1],
                [2, 1],
                [2, 2],
                [1, 2],
                [1, 1],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            adcode: 'bad',
            name: '无效编码',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [3, 3],
                [4, 3],
                [4, 4],
                [3, 4],
                [3, 3],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            name: '缺少编码',
          },
          type: 'Feature',
        },
        {
          geometry: {
            geometries: [],
            type: 'GeometryCollection',
          },
          properties: {
            adcode: 130000,
            center: [115, 38],
            name: '空几何省份',
          },
          type: 'Feature',
        },
      ],
      type: 'FeatureCollection',
    },
    world: {
      features: [
        {
          geometry: {
            coordinates: [
              [
                [72, 18],
                [136, 18],
                [136, 54],
                [72, 54],
                [72, 18],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            ISO_A2: 'CN',
            ISO_A2_EH: 'CN',
            LABEL_X: 104,
            LABEL_Y: 35,
            NAME: 'China',
            NAME_ZH: '中国',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [-125, 25],
                [-66, 25],
                [-66, 49],
                [-125, 49],
                [-125, 25],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            ISO_A2: 'US',
            ISO_A2_EH: 'US',
            LABEL_X: -98,
            LABEL_Y: 39,
            NAME: 'United States of America',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [-8, 50],
                [2, 50],
                [2, 59],
                [-8, 59],
                [-8, 50],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            ISO_A2: 'gb',
            ISO_A2_EH: '-99',
            NAME: 'United Kingdom',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [2, -55],
                [5, -55],
                [5, -53],
                [2, -53],
                [2, -55],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            ISO_A2: 'BV',
            ISO_A2_EH: 'BV',
            NAME: 'Bouvet Island',
          },
          type: 'Feature',
        },
        {
          geometry: {
            coordinates: [
              [
                [30, 0],
                [31, 0],
                [31, 1],
                [30, 1],
                [30, 0],
              ],
            ],
            type: 'Polygon',
          },
          properties: {
            ISO_A2: '-99',
            ISO_A2_EH: '-99',
          },
          type: 'Feature',
        },
        {
          geometry: {
            geometries: [],
            type: 'GeometryCollection',
          },
          properties: {
            ISO_A2: 'AQ',
            ISO_A2_EH: 'AQ',
            NAME: 'Empty geometry country',
          },
          type: 'Feature',
        },
      ],
      type: 'FeatureCollection',
    },
  };
}

function createGraphWithForeignLocation(): ProcessFlowGraphData {
  const graph = createProcessFlowGraphFixture();
  const foreignNodes: ProcessFlowGraphData['nodes'] = [
    {
      category: '运输',
      clusterId: 'transport',
      degree: 1,
      flowType: 'Product flow',
      id: foreignFlowId,
      kind: 'flow',
      location: 'US',
      name: 'Imported service',
      version: '01.00.000',
    },
    {
      category: '运输',
      clusterId: 'transport',
      degree: 1,
      id: foreignProcessId,
      kind: 'process',
      location: 'US',
      name: 'Foreign process',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'regions',
      degree: 0,
      flowType: 'Product flow',
      id: regionalFlowId,
      kind: 'flow',
      location: 'RER',
      name: 'Regional market',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'regions',
      degree: 0,
      flowType: 'Product flow',
      id: unknownCountryFlowId,
      kind: 'flow',
      location: 'AQ',
      name: 'Unknown country market',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'regions',
      degree: 0,
      id: noLocationProcessId,
      kind: 'process',
      name: 'No location process',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'regions',
      degree: 0,
      flowType: 'Product flow',
      id: malformedChinaFlowId,
      kind: 'flow',
      location: 'CN-',
      name: 'Malformed China location',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'regions',
      degree: 0,
      flowType: 'Product flow',
      id: zhejiangFlowId,
      kind: 'flow',
      location: 'CN-ZJ-HZH',
      name: 'Zhejiang local flow',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'regions',
      degree: 0,
      id: hongKongProcessId,
      kind: 'process',
      location: 'CN-HK',
      name: 'Hong Kong process',
      version: '01.00.000',
    },
  ];
  const foreignEdge: ProcessFlowGraphEdge = {
    amount: 5,
    direction: 'input',
    exchangeId: 'exchange:4',
    flowId: foreignFlowId,
    id: 'exchange:4',
    processId: foreignProcessId,
    source: foreignFlowId,
    target: foreignProcessId,
    unit: 'tkm',
  };
  const nextNodes = [...graph.nodes, ...foreignNodes].map((node) =>
    node.id === byproductFlowId ? { ...node, location: 'CN-GD-GZO' } : node,
  );
  const nextEdges = [...graph.edges, foreignEdge];
  const nodeById: ProcessFlowGraphData['indexes']['nodeById'] = {};
  const flowById: ProcessFlowGraphData['indexes']['flowById'] = {};
  const processById: ProcessFlowGraphData['indexes']['processById'] = {};

  nextNodes.forEach((node, index) => {
    nodeById[node.id] = index;
    if (node.kind === 'flow') {
      flowById[node.id] = index;
    } else {
      processById[node.id] = index;
    }
  });

  return {
    ...graph,
    adjacency: {
      ...graph.adjacency,
      [foreignFlowId]: ['exchange:4'],
      [foreignProcessId]: ['exchange:4'],
    },
    clusters: [
      ...graph.clusters,
      { count: 2, id: 'transport', label: '运输' },
      { count: 6, id: 'regions', label: '区域' },
    ],
    edges: nextEdges,
    indexes: {
      edgeById: {
        ...nextEdges.reduce<ProcessFlowGraphData['indexes']['edgeById']>(
          (indexById, edge, index) => {
            indexById[edge.id] = index;
            return indexById;
          },
          {},
        ),
      },
      flowById,
      nodeById,
      processById,
      searchFlows: [
        ...nextNodes
          .filter((node) => node.kind === 'flow')
          .map((node) => ({
            degree: node.degree,
            flowType: node.flowType,
            id: node.id,
            name: node.name,
            version: node.version,
          })),
      ],
    },
    nodes: nextNodes,
    stats: {
      edgeCount: nextEdges.length,
      flowCount: nextNodes.filter((node) => node.kind === 'flow').length,
      maxDegree: Math.max(...nextNodes.map((node) => node.degree)),
      processCount: nextNodes.filter((node) => node.kind === 'process').length,
    },
  };
}

function createDenseLocationGraph(location: string, count: number): ProcessFlowGraphData {
  const baseGraph = createProcessFlowGraphFixture();
  const denseNodes: ProcessFlowGraphData['nodes'] = Array.from({ length: count }, (_, index) => ({
    category: '密集区域',
    clusterId: 'dense',
    degree: 0,
    flowType: 'Product flow',
    id: `flow:dense-${index}@v1`,
    kind: 'flow',
    location,
    name: `Dense flow ${index}`,
    version: '01.00.000',
  }));
  const nodeById: ProcessFlowGraphData['indexes']['nodeById'] = {};
  const flowById: ProcessFlowGraphData['indexes']['flowById'] = {};

  denseNodes.forEach((node, index) => {
    nodeById[node.id] = index;
    flowById[node.id] = index;
  });

  return {
    ...baseGraph,
    adjacency: Object.fromEntries(denseNodes.map((node) => [node.id, []])),
    clusters: [{ count, id: 'dense', label: '密集区域' }],
    edges: [],
    indexes: {
      edgeById: {},
      flowById,
      nodeById,
      processById: {},
      searchFlows: denseNodes.map((node) => ({
        degree: node.degree,
        flowType: node.flowType,
        id: node.id,
        name: node.name,
        version: node.version,
      })),
    },
    nodes: denseNodes,
    stats: {
      edgeCount: 0,
      flowCount: denseNodes.length,
      maxDegree: 0,
      processCount: 0,
    },
  };
}

const originalFetch = global.fetch;

function createMapFetchResponse(
  payload: FeatureCollection<Geometry, Record<string, unknown>>,
  ok = true,
  status = 200,
) {
  return {
    json: jest.fn().mockResolvedValue(payload),
    ok,
    status,
  } as unknown as Response;
}

describe('NationalCarbonDashboard process-flow graph', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses worker cache schema with global sphere and expanded layouts', () => {
    const graph = createProcessFlowGraphFixture();

    expect(graph.schemaVersion).toBe('process_flow_graph_v1');
    expect(graph.indexes.flowById[flowAId]).toBeDefined();
    expect(graph.layouts.sphere3d[flowAId]).toHaveLength(3);
    expect(graph.layouts.expanded2d[flowAId]).toHaveLength(3);
    expect(graph.clusters).toHaveLength(2);
    expect(graph.stats.edgeCount).toBe(4);
  });

  it('classifies China location codes and retries map asset loading after failure', async () => {
    const assets = createGeoMapAssets();
    const failedFetch = jest
      .fn()
      .mockResolvedValue(createMapFetchResponse(assets.world, false, 503));
    global.fetch = failedFetch;

    await expect(loadProcessFlowGeoMapAssets()).rejects.toThrow('failed to fetch map asset: 503');

    const successfulFetch = jest
      .fn()
      .mockResolvedValueOnce(createMapFetchResponse(assets.world))
      .mockResolvedValueOnce(createMapFetchResponse(assets.china));
    global.fetch = successfulFetch;

    await expect(loadProcessFlowGeoMapAssets()).resolves.toEqual(assets);
    await expect(loadProcessFlowGeoMapAssets()).resolves.toEqual(assets);

    expect(successfulFetch).toHaveBeenCalledTimes(2);
    expect(isChinaProcessFlowLocation('cn-gd')).toBe(true);
    expect(isChinaProcessFlowLocation(' CN ')).toBe(true);
    expect(isChinaProcessFlowLocation('US')).toBe(false);
    expect(isChinaProcessFlowLocation('')).toBe(false);
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

  it('builds world and China map scopes while preserving graph selection data', () => {
    const graph = createGraphWithForeignLocation();
    const assets = createGeoMapAssets();

    const worldView = buildProcessFlowGraphGeoMapView(graph, 'world', assets);
    const chinaView = buildProcessFlowGraphGeoMapView(graph, 'china', assets);

    expect(worldView.background.scope).toBe('world');
    expect(worldView.background.paths.map((mapPath) => mapPath.code)).toEqual(
      expect.arrayContaining(['BV', 'CN', 'GB', 'US', undefined]),
    );
    expect(worldView.background.paths.map((mapPath) => mapPath.label)).toEqual(
      expect.arrayContaining(['中国', 'Country']),
    );
    expect(worldView.data.nodes.map((node) => node.id)).toContain(foreignFlowId);
    expect(worldView.data.layouts.geoMap2d?.[foreignFlowId]).toHaveLength(3);
    expect(worldView.data.layouts.geoMap2d?.[byproductFlowId]).toHaveLength(3);
    expect(worldView.data.layouts.geoMap2d?.[regionalFlowId]).toHaveLength(3);
    expect(worldView.data.layouts.geoMap2d?.[unknownCountryFlowId]).toHaveLength(3);
    expect(worldView.data.layouts.geoMap2d?.[noLocationProcessId]).toHaveLength(3);

    const worldWithoutChinaView = buildProcessFlowGraphGeoMapView(graph, 'world', {
      ...assets,
      world: {
        ...assets.world,
        features: assets.world.features.filter((feature) => feature.properties?.ISO_A2 !== 'CN'),
      },
    });
    expect(worldWithoutChinaView.data.layouts.geoMap2d?.[flowAId]).toHaveLength(3);

    expect(chinaView.background.scope).toBe('china');
    expect(chinaView.background.paths.map((mapPath) => mapPath.id)).toEqual(
      expect.arrayContaining(['china:CN-ZJ', 'china:999998', 'china:999999']),
    );
    expect(chinaView.data.nodes.every((node) => node.location?.startsWith('CN'))).toBe(true);
    expect(chinaView.data.nodes.map((node) => node.id)).not.toContain(foreignFlowId);
    expect(chinaView.data.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([malformedChinaFlowId, zhejiangFlowId, hongKongProcessId]),
    );
    expect(chinaView.data.edges.map((edge) => edge.id)).not.toContain('exchange:4');
    expect(chinaView.data.indexes.searchFlows.map((flow) => flow.id)).not.toContain(foreignFlowId);
    expect(chinaView.data.layouts.geoMap2d?.[byproductFlowId]).toHaveLength(3);
    expect(chinaView.data.layouts.geoMap2d?.[malformedChinaFlowId]).toHaveLength(3);
    expect(chinaView.data.layouts.geoMap2d?.[zhejiangFlowId]).toHaveLength(3);

    const chinaSelection = getProcessFlowGraphSelection(chinaView.data, flowAId);
    expect(chinaSelection.highlightedEdgeIds).toEqual(
      new Set(['exchange:0', 'exchange:2', 'exchange:1', 'exchange:3']),
    );
  });

  it('spreads dense world-map country nodes across the location area instead of a ring', () => {
    const worldView = buildProcessFlowGraphGeoMapView(
      createDenseLocationGraph('CN', 32),
      'world',
      createGeoMapAssets(),
    );
    const positions = Object.values(worldView.data.layouts.geoMap2d ?? {});
    const xValues = positions.map(([x]) => x);
    const yValues = positions.map(([, y]) => y);
    const xRange = Math.max(...xValues) - Math.min(...xValues);
    const yRange = Math.max(...yValues) - Math.min(...yValues);

    expect(positions).toHaveLength(32);
    expect(xRange).toBeGreaterThan(70);
    expect(yRange).toBeGreaterThan(40);
  });

  it('uses a compact non-ring fallback for unknown world-map regions', () => {
    const worldView = buildProcessFlowGraphGeoMapView(
      createDenseLocationGraph('UNKNOWN-REGION', 9),
      'world',
      createGeoMapAssets(),
    );
    const positions = Object.values(worldView.data.layouts.geoMap2d ?? {});
    const xValues = positions.map(([x]) => x);
    const yValues = positions.map(([, y]) => y);

    expect(positions).toHaveLength(9);
    expect(Math.max(...xValues) - Math.min(...xValues)).toBeLessThan(80);
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeLessThan(60);
  });

  it('falls back to compact placement when a world-map country area cannot contain samples', () => {
    const assets = createGeoMapAssets();
    const worldView = buildProcessFlowGraphGeoMapView(createDenseLocationGraph('ZZ', 2), 'world', {
      ...assets,
      world: {
        ...assets.world,
        features: [
          ...assets.world.features,
          {
            geometry: {
              coordinates: [
                [20, 20],
                [24, 24],
              ],
              type: 'LineString',
            },
            properties: {
              ISO_A2: 'ZZ',
              ISO_A2_EH: 'ZZ',
              LABEL_X: 22,
              LABEL_Y: 22,
              NAME: 'Line country',
            },
            type: 'Feature',
          },
        ],
      },
    });

    expect(Object.values(worldView.data.layouts.geoMap2d ?? {})).toHaveLength(2);
  });

  it('hides overview base edges in map mode until a node is selected', () => {
    const emptySelection = createEmptyProcessFlowGraphSelection();
    const selectedSelection = getProcessFlowGraphSelection(
      createProcessFlowGraphFixture(),
      flowAId,
    );

    expect(shouldRenderProcessFlowBaseEdges('sphere3d', emptySelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('expanded2d', emptySelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('geoMap2d', emptySelection)).toBe(false);
    expect(shouldRenderProcessFlowBaseEdges('geoMap2d', selectedSelection)).toBe(true);
  });
});
