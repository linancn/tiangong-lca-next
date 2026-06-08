import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type {
  ProcessFlowGraphCluster,
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
  ProcessFlowGraphLayout,
  ProcessFlowGraphMapScope,
  ProcessFlowGraphNode,
} from './graphTypes';

type MapProperties = Record<string, unknown>;
type MapFeature = Feature<Geometry, MapProperties>;
type MapData = FeatureCollection<Geometry, MapProperties>;

export type ProcessFlowGraphMapPath = {
  code?: string;
  id: string;
  label: string;
  path: string;
};

export type ProcessFlowGraphMapBackground = {
  height: number;
  paths: ProcessFlowGraphMapPath[];
  scope: ProcessFlowGraphMapScope;
  width: number;
};

export type ProcessFlowGraphGeoMapAssets = {
  china: MapData;
  world: MapData;
};

export type ProcessFlowGraphGeoMapView = {
  background: ProcessFlowGraphMapBackground;
  data: ProcessFlowGraphData;
};

type Anchor = {
  key: string;
  spread: number;
  x: number;
  y: number;
};

type ProjectionBundle = {
  background: ProcessFlowGraphMapBackground;
  chinaCountryAnchor: Anchor;
  countryAnchors: Map<string, Anchor>;
  provinceAnchors: Map<string, Anchor>;
  regionAnchors: Map<string, Anchor>;
  unknownAnchor: Anchor;
};

const worldViewBox = {
  height: 640,
  padding: 28,
  width: 1120,
} as const;

const chinaViewBox = {
  height: 720,
  padding: 22,
  width: 1100,
} as const;

const chinaProvinceCodeByAdcode: Record<number, string> = {
  110000: 'CN-BJ',
  120000: 'CN-TJ',
  130000: 'CN-HE',
  140000: 'CN-SX',
  150000: 'CN-NM',
  210000: 'CN-LN',
  220000: 'CN-JL',
  230000: 'CN-HL',
  310000: 'CN-SH',
  320000: 'CN-JS',
  330000: 'CN-ZJ',
  340000: 'CN-AH',
  350000: 'CN-FJ',
  360000: 'CN-JX',
  370000: 'CN-SD',
  410000: 'CN-HA',
  420000: 'CN-HB',
  430000: 'CN-HN',
  440000: 'CN-GD',
  450000: 'CN-GX',
  460000: 'CN-HI',
  500000: 'CN-CQ',
  510000: 'CN-SC',
  520000: 'CN-GZ',
  530000: 'CN-YN',
  540000: 'CN-XZ',
  610000: 'CN-SN',
  620000: 'CN-GS',
  630000: 'CN-QH',
  640000: 'CN-NX',
  650000: 'CN-XJ',
  710000: 'CN-TW',
  810000: 'CN-HK',
  820000: 'CN-MO',
};

const regionCoordinates: Record<string, [number, number]> = {
  AFR: [20, 1],
  CENTREL: [15, 49],
  CPA: [103, 36],
  EAS: [112, 34],
  'EC-CC': [22, 44],
  EEU: [24, 51],
  'EU+EFTA+UK': [10, 51],
  'EU-15': [6, 48],
  'EU-25': [12, 50],
  'EU-25&CC': [16, 48],
  'EU-25&CC&AC': [18, 47],
  'EU-27': [12, 50],
  'EU-AC': [18, 45],
  'EU-NMC': [20, 51],
  FSU: [62, 56],
  GLO: [0, 8],
  MEA: [38, 25],
  NORDEL: [18, 62],
  OCE: [137, -25],
  PAO: [145, -22],
  PAS: [116, 7],
  RAF: [20, 1],
  RAM: [-76, 8],
  RAS: [103, 20],
  RER: [10, 50],
  RLA: [-65, -16],
  RME: [44, 27],
  RNA: [-101, 46],
  RNE: [40, 31],
  SAS: [78, 20],
  UCTE: [12, 49],
  WEU: [2, 48],
};

const countryCoordinateOverrides: Record<string, [number, number]> = {
  BV: [3.35, -54.42],
  GI: [-5.35, 36.14],
  UM: [-162, 6],
};

let geoMapAssetsRequest: Promise<ProcessFlowGraphGeoMapAssets> | undefined;

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getCoordinate(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }

  const [longitude, latitude] = value;
  return typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    typeof latitude === 'number' &&
    Number.isFinite(latitude)
    ? [longitude, latitude]
    : undefined;
}

async function fetchMapData(url: string): Promise<MapData> {
  const response = await fetch(url, { credentials: 'omit' });

  if (!response.ok) {
    throw new Error(`failed to fetch map asset: ${response.status} ${url}`);
  }

  return response.json() as Promise<MapData>;
}

export function loadProcessFlowGeoMapAssets(): Promise<ProcessFlowGraphGeoMapAssets> {
  if (!geoMapAssetsRequest) {
    geoMapAssetsRequest = Promise.all([
      fetchMapData('/maps/world-map-units-50m.geojson'),
      fetchMapData('/maps/china-province-100000-full.geojson'),
    ])
      .then(([world, china]) => ({ china, world }))
      .catch((error: unknown) => {
        geoMapAssetsRequest = undefined;
        throw error;
      });
  }

  return geoMapAssetsRequest;
}

function getWorldCode(feature: MapFeature): string | undefined {
  const isoA2Eh = getString(feature.properties?.ISO_A2_EH);
  const isoA2 = getString(feature.properties?.ISO_A2);
  const code = isoA2Eh && isoA2Eh !== '-99' ? isoA2Eh : isoA2;

  return code && code !== '-99' ? code.toUpperCase() : undefined;
}

function getWorldLabel(feature: MapFeature): string {
  return (
    getString(feature.properties?.NAME_ZH) ??
    getString(feature.properties?.NAME) ??
    getWorldCode(feature) ??
    'Country'
  );
}

function getChinaAdcode(feature: MapFeature): number | undefined {
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

function getChinaLabel(feature: MapFeature): string {
  const label = getString(feature.properties?.name);
  if (label) {
    return label;
  }

  return String(getChinaAdcode(feature)!);
}

function rewindFeature(feature: MapFeature): MapFeature {
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

function toSceneCoordinate(
  coordinate: [number, number] | null | undefined,
  width: number,
  height: number,
): [number, number] | undefined {
  if (!coordinate || !coordinate.every(Number.isFinite)) {
    return undefined;
  }

  return [coordinate[0] - width / 2, height / 2 - coordinate[1]];
}

function projectCoordinate(
  projection: (coordinate: [number, number]) => [number, number] | null,
  coordinate: [number, number],
  width: number,
  height: number,
): [number, number] | undefined {
  return toSceneCoordinate(projection(coordinate), width, height);
}

function createAnchor(
  key: string,
  coordinate: [number, number] | undefined,
  spread: number,
): Anchor | undefined {
  return coordinate ? { key, spread, x: coordinate[0], y: coordinate[1] } : undefined;
}

function getStableHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeLocation(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : undefined;
}

export function isChinaProcessFlowLocation(location: unknown): boolean {
  const normalizedLocation = normalizeLocation(location);
  return normalizedLocation === 'CN' || Boolean(normalizedLocation?.startsWith('CN-'));
}

function getChinaProvinceLocationCode(location: string): string | undefined {
  const parts = location.split('-');
  return parts.length >= 2 && parts[0] === 'CN' && parts[1] ? `CN-${parts[1]}` : undefined;
}

function isCountryCode(location: string): boolean {
  return /^[A-Z]{2}$/.test(location);
}

function buildChinaProvinceAnchors({
  china,
  height,
  projection,
  width,
}: {
  china: MapData;
  height: number;
  projection: (coordinate: [number, number]) => [number, number] | null;
  width: number;
}): Map<string, Anchor> {
  const provinceAnchors = new Map<string, Anchor>();

  china.features.forEach((feature) => {
    const adcode = getChinaAdcode(feature);
    const provinceCode = adcode ? chinaProvinceCodeByAdcode[adcode] : undefined;
    if (!provinceCode) {
      return;
    }

    const coordinate =
      getCoordinate(feature.properties?.centroid) ?? getCoordinate(feature.properties?.center);
    const projectedCoordinate = coordinate
      ? projectCoordinate(projection, coordinate, width, height)
      : undefined;
    const anchor = createAnchor(`province:${provinceCode}`, projectedCoordinate, 34);

    if (anchor) {
      provinceAnchors.set(provinceCode, anchor);
    }
  });

  return provinceAnchors;
}

function buildWorldProjectionBundle(world: MapData, china: MapData): ProjectionBundle {
  const displayFeatures = world.features.filter((feature) => feature.geometry);
  const displayMapData: MapData = {
    ...world,
    features: displayFeatures,
  };
  const projection = geoNaturalEarth1().fitExtent(
    [
      [worldViewBox.padding, worldViewBox.padding],
      [worldViewBox.width - worldViewBox.padding, worldViewBox.height - worldViewBox.padding],
    ],
    displayMapData,
  );
  const pathGenerator = geoPath(projection);
  const paths = displayFeatures.flatMap((feature, index): ProcessFlowGraphMapPath[] => {
    const path = pathGenerator(feature);
    if (!path) {
      return [];
    }

    const code = getWorldCode(feature);
    return [
      {
        code,
        id: `world:${code ?? index}`,
        label: getWorldLabel(feature),
        path,
      },
    ];
  });
  const countryAnchors = new Map<string, Anchor>();

  displayFeatures.forEach((feature) => {
    const code = getWorldCode(feature);
    if (!code) {
      return;
    }

    const labelCoordinate = getCoordinate([
      getNumber(feature.properties?.LABEL_X),
      getNumber(feature.properties?.LABEL_Y),
    ]);
    const projectedLabelCoordinate = labelCoordinate
      ? projectCoordinate(
          projection as (coordinate: [number, number]) => [number, number] | null,
          labelCoordinate,
          worldViewBox.width,
          worldViewBox.height,
        )
      : undefined;
    const centroidCoordinate = toSceneCoordinate(
      pathGenerator.centroid(feature) as [number, number],
      worldViewBox.width,
      worldViewBox.height,
    );
    const anchor = createAnchor(
      `country:${code}`,
      projectedLabelCoordinate ?? centroidCoordinate,
      30,
    );

    if (anchor) {
      countryAnchors.set(code, anchor);
    }
  });

  Object.entries(countryCoordinateOverrides).forEach(([code, coordinate]) => {
    if (countryAnchors.has(code)) {
      return;
    }

    const anchor = createAnchor(
      `country:${code}`,
      projectCoordinate(
        projection as (coordinate: [number, number]) => [number, number] | null,
        coordinate,
        worldViewBox.width,
        worldViewBox.height,
      ),
      30,
    );

    if (anchor) {
      countryAnchors.set(code, anchor);
    }
  });

  const regionAnchors = new Map<string, Anchor>();
  Object.entries(regionCoordinates).forEach(([code, coordinate]) => {
    const anchor = createAnchor(
      `region:${code}`,
      projectCoordinate(
        projection as (coordinate: [number, number]) => [number, number] | null,
        coordinate,
        worldViewBox.width,
        worldViewBox.height,
      ),
      42,
    );

    if (anchor) {
      regionAnchors.set(code, anchor);
    }
  });

  const provinceAnchors = buildChinaProvinceAnchors({
    china,
    height: worldViewBox.height,
    projection: projection as (coordinate: [number, number]) => [number, number] | null,
    width: worldViewBox.width,
  });
  const chinaCountryAnchor =
    countryAnchors.get('CN') ??
    createAnchor(
      'country:CN',
      projectCoordinate(
        projection as (coordinate: [number, number]) => [number, number] | null,
        [104, 35],
        worldViewBox.width,
        worldViewBox.height,
      ),
      34,
    )!;
  const unknownAnchor = {
    key: 'unknown',
    spread: 44,
    x: -worldViewBox.width / 2 + 80,
    y: -worldViewBox.height / 2 + 48,
  };

  return {
    background: {
      height: worldViewBox.height,
      paths,
      scope: 'world',
      width: worldViewBox.width,
    },
    chinaCountryAnchor,
    countryAnchors,
    provinceAnchors,
    regionAnchors,
    unknownAnchor,
  };
}

function buildChinaProjectionBundle(china: MapData): ProjectionBundle {
  const displayFeatures = china.features
    .filter((feature) => {
      const adcode = getChinaAdcode(feature);
      return Boolean(feature.properties?.name) && Boolean(adcode) && adcode !== 100000;
    })
    .map(rewindFeature);
  const displayMapData: MapData = {
    ...china,
    features: displayFeatures,
  };
  const projection = geoMercator().fitExtent(
    [
      [chinaViewBox.padding, chinaViewBox.padding],
      [chinaViewBox.width - chinaViewBox.padding, chinaViewBox.height - chinaViewBox.padding],
    ],
    displayMapData,
  );
  const pathGenerator = geoPath(projection);
  const paths = displayFeatures.flatMap((feature): ProcessFlowGraphMapPath[] => {
    const path = pathGenerator(feature);
    if (!path) {
      return [];
    }

    const adcode = getChinaAdcode(feature)!;
    const code = chinaProvinceCodeByAdcode[adcode];

    return [
      {
        code,
        id: `china:${code ?? adcode}`,
        label: getChinaLabel(feature),
        path,
      },
    ];
  });
  const provinceAnchors = buildChinaProvinceAnchors({
    china: displayMapData,
    height: chinaViewBox.height,
    projection: projection as (coordinate: [number, number]) => [number, number] | null,
    width: chinaViewBox.width,
  });
  const chinaCountryAnchor = {
    key: 'country:CN',
    spread: 40,
    x: 0,
    y: 0,
  };
  const countryAnchors = new Map<string, Anchor>([['CN', chinaCountryAnchor]]);
  const unknownAnchor = {
    key: 'unknown:china',
    spread: 34,
    x: -chinaViewBox.width / 2 + 70,
    y: -chinaViewBox.height / 2 + 52,
  };

  return {
    background: {
      height: chinaViewBox.height,
      paths,
      scope: 'china',
      width: chinaViewBox.width,
    },
    chinaCountryAnchor,
    countryAnchors,
    provinceAnchors,
    regionAnchors: new Map<string, Anchor>(),
    unknownAnchor,
  };
}

function resolveAnchor(
  node: ProcessFlowGraphNode,
  scope: ProcessFlowGraphMapScope,
  bundle: ProjectionBundle,
): Anchor {
  const location = normalizeLocation(node.location);

  if (!location || location === 'NULL') {
    return bundle.unknownAnchor;
  }

  if (location === 'CN') {
    return bundle.chinaCountryAnchor;
  }

  const provinceCode = location.startsWith('CN-')
    ? getChinaProvinceLocationCode(location)
    : undefined;
  if (provinceCode) {
    return bundle.provinceAnchors.get(provinceCode) ?? bundle.chinaCountryAnchor;
  }

  if (scope === 'china') {
    return bundle.unknownAnchor;
  }

  if (isCountryCode(location)) {
    return bundle.countryAnchors.get(location) ?? bundle.unknownAnchor;
  }

  const regionAnchor = bundle.regionAnchors.get(location);
  if (regionAnchor) {
    return regionAnchor;
  }

  return bundle.unknownAnchor;
}

function getJitteredPosition(anchor: Anchor, node: ProcessFlowGraphNode, anchorIndex: number) {
  if (anchorIndex === 0) {
    return [anchor.x, anchor.y, 0] as [number, number, number];
  }

  const hash = getStableHash(`${node.id}:${anchor.key}`);
  const ring = Math.floor((anchorIndex - 1) / 8);
  const slot = (anchorIndex - 1) % 8;
  const radius = Math.min(anchor.spread, 7 + ring * 7 + (hash % 5));
  const angle = slot * ((Math.PI * 2) / 8) + ring * 0.48 + (hash % 360) * (Math.PI / 180);

  return [
    anchor.x + Math.cos(angle) * radius,
    anchor.y + Math.sin(angle) * radius,
    node.kind === 'process' ? 0.6 : 0,
  ] as [number, number, number];
}

function buildGeoMapLayout(
  nodes: ProcessFlowGraphNode[],
  scope: ProcessFlowGraphMapScope,
  bundle: ProjectionBundle,
): ProcessFlowGraphLayout {
  const seenByAnchor = new Map<string, number>();

  return nodes.reduce<ProcessFlowGraphLayout>((layout, node) => {
    const anchor = resolveAnchor(node, scope, bundle);
    const anchorIndex = seenByAnchor.get(anchor.key) ?? 0;
    seenByAnchor.set(anchor.key, anchorIndex + 1);
    layout[node.id] = getJitteredPosition(anchor, node, anchorIndex);
    return layout;
  }, {});
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
  clusters: ProcessFlowGraphCluster[],
  nodes: ProcessFlowGraphNode[],
): ProcessFlowGraphCluster[] {
  const countByClusterId = nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.clusterId] = (counts[node.clusterId] ?? 0) + 1;
    return counts;
  }, {});

  return clusters.map((cluster) => ({
    ...cluster,
    count: countByClusterId[cluster.id] ?? 0,
  }));
}

function withGeoMapData(
  data: ProcessFlowGraphData,
  nodes: ProcessFlowGraphNode[],
  edges: ProcessFlowGraphEdge[],
  layout: ProcessFlowGraphLayout,
): ProcessFlowGraphData {
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
    layouts: {
      ...data.layouts,
      geoMap2d: layout,
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

export function buildProcessFlowGraphGeoMapView(
  data: ProcessFlowGraphData,
  scope: ProcessFlowGraphMapScope,
  assets: ProcessFlowGraphGeoMapAssets,
): ProcessFlowGraphGeoMapView {
  const bundle =
    scope === 'world'
      ? buildWorldProjectionBundle(assets.world, assets.china)
      : buildChinaProjectionBundle(assets.china);
  const visibleNodes =
    scope === 'china'
      ? data.nodes.filter((node) => isChinaProcessFlowLocation(node.location))
      : data.nodes;
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges =
    scope === 'china'
      ? data.edges.filter(
          (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
        )
      : data.edges;
  const layout = buildGeoMapLayout(visibleNodes, scope, bundle);

  return {
    background: bundle.background,
    data: {
      ...withGeoMapData(data, visibleNodes, visibleEdges, layout),
      geoMapFrame: {
        height: bundle.background.height,
        width: bundle.background.width,
      },
    },
  };
}
