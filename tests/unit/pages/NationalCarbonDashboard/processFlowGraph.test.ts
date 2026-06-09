import {
  buildCategorizedExpandedLayout,
  summarizeCategorizedExpandedLayout,
} from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/expandedLayout';
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
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

const flowAId = 'flow:A@v1';
const processOneId = 'process:one@v1';
const processTwoId = 'process:two@v1';
const byproductFlowId = 'flow:byproduct@v1';
const outputFlowId = 'flow:output@v1';
const foreignFlowId = 'flow:foreign@v1';
const foreignProcessId = 'process:foreign@v1';
const regionalFlowId = 'flow:regional@v1';
const unknownCountryFlowId = 'flow:unknown-country@v1';
const noLocationFlowId = 'flow:no-location@v1';
const stableNoLocationFlowId = 'flow:stable-no-location@v1';
const noLocationProcessId = 'process:no-location@v1';
const malformedChinaFlowId = 'flow:malformed-china@v1';
const zhejiangFlowId = 'flow:zhejiang@v1';
const hongKongProcessId = 'process:hong-kong@v1';
const testWorldViewBox = {
  height: 640,
  padding: 28,
  width: 1120,
} as const;

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

function createScatteredCategorizedExpandedFixture(): ProcessFlowGraphData {
  const clusterIds = ['energy', 'materials', 'transport'] as const;
  const scatteredLayout: Array<{
    clusterId: (typeof clusterIds)[number];
    id: string;
    kind: ProcessFlowGraphData['nodes'][number]['kind'];
    position: [number, number, number];
  }> = [
    { clusterId: 'energy', id: 'energy-a', kind: 'process', position: [-420, -220, 6] },
    { clusterId: 'materials', id: 'materials-a', kind: 'process', position: [-250, 180, 6] },
    { clusterId: 'transport', id: 'transport-a', kind: 'process', position: [-40, -260, 6] },
    { clusterId: 'energy', id: 'energy-b', kind: 'flow', position: [220, 210, 0] },
    { clusterId: 'materials', id: 'materials-b', kind: 'flow', position: [20, -120, 0] },
    { clusterId: 'transport', id: 'transport-b', kind: 'flow', position: [390, 160, 0] },
    { clusterId: 'energy', id: 'energy-c', kind: 'process', position: [460, -180, 6] },
    { clusterId: 'materials', id: 'materials-c', kind: 'process', position: [300, -260, 6] },
    { clusterId: 'transport', id: 'transport-c', kind: 'process', position: [-360, 260, 6] },
  ];
  const nodes = scatteredLayout.map<ProcessFlowGraphData['nodes'][number]>((item, index) => ({
    category: item.clusterId,
    clusterId: item.clusterId,
    degree: scatteredLayout.length - index,
    flowType: item.kind === 'flow' ? 'Product flow' : undefined,
    id: `node:${item.id}`,
    kind: item.kind,
    location: 'CN',
    name: item.id,
    version: '01.00.000',
  }));
  const nodeById = Object.fromEntries(nodes.map((node, index) => [node.id, index]));
  const flowById = Object.fromEntries(
    nodes
      .map((node, index) => [node, index] as const)
      .filter(([node]) => node.kind === 'flow')
      .map(([node, index]) => [node.id, index]),
  );
  const processById = Object.fromEntries(
    nodes
      .map((node, index) => [node, index] as const)
      .filter(([node]) => node.kind === 'process')
      .map(([node, index]) => [node.id, index]),
  );
  const expanded2d = Object.fromEntries(
    scatteredLayout.map((item) => [`node:${item.id}`, item.position]),
  ) as ProcessFlowGraphData['layouts']['expanded2d'];

  return {
    adjacency: Object.fromEntries(nodes.map((node) => [node.id, []])),
    buildId: 'categorized-expanded-fixture',
    clusters: clusterIds.map((clusterId) => ({
      count: nodes.filter((node) => node.clusterId === clusterId).length,
      id: clusterId,
      label: clusterId,
    })),
    edges: [],
    indexes: {
      edgeById: {},
      flowById,
      nodeById,
      processById,
      searchFlows: nodes
        .filter((node) => node.kind === 'flow')
        .map((node) => ({
          degree: node.degree,
          flowType: node.flowType,
          id: node.id,
          name: node.name,
          version: node.version,
        })),
    },
    layouts: {
      expanded2d,
      sphere3d: expanded2d,
    },
    nodes,
    schemaVersion: 'process_flow_graph_v1',
    stats: {
      edgeCount: 0,
      flowCount: Object.keys(flowById).length,
      maxDegree: scatteredLayout.length,
      processCount: Object.keys(processById).length,
    },
  };
}

function createDenseCategorizedExpandedFixture(): ProcessFlowGraphData {
  const clusterIds = ['energy', 'materials', 'transport', 'waste', 'water', 'chemical'] as const;
  const nodeCount = 1200;
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const clusterId = clusterIds[index % clusterIds.length];
    const angle = index * 2.399963229728653;
    const radius = Math.sqrt((index + 0.5) / nodeCount) * 520;

    return {
      category: clusterId,
      clusterId,
      degree: nodeCount - index,
      flowType: index % 3 === 0 ? 'Product flow' : undefined,
      id: `dense:${clusterId}:${index}`,
      kind: index % 3 === 0 ? 'flow' : 'process',
      location: 'CN',
      name: `dense ${clusterId} ${index}`,
      position: [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.62,
        index % 3 === 0 ? 0 : 6,
      ],
      version: '01.00.000',
    } satisfies ProcessFlowGraphData['nodes'][number] & { position: [number, number, number] };
  });
  const graphNodes = nodes.map((node) => ({
    category: node.category,
    clusterId: node.clusterId,
    degree: node.degree,
    flowType: node.flowType,
    id: node.id,
    kind: node.kind,
    location: node.location,
    name: node.name,
    version: node.version,
  }));
  const nodeById = Object.fromEntries(graphNodes.map((node, index) => [node.id, index]));
  const flowById = Object.fromEntries(
    graphNodes
      .map((node, index) => [node, index] as const)
      .filter(([node]) => node.kind === 'flow')
      .map(([node, index]) => [node.id, index]),
  );
  const processById = Object.fromEntries(
    graphNodes
      .map((node, index) => [node, index] as const)
      .filter(([node]) => node.kind === 'process')
      .map(([node, index]) => [node.id, index]),
  );
  const expanded2d = Object.fromEntries(nodes.map((node) => [node.id, node.position]));

  return {
    adjacency: Object.fromEntries(graphNodes.map((node) => [node.id, []])),
    buildId: 'dense-categorized-expanded-fixture',
    clusters: clusterIds.map((clusterId) => ({
      count: graphNodes.filter((node) => node.clusterId === clusterId).length,
      id: clusterId,
      label: clusterId,
    })),
    edges: [],
    indexes: {
      edgeById: {},
      flowById,
      nodeById,
      processById,
      searchFlows: graphNodes
        .filter((node) => node.kind === 'flow')
        .map((node) => ({
          degree: node.degree,
          flowType: node.flowType,
          id: node.id,
          name: node.name,
          version: node.version,
        })),
    },
    layouts: {
      expanded2d: expanded2d as ProcessFlowGraphData['layouts']['expanded2d'],
      sphere3d: expanded2d as ProcessFlowGraphData['layouts']['sphere3d'],
    },
    nodes: graphNodes,
    schemaVersion: 'process_flow_graph_v1',
    stats: {
      edgeCount: 0,
      flowCount: Object.keys(flowById).length,
      maxDegree: nodeCount,
      processCount: Object.keys(processById).length,
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

function getWorldFeatureSceneBounds(
  world: FeatureCollection<Geometry, Record<string, unknown>>,
  feature: Feature<Geometry, Record<string, unknown>>,
) {
  const projection = geoNaturalEarth1().fitExtent(
    [
      [testWorldViewBox.padding, testWorldViewBox.padding],
      [
        testWorldViewBox.width - testWorldViewBox.padding,
        testWorldViewBox.height - testWorldViewBox.padding,
      ],
    ],
    world,
  );
  const [[left, top], [right, bottom]] = geoPath(projection).bounds(feature);

  return {
    maxX: right - testWorldViewBox.width / 2,
    maxY: testWorldViewBox.height / 2 - top,
    minX: left - testWorldViewBox.width / 2,
    minY: testWorldViewBox.height / 2 - bottom,
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
      clusterId: 'energy',
      degree: 1,
      flowType: 'Product flow',
      id: noLocationFlowId,
      kind: 'flow',
      name: 'No location flow',
      version: '01.00.000',
    },
    {
      category: '区域',
      clusterId: 'energy',
      degree: 2,
      flowType: 'Product flow',
      id: stableNoLocationFlowId,
      kind: 'flow',
      name: 'Stable no location flow',
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
  const noLocationFlowForeignEdge: ProcessFlowGraphEdge = {
    amount: 6,
    direction: 'input',
    exchangeId: 'exchange:5',
    flowId: noLocationFlowId,
    id: 'exchange:5',
    processId: foreignProcessId,
    source: noLocationFlowId,
    target: foreignProcessId,
    unit: 'kg',
  };
  const noLocationFlowEdge: ProcessFlowGraphEdge = {
    amount: 7,
    direction: 'input',
    exchangeId: 'exchange:6',
    flowId: noLocationFlowId,
    id: 'exchange:6',
    processId: processOneId,
    source: noLocationFlowId,
    target: processOneId,
    unit: 'kg',
  };
  const noLocationFlowNoLocationProcessEdge: ProcessFlowGraphEdge = {
    amount: 8,
    direction: 'input',
    exchangeId: 'exchange:7',
    flowId: noLocationFlowId,
    id: 'exchange:7',
    processId: noLocationProcessId,
    source: noLocationFlowId,
    target: noLocationProcessId,
    unit: 'kg',
  };
  const noLocationFlowMissingProcessEdge: ProcessFlowGraphEdge = {
    amount: 9,
    direction: 'input',
    exchangeId: 'exchange:8',
    flowId: noLocationFlowId,
    id: 'exchange:8',
    processId: 'process:missing@v1',
    source: noLocationFlowId,
    target: 'process:missing@v1',
    unit: 'kg',
  };
  const stableNoLocationFlowChinaEdge: ProcessFlowGraphEdge = {
    amount: 10,
    direction: 'input',
    exchangeId: 'exchange:9',
    flowId: stableNoLocationFlowId,
    id: 'exchange:9',
    processId: hongKongProcessId,
    source: stableNoLocationFlowId,
    target: hongKongProcessId,
    unit: 'kg',
  };
  const stableNoLocationFlowForeignEdge: ProcessFlowGraphEdge = {
    amount: 11,
    direction: 'input',
    exchangeId: 'exchange:10',
    flowId: stableNoLocationFlowId,
    id: 'exchange:10',
    processId: foreignProcessId,
    source: stableNoLocationFlowId,
    target: foreignProcessId,
    unit: 'kg',
  };
  const nextNodes = [...graph.nodes, ...foreignNodes].map((node) =>
    node.id === byproductFlowId ? { ...node, location: 'CN-GD-GZO' } : node,
  );
  const nextEdges = [
    ...graph.edges,
    foreignEdge,
    noLocationFlowForeignEdge,
    noLocationFlowEdge,
    noLocationFlowNoLocationProcessEdge,
    noLocationFlowMissingProcessEdge,
    stableNoLocationFlowChinaEdge,
    stableNoLocationFlowForeignEdge,
  ];
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
      [foreignProcessId]: ['exchange:4', 'exchange:5', 'exchange:10'],
      [hongKongProcessId]: ['exchange:9'],
      [noLocationFlowId]: ['exchange:5', 'exchange:6', 'exchange:7', 'exchange:8'],
      [noLocationProcessId]: ['exchange:7'],
      [processOneId]: [...(graph.adjacency[processOneId] ?? []), 'exchange:6'],
      [stableNoLocationFlowId]: ['exchange:9', 'exchange:10'],
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

  it('rebuilds expanded layout into category groups while preserving the graph outline', () => {
    const graph = createScatteredCategorizedExpandedFixture();
    const originalSummary = summarizeCategorizedExpandedLayout(graph, graph.layouts.expanded2d);
    const categorizedLayout = buildCategorizedExpandedLayout(graph);
    const categorizedSummary = summarizeCategorizedExpandedLayout(graph, categorizedLayout);

    expect(Object.keys(categorizedLayout)).toHaveLength(graph.nodes.length);
    Object.values(categorizedLayout).forEach((position) => {
      expect(position.every(Number.isFinite)).toBe(true);
    });
    expect(categorizedSummary.clusterCount).toBe(3);
    expect(categorizedSummary.meanClusterDistance).toBeLessThan(
      originalSummary.meanClusterDistance * 0.72,
    );
    expect(categorizedSummary.width).toBeGreaterThan(originalSummary.width * 0.62);
    expect(categorizedSummary.height).toBeGreaterThan(originalSummary.height * 0.62);
  });

  it('fills the expanded outline instead of leaving a central void', () => {
    const graph = createDenseCategorizedExpandedFixture();
    const categorizedLayout = buildCategorizedExpandedLayout(graph);
    const categorizedSummary = summarizeCategorizedExpandedLayout(graph, categorizedLayout);

    expect(categorizedSummary.clusterCount).toBe(6);
    expect(categorizedSummary.filledCellRatio).toBeGreaterThan(0.82);
    expect(categorizedSummary.centralFilledCellRatio).toBeGreaterThan(0.9);
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
    expect(selection.highlightedNodeIds).toEqual(
      new Set([flowAId, processOneId, processTwoId, byproductFlowId, outputFlowId]),
    );
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
    expect(selection.highlightedNodeIds).toEqual(new Set([processOneId, flowAId, byproductFlowId]));
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
    expect(worldView.data.layouts.geoMap2d?.[noLocationFlowId]).toHaveLength(3);
    expect(worldView.data.layouts.geoMap2d?.[stableNoLocationFlowId]).toHaveLength(3);
    expect(worldView.data.layouts.geoMap2d?.[unknownCountryFlowId]).toBeUndefined();
    expect(worldView.data.layouts.geoMap2d?.[noLocationProcessId]).toBeUndefined();

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
    expect(
      chinaView.data.nodes.every((node) => node.kind === 'flow' || node.location?.startsWith('CN')),
    ).toBe(true);
    expect(chinaView.data.nodes.map((node) => node.id)).not.toContain(foreignFlowId);
    expect(chinaView.data.nodes.map((node) => node.id)).not.toContain(malformedChinaFlowId);
    expect(chinaView.data.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        noLocationFlowId,
        stableNoLocationFlowId,
        zhejiangFlowId,
        hongKongProcessId,
      ]),
    );
    expect(chinaView.data.edges.map((edge) => edge.id)).not.toContain('exchange:4');
    expect(chinaView.data.indexes.searchFlows.map((flow) => flow.id)).not.toContain(foreignFlowId);
    expect(chinaView.data.layouts.geoMap2d?.[byproductFlowId]).toHaveLength(3);
    expect(chinaView.data.layouts.geoMap2d?.[malformedChinaFlowId]).toBeUndefined();
    expect(chinaView.data.layouts.geoMap2d?.[stableNoLocationFlowId]).toHaveLength(3);
    expect(chinaView.data.layouts.geoMap2d?.[zhejiangFlowId]).toHaveLength(3);

    const chinaSelection = getProcessFlowGraphSelection(chinaView.data, flowAId);
    expect(chinaSelection.highlightedEdgeIds).toEqual(
      new Set(['exchange:0', 'exchange:2', 'exchange:1', 'exchange:6', 'exchange:3']),
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

  it('keeps dense small-country nodes inside the feature bounds', () => {
    const assets = createGeoMapAssets();
    const tinyCountry: Feature<Geometry, Record<string, unknown>> = {
      geometry: {
        coordinates: [
          [
            [20, 10],
            [20.35, 10],
            [20.35, 10.35],
            [20, 10.35],
            [20, 10],
          ],
        ],
        type: 'Polygon',
      },
      properties: {
        ISO_A2: 'TS',
        ISO_A2_EH: 'TS',
        LABEL_X: 20.175,
        LABEL_Y: 10.175,
        NAME: 'Tiny sample country',
      },
      type: 'Feature',
    };
    const world = {
      ...assets.world,
      features: [...assets.world.features, tinyCountry],
    };
    const worldView = buildProcessFlowGraphGeoMapView(createDenseLocationGraph('TS', 64), 'world', {
      ...assets,
      world,
    });
    const positions = Object.values(worldView.data.layouts.geoMap2d ?? {});
    const bounds = getWorldFeatureSceneBounds(world, tinyCountry);

    expect(positions).toHaveLength(64);
    positions.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(bounds.minX - 0.01);
      expect(x).toBeLessThanOrEqual(bounds.maxX + 0.01);
      expect(y).toBeGreaterThanOrEqual(bounds.minY - 0.01);
      expect(y).toBeLessThanOrEqual(bounds.maxY + 0.01);
    });
  });

  it('uses the primary country map unit when a world code has overseas units', () => {
    const assets = createGeoMapAssets();
    const mainland: Feature<Geometry, Record<string, unknown>> = {
      geometry: {
        coordinates: [
          [
            [20, 10],
            [24, 10],
            [24, 14],
            [20, 14],
            [20, 10],
          ],
        ],
        type: 'Polygon',
      },
      properties: {
        ADMIN: 'Testland',
        GEOUNIT: 'Testland',
        HOMEPART: 1,
        ISO_A2: 'TS',
        ISO_A2_EH: 'TS',
        LABEL_X: 22,
        LABEL_Y: 12,
        NAME: 'Testland',
      },
      type: 'Feature',
    };
    const overseasUnit: Feature<Geometry, Record<string, unknown>> = {
      geometry: {
        coordinates: [
          [
            [-40, -30],
            [-36, -30],
            [-36, -26],
            [-40, -26],
            [-40, -30],
          ],
        ],
        type: 'Polygon',
      },
      properties: {
        ADMIN: 'Testland',
        GEOUNIT: 'Testland Island',
        HOMEPART: -99,
        ISO_A2: '-99',
        ISO_A2_EH: 'TS',
        LABEL_X: -38,
        LABEL_Y: -28,
        NAME: 'Testland Island',
      },
      type: 'Feature',
    };
    const world = {
      ...assets.world,
      features: [...assets.world.features, mainland, overseasUnit],
    };
    const worldView = buildProcessFlowGraphGeoMapView(createDenseLocationGraph('TS', 8), 'world', {
      ...assets,
      world,
    });
    const positions = Object.values(worldView.data.layouts.geoMap2d ?? {});
    const mainlandBounds = getWorldFeatureSceneBounds(world, mainland);

    expect(positions).toHaveLength(8);
    positions.forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(mainlandBounds.minX - 0.01);
      expect(x).toBeLessThanOrEqual(mainlandBounds.maxX + 0.01);
      expect(y).toBeGreaterThanOrEqual(mainlandBounds.minY - 0.01);
      expect(y).toBeLessThanOrEqual(mainlandBounds.maxY + 0.01);
    });
  });

  it('omits unknown world-map regions instead of placing them in a fallback block', () => {
    const worldView = buildProcessFlowGraphGeoMapView(
      createDenseLocationGraph('UNKNOWN-REGION', 9),
      'world',
      createGeoMapAssets(),
    );
    const positions = Object.values(worldView.data.layouts.geoMap2d ?? {});

    expect(worldView.data.nodes).toHaveLength(0);
    expect(positions).toHaveLength(0);
  });

  it('keeps China map usable when no province area can be built', () => {
    const assets = createGeoMapAssets();
    const chinaView = buildProcessFlowGraphGeoMapView(createDenseLocationGraph('CN', 2), 'china', {
      ...assets,
      china: {
        ...assets.china,
        features: [],
      },
    });
    const positions = Object.values(chinaView.data.layouts.geoMap2d ?? {});

    expect(chinaView.background.paths).toHaveLength(0);
    expect(positions).toHaveLength(2);
  });

  it('samples world-map polygon areas with holes', () => {
    const assets = createGeoMapAssets();
    const worldView = buildProcessFlowGraphGeoMapView(createDenseLocationGraph('XY', 24), 'world', {
      ...assets,
      world: {
        ...assets.world,
        features: [
          ...assets.world.features,
          {
            geometry: {
              coordinates: [
                [
                  [-60, -30],
                  [60, -30],
                  [60, 30],
                  [-60, 30],
                  [-60, -30],
                ],
                [
                  [-50, -24],
                  [50, -24],
                  [50, 24],
                  [-50, 24],
                  [-50, -24],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              ISO_A2: 'XY',
              ISO_A2_EH: 'XY',
              LABEL_X: 0,
              LABEL_Y: 0,
              NAME: 'Holed country',
            },
            type: 'Feature',
          },
        ],
      },
    });

    expect(Object.values(worldView.data.layouts.geoMap2d ?? {})).toHaveLength(24);
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

  it('hides base edges in map overview and all selected views', () => {
    const emptySelection = createEmptyProcessFlowGraphSelection();
    const selectedSelection = getProcessFlowGraphSelection(
      createProcessFlowGraphFixture(),
      flowAId,
    );

    expect(shouldRenderProcessFlowBaseEdges('sphere3d', emptySelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('expanded2d', emptySelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('geoMap2d', emptySelection)).toBe(false);
    expect(shouldRenderProcessFlowBaseEdges('sphere3d', selectedSelection)).toBe(false);
    expect(shouldRenderProcessFlowBaseEdges('expanded2d', selectedSelection)).toBe(false);
    expect(shouldRenderProcessFlowBaseEdges('geoMap2d', selectedSelection)).toBe(false);
  });
});
