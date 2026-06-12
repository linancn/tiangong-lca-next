import {
  createEmptyProcessFlowGraphSelection,
  getProcessFlowGraphNode,
  getProcessFlowGraphSelection,
  summarizeProcessFlowSelection,
} from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphSelection';
import { shouldRenderProcessFlowBaseEdges } from '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphVisibility';
import {
  DecompressionStream as NodeDecompressionStream,
  ReadableStream as NodeReadableStream,
} from 'node:stream/web';
import { gzipSync } from 'zlib';

const mockRequestNationalCarbonGraphCacheObjectsApi = jest.fn();

jest.mock('@/services/nationalCarbonGraphCache/objects', () => ({
  __esModule: true,
  requestNationalCarbonGraphCacheObjectsApi: (...args: any[]) =>
    mockRequestNationalCarbonGraphCacheObjectsApi(...args),
}));

const {
  loadProcessFlowGraphFromCache,
  loadProcessFlowGraphGeoMapViewFromCache,
  resetProcessFlowGraphCacheLoaderStateForTest,
} =
  require('@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/processFlowGraphCacheLoader') as typeof import('@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/processFlowGraphCacheLoader');

type ProcessFlowGraphData =
  import('@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphTypes').ProcessFlowGraphData;
type ProcessFlowGraphEdge =
  import('@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphTypes').ProcessFlowGraphEdge;

const flowAId = 'flow:A@v1';
const processOneId = 'process:one@v1';
const processTwoId = 'process:two@v1';
const byproductFlowId = 'flow:byproduct@v1';
const outputFlowId = 'flow:output@v1';
const cacheBaseUrl = 'https://cache.test/process-flow-graph';
const supabaseS3CacheBaseUrl =
  'https://fotofiyqnuyvgtotswie.supabase.co/storage/v1/s3/lca_results/national-carbon/process-flow-graph/v1';

const nodes: ProcessFlowGraphData['nodes'] = [
  {
    category: '能源',
    clusterIdLevel1: 'energy',
    clusterIdLevel3: 'energy',
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
    clusterIdLevel1: 'energy',
    clusterIdLevel3: 'energy',
    degree: 2,
    id: processOneId,
    kind: 'process',
    location: 'CN',
    name: '电力生产一',
    version: '01.00.000',
  },
  {
    category: '能源',
    clusterIdLevel1: 'energy',
    clusterIdLevel3: 'energy',
    degree: 2,
    id: processTwoId,
    kind: 'process',
    location: 'CN',
    name: '电力生产二',
    version: '01.00.000',
  },
  {
    category: '材料',
    clusterIdLevel1: 'materials',
    clusterIdLevel3: 'materials',
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
    clusterIdLevel1: 'energy',
    clusterIdLevel3: 'energy',
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
    clustersLevel1: [
      { count: 4, id: 'energy', label: '能源' },
      { count: 1, id: 'materials', label: '材料' },
    ],
    clustersLevel3: [
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
    schemaVersion: 'process_flow_graph_v2',
    stats: {
      edgeCount: edges.length,
      flowCount: 3,
      maxDegree: 2,
      processCount: 2,
    },
  };
}

const originalFetch = global.fetch;
const originalDecompressionStream = globalThis.DecompressionStream;
const originalResponse = globalThis.Response;
const originalProcessFlowGraphCacheBaseUrl = process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

function gzipJson(value: unknown): ArrayBuffer {
  return toArrayBuffer(gzipSync(Buffer.from(JSON.stringify(value))));
}

function gzipBinary(bytes: Uint8Array): ArrayBuffer {
  return toArrayBuffer(gzipSync(bytes));
}

function createJsonResponse(payload: unknown): Response {
  return {
    json: jest.fn().mockResolvedValue(payload),
    ok: true,
    status: 200,
  } as unknown as Response;
}

function createArrayBufferResponse(payload: ArrayBuffer): Response {
  return {
    arrayBuffer: jest.fn().mockResolvedValue(payload),
    ok: true,
    status: 200,
  } as unknown as Response;
}

function isReadableStreamBody(body: unknown): body is ReadableStream<Uint8Array> {
  return Boolean(body && typeof (body as { getReader?: unknown }).getReader === 'function');
}

function getBodyBytes(body: unknown): Uint8Array | null {
  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }

  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }

  return null;
}

function createTestResponseBodyStream(body: unknown): ReadableStream<Uint8Array> | null {
  if (isReadableStreamBody(body)) {
    return body;
  }

  const bytes = getBodyBytes(body);

  if (!bytes) {
    return null;
  }

  return new NodeReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }) as unknown as ReadableStream<Uint8Array>;
}

class TestResponse {
  readonly body: ReadableStream<Uint8Array> | null;

  constructor(body?: unknown) {
    this.body = createTestResponseBodyStream(body);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (!this.body) {
      return new ArrayBuffer(0);
    }

    const reader = this.body.getReader();
    const chunks: Uint8Array[] = [];
    let byteLength = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      chunks.push(chunk);
      byteLength += chunk.byteLength;
    }

    const arrayBuffer = new ArrayBuffer(byteLength);
    const bytes = new Uint8Array(arrayBuffer);
    let offset = 0;

    chunks.forEach((chunk) => {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    });

    return arrayBuffer;
  }
}

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

function writeU32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
  return offset + 4;
}

function writeF32(view: DataView, offset: number, value: number) {
  view.setFloat32(offset, value, true);
  return offset + 4;
}

function writeF64(view: DataView, offset: number, value: number) {
  view.setFloat64(offset, value, true);
  return offset + 8;
}

function createEdgeBinary(edgeCount = 1): Uint8Array {
  const bytes = new Uint8Array(16 + edgeCount * 52);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, 'PFGEDG1\0');
  let offset = writeU32(view, 8, 1);
  offset = writeU32(view, offset, edgeCount);

  if (edgeCount === 0) {
    return bytes;
  }

  offset = writeU32(view, offset, 0);
  offset = writeU32(view, offset, 1);
  offset = writeU32(view, offset, 0);
  offset = writeU32(view, offset, 1);
  bytes[offset] = 0;
  offset += 1;
  bytes[offset] = 0;
  offset += 1;
  view.setUint16(offset, 0, true);
  offset += 2;
  offset = writeF64(view, offset, 1.25);
  offset = writeF64(view, offset, 1.25);
  offset = writeU32(view, offset, 0xffffffff);
  offset = writeU32(view, offset, 0xffffffff);
  offset = writeU32(view, offset, 0);
  writeU32(view, offset, 0xffffffff);

  return bytes;
}

function createAdjacencyBinary(nodeCount: number, edgeIndexesByNode: number[][]): Uint8Array {
  const edgeIndexes = edgeIndexesByNode.flat();
  const bytes = new Uint8Array(20 + (nodeCount + 1 + edgeIndexes.length) * 4);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, 'PFGCSR1\0');
  let offset = writeU32(view, 8, 1);
  offset = writeU32(view, offset, nodeCount);
  offset = writeU32(view, offset, edgeIndexes.length);
  let cursor = 0;
  offset = writeU32(view, offset, cursor);
  edgeIndexesByNode.forEach((indexes) => {
    cursor += indexes.length;
    offset = writeU32(view, offset, cursor);
  });
  edgeIndexes.forEach((edgeIndex) => {
    offset = writeU32(view, offset, edgeIndex);
  });

  return bytes;
}

function createLayoutBinary(layout: Array<[number, number, number]>): Uint8Array {
  const bytes = new Uint8Array(16 + layout.length * 12);
  const view = new DataView(bytes.buffer);
  writeAscii(bytes, 0, 'PFGLAY1\0');
  let offset = writeU32(view, 8, 1);
  offset = writeU32(view, offset, layout.length);
  layout.forEach(([x, y, z]) => {
    offset = writeF32(view, offset, x);
    offset = writeF32(view, offset, y);
    offset = writeF32(view, offset, z);
  });

  return bytes;
}

function mockProcessFlowGraphCache(files: Record<string, Response>) {
  process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL = cacheBaseUrl;
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const path = url.replace(`${cacheBaseUrl}/`, '');
    const response = files[path];

    if (response) {
      return response;
    }

    return {
      ok: false,
      status: 404,
    } as Response;
  }) as typeof fetch;
}

function createSignedUrl(path: string): string {
  return `https://signed.test/${path.replace(/^builds\/test-build\//, '')}`;
}

function mockSignedProcessFlowGraphCache(files: Record<string, Response>) {
  process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL = supabaseS3CacheBaseUrl;
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.startsWith('https://signed.test/')) {
      const path = `builds/test-build/${url.replace('https://signed.test/', '')}`;
      const response = files[path];

      if (response) {
        return response;
      }
    }

    return {
      ok: false,
      status: 404,
    } as Response;
  }) as typeof fetch;
}

function createWorkerV2SignedCacheBundle() {
  return {
    activeManifest: {
      activeBuildId: 'test-build',
      buildManifestPath: 'builds/test-build/manifest.json',
      schemaVersion: 'process_flow_graph_manifest_v1',
    },
    buildManifest: {
      buildId: 'test-build',
      files: {
        adjacency: {
          path: 'graph/adjacency.csr.bin.gz',
          signedUrl: createSignedUrl('builds/test-build/graph/adjacency.csr.bin.gz'),
        },
        clustersLevel1: {
          path: 'layout/clusters-level1.json.gz',
          signedUrl: createSignedUrl('builds/test-build/layout/clusters-level1.json.gz'),
        },
        clustersLevel3: {
          path: 'layout/clusters-level3.json.gz',
          signedUrl: createSignedUrl('builds/test-build/layout/clusters-level3.json.gz'),
        },
        dictionaries: {
          path: 'graph/dictionaries.json.gz',
          signedUrl: createSignedUrl('builds/test-build/graph/dictionaries.json.gz'),
        },
        edges: {
          path: 'graph/edges.bin.gz',
          signedUrl: createSignedUrl('builds/test-build/graph/edges.bin.gz'),
        },
        expanded2d: {
          path: 'layout/expanded2d.f32.bin.gz',
          signedUrl: createSignedUrl('builds/test-build/layout/expanded2d.f32.bin.gz'),
        },
        nodeLookup: {
          path: 'indexes/node-lookup.json.gz',
          signedUrl: createSignedUrl('builds/test-build/indexes/node-lookup.json.gz'),
        },
        nodes: {
          path: 'graph/nodes.json.gz',
          signedUrl: createSignedUrl('builds/test-build/graph/nodes.json.gz'),
        },
        searchFlows: {
          path: 'indexes/search-flows.json.gz',
          signedUrl: createSignedUrl('builds/test-build/indexes/search-flows.json.gz'),
        },
        sphere3d: {
          path: 'layout/sphere3d.f32.bin.gz',
          signedUrl: createSignedUrl('builds/test-build/layout/sphere3d.f32.bin.gz'),
        },
      },
      schemaVersion: 'process_flow_graph_v2',
      stats: {
        edgeCount: 1,
        flowCount: 1,
        maxDegree: 1,
        processCount: 1,
      },
    },
    bucket: 'lca_results',
    expiresIn: 3600,
    prefix: 'national-carbon/process-flow-graph/v1',
  };
}

function createWorkerV2CacheFiles(extraFiles: Record<string, Response> = {}) {
  const cacheNodes: ProcessFlowGraphData['nodes'] = [
    {
      category: 'Energy / Power / Solar',
      clusterIdLevel1: 'energy',
      clusterIdLevel3: 'energy-power-solar',
      clusterLabelLevel1: 'Energy',
      clusterLabelLevel3: 'Energy / Power / Solar',
      degree: 1,
      flowType: 'Product flow',
      id: 'flow:cache-a@v1',
      kind: 'flow',
      name: 'Cache Flow A',
      version: '01.00.000',
    },
    {
      category: 'Energy / Power / Solar',
      clusterIdLevel1: 'energy',
      clusterIdLevel3: 'energy-power-solar',
      clusterLabelLevel1: 'Energy',
      clusterLabelLevel3: 'Energy / Power / Solar',
      degree: 1,
      id: 'process:cache-a@v1',
      kind: 'process',
      location: 'CN-GD',
      name: 'Cache Process A',
      version: '01.00.000',
    },
  ];

  return {
    'manifest.json': createJsonResponse({
      activeBuildId: 'test-build',
      buildManifestPath: 'builds/test-build/manifest.json',
      schemaVersion: 'process_flow_graph_manifest_v1',
    }),
    'builds/test-build/manifest.json': createJsonResponse({
      buildId: 'test-build',
      files: {
        adjacency: { path: 'graph/adjacency.csr.bin.gz' },
        clustersLevel1: { path: 'layout/clusters-level1.json.gz' },
        clustersLevel3: { path: 'layout/clusters-level3.json.gz' },
        dictionaries: { path: 'graph/dictionaries.json.gz' },
        edges: { path: 'graph/edges.bin.gz' },
        expanded2d: { path: 'layout/expanded2d.f32.bin.gz' },
        nodeLookup: { path: 'indexes/node-lookup.json.gz' },
        nodes: { path: 'graph/nodes.json.gz' },
        searchFlows: { path: 'indexes/search-flows.json.gz' },
        sphere3d: { path: 'layout/sphere3d.f32.bin.gz' },
        ...Object.fromEntries(
          Object.keys(extraFiles).map((path) => [
            path.includes('/view.json.gz')
              ? path.includes('/world/')
                ? 'geoMapWorldView'
                : 'geoMapChinaView'
              : path.includes('/edges.bin.gz')
                ? path.includes('/world/')
                  ? 'geoMapWorldEdges'
                  : 'geoMapChinaEdges'
                : path.includes('/adjacency.csr.bin.gz')
                  ? path.includes('/world/')
                    ? 'geoMapWorldAdjacency'
                    : 'geoMapChinaAdjacency'
                  : path.includes('/layout.f32.bin.gz')
                    ? path.includes('/world/')
                      ? 'geoMapWorldLayout'
                      : 'geoMapChinaLayout'
                    : path,
            { path: path.replace(/^builds\/test-build\//, '') },
          ]),
        ),
      },
      schemaVersion: 'process_flow_graph_v2',
      stats: {
        edgeCount: 1,
        flowCount: 1,
        maxDegree: 1,
        processCount: 1,
      },
    }),
    'builds/test-build/graph/adjacency.csr.bin.gz': createArrayBufferResponse(
      gzipBinary(createAdjacencyBinary(2, [[0], [0]])),
    ),
    'builds/test-build/graph/dictionaries.json.gz': createArrayBufferResponse(
      gzipJson({ units: ['kg'] }),
    ),
    'builds/test-build/graph/edges.bin.gz': createArrayBufferResponse(
      gzipBinary(createEdgeBinary()),
    ),
    'builds/test-build/graph/nodes.json.gz': createArrayBufferResponse(
      gzipJson({
        buildId: 'test-build',
        nodes: cacheNodes,
        schemaVersion: 'process_flow_graph_v2',
      }),
    ),
    'builds/test-build/indexes/node-lookup.json.gz': createArrayBufferResponse(
      gzipJson({
        edgeByIdFormat: 'exchange:{edgeIndex}',
        flowById: { 'flow:cache-a@v1': 0 },
        nodeById: {
          'flow:cache-a@v1': 0,
          'process:cache-a@v1': 1,
        },
        processById: { 'process:cache-a@v1': 1 },
      }),
    ),
    'builds/test-build/indexes/search-flows.json.gz': createArrayBufferResponse(
      gzipJson({
        searchFlows: [
          {
            degree: 1,
            flowType: 'Product flow',
            id: 'flow:cache-a@v1',
            name: 'Cache Flow A',
            version: '01.00.000',
          },
        ],
      }),
    ),
    'builds/test-build/layout/clusters-level1.json.gz': createArrayBufferResponse(
      gzipJson({
        buildId: 'test-build',
        clustersLevel1: [{ id: 'energy', label: 'Energy' }],
        schemaVersion: 'process_flow_graph_v2',
      }),
    ),
    'builds/test-build/layout/clusters-level3.json.gz': createArrayBufferResponse(
      gzipJson({
        buildId: 'test-build',
        clustersLevel3: [{ id: 'energy-power-solar', label: 'Energy / Power / Solar' }],
        schemaVersion: 'process_flow_graph_v2',
      }),
    ),
    'builds/test-build/layout/expanded2d.f32.bin.gz': createArrayBufferResponse(
      gzipBinary(
        createLayoutBinary([
          [0, 0, 0],
          [40, 0, 6],
        ]),
      ),
    ),
    'builds/test-build/layout/sphere3d.f32.bin.gz': createArrayBufferResponse(
      gzipBinary(
        createLayoutBinary([
          [0, 0, 310],
          [40, 0, 306],
        ]),
      ),
    ),
    ...extraFiles,
  };
}

describe('NationalCarbonDashboard process-flow graph', () => {
  beforeEach(() => {
    mockRequestNationalCarbonGraphCacheObjectsApi.mockReset();
  });

  afterEach(() => {
    resetProcessFlowGraphCacheLoaderStateForTest();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    globalThis.DecompressionStream = originalDecompressionStream;
    globalThis.Response = originalResponse;
    process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL = originalProcessFlowGraphCacheBaseUrl;
  });

  it('uses worker cache schema with global sphere and expanded layouts', () => {
    const graph = createProcessFlowGraphFixture();

    expect(graph.schemaVersion).toBe('process_flow_graph_v2');
    expect(graph.indexes.flowById[flowAId]).toBeDefined();
    expect(graph.layouts.sphere3d[flowAId]).toHaveLength(3);
    expect(graph.layouts.expanded2d[flowAId]).toHaveLength(3);
    expect(graph.clustersLevel1).toHaveLength(2);
    expect(graph.stats.edgeCount).toBe(4);
  });

  it('loads worker process-flow graph v2 cache with level-1 and level-3 clusters', async () => {
    globalThis.DecompressionStream =
      NodeDecompressionStream as unknown as typeof DecompressionStream;
    globalThis.Response = TestResponse as unknown as typeof Response;
    mockProcessFlowGraphCache(createWorkerV2CacheFiles());

    const graph = await loadProcessFlowGraphFromCache();

    expect(mockRequestNationalCarbonGraphCacheObjectsApi).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`${cacheBaseUrl}/manifest.json`, {
      cache: 'no-store',
      credentials: 'omit',
    });
    expect(global.fetch).toHaveBeenCalledWith(`${cacheBaseUrl}/builds/test-build/manifest.json`, {
      cache: 'no-store',
      credentials: 'omit',
    });
    expect(graph.schemaVersion).toBe('process_flow_graph_v2');
    expect(graph.nodes[0]).toMatchObject({
      clusterIdLevel1: 'energy',
      clusterIdLevel3: 'energy-power-solar',
    });
    expect(graph.clustersLevel1).toEqual([{ count: 2, id: 'energy', label: 'Energy' }]);
    expect(graph.clustersLevel3).toEqual([
      { count: 2, id: 'energy-power-solar', label: 'Energy / Power / Solar' },
    ]);
    expect(graph.edges[0]).toMatchObject({
      flowId: 'flow:cache-a@v1',
      processId: 'process:cache-a@v1',
      source: 'flow:cache-a@v1',
      target: 'process:cache-a@v1',
      unit: 'kg',
    });
    expect(graph.adjacency['flow:cache-a@v1']).toEqual(['exchange:0']);
    expect(graph.layouts.expanded2d['process:cache-a@v1']).toEqual([40, 0, 6]);
  });

  it('loads private Supabase S3 cache objects through Edge signed URLs', async () => {
    globalThis.DecompressionStream =
      NodeDecompressionStream as unknown as typeof DecompressionStream;
    globalThis.Response = TestResponse as unknown as typeof Response;
    mockSignedProcessFlowGraphCache(createWorkerV2CacheFiles());
    mockRequestNationalCarbonGraphCacheObjectsApi.mockResolvedValue({
      data: createWorkerV2SignedCacheBundle(),
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });

    const graph = await loadProcessFlowGraphFromCache();
    const fetchMock = global.fetch as jest.Mock;
    const requestedUrls = fetchMock.mock.calls.map(([input]) => String(input));

    expect(mockRequestNationalCarbonGraphCacheObjectsApi).toHaveBeenCalledWith({
      action: 'read_manifest_bundle',
    });
    expect(requestedUrls).toContain('https://signed.test/graph/nodes.json.gz');
    expect(requestedUrls).not.toContain(`${supabaseS3CacheBaseUrl}/manifest.json`);
    expect(graph.buildId).toBe('test-build');
    expect(graph.nodes[0].name).toBe('Cache Flow A');
  });

  it('loads worker geoMap v2 cache without rebuilding adjacency or stats in the browser', async () => {
    globalThis.DecompressionStream =
      NodeDecompressionStream as unknown as typeof DecompressionStream;
    globalThis.Response = TestResponse as unknown as typeof Response;
    const processLinkId = 'process-link:world:test';
    const geoMapNodes: ProcessFlowGraphData['nodes'] = [
      {
        category: 'Energy / Power / Solar',
        clusterIdLevel1: 'energy',
        clusterIdLevel3: 'energy-power-solar',
        clusterLabelLevel1: 'Energy',
        clusterLabelLevel3: 'Energy / Power / Solar',
        degree: 1,
        id: 'process:provider@v1',
        kind: 'process',
        location: 'US',
        name: 'Provider',
        version: '01.00.000',
      },
      {
        category: 'Energy / Power / Solar',
        clusterIdLevel1: 'energy',
        clusterIdLevel3: 'energy-power-solar',
        clusterLabelLevel1: 'Energy',
        clusterLabelLevel3: 'Energy / Power / Solar',
        degree: 1,
        id: 'process:consumer@v1',
        kind: 'process',
        location: 'PT',
        name: 'Consumer',
        version: '01.00.000',
      },
    ];
    const geoMapFiles = {
      '/maps/world-map-units-50m.geojson': createJsonResponse({
        features: [
          {
            geometry: {
              coordinates: [
                [
                  [-125, 25],
                  [-125, 49],
                  [-67, 49],
                  [-67, 25],
                  [-125, 25],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              ISO_A2: 'US',
              ISO_A2_EH: 'US',
              LABEL_X: -97,
              LABEL_Y: 39,
              NAME: 'United States of America',
              NAME_EN: 'United States of America',
            },
            type: 'Feature',
          },
          {
            geometry: {
              coordinates: [
                [
                  [-17.4, 32.4],
                  [-17.4, 33],
                  [-16.4, 33],
                  [-16.4, 32.4],
                  [-17.4, 32.4],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              ISO_A2: '-99',
              ISO_A2_EH: 'PT',
              LABEL_X: -16.9,
              LABEL_Y: 32.7,
              NAME: 'Madeira',
              NAME_EN: 'Madeira',
            },
            type: 'Feature',
          },
          {
            geometry: {
              coordinates: [
                [
                  [-10, 36],
                  [-10, 42],
                  [-6, 42],
                  [-6, 36],
                  [-10, 36],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              ISO_A2: '-99',
              ISO_A2_EH: 'PT',
              LABEL_X: -8,
              LABEL_Y: 39,
              NAME: 'Portugal',
              NAME_EN: 'Portugal',
            },
            type: 'Feature',
          },
          {
            geometry: {
              coordinates: [
                [
                  [-31, 37],
                  [-31, 39],
                  [-26, 39],
                  [-26, 37],
                  [-31, 37],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              ISO_A2: '-99',
              ISO_A2_EH: 'PT',
              LABEL_X: -28.5,
              LABEL_Y: 38,
              NAME: 'Azores',
              NAME_EN: 'Azores',
            },
            type: 'Feature',
          },
        ],
        type: 'FeatureCollection',
      }),
      'builds/test-build/geo-map/world/adjacency.csr.bin.gz': createArrayBufferResponse(
        gzipBinary(createAdjacencyBinary(2, [[], []])),
      ),
      'builds/test-build/geo-map/world/edges.bin.gz': createArrayBufferResponse(
        gzipBinary(createEdgeBinary(0)),
      ),
      'builds/test-build/geo-map/world/layout.f32.bin.gz': createArrayBufferResponse(
        gzipBinary(
          createLayoutBinary([
            [10, 12, 6],
            [20, 24, 6],
          ]),
        ),
      ),
      'builds/test-build/geo-map/world/view.json.gz': createArrayBufferResponse(
        gzipJson({
          adjacency: {
            'process:consumer@v1': [processLinkId],
            'process:provider@v1': [processLinkId],
          },
          adjacencyIncludesProcessLinks: true,
          background: {
            height: 640,
            paths: [{ id: 'world-frame', label: 'World', path: 'M0 0H1120V640H0Z' }],
            scope: 'world',
            width: 1120,
          },
          buildId: 'test-build',
          clustersLevel1: [{ id: 'energy', label: 'Energy' }],
          clustersLevel3: [{ id: 'energy-power-solar', label: 'Energy / Power / Solar' }],
          geoMapFrame: { height: 640, width: 1120 },
          nodes: geoMapNodes,
          processLinks: [
            {
              direction: 'output',
              exchangeId: processLinkId,
              flowId: 'flow:hidden@v1',
              id: processLinkId,
              processId: 'process:consumer@v1',
              source: 'process:provider@v1',
              target: 'process:consumer@v1',
            },
          ],
          schemaVersion: 'process_flow_graph_geo_map_view_v2',
          scope: 'world',
          searchFlows: [],
          stats: {
            edgeCount: 1,
            flowCount: 0,
            maxDegree: 1,
            processCount: 2,
          },
          units: ['kg'],
        }),
      ),
    };
    mockProcessFlowGraphCache(createWorkerV2CacheFiles(geoMapFiles));

    const view = await loadProcessFlowGraphGeoMapViewFromCache('world');

    expect(global.fetch).toHaveBeenCalledWith('/maps/world-map-units-50m.geojson', {
      credentials: 'omit',
    });
    expect(view?.background.scope).toBe('world');
    expect(view?.background.paths.map((path) => path.code)).toEqual(['US', 'PT', 'PT', 'PT']);
    expect(view?.data.adjacency['process:provider@v1']).toEqual([processLinkId]);
    expect(view?.data.edges).toHaveLength(1);
    expect(view?.data.indexes.edgeById[processLinkId]).toBe(0);
    expect(view?.data.stats.edgeCount).toBe(1);
    const portugalPoint = view?.data.layouts.geoMap2d?.['process:consumer@v1'];
    expect(portugalPoint).toBeDefined();
    expect(portugalPoint).not.toEqual([20, -24, 6]);
    expect(portugalPoint?.[2]).toBe(6);
    const [portugalX = NaN, portugalY = NaN] = portugalPoint ?? [];
    const longitude = ((portugalX + 1120 / 2) / 1120) * 360 - 180;
    const latitude = 90 - ((-portugalY + 640 / 2) / 640) * 180;
    expect(longitude).toBeGreaterThanOrEqual(-10);
    expect(longitude).toBeLessThanOrEqual(-6);
    expect(latitude).toBeGreaterThanOrEqual(36);
    expect(latitude).toBeLessThanOrEqual(42);
  });

  it('deduplicates in-flight geoMap cache requests and reuses successful map views', async () => {
    globalThis.DecompressionStream =
      NodeDecompressionStream as unknown as typeof DecompressionStream;
    globalThis.Response = TestResponse as unknown as typeof Response;
    const geoMapFiles = {
      'builds/test-build/geo-map/world/adjacency.csr.bin.gz': createArrayBufferResponse(
        gzipBinary(createAdjacencyBinary(1, [[]])),
      ),
      'builds/test-build/geo-map/world/edges.bin.gz': createArrayBufferResponse(
        gzipBinary(createEdgeBinary(0)),
      ),
      'builds/test-build/geo-map/world/layout.f32.bin.gz': createArrayBufferResponse(
        gzipBinary(createLayoutBinary([[10, 12, 6]])),
      ),
      'builds/test-build/geo-map/world/view.json.gz': createArrayBufferResponse(
        gzipJson({
          adjacency: {
            'process:cached@v1': [],
          },
          adjacencyIncludesProcessLinks: true,
          background: {
            height: 640,
            paths: [{ code: 'US', id: 'world-US', label: 'United States', path: 'M0 0H1V1H0Z' }],
            scope: 'world',
            width: 1120,
          },
          buildId: 'test-build',
          clustersLevel1: [{ id: 'energy', label: 'Energy' }],
          clustersLevel3: [{ id: 'energy-power-solar', label: 'Energy / Power / Solar' }],
          geoMapFrame: { height: 640, width: 1120 },
          nodes: [
            {
              category: 'Energy / Power / Solar',
              clusterIdLevel1: 'energy',
              clusterIdLevel3: 'energy-power-solar',
              clusterLabelLevel1: 'Energy',
              clusterLabelLevel3: 'Energy / Power / Solar',
              degree: 0,
              id: 'process:cached@v1',
              kind: 'process',
              location: 'US',
              name: 'Cached Process',
              version: '01.00.000',
            },
          ],
          processLinks: [],
          schemaVersion: 'process_flow_graph_geo_map_view_v2',
          scope: 'world',
          searchFlows: [],
          stats: {
            edgeCount: 0,
            flowCount: 0,
            maxDegree: 0,
            processCount: 1,
          },
          units: ['kg'],
        }),
      ),
    };
    mockProcessFlowGraphCache(createWorkerV2CacheFiles(geoMapFiles));

    const [firstView, secondView] = await Promise.all([
      loadProcessFlowGraphGeoMapViewFromCache('world'),
      loadProcessFlowGraphGeoMapViewFromCache('world'),
    ]);
    const thirdView = await loadProcessFlowGraphGeoMapViewFromCache('world');
    const fetchMock = global.fetch as jest.Mock;
    const viewCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === `${cacheBaseUrl}/builds/test-build/geo-map/world/view.json.gz`,
    );

    expect(firstView).toBeDefined();
    expect(secondView).toBe(firstView);
    expect(thirdView).toBe(firstView);
    expect(viewCalls).toHaveLength(1);
  });

  it('replaces worker China map paths with the local China outline and projects nodes with the same map projection', async () => {
    globalThis.DecompressionStream =
      NodeDecompressionStream as unknown as typeof DecompressionStream;
    globalThis.Response = TestResponse as unknown as typeof Response;
    const geoMapNodes: ProcessFlowGraphData['nodes'] = [
      {
        category: 'Energy / Power / Solar',
        clusterIdLevel1: 'energy',
        clusterIdLevel3: 'energy-power-solar',
        clusterLabelLevel1: 'Energy',
        clusterLabelLevel3: 'Energy / Power / Solar',
        degree: 1,
        id: 'process:provider@v1',
        kind: 'process',
        location: 'CN-GD',
        name: 'Provider',
        version: '01.00.000',
      },
      {
        category: 'Energy / Power / Solar',
        clusterIdLevel1: 'energy',
        clusterIdLevel3: 'energy-power-solar',
        clusterLabelLevel1: 'Energy',
        clusterLabelLevel3: 'Energy / Power / Solar',
        degree: 1,
        id: 'process:consumer@v1',
        kind: 'process',
        location: 'CN-GD',
        name: 'Consumer',
        version: '01.00.000',
      },
    ];
    const rawLinearChinaPoint: [number, number, number] = [159.6774, 270, 6];
    const geoMapFiles = {
      '/maps/china-province-100000-full.geojson': createJsonResponse({
        features: [
          {
            geometry: {
              coordinates: [
                [
                  [110, 20],
                  [116, 20],
                  [116, 25],
                  [110, 25],
                  [110, 20],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              adcode: 440000,
              name: '广东',
            },
            type: 'Feature',
          },
          {
            geometry: {
              coordinates: [
                [
                  [73, 18],
                  [135, 18],
                  [135, 54],
                  [73, 54],
                  [73, 18],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              adcode: 100000,
              name: '中国',
            },
            type: 'Feature',
          },
        ],
        type: 'FeatureCollection',
      }),
      'builds/test-build/geo-map/china/adjacency.csr.bin.gz': createArrayBufferResponse(
        gzipBinary(createAdjacencyBinary(2, [[], []])),
      ),
      'builds/test-build/geo-map/china/edges.bin.gz': createArrayBufferResponse(
        gzipBinary(createEdgeBinary(0)),
      ),
      'builds/test-build/geo-map/china/layout.f32.bin.gz': createArrayBufferResponse(
        gzipBinary(createLayoutBinary([[0, 0, 6], rawLinearChinaPoint])),
      ),
      'builds/test-build/geo-map/china/view.json.gz': createArrayBufferResponse(
        gzipJson({
          adjacency: {
            'process:consumer@v1': [],
            'process:provider@v1': [],
          },
          adjacencyIncludesProcessLinks: true,
          background: {
            height: 900,
            paths: [
              {
                code: 'AU',
                id: 'worker-australia-leak',
                label: 'Australia',
                path: 'M940 440L1040 470L1010 560L900 540Z',
              },
            ],
            scope: 'world',
            width: 1600,
          },
          buildId: 'test-build',
          clustersLevel1: [{ id: 'energy', label: 'Energy' }],
          clustersLevel3: [{ id: 'energy-power-solar', label: 'Energy / Power / Solar' }],
          geoMapFrame: { height: 720, width: 1100 },
          nodes: geoMapNodes,
          processLinks: [],
          schemaVersion: 'process_flow_graph_geo_map_view_v2',
          scope: 'china',
          searchFlows: [],
          stats: {
            edgeCount: 0,
            flowCount: 0,
            maxDegree: 0,
            processCount: 2,
          },
          units: ['kg'],
        }),
      ),
    };
    mockProcessFlowGraphCache(createWorkerV2CacheFiles(geoMapFiles));

    const view = await loadProcessFlowGraphGeoMapViewFromCache('china');

    expect(global.fetch).toHaveBeenCalledWith('/maps/china-province-100000-full.geojson', {
      credentials: 'omit',
    });
    expect(view?.background.scope).toBe('china');
    expect(view?.background.width).toBe(1100);
    expect(view?.background.height).toBe(720);
    expect(view?.background.paths).toHaveLength(1);
    expect(view?.background.paths[0]).toMatchObject({
      code: '440000',
      label: '广东',
    });
    expect(view?.background.paths[0].id).not.toBe('worker-australia-leak');
    expect(view?.background.paths[0].path).not.toBe('M940 440L1040 470L1010 560L900 540Z');
    const projectedPoint = view?.data.layouts.geoMap2d?.['process:consumer@v1'];
    expect(projectedPoint?.[0]).not.toBeCloseTo(rawLinearChinaPoint[0], 3);
    expect(projectedPoint?.[1]).not.toBeCloseTo(-rawLinearChinaPoint[1], 3);
    expect(projectedPoint?.[2]).toBe(6);
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

  it('keeps sphere base edges visible while hiding map overview and flat selected views', () => {
    const emptySelection = createEmptyProcessFlowGraphSelection();
    const selectedSelection = getProcessFlowGraphSelection(
      createProcessFlowGraphFixture(),
      flowAId,
    );

    expect(shouldRenderProcessFlowBaseEdges('sphere3d', emptySelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('expanded2d', emptySelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('geoMap2d', emptySelection)).toBe(false);
    expect(shouldRenderProcessFlowBaseEdges('sphere3d', selectedSelection)).toBe(true);
    expect(shouldRenderProcessFlowBaseEdges('expanded2d', selectedSelection)).toBe(false);
    expect(shouldRenderProcessFlowBaseEdges('geoMap2d', selectedSelection)).toBe(false);
  });
});
