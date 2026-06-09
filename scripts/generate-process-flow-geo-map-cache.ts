import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  buildCategorizedExpandedLayout,
  summarizeCategorizedExpandedLayout,
} from '../src/pages/NationalCarbonDashboard/components/ProcessFlowGraph/expandedLayout';
import {
  buildProcessFlowGraphGeoMapView,
  type ProcessFlowGraphGeoMapView,
} from '../src/pages/NationalCarbonDashboard/components/ProcessFlowGraph/geoMapLayout';
import type {
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
  ProcessFlowGraphLayout,
  ProcessFlowGraphMapScope,
  ProcessFlowGraphNode,
} from '../src/pages/NationalCarbonDashboard/components/ProcessFlowGraph/graphTypes';
import { loadProcessFlowGraphFromCache } from '../src/pages/NationalCarbonDashboard/components/ProcessFlowGraph/processFlowGraphCacheLoader';

const edgeMagic = 'PFGEDG1\0';
const adjacencyMagic = 'PFGCSR1\0';
const layoutMagic = 'PFGLAY1\0';
const u32None = 0xffffffff;

type ActiveManifest = {
  activeBuildId: string;
  buildManifestPath: string;
  schemaVersion: 'process_flow_graph_manifest_v1';
};

type BuildFileEntry = {
  byteSize?: number;
  contentType?: string;
  path: string;
  sha256?: string;
};

type BuildManifest = {
  buildId: string;
  files: Record<string, BuildFileEntry>;
  schemaVersion: 'process_flow_graph_v1';
};

type ProcessFlowGraphCacheFile = {
  key: string;
  localPath: string;
  manifestEntry: BuildFileEntry;
  remotePath: string;
};

type GeoMapViewSummary = {
  backgroundPaths: number;
  edges: number;
  omittedNodes: number;
  nodes: number;
  processLinks: number;
  sourceEdges: number;
  sourceNodes: number;
};

type CliOptions = {
  cacheBaseUrl?: string;
  forceExpandedLayout: boolean;
  minioAccessKey: string;
  minioAlias: string;
  minioContainer: string;
  minioEndpoint: string;
  minioSecretKey: string;
  outputDir: string;
  skipExpandedLayout: boolean;
  uploadLocalMinio: boolean;
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

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    forceExpandedLayout: false,
    minioAccessKey: 'minioadmin',
    minioAlias: 'local',
    minioContainer: 'tiangong-process-flow-minio',
    minioEndpoint: 'http://127.0.0.1:9000',
    minioSecretKey: 'minioadmin',
    outputDir: 'tmp/process-flow-geo-map-cache',
    skipExpandedLayout: false,
    uploadLocalMinio: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--upload-local-minio') {
      options.uploadLocalMinio = true;
      continue;
    }

    if (arg === '--skip-expanded-layout') {
      options.skipExpandedLayout = true;
      continue;
    }

    if (arg === '--force-expanded-layout') {
      options.forceExpandedLayout = true;
      continue;
    }

    if (!next) {
      throw new Error(`missing value for ${arg}`);
    }

    if (arg === '--cache-base-url') {
      options.cacheBaseUrl = next;
    } else if (arg === '--minio-access-key') {
      options.minioAccessKey = next;
    } else if (arg === '--minio-alias') {
      options.minioAlias = next;
    } else if (arg === '--minio-container') {
      options.minioContainer = next;
    } else if (arg === '--minio-endpoint') {
      options.minioEndpoint = next;
    } else if (arg === '--minio-secret-key') {
      options.minioSecretKey = next;
    } else if (arg === '--output-dir') {
      options.outputDir = next;
    } else {
      throw new Error(`unknown option: ${arg}`);
    }

    index += 1;
  }

  return options;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmedLine);
      if (!match || process.env[match[1]] !== undefined) {
        return;
      }

      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    });
}

function resolveCacheBaseUrl(options: CliOptions): string {
  loadEnvFile(resolve('.env.local'));
  loadEnvFile(resolve('.env'));

  const cacheBaseUrl =
    options.cacheBaseUrl ?? process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL?.replace(/\/+$/, '');

  if (!cacheBaseUrl) {
    throw new Error('PROCESS_FLOW_GRAPH_CACHE_BASE_URL is not configured');
  }

  process.env.PROCESS_FLOW_GRAPH_CACHE_BASE_URL = cacheBaseUrl;
  return cacheBaseUrl;
}

function resolveCacheUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${baseUrl.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function parseCacheObjectBase(cacheBaseUrl: string): { bucket: string; prefix: string } {
  const segments = new URL(cacheBaseUrl).pathname.replace(/^\/+|\/+$/g, '').split('/');
  const [bucket, ...prefixParts] = segments;

  if (!bucket) {
    throw new Error(`cache base URL does not include an S3 bucket path: ${cacheBaseUrl}`);
  }

  return {
    bucket,
    prefix: prefixParts.join('/'),
  };
}

function getBuildRootPath(activeManifest: ActiveManifest): string {
  return activeManifest.buildManifestPath.replace(/\/manifest\.json$/, '');
}

function normalizeLocation(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : undefined;
}

function hasChinaProvinceLocation(location: string): boolean {
  const parts = location.split('-');
  return parts.length >= 2 && parts[0] === 'CN' && Boolean(parts[1]);
}

function getWorldCountryLocation(location: string): string | undefined {
  if (location === 'CN' || location.startsWith('CN-')) {
    return 'CN';
  }

  return /^[A-Z]{2}$/.test(location) ? location : undefined;
}

function hasOwnMapLocation(
  node: ProcessFlowGraphNode,
  scope: ProcessFlowGraphMapScope,
  worldCountryCodes: Set<string>,
): boolean {
  const location = normalizeLocation(node.location);

  if (!location || location === 'NULL') {
    return false;
  }

  if (scope === 'china') {
    return hasChinaProvinceLocation(location);
  }

  const countryLocation = getWorldCountryLocation(location);
  return Boolean(countryLocation && worldCountryCodes.has(countryLocation));
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

async function writeObject(
  outputRoot: string,
  relativePath: string,
  buffer: Buffer,
): Promise<BuildFileEntry & { localPath: string }> {
  const localPath = join(outputRoot, relativePath);
  await mkdir(join(localPath, '..'), { recursive: true });
  await writeFile(localPath, buffer);

  return {
    byteSize: buffer.byteLength,
    contentType: 'application/gzip',
    localPath,
    path: relativePath,
    sha256: sha256(buffer),
  };
}

async function writeGzipJson(
  outputRoot: string,
  relativePath: string,
  payload: unknown,
): Promise<BuildFileEntry & { localPath: string }> {
  return writeObject(outputRoot, relativePath, gzipSync(JSON.stringify(payload)));
}

function writeMagic(view: DataView, magic: string) {
  for (let index = 0; index < magic.length; index += 1) {
    view.setUint8(index, magic.charCodeAt(index));
  }
  view.setUint32(8, 1, true);
}

function getNodeIndexes(nodes: ProcessFlowGraphNode[]): Record<string, number> {
  return nodes.reduce<Record<string, number>>((indexes, node, index) => {
    indexes[node.id] = index;
    return indexes;
  }, {});
}

function getUnitDictionary(edges: ProcessFlowGraphEdge[]): string[] {
  return Array.from(
    edges.reduce<Set<string>>((units, edge) => {
      if (edge.unit) {
        units.add(edge.unit);
      }
      return units;
    }, new Set<string>()),
  ).sort();
}

function writeEdgesBinary(
  edges: ProcessFlowGraphEdge[],
  nodes: ProcessFlowGraphNode[],
  units: string[],
): Buffer {
  const rowByteLength = 52;
  const buffer = Buffer.alloc(16 + edges.length * rowByteLength);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const nodeIndexes = getNodeIndexes(nodes);
  const unitIndexes = new Map(units.map((unit, index) => [unit, index] as const));

  writeMagic(view, edgeMagic);
  view.setUint32(12, edges.length, true);

  let offset = 16;
  edges.forEach((edge) => {
    view.setUint32(offset, nodeIndexes[edge.source] ?? u32None, true);
    offset += 4;
    view.setUint32(offset, nodeIndexes[edge.target] ?? u32None, true);
    offset += 4;
    view.setUint32(offset, nodeIndexes[edge.flowId] ?? u32None, true);
    offset += 4;
    view.setUint32(offset, nodeIndexes[edge.processId] ?? u32None, true);
    offset += 4;
    view.setUint8(offset, edge.direction === 'input' ? 0 : 1);
    offset += 1;
    offset += 1;
    offset += 2;
    view.setFloat64(offset, edge.amount ?? Number.NaN, true);
    offset += 8;
    view.setFloat64(offset, Number.NaN, true);
    offset += 8;
    offset += 4;
    offset += 4;
    view.setUint32(offset, edge.unit ? (unitIndexes.get(edge.unit) ?? u32None) : u32None, true);
    offset += 4;
    view.setUint32(offset, u32None, true);
    offset += 4;
  });

  return buffer;
}

function writeAdjacencyBinary(data: ProcessFlowGraphData): Buffer {
  const edgeIndexes = new Map(data.edges.map((edge, index) => [edge.id, index] as const));
  const offsets: number[] = [0];
  const edgeReferences: number[] = [];

  data.nodes.forEach((node) => {
    (data.adjacency[node.id] ?? []).forEach((edgeId) => {
      const edgeIndex = edgeIndexes.get(edgeId);
      if (edgeIndex !== undefined) {
        edgeReferences.push(edgeIndex);
      }
    });
    offsets.push(edgeReferences.length);
  });

  const buffer = Buffer.alloc(20 + offsets.length * 4 + edgeReferences.length * 4);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  writeMagic(view, adjacencyMagic);
  view.setUint32(12, data.nodes.length, true);
  view.setUint32(16, edgeReferences.length, true);

  let offset = 20;
  offsets.forEach((value) => {
    view.setUint32(offset, value, true);
    offset += 4;
  });
  edgeReferences.forEach((value) => {
    view.setUint32(offset, value, true);
    offset += 4;
  });

  return buffer;
}

function writeLayoutBinary(
  nodes: ProcessFlowGraphNode[],
  layout: ProcessFlowGraphLayout | undefined,
  label: string,
): Buffer {
  if (!layout) {
    throw new Error(`${label} layout was not generated`);
  }

  const buffer = Buffer.alloc(16 + nodes.length * 12);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  writeMagic(view, layoutMagic);
  view.setUint32(12, nodes.length, true);

  let offset = 16;
  nodes.forEach((node) => {
    const position = layout[node.id];
    if (!position) {
      throw new Error(`${label} layout is missing node position: ${node.id}`);
    }

    const [x, y, z] = position;
    view.setFloat32(offset, x, true);
    offset += 4;
    view.setFloat32(offset, y, true);
    offset += 4;
    view.setFloat32(offset, z, true);
    offset += 4;
  });

  return buffer;
}

function buildEdgeById(edges: ProcessFlowGraphEdge[]): Record<string, number> {
  return edges.reduce<Record<string, number>>((indexById, edge, index) => {
    indexById[edge.id] = index;
    return indexById;
  }, {});
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
  clusters: ProcessFlowGraphData['clusters'],
  nodes: ProcessFlowGraphNode[],
): ProcessFlowGraphData['clusters'] {
  const counts = nodes.reduce<Record<string, number>>((countByClusterId, node) => {
    countByClusterId[node.clusterId] = (countByClusterId[node.clusterId] ?? 0) + 1;
    return countByClusterId;
  }, {});

  return clusters.map((cluster) => ({
    ...cluster,
    count: counts[cluster.id] ?? 0,
  }));
}

function createProcessLinkId(
  scope: ProcessFlowGraphMapScope,
  flowId: string,
  sourceProcessId: string,
  targetProcessId: string,
): string {
  return `process-link:${scope}:${sha256(
    Buffer.from(`${flowId}\0${sourceProcessId}\0${targetProcessId}`),
  ).slice(0, 20)}`;
}

function buildHiddenFlowProcessLinks(
  data: ProcessFlowGraphData,
  scope: ProcessFlowGraphMapScope,
  visibleNodes: ProcessFlowGraphNode[],
): ProcessFlowGraphEdge[] {
  const visibleProcessIds = new Set(
    visibleNodes.filter((node) => node.kind === 'process').map((node) => node.id),
  );
  const processLinks: ProcessFlowGraphEdge[] = [];
  const seenProcessLinkIds = new Set<string>();

  data.nodes
    .filter((node) => node.kind === 'flow')
    .forEach((flowNode) => {
      const flowEdges = (data.adjacency[flowNode.id] ?? [])
        .map((edgeId) => data.edges[data.indexes.edgeById[edgeId]])
        .filter(
          (edge): edge is ProcessFlowGraphEdge =>
            Boolean(edge) && visibleProcessIds.has(edge.processId),
        );
      const providers = new Set(
        flowEdges.filter((edge) => edge.direction === 'output').map((edge) => edge.processId),
      );
      const consumers = new Set(
        flowEdges.filter((edge) => edge.direction === 'input').map((edge) => edge.processId),
      );

      providers.forEach((sourceProcessId) => {
        consumers.forEach((targetProcessId) => {
          if (sourceProcessId === targetProcessId) {
            return;
          }

          const id = createProcessLinkId(scope, flowNode.id, sourceProcessId, targetProcessId);
          if (seenProcessLinkIds.has(id)) {
            return;
          }

          seenProcessLinkIds.add(id);
          processLinks.push({
            direction: 'output',
            exchangeId: id,
            flowId: flowNode.id,
            id,
            processId: targetProcessId,
            source: sourceProcessId,
            target: targetProcessId,
          });
        });
      });
    });

  return processLinks;
}

function filterGraphDataByOwnLocation(
  data: ProcessFlowGraphData,
  scope: ProcessFlowGraphMapScope,
  worldCountryCodes: Set<string>,
): ProcessFlowGraphData {
  const nodes = data.nodes.filter((node) => hasOwnMapLocation(node, scope, worldCountryCodes));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const indexes = buildNodeIndexes(nodes);

  return {
    ...data,
    adjacency: buildAdjacency(nodes, edges),
    clusters: normalizeClusters(data.clusters, nodes),
    edges,
    indexes: {
      ...indexes,
      edgeById: buildEdgeById(edges),
      searchFlows: data.indexes.searchFlows.filter(
        (flow) => indexes.flowById[flow.id] !== undefined,
      ),
    },
    nodes,
    stats: {
      edgeCount: edges.length,
      flowCount: nodes.filter((node) => node.kind === 'flow').length,
      maxDegree: nodes.reduce((maxDegree, node) => Math.max(maxDegree, node.degree), 0),
      processCount: nodes.filter((node) => node.kind === 'process').length,
    },
  };
}

function assertGeoMapBackgroundPreserved(
  scope: ProcessFlowGraphMapScope,
  sourceView: ProcessFlowGraphGeoMapView,
  filteredView: ProcessFlowGraphGeoMapView,
) {
  const sourceBackground = sourceView.background;
  const filteredBackground = filteredView.background;

  if (!sourceBackground.paths.length) {
    throw new Error(`${scope} map background has no outline paths`);
  }

  const emptyPath = sourceBackground.paths.find((path) => !path.path.trim());
  if (emptyPath) {
    throw new Error(`${scope} map background contains an empty outline path: ${emptyPath.id}`);
  }

  if (JSON.stringify(filteredBackground) !== JSON.stringify(sourceBackground)) {
    throw new Error(`${scope} map background changed while filtering nodes`);
  }
}

function summarizeGeoMapView(
  sourceView: ProcessFlowGraphGeoMapView,
  filteredView: ProcessFlowGraphGeoMapView,
  processLinks: ProcessFlowGraphEdge[],
): GeoMapViewSummary {
  return {
    backgroundPaths: filteredView.background.paths.length,
    edges: filteredView.data.edges.length + processLinks.length,
    nodes: filteredView.data.nodes.length,
    omittedNodes: sourceView.data.nodes.length - filteredView.data.nodes.length,
    processLinks: processLinks.length,
    sourceEdges: sourceView.data.edges.length,
    sourceNodes: sourceView.data.nodes.length,
  };
}

async function loadGeoMapAssets() {
  const [world, china] = await Promise.all([
    readFile(resolve('public/maps/world-map-units-50m.geojson'), 'utf8'),
    readFile(resolve('public/maps/china-province-100000-full.geojson'), 'utf8'),
  ]);

  return {
    china: JSON.parse(china),
    world: JSON.parse(world),
  };
}

async function writeGeoMapViewFiles(
  outputRoot: string,
  scope: ProcessFlowGraphMapScope,
  view: ProcessFlowGraphGeoMapView,
  processLinks: ProcessFlowGraphEdge[],
  manifestPathVersion: string,
): Promise<ProcessFlowGraphCacheFile[]> {
  const fileKeys = geoMapCacheFileKeys[scope];
  const scopeRoot = `geo-map/${scope}`;
  const units = getUnitDictionary(view.data.edges);
  const payload = {
    background: view.background,
    buildId: view.data.buildId,
    clusters: view.data.clusters,
    geoMapFrame: view.data.geoMapFrame,
    nodes: view.data.nodes,
    processLinks,
    schemaVersion: 'process_flow_graph_geo_map_view_v1',
    scope,
    searchFlows: view.data.indexes.searchFlows,
    stats: {
      ...view.data.stats,
      edgeCount: view.data.edges.length + processLinks.length,
    },
    units,
  };
  const files = [
    {
      entry: await writeGzipJson(outputRoot, `${scopeRoot}/view.json.gz`, payload),
      key: fileKeys.view,
    },
    {
      entry: await writeObject(
        outputRoot,
        `${scopeRoot}/edges.bin.gz`,
        gzipSync(writeEdgesBinary(view.data.edges, view.data.nodes, units)),
      ),
      key: fileKeys.edges,
    },
    {
      entry: await writeObject(
        outputRoot,
        `${scopeRoot}/adjacency.csr.bin.gz`,
        gzipSync(writeAdjacencyBinary(view.data)),
      ),
      key: fileKeys.adjacency,
    },
    {
      entry: await writeObject(
        outputRoot,
        `${scopeRoot}/layout.f32.bin.gz`,
        gzipSync(writeLayoutBinary(view.data.nodes, view.data.layouts.geoMap2d, 'geoMap2d')),
      ),
      key: fileKeys.layout,
    },
  ];

  return files.map(({ entry, key }) => {
    const { localPath, ...manifestEntry } = entry;
    return {
      key,
      localPath,
      manifestEntry: {
        ...manifestEntry,
        path: `${manifestEntry.path}?v=${manifestPathVersion}`,
      },
      remotePath: manifestEntry.path,
    };
  });
}

async function writeCategorizedExpandedLayoutFile(
  outputRoot: string,
  data: ProcessFlowGraphData,
  manifestPathVersion: string,
): Promise<{
  file: ProcessFlowGraphCacheFile;
  layout: ProcessFlowGraphLayout;
}> {
  const layout = buildCategorizedExpandedLayout(data);
  const entry = await writeObject(
    outputRoot,
    'expanded/categorized-filled-layout.f32.bin.gz',
    gzipSync(writeLayoutBinary(data.nodes, layout, 'expanded2d')),
  );
  const { localPath, ...manifestEntry } = entry;

  return {
    file: {
      key: 'expanded2d',
      localPath,
      manifestEntry: {
        ...manifestEntry,
        path: `${manifestEntry.path}?v=${manifestPathVersion}`,
      },
      remotePath: manifestEntry.path,
    },
    layout,
  };
}

function isCategorizedExpandedLayoutFile(buildManifest: BuildManifest): boolean {
  return /(^|\/)categorized-filled-layout\.f32\.bin\.gz(?:\?|$)/.test(
    buildManifest.files.expanded2d?.path ?? '',
  );
}

function runDocker(args: string[]) {
  execFileSync('docker', args, { stdio: 'inherit' });
}

function uploadToLocalMinio({
  bucket,
  buildFiles,
  buildManifestPath,
  buildRootObjectPath,
  container,
  localBuildRoot,
  minioAccessKey,
  minioAlias,
  minioEndpoint,
  minioSecretKey,
}: {
  bucket: string;
  buildFiles: ProcessFlowGraphCacheFile[];
  buildManifestPath: string;
  buildRootObjectPath: string;
  container: string;
  localBuildRoot: string;
  minioAccessKey: string;
  minioAlias: string;
  minioEndpoint: string;
  minioSecretKey: string;
}) {
  const containerRoot = `/tmp/process-flow-geo-map-cache-${Date.now()}`;
  runDocker(['exec', container, 'rm', '-rf', containerRoot]);
  runDocker(['cp', `${localBuildRoot}/.`, `${container}:${containerRoot}`]);
  runDocker([
    'exec',
    container,
    'mc',
    'alias',
    'set',
    minioAlias,
    minioEndpoint,
    minioAccessKey,
    minioSecretKey,
  ]);

  const manifestBackupPath = `${buildManifestPath}.before-process-flow-cache-${Date.now()}`;
  runDocker([
    'exec',
    container,
    'mc',
    'cp',
    `${minioAlias}/${bucket}/${buildManifestPath}`,
    `${minioAlias}/${bucket}/${manifestBackupPath}`,
  ]);

  buildFiles.forEach((file) => {
    runDocker([
      'exec',
      container,
      'mc',
      'cp',
      `${containerRoot}/${file.remotePath}`,
      `${minioAlias}/${bucket}/${buildRootObjectPath}/${file.remotePath}`,
    ]);
  });
  runDocker([
    'exec',
    container,
    'mc',
    'cp',
    `${containerRoot}/manifest.json`,
    `${minioAlias}/${bucket}/${buildManifestPath}`,
  ]);
  runDocker(['exec', container, 'rm', '-rf', containerRoot]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cacheBaseUrl = resolveCacheBaseUrl(options);
  const activeManifest = await fetchJson<ActiveManifest>(
    resolveCacheUrl(cacheBaseUrl, 'manifest.json'),
  );
  const buildManifest = await fetchJson<BuildManifest>(
    resolveCacheUrl(cacheBaseUrl, activeManifest.buildManifestPath),
  );
  const buildId = buildManifest.buildId || activeManifest.activeBuildId;
  const outputRoot = resolve(options.outputDir, buildId);
  const objectRoot = join(outputRoot, 'objects');
  const { bucket, prefix } = parseCacheObjectBase(cacheBaseUrl);
  const buildRootPath = getBuildRootPath(activeManifest);
  const buildRootObjectPath = [prefix, buildRootPath].filter(Boolean).join('/');

  await rm(outputRoot, { force: true, recursive: true });
  await mkdir(objectRoot, { recursive: true });

  console.log(`Loading process-flow graph cache from ${cacheBaseUrl}`);
  const [data, assets] = await Promise.all([loadProcessFlowGraphFromCache(), loadGeoMapAssets()]);
  const sourceViews = {
    china: buildProcessFlowGraphGeoMapView(data, 'china', assets),
    world: buildProcessFlowGraphGeoMapView(data, 'world', assets),
  };
  const worldCountryCodes = new Set(
    sourceViews.world.background.paths
      .map((path) => path.code)
      .filter((code): code is string => Boolean(code)),
  );
  const filteredData = {
    china: filterGraphDataByOwnLocation(data, 'china', worldCountryCodes),
    world: filterGraphDataByOwnLocation(data, 'world', worldCountryCodes),
  };
  const views = {
    china: buildProcessFlowGraphGeoMapView(filteredData.china, 'china', assets),
    world: buildProcessFlowGraphGeoMapView(filteredData.world, 'world', assets),
  };
  const processLinks = {
    china: buildHiddenFlowProcessLinks(data, 'china', views.china.data.nodes),
    world: buildHiddenFlowProcessLinks(data, 'world', views.world.data.nodes),
  };
  const manifestPathVersion = Date.now().toString(36);

  assertGeoMapBackgroundPreserved('world', sourceViews.world, views.world);
  assertGeoMapBackgroundPreserved('china', sourceViews.china, views.china);

  const geoMapBuildFiles = [
    ...(await writeGeoMapViewFiles(
      objectRoot,
      'world',
      views.world,
      processLinks.world,
      manifestPathVersion,
    )),
    ...(await writeGeoMapViewFiles(
      objectRoot,
      'china',
      views.china,
      processLinks.china,
      manifestPathVersion,
    )),
  ];
  const sourceExpandedLayoutSummary = summarizeCategorizedExpandedLayout(
    data,
    data.layouts.expanded2d,
  );
  const shouldWriteExpandedLayout =
    !options.skipExpandedLayout &&
    (options.forceExpandedLayout || !isCategorizedExpandedLayoutFile(buildManifest));
  const expandedLayoutResult = shouldWriteExpandedLayout
    ? await writeCategorizedExpandedLayoutFile(objectRoot, data, manifestPathVersion)
    : undefined;
  const expandedLayoutSummary = options.skipExpandedLayout
    ? { source: sourceExpandedLayoutSummary, status: 'skipped' }
    : expandedLayoutResult
      ? {
          categorized: summarizeCategorizedExpandedLayout(data, expandedLayoutResult.layout),
          source: sourceExpandedLayoutSummary,
          status: 'generated',
        }
      : {
          source: sourceExpandedLayoutSummary,
          status: 'already-categorized',
        };
  const buildFiles = [
    ...geoMapBuildFiles,
    ...(expandedLayoutResult ? [expandedLayoutResult.file] : []),
  ];
  const patchedManifest: BuildManifest = {
    ...buildManifest,
    files: buildFiles.reduce<Record<string, BuildFileEntry>>(
      (files, file) => ({
        ...files,
        [file.key]: file.manifestEntry,
      }),
      { ...buildManifest.files },
    ),
  };

  await writeFile(
    join(objectRoot, 'manifest.json'),
    `${JSON.stringify(patchedManifest, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        buildId,
        china: summarizeGeoMapView(sourceViews.china, views.china, processLinks.china),
        expanded2d: expandedLayoutSummary,
        files: Object.fromEntries(
          buildFiles.map((file) => [file.key, file.manifestEntry.path] as const),
        ),
        outputRoot,
        world: summarizeGeoMapView(sourceViews.world, views.world, processLinks.world),
      },
      null,
      2,
    ),
  );

  if (options.uploadLocalMinio) {
    uploadToLocalMinio({
      bucket,
      buildFiles,
      buildManifestPath: [prefix, activeManifest.buildManifestPath].filter(Boolean).join('/'),
      buildRootObjectPath,
      container: options.minioContainer,
      localBuildRoot: objectRoot,
      minioAccessKey: options.minioAccessKey,
      minioAlias: options.minioAlias,
      minioEndpoint: options.minioEndpoint,
      minioSecretKey: options.minioSecretKey,
    });
    console.log(
      `Uploaded geo map cache objects to ${options.minioAlias}/${bucket}/${buildRootObjectPath}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
