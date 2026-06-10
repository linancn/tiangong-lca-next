import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';
import type {
  ProcessFlowGraphCluster,
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
  ProcessFlowGraphGeoMapView,
  ProcessFlowGraphLayout,
  ProcessFlowGraphMapBackground,
  ProcessFlowGraphMapScope,
  ProcessFlowGraphNode,
  ProcessFlowGraphSearchItem,
} from './graphTypes';

const defaultProcessFlowGraphCacheBaseUrl = '';
const edgeMagic = 'PFGEDG1\0';
const adjacencyMagic = 'PFGCSR1\0';
const layoutMagic = 'PFGLAY1\0';
const u32None = 0xffffffff;
const processFlowGraphSchemaVersion = 'process_flow_graph_v2';
const processFlowGraphGeoMapViewSchemaVersion = 'process_flow_graph_geo_map_view_v2';
const localGeoMapAssetPaths: Record<ProcessFlowGraphMapScope, string> = {
  china: '/maps/china-province-100000-full.geojson',
  world: '/maps/world-map-units-50m.geojson',
};
const chinaGeoBounds = {
  latMax: 54,
  latMin: 18,
  lonMax: 135,
  lonMin: 73,
} as const;

type ActiveManifest = {
  activeBuildId: string;
  buildManifestPath: string;
  schemaVersion: 'process_flow_graph_manifest_v1';
};

type BuildManifest = {
  buildId: string;
  files: Record<string, { path: string }>;
  schemaVersion: typeof processFlowGraphSchemaVersion;
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
  schemaVersion: typeof processFlowGraphSchemaVersion;
};

type DictionariesPayload = {
  units?: string[];
};

type ClustersPayload = {
  buildId: string;
  clusters?: ProcessFlowGraphCluster[];
  clustersLevel1?: ProcessFlowGraphCluster[];
  clustersLevel3?: ProcessFlowGraphCluster[];
  schemaVersion?: typeof processFlowGraphSchemaVersion;
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
  adjacency: Record<string, string[]>;
  adjacencyIncludesProcessLinks?: boolean;
  background: ProcessFlowGraphMapBackground;
  buildId: string;
  clustersLevel1: ProcessFlowGraphCluster[];
  clustersLevel3: ProcessFlowGraphCluster[];
  geoMapFrame: {
    height: number;
    width: number;
  };
  nodes: ProcessFlowGraphNode[];
  schemaVersion: typeof processFlowGraphGeoMapViewSchemaVersion;
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
type LocalMapFeatureProperties = {
  ADM0_ISO?: string;
  adcode?: number | string;
  ISO_A2?: string;
  ISO_A2_EH?: string;
  ISO_A3?: string;
  NAME?: string;
  NAME_EN?: string;
  name?: string;
  POSTAL?: string;
};
type LocalMapFeature = Feature<Geometry, LocalMapFeatureProperties>;
type LocalMapFeatureCollection = FeatureCollection<Geometry, LocalMapFeatureProperties>;
type CoordinateProjector = (longitude: number, latitude: number) => [number, number];
type LayoutPositionTransform = (x: number, y: number, z: number) => [number, number, number];
type GeoMapBackgroundResolution = {
  background: ProcessFlowGraphMapBackground;
  layoutPositionTransform?: LayoutPositionTransform;
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
const geoMapBackgroundFallbackRequests: Partial<
  Record<string, Promise<GeoMapBackgroundResolution | undefined>>
> = {};

function isWorkerFrameOnlyBackground(background: ProcessFlowGraphMapBackground): boolean {
  if (background.paths.length !== 1) {
    return false;
  }

  const [path] = background.paths;
  return (
    path.id.endsWith('-frame') ||
    /map frame/i.test(path.label) ||
    /^M0 0H\d+(?:\.\d+)?V\d+(?:\.\d+)?H0Z$/.test(path.path)
  );
}

function projectWorldCoordinate(width: number, height: number): CoordinateProjector {
  return (longitude, latitude) => [
    ((longitude + 180) / 360) * width,
    height - ((latitude + 90) / 180) * height,
  ];
}

function formatPathNumber(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(3)).toString() : '0';
}

function positionToPoint(position: Position, projectCoordinate: CoordinateProjector): string {
  const [longitude, latitude] = position;
  const [x, y] = projectCoordinate(longitude, latitude);
  return `${formatPathNumber(x)} ${formatPathNumber(y)}`;
}

function ringToPath(ring: Position[], projectCoordinate: CoordinateProjector): string {
  if (ring.length < 2) {
    return '';
  }

  const [firstPosition, ...restPositions] = ring;
  const restPath = restPositions
    .map((position) => `L${positionToPoint(position, projectCoordinate)}`)
    .join('');

  return `M${positionToPoint(firstPosition, projectCoordinate)}${restPath}Z`;
}

function polygonToPath(polygon: Polygon, projectCoordinate: CoordinateProjector): string {
  return polygon.coordinates
    .map((ring) => ringToPath(ring, projectCoordinate))
    .filter(Boolean)
    .join('');
}

function multiPolygonToPath(
  multiPolygon: MultiPolygon,
  projectCoordinate: CoordinateProjector,
): string {
  return multiPolygon.coordinates
    .map((polygonCoordinates) =>
      polygonToPath({ coordinates: polygonCoordinates, type: 'Polygon' }, projectCoordinate),
    )
    .filter(Boolean)
    .join('');
}

function featureToPath(feature: LocalMapFeature, projectCoordinate: CoordinateProjector): string {
  if (feature.geometry.type === 'Polygon') {
    return polygonToPath(feature.geometry, projectCoordinate);
  }

  if (feature.geometry.type === 'MultiPolygon') {
    return multiPolygonToPath(feature.geometry, projectCoordinate);
  }

  return '';
}

function getLocalMapPathCode(
  scope: ProcessFlowGraphMapScope,
  feature: LocalMapFeature,
): string | undefined {
  if (scope === 'china') {
    const rawAdcode = feature.properties?.adcode;
    return rawAdcode === undefined ? undefined : String(rawAdcode);
  }

  return [
    feature.properties?.ISO_A2_EH,
    feature.properties?.ISO_A2,
    feature.properties?.POSTAL,
    feature.properties?.ADM0_ISO,
    feature.properties?.ISO_A3,
  ].find((code) => code && code !== '-99');
}

function getLocalMapPathLabel(scope: ProcessFlowGraphMapScope, feature: LocalMapFeature): string {
  if (scope === 'china') {
    return feature.properties?.name || 'China region';
  }

  return feature.properties?.NAME_EN || feature.properties?.NAME || 'World region';
}

function getLocalChinaFeatureAdcode(feature: LocalMapFeature): number | undefined {
  const rawAdcode = feature.properties?.adcode;
  if (typeof rawAdcode === 'number') {
    return rawAdcode;
  }
  if (typeof rawAdcode === 'string') {
    const parsed = Number.parseInt(rawAdcode, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function rewindLocalMapFeature(feature: LocalMapFeature): LocalMapFeature {
  if (feature.geometry.type === 'Polygon') {
    const geometry: Polygon = {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((ring) => ring.slice().reverse()),
    };
    return { ...feature, geometry };
  }

  if (feature.geometry.type === 'MultiPolygon') {
    const geometry: MultiPolygon = {
      ...feature.geometry,
      coordinates: feature.geometry.coordinates.map((polygon) =>
        polygon.map((ring) => ring.slice().reverse()),
      ),
    };
    return { ...feature, geometry };
  }

  return feature;
}

function shouldUseLocalMapFeature(
  scope: ProcessFlowGraphMapScope,
  feature: LocalMapFeature,
): boolean {
  if (!feature.geometry) {
    return false;
  }

  if (scope === 'china') {
    const adcode = getLocalChinaFeatureAdcode(feature);
    return Boolean(feature.properties?.name) && Boolean(adcode) && adcode !== 100000;
  }

  return Boolean(feature.properties?.NAME || feature.properties?.NAME_EN);
}

function buildChinaMercatorMap(
  mapData: LocalMapFeatureCollection,
  frame: Pick<ProcessFlowGraphMapBackground, 'height' | 'width'>,
):
  | {
      features: LocalMapFeature[];
      projection: GeoProjection;
    }
  | undefined {
  const features = mapData.features
    .filter((feature) => shouldUseLocalMapFeature('china', feature))
    .map(rewindLocalMapFeature);

  if (!features.length) {
    return undefined;
  }

  const displayMapData: LocalMapFeatureCollection = {
    ...mapData,
    features,
  };
  const padding = 18;
  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [Math.max(padding + 1, frame.width - 20), Math.max(padding + 1, frame.height - 20)],
    ],
    displayMapData,
  );

  return { features, projection };
}

function createChinaMercatorLayoutTransform(
  frame: Pick<ProcessFlowGraphMapBackground, 'height' | 'width'>,
  projection: GeoProjection,
): LayoutPositionTransform {
  const longitudeSpan = chinaGeoBounds.lonMax - chinaGeoBounds.lonMin;
  const latitudeSpan = chinaGeoBounds.latMax - chinaGeoBounds.latMin;

  return (x, y, z) => {
    const screenX = x + frame.width / 2;
    const screenY = y + frame.height / 2;
    const longitude = chinaGeoBounds.lonMin + (screenX / frame.width) * longitudeSpan;
    const latitude = chinaGeoBounds.latMax - (screenY / frame.height) * latitudeSpan;
    const projected = projection([longitude, latitude]);

    if (!projected) {
      return [x, y, z];
    }

    return [projected[0] - frame.width / 2, projected[1] - frame.height / 2, z];
  };
}

async function loadLocalGeoMapBackground(
  scope: ProcessFlowGraphMapScope,
  frame: Pick<ProcessFlowGraphMapBackground, 'height' | 'width'>,
): Promise<GeoMapBackgroundResolution | undefined> {
  const response = await fetch(localGeoMapAssetPaths[scope], { credentials: 'omit' });

  if (!response.ok) {
    return undefined;
  }

  const mapData = (await response.json()) as LocalMapFeatureCollection;

  if (scope === 'china') {
    const chinaMap = buildChinaMercatorMap(mapData, frame);
    if (!chinaMap) {
      return undefined;
    }

    const pathGenerator = geoPath(chinaMap.projection);
    const paths = chinaMap.features
      .map((feature, index) => {
        const code = getLocalMapPathCode(scope, feature);
        const path = pathGenerator(feature) ?? '';

        return {
          code,
          id: `${scope}-${code ?? index}`,
          label: getLocalMapPathLabel(scope, feature),
          path,
        };
      })
      .filter((path) => path.path);

    if (!paths.length) {
      return undefined;
    }

    return {
      background: {
        height: frame.height,
        paths,
        scope,
        width: frame.width,
      },
      layoutPositionTransform: createChinaMercatorLayoutTransform(frame, chinaMap.projection),
    };
  }

  const projectCoordinate = projectWorldCoordinate(frame.width, frame.height);
  const paths = mapData.features
    .filter((feature) => shouldUseLocalMapFeature(scope, feature))
    .map((feature, index) => {
      const code = getLocalMapPathCode(scope, feature);
      const path = featureToPath(feature, projectCoordinate);

      return {
        code,
        id: `${scope}-${code ?? index}`,
        label: getLocalMapPathLabel(scope, feature),
        path,
      };
    })
    .filter((path) => path.path);

  if (!paths.length) {
    return undefined;
  }

  return {
    background: {
      height: frame.height,
      paths,
      scope,
      width: frame.width,
    },
  };
}

async function loadCachedLocalGeoMapBackground(
  scope: ProcessFlowGraphMapScope,
  frame: Pick<ProcessFlowGraphMapBackground, 'height' | 'width'>,
): Promise<GeoMapBackgroundResolution | undefined> {
  const cacheKey = `${scope}:${frame.width}:${frame.height}`;
  geoMapBackgroundFallbackRequests[cacheKey] ??= loadLocalGeoMapBackground(scope, frame);
  return geoMapBackgroundFallbackRequests[cacheKey];
}

async function resolveGeoMapBackground(
  scope: ProcessFlowGraphMapScope,
  frame: Pick<ProcessFlowGraphMapBackground, 'height' | 'width'>,
  background: ProcessFlowGraphMapBackground,
): Promise<GeoMapBackgroundResolution> {
  if (scope === 'china') {
    return (await loadCachedLocalGeoMapBackground(scope, frame)) ?? { background };
  }

  if (!isWorkerFrameOnlyBackground(background)) {
    return { background };
  }

  return (await loadCachedLocalGeoMapBackground(scope, frame)) ?? { background };
}

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

async function fetchRequired(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, { credentials: 'omit', ...init });

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

  const compressedStream = new Response(buffer).body;

  if (!compressedStream) {
    throw new Error('browser does not support response body streams');
  }

  const stream = compressedStream.pipeThrough(new DecompressionStreamCtor('gzip'));
  return new Response(stream).arrayBuffer();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return (await fetchRequired(url, init)).json() as Promise<T>;
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

function assertSchemaVersion(actual: string | undefined, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`invalid ${label} schema version: ${actual ?? 'missing'}`);
  }
}

function assertBinaryMagic(buffer: ArrayBuffer, expected: string, label: string) {
  assertMagic(new DataView(buffer), expected, label);
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

function parseLayout(
  buffer: ArrayBuffer,
  nodes: ProcessFlowGraphNode[],
  options: { flipY?: boolean; transformPosition?: LayoutPositionTransform } = {},
): ProcessFlowGraphLayout {
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
      const [layoutX, layoutY, layoutZ] = options.transformPosition?.(x, y, z) ?? [x, y, z];
      layout[node.id] = [layoutX, options.flipY ? -layoutY : layoutY, layoutZ];
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

  const activeManifest = await fetchJson<ActiveManifest>(
    resolveCacheUrl(baseUrl, 'manifest.json'),
    {
      cache: 'no-store',
    },
  );
  const buildManifest = await fetchJson<BuildManifest>(
    resolveCacheUrl(baseUrl, activeManifest.buildManifestPath),
    { cache: 'no-store' },
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

function normalizeClusters(
  clusters: ProcessFlowGraphCluster[],
  nodes: ProcessFlowGraphNode[],
  clusterIdField: 'clusterIdLevel1' | 'clusterIdLevel3',
): ProcessFlowGraphCluster[] {
  const counts = nodes.reduce<Record<string, number>>((countByClusterId, node) => {
    const clusterId = node[clusterIdField];
    countByClusterId[clusterId] = (countByClusterId[clusterId] ?? 0) + 1;
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
  assertSchemaVersion(buildManifest.schemaVersion, processFlowGraphSchemaVersion, 'build manifest');

  const [
    nodesPayload,
    dictionariesPayload,
    clustersLevel1Payload,
    clustersLevel3Payload,
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
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'clustersLevel1')),
    ),
    fetchGzipJson<ClustersPayload>(
      resolveCacheUrl(baseUrl, getBuildFilePath(activeManifest, buildManifest, 'clustersLevel3')),
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
  assertSchemaVersion(nodesPayload.schemaVersion, processFlowGraphSchemaVersion, 'nodes payload');
  assertSchemaVersion(
    clustersLevel1Payload.schemaVersion,
    processFlowGraphSchemaVersion,
    'clustersLevel1 payload',
  );
  assertSchemaVersion(
    clustersLevel3Payload.schemaVersion,
    processFlowGraphSchemaVersion,
    'clustersLevel3 payload',
  );

  const nodes = nodesPayload.nodes;
  const edges = parseEdges(edgesBuffer, nodes, dictionariesPayload.units);
  const clustersLevel1 = clustersLevel1Payload.clustersLevel1 ?? clustersLevel1Payload.clusters;
  const clustersLevel3 = clustersLevel3Payload.clustersLevel3 ?? clustersLevel3Payload.clusters;

  if (!clustersLevel1?.length || !clustersLevel3?.length) {
    throw new Error('missing process-flow graph v2 cluster payloads');
  }

  return {
    adjacency: parseAdjacency(adjacencyBuffer, nodes),
    buildId: buildManifest.buildId || activeManifest.activeBuildId,
    clustersLevel1: normalizeClusters(clustersLevel1, nodes, 'clusterIdLevel1'),
    clustersLevel3: normalizeClusters(clustersLevel3, nodes, 'clusterIdLevel3'),
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
    schemaVersion: processFlowGraphSchemaVersion,
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
  assertSchemaVersion(buildManifest.schemaVersion, processFlowGraphSchemaVersion, 'build manifest');

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
    viewPayload.schemaVersion !== processFlowGraphGeoMapViewSchemaVersion ||
    viewPayload.scope !== scope
  ) {
    throw new Error(`invalid process-flow geo map cache payload: ${scope}`);
  }
  assertBinaryMagic(adjacencyBuffer, adjacencyMagic, 'geo map adjacency');

  if (!viewPayload.adjacency || !viewPayload.adjacencyIncludesProcessLinks) {
    throw new Error(`missing worker-provided process-flow geo map adjacency: ${scope}`);
  }

  const nodes = viewPayload.nodes;
  const edges = [
    ...parseEdges(edgesBuffer, nodes, viewPayload.units),
    ...(viewPayload.processLinks ?? []),
  ];
  const indexes = buildNodeIndexes(nodes);
  const backgroundResolution = await resolveGeoMapBackground(
    scope,
    viewPayload.geoMapFrame,
    viewPayload.background,
  );

  return {
    background: backgroundResolution.background,
    data: {
      adjacency: viewPayload.adjacency,
      buildId: viewPayload.buildId || buildManifest.buildId || activeManifest.activeBuildId,
      clustersLevel1: normalizeClusters(viewPayload.clustersLevel1, nodes, 'clusterIdLevel1'),
      clustersLevel3: normalizeClusters(viewPayload.clustersLevel3, nodes, 'clusterIdLevel3'),
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
        // Worker geo-map layouts are emitted in map-pixel y-down space; WebGL uses y-up.
        geoMap2d: parseLayout(layoutBuffer, nodes, {
          flipY: true,
          transformPosition: backgroundResolution.layoutPositionTransform,
        }),
        sphere3d: {},
      },
      nodes,
      schemaVersion: processFlowGraphSchemaVersion,
      stats: viewPayload.stats,
    },
  };
}
