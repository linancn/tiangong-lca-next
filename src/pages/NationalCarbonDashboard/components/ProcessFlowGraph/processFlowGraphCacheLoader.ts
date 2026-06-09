import type { ProcessFlowGraphGeoMapView, ProcessFlowGraphMapBackground } from './geoMapLayout';
import type {
  ProcessFlowGraphCluster,
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
  ProcessFlowGraphLayout,
  ProcessFlowGraphMapScope,
  ProcessFlowGraphNode,
  ProcessFlowGraphSearchItem,
} from './graphTypes';

const defaultProcessFlowGraphCacheBaseUrl = '';
const edgeMagic = 'PFGEDG1\0';
const adjacencyMagic = 'PFGCSR1\0';
const layoutMagic = 'PFGLAY1\0';
const u32None = 0xffffffff;

type ActiveManifest = {
  activeBuildId: string;
  buildManifestPath: string;
  schemaVersion: 'process_flow_graph_manifest_v1';
};

type BuildManifest = {
  buildId: string;
  files: Record<string, { path: string }>;
  schemaVersion: 'process_flow_graph_v1';
  stats: {
    edgeCount: number;
    flowCount: number;
    maxDegree: number;
    processCount: number;
  };
};

type NodesPayload = {
  buildId: string;
  nodes: ProcessFlowGraphNode[];
  schemaVersion: 'process_flow_graph_v1';
};

type DictionariesPayload = {
  units?: string[];
};

type ClustersPayload = {
  buildId: string;
  clusters: ProcessFlowGraphCluster[];
  schemaVersion?: 'process_flow_graph_v1';
};

type SearchPayload = {
  searchFlows: ProcessFlowGraphSearchItem[];
};

type LookupPayload = {
  edgeByIdFormat: string;
  flowById: Record<string, number>;
  nodeById: Record<string, number>;
  processById: Record<string, number>;
};

type GeoMapViewPayload = {
  background: ProcessFlowGraphMapBackground;
  buildId: string;
  clusters: ProcessFlowGraphCluster[];
  geoMapFrame: {
    height: number;
    width: number;
  };
  nodes: ProcessFlowGraphNode[];
  schemaVersion: 'process_flow_graph_geo_map_view_v1';
  scope: ProcessFlowGraphMapScope;
  processLinks?: ProcessFlowGraphEdge[];
  searchFlows: ProcessFlowGraphSearchItem[];
  stats: ProcessFlowGraphData['stats'];
  units?: string[];
};

type CacheManifests = {
  activeManifest: ActiveManifest;
  baseUrl: string;
  buildManifest: BuildManifest;
};

const geoMapCacheFileKeys: Record<
  ProcessFlowGraphMapScope,
  {
    adjacency: string;
    edges: string;
    layout: string;
    view: string;
  }
> = {
  china: {
    adjacency: 'geoMapChinaAdjacency',
    edges: 'geoMapChinaEdges',
    layout: 'geoMapChinaLayout',
    view: 'geoMapChinaView',
  },
  world: {
    adjacency: 'geoMapWorldAdjacency',
    edges: 'geoMapWorldEdges',
    layout: 'geoMapWorldLayout',
    view: 'geoMapWorldView',
  },
};

function getProcessFlowGraphCacheBaseUrl(): string {
  const rawBaseUrl =
    process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL || defaultProcessFlowGraphCacheBaseUrl;
  return rawBaseUrl.replace(/\/+$/, '');
}

function resolveCacheUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl}/${pathOrUrl.replace(/^\/+/, '')}`;
}

async function fetchRequired(url: string): Promise<Response> {
  const response = await fetch(url, { credentials: 'omit' });

  if (!response.ok) {
    throw new Error(`failed to fetch process-flow graph object: ${response.status} ${url}`);
  }

  return response;
}

async function gunzip(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const DecompressionStreamCtor = globalThis.DecompressionStream;

  if (!DecompressionStreamCtor) {
    throw new Error('browser does not support gzip decompression streams');
  }

  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStreamCtor('gzip'));
  return new Response(stream).arrayBuffer();
}

async function fetchJson<T>(url: string): Promise<T> {
  return (await fetchRequired(url)).json() as Promise<T>;
}

async function fetchGzipJson<T>(url: string): Promise<T> {
  const compressed = await (await fetchRequired(url)).arrayBuffer();
  const text = new TextDecoder().decode(await gunzip(compressed));
  return JSON.parse(text) as T;
}

async function fetchGzipBinary(url: string): Promise<ArrayBuffer> {
  const compressed = await (await fetchRequired(url)).arrayBuffer();
  return gunzip(compressed);
}

function readMagic(view: DataView): string {
  return Array.from({ length: 8 }, (_, index) => String.fromCharCode(view.getUint8(index))).join(
    '',
  );
}

function assertMagic(view: DataView, expected: string, label: string) {
  const actual = readMagic(view);

  if (actual !== expected) {
    throw new Error(`invalid ${label} magic: ${actual}`);
  }
}

function finiteNumber(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

function optionalDictionaryValue(values: string[] | undefined, index: number): string | undefined {
  if (index === u32None) {
    return undefined;
  }
  return values?.[index];
}

function parseEdges(
  buffer: ArrayBuffer,
  nodes: ProcessFlowGraphNode[],
  units: string[] | undefined,
): ProcessFlowGraphEdge[] {
  const view = new DataView(buffer);
  assertMagic(view, edgeMagic, 'edges');

  const edgeCount = view.getUint32(12, true);
  const edges: ProcessFlowGraphEdge[] = [];
  let offset = 16;

  for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex += 1) {
    const sourceIndex = view.getUint32(offset, true);
    offset += 4;
    const targetIndex = view.getUint32(offset, true);
    offset += 4;
    const flowIndex = view.getUint32(offset, true);
    offset += 4;
    const processIndex = view.getUint32(offset, true);
    offset += 4;
    const directionByte = view.getUint8(offset);
    offset += 1;
    offset += 1;
    offset += 2;
    const meanAmount = view.getFloat64(offset, true);
    offset += 8;
    const resultingAmount = view.getFloat64(offset, true);
    offset += 8;
    offset += 4;
    offset += 4;
    const unitIndex = view.getUint32(offset, true);
    offset += 4;
    const exchangeInternalId = view.getUint32(offset, true);
    offset += 4;

    const source = nodes[sourceIndex]?.id;
    const target = nodes[targetIndex]?.id;
    const flowId = nodes[flowIndex]?.id;
    const processId = nodes[processIndex]?.id;

    if (!source || !target || !flowId || !processId) {
      continue;
    }

    const amount = finiteNumber(meanAmount) ?? finiteNumber(resultingAmount);

    edges.push({
      amount,
      direction: directionByte === 0 ? 'input' : 'output',
      exchangeId:
        exchangeInternalId === u32None ? `exchange:${edgeIndex}` : String(exchangeInternalId),
      flowId,
      id: `exchange:${edgeIndex}`,
      processId,
      source,
      target,
      unit: optionalDictionaryValue(units, unitIndex),
    });
  }

  return edges;
}

function parseAdjacency(
  buffer: ArrayBuffer,
  nodes: ProcessFlowGraphNode[],
): Record<string, string[]> {
  const view = new DataView(buffer);
  assertMagic(view, adjacencyMagic, 'adjacency');

  const nodeCount = view.getUint32(12, true);
  const edgeReferenceCount = view.getUint32(16, true);
  const offsets: number[] = [];
  let cursor = 20;

  for (let index = 0; index <= nodeCount; index += 1) {
    offsets.push(view.getUint32(cursor, true));
    cursor += 4;
  }

  const edgeIndexes: number[] = [];
  for (let index = 0; index < edgeReferenceCount; index += 1) {
    edgeIndexes.push(view.getUint32(cursor, true));
    cursor += 4;
  }

  return nodes.reduce<Record<string, string[]>>((adjacency, node, nodeIndex) => {
    const start = offsets[nodeIndex] ?? 0;
    const end = offsets[nodeIndex + 1] ?? start;
    adjacency[node.id] = edgeIndexes.slice(start, end).map((edgeIndex) => `exchange:${edgeIndex}`);
    return adjacency;
  }, {});
}

function parseLayout(buffer: ArrayBuffer, nodes: ProcessFlowGraphNode[]): ProcessFlowGraphLayout {
  const view = new DataView(buffer);
  assertMagic(view, layoutMagic, 'layout');

  const nodeCount = view.getUint32(12, true);
  const layout: ProcessFlowGraphLayout = {};
  let offset = 16;

  for (let index = 0; index < nodeCount; index += 1) {
    const x = view.getFloat32(offset, true);
    offset += 4;
    const y = view.getFloat32(offset, true);
    offset += 4;
    const z = view.getFloat32(offset, true);
    offset += 4;

    const node = nodes[index];
    if (node) {
      layout[node.id] = [x, y, z];
    }
  }

  return layout;
}

function buildEdgeById(edges: ProcessFlowGraphEdge[]): Record<string, number> {
  return edges.reduce<Record<string, number>>((indexById, edge, index) => {
    indexById[edge.id] = index;
    return indexById;
  }, {});
}

function getBuildRootPath(activeManifest: ActiveManifest): string {
  return activeManifest.buildManifestPath.replace(/\/manifest\.json$/, '');
}

function getBuildFilePath(
  activeManifest: ActiveManifest,
  buildManifest: BuildManifest,
  fileKey: string,
): string {
  const filePath = buildManifest.files[fileKey]?.path;

  if (!filePath) {
    throw new Error(`missing process-flow graph file entry: ${fileKey}`);
  }

  return `${getBuildRootPath(activeManifest)}/${filePath.replace(/^\/+/, '')}`;
}

async function loadCacheManifests(): Promise<CacheManifests> {
  const baseUrl = getProcessFlowGraphCacheBaseUrl();

  if (!baseUrl) {
    throw new Error('PROCESS_FLOW_GRAPH_CACHE_BASE_URL is not configured');
  }

  const activeManifest = await fetchJson<ActiveManifest>(resolveCacheUrl(baseUrl, 'manifest.json'));
  const buildManifest = await fetchJson<BuildManifest>(
    resolveCacheUrl(baseUrl, activeManifest.buildManifestPath),
  );

  return { activeManifest, baseUrl, buildManifest };
}

function hasBuildFile(buildManifest: BuildManifest, fileKey: string): boolean {
  return Boolean(buildManifest.files[fileKey]?.path);
}

function buildNodeIndexes(nodes: ProcessFlowGraphNode[]) {
  return nodes.reduce<{
    flowById: Record<string, number>;
    nodeById: Record<string, number>;
    processById: Record<string, number>;
  }>(
    (indexes, node, index) => {
      indexes.nodeById[node.id] = index;
      if (node.kind === 'flow') {
        indexes.flowById[node.id] = index;
      } else {
        indexes.processById[node.id] = index;
      }
      return indexes;
    },
    { flowById: {}, nodeById: {}, processById: {} },
  );
}

function buildAdjacency(
  nodes: ProcessFlowGraphNode[],
  edges: ProcessFlowGraphEdge[],
): Record<string, string[]> {
  const adjacency = nodes.reduce<Record<string, string[]>>((nextAdjacency, node) => {
    nextAdjacency[node.id] = [];
    return nextAdjacency;
  }, {});

  edges.forEach((edge) => {
    adjacency[edge.source]?.push(edge.id);
    adjacency[edge.target]?.push(edge.id);
  });

  return adjacency;
}

function normalizeClusters(
  clusters: ProcessFlowGraphCluster[],
  nodes: ProcessFlowGraphNode[],
): ProcessFlowGraphCluster[] {
  const counts = nodes.reduce<Record<string, number>>((countByClusterId, node) => {
    countByClusterId[node.clusterId] = (countByClusterId[node.clusterId] ?? 0) + 1;
    return countByClusterId;
  }, {});
  const normalizedClusters = clusters.map((cluster) => ({
    ...cluster,
    count: cluster.count ?? counts[cluster.id] ?? 0,
  }));
  const knownClusterIds = new Set(normalizedClusters.map((cluster) => cluster.id));

  Object.entries(counts).forEach(([id, count]) => {
    if (!knownClusterIds.has(id)) {
      normalizedClusters.push({
        count,
        id,
        label: id,
      });
    }
  });

  return normalizedClusters;
}

export async function loadProcessFlowGraphFromCache(): Promise<ProcessFlowGraphData> {
  const { activeManifest, baseUrl, buildManifest } = await loadCacheManifests();

  const [
    nodesPayload,
    dictionariesPayload,
    clustersPayload,
    searchPayload,
    lookupPayload,
    edgesBuffer,
    adjacencyBuffer,
    sphereLayoutBuffer,
    expandedLayoutBuffer,
  ] = await Promise.all([
    fetchGzipJson<NodesPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'nodes')),
    ),
    fetchGzipJson<DictionariesPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'dictionaries')),
    ),
    fetchGzipJson<ClustersPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'clusters')),
    ),
    fetchGzipJson<SearchPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'searchFlows')),
    ),
    fetchGzipJson<LookupPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'nodeLookup')),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'edges')),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'adjacency')),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'sphere3d')),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'expanded2d')),
    ),
  ]);

  const nodes = nodesPayload.nodes;
  const edges = parseEdges(edgesBuffer, nodes, dictionariesPayload.units);

  return {
    adjacency: parseAdjacency(adjacencyBuffer, nodes),
    buildId: buildManifest.buildId || activeManifest.activeBuildId,
    clusters: normalizeClusters(clustersPayload.clusters, nodes),
    edges,
    indexes: {
      edgeById: buildEdgeById(edges),
      flowById: lookupPayload.flowById,
      nodeById: lookupPayload.nodeById,
      processById: lookupPayload.processById,
      searchFlows: searchPayload.searchFlows,
    },
    layouts: {
      expanded2d: parseLayout(expandedLayoutBuffer, nodes),
      sphere3d: parseLayout(sphereLayoutBuffer, nodes),
    },
    nodes,
    schemaVersion: 'process_flow_graph_v1',
    stats: {
      edgeCount: buildManifest.stats.edgeCount,
      flowCount: buildManifest.stats.flowCount,
      maxDegree: buildManifest.stats.maxDegree,
      processCount: buildManifest.stats.processCount,
    },
  };
}

export async function loadProcessFlowGraphGeoMapViewFromCache(
  scope: ProcessFlowGraphMapScope,
): Promise<ProcessFlowGraphGeoMapView | undefined> {
  const { activeManifest, baseUrl, buildManifest } = await loadCacheManifests();
  const fileKeys = geoMapCacheFileKeys[scope];
  const requiredFileKeys = [fileKeys.view, fileKeys.edges, fileKeys.adjacency, fileKeys.layout];

  if (!requiredFileKeys.every((fileKey) => hasBuildFile(buildManifest, fileKey))) {
    return undefined;
  }

  const [viewPayload, edgesBuffer, adjacencyBuffer, layoutBuffer] = await Promise.all([
    fetchGzipJson<GeoMapViewPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, fileKeys.view)),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, fileKeys.edges)),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, fileKeys.adjacency)),
    ),
    fetchGzipBinary(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, fileKeys.layout)),
    ),
  ]);

  if (
    viewPayload.schemaVersion !== 'process_flow_graph_geo_map_view_v1' ||
    viewPayload.scope !== scope
  ) {
    throw new Error(`invalid process-flow geo map cache payload: ${scope}`);
  }

  const nodes = viewPayload.nodes;
  const edges = [
    ...parseEdges(edgesBuffer, nodes, viewPayload.units),
    ...(viewPayload.processLinks ?? []),
  ];
  const indexes = buildNodeIndexes(nodes);

  return {
    background: viewPayload.background,
    data: {
      adjacency: viewPayload.processLinks?.length
        ? buildAdjacency(nodes, edges)
        : parseAdjacency(adjacencyBuffer, nodes),
      buildId: viewPayload.buildId || buildManifest.buildId || activeManifest.activeBuildId,
      clusters: normalizeClusters(viewPayload.clusters, nodes),
      edges,
      geoMapFrame: viewPayload.geoMapFrame,
      indexes: {
        ...indexes,
        edgeById: buildEdgeById(edges),
        searchFlows: viewPayload.searchFlows.filter(
          (flow) => indexes.flowById[flow.id] !== undefined,
        ),
      },
      layouts: {
        expanded2d: {},
        geoMap2d: parseLayout(layoutBuffer, nodes),
        sphere3d: {},
      },
      nodes,
      schemaVersion: 'process_flow_graph_v1',
      stats: {
        ...viewPayload.stats,
        edgeCount: edges.length,
      },
    },
  };
}
