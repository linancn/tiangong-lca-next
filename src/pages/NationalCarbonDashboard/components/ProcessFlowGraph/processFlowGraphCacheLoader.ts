import { requestNationalCarbonGraphCacheObjectsApi } from '@/services/nationalCarbonGraphCacheObjects/api';
import { geoContains, type GeoProjection } from 'd3-geo';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position,
} from 'geojson';
import {
  buildChinaMercatorMap,
  getChinaRegionAdcode,
  rewindChinaMapFeature,
  type ChinaMapData,
  type ChinaMapFeature,
} from '../../chinaMapProjection';
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
const chinaInsetMapPathCode = '100000_JD';
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
const chinaProvinceLocationAdcodes: Record<string, string> = {
  'CN-AH': '340000',
  'CN-BJ': '110000',
  'CN-CQ': '500000',
  'CN-FJ': '350000',
  'CN-GD': '440000',
  'CN-GS': '620000',
  'CN-GX': '450000',
  'CN-GZ': '520000',
  'CN-HA': '410000',
  'CN-HB': '420000',
  'CN-HE': '130000',
  'CN-HI': '460000',
  'CN-HK': '810000',
  'CN-HL': '230000',
  'CN-HN': '430000',
  'CN-JL': '220000',
  'CN-JS': '320000',
  'CN-JX': '360000',
  'CN-LN': '210000',
  'CN-MO': '820000',
  'CN-NM': '150000',
  'CN-NX': '640000',
  'CN-QH': '630000',
  'CN-SC': '510000',
  'CN-SD': '370000',
  'CN-SH': '310000',
  'CN-SN': '610000',
  'CN-SX': '140000',
  'CN-TJ': '120000',
  'CN-TW': '710000',
  'CN-XJ': '650000',
  'CN-XZ': '540000',
  'CN-YN': '530000',
  'CN-ZJ': '330000',
};

type ActiveManifest = {
  activeBuildId: string;
  buildManifestPath: string;
  schemaVersion: 'process_flow_graph_manifest_v1';
};

type BuildManifest = {
  buildId: string;
  files: Record<string, { path: string; signedUrl?: string }>;
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
  baseUrl?: string;
  buildManifest: BuildManifest;
};
type LocalMapFeatureProperties = {
  ADM0_ISO?: string;
  adchar?: string;
  adcode?: number | string;
  center?: Position;
  centroid?: Position;
  ISO_A2?: string;
  ISO_A2_EH?: string;
  ISO_A3?: string;
  LABEL_X?: number | string;
  LABEL_Y?: number | string;
  NAME?: string;
  NAME_EN?: string;
  name?: string;
  POSTAL?: string;
};
type LocalMapFeature = Feature<Geometry, LocalMapFeatureProperties>;
type LocalPolygonMapFeature = Feature<Polygon | MultiPolygon, LocalMapFeatureProperties>;
type LocalMapFeatureCollection = FeatureCollection<Geometry, LocalMapFeatureProperties>;
type CoordinateProjector = (longitude: number, latitude: number) => [number, number];
type LayoutPositionTransform = (
  x: number,
  y: number,
  z: number,
  node: ProcessFlowGraphNode,
  nodeIndex: number,
) => [number, number, number];
type LayoutPositionTransformFactory = (nodes: ProcessFlowGraphNode[]) => LayoutPositionTransform;
type LonLatBounds = {
  latMax: number;
  latMin: number;
  lonMax: number;
  lonMin: number;
};
type GeoRegionPlacement = {
  bounds: LonLatBounds;
  feature: LocalPolygonMapFeature;
};
type GeoMapBackgroundResolution = {
  background: ProcessFlowGraphMapBackground;
  createLayoutPositionTransform?: LayoutPositionTransformFactory;
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
const geoMapViewCache: Partial<Record<ProcessFlowGraphMapScope, ProcessFlowGraphGeoMapView>> = {};
const geoMapViewRequests: Partial<
  Record<ProcessFlowGraphMapScope, Promise<ProcessFlowGraphGeoMapView | undefined>>
> = {};

export function resetProcessFlowGraphCacheLoaderState(): void {
  Object.keys(geoMapBackgroundFallbackRequests).forEach((cacheKey) => {
    delete geoMapBackgroundFallbackRequests[cacheKey];
  });
  Object.keys(geoMapViewCache).forEach((scope) => {
    delete geoMapViewCache[scope as ProcessFlowGraphMapScope];
  });
  Object.keys(geoMapViewRequests).forEach((scope) => {
    delete geoMapViewRequests[scope as ProcessFlowGraphMapScope];
  });
}

export function resetProcessFlowGraphCacheLoaderStateForTest(): void {
  resetProcessFlowGraphCacheLoaderState();
}

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

function shouldUseLocalWorldMapFeature(feature: LocalMapFeature): boolean {
  if (!feature.geometry) {
    return false;
  }

  return Boolean(feature.properties?.NAME || feature.properties?.NAME_EN);
}

function isPolygonMapFeature(feature: LocalMapFeature): feature is LocalPolygonMapFeature {
  return feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon';
}

function createInitialBounds(): LonLatBounds {
  return {
    latMax: -Infinity,
    latMin: Infinity,
    lonMax: -Infinity,
    lonMin: Infinity,
  };
}

function extendBounds(bounds: LonLatBounds, position: Position): void {
  const [longitude, latitude] = position;

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return;
  }

  bounds.lonMin = Math.min(bounds.lonMin, longitude);
  bounds.lonMax = Math.max(bounds.lonMax, longitude);
  bounds.latMin = Math.min(bounds.latMin, latitude);
  bounds.latMax = Math.max(bounds.latMax, latitude);
}

function hasUsableBounds(bounds: LonLatBounds): boolean {
  return (
    Number.isFinite(bounds.lonMin) &&
    Number.isFinite(bounds.lonMax) &&
    Number.isFinite(bounds.latMin) &&
    Number.isFinite(bounds.latMax) &&
    bounds.lonMax > bounds.lonMin &&
    bounds.latMax > bounds.latMin
  );
}

function getPolygonLonLatBounds(polygonCoordinates: Position[][]): LonLatBounds | undefined {
  const bounds = createInitialBounds();
  polygonCoordinates.forEach((ring) => {
    ring.forEach((position) => extendBounds(bounds, position));
  });
  return hasUsableBounds(bounds) ? bounds : undefined;
}

function getFeatureLonLatBounds(feature: LocalPolygonMapFeature): LonLatBounds | undefined {
  if (feature.geometry.type === 'Polygon') {
    return getPolygonLonLatBounds(feature.geometry.coordinates);
  }

  const bounds = createInitialBounds();
  feature.geometry.coordinates.forEach((polygonCoordinates) => {
    polygonCoordinates.forEach((ring) => {
      ring.forEach((position) => extendBounds(bounds, position));
    });
  });
  return hasUsableBounds(bounds) ? bounds : undefined;
}

function getBoundsArea(bounds: LonLatBounds): number {
  return (bounds.lonMax - bounds.lonMin) * (bounds.latMax - bounds.latMin);
}

function getLargestPolygonPlacementFeature(
  feature: LocalPolygonMapFeature,
): LocalPolygonMapFeature | undefined {
  if (feature.geometry.type === 'Polygon') {
    return getFeatureLonLatBounds(feature) ? feature : undefined;
  }

  const largestPolygon = feature.geometry.coordinates.reduce<{
    area: number;
    coordinates: Position[][] | undefined;
  }>(
    (largest, polygonCoordinates) => {
      const bounds = getPolygonLonLatBounds(polygonCoordinates);
      if (!bounds) {
        return largest;
      }

      const area = getBoundsArea(bounds);
      return area > largest.area ? { area, coordinates: polygonCoordinates } : largest;
    },
    { area: -Infinity, coordinates: undefined },
  );

  if (!largestPolygon.coordinates) {
    return undefined;
  }

  return {
    ...feature,
    geometry: {
      coordinates: largestPolygon.coordinates,
      type: 'Polygon',
    },
  };
}

function createRegionPlacementMap(
  features: LocalMapFeature[],
  getRegionCode: (feature: LocalMapFeature) => string | undefined,
): Map<string, GeoRegionPlacement> {
  return features.reduce<Map<string, GeoRegionPlacement>>((placementByCode, feature) => {
    if (!isPolygonMapFeature(feature)) {
      return placementByCode;
    }

    const code = getRegionCode(feature);
    const placementFeature = getLargestPolygonPlacementFeature(feature);
    const bounds = placementFeature ? getFeatureLonLatBounds(placementFeature) : undefined;

    if (code && placementFeature && bounds) {
      const existingPlacement = placementByCode.get(code);
      if (!existingPlacement || getBoundsArea(bounds) > getBoundsArea(existingPlacement.bounds)) {
        placementByCode.set(code, {
          bounds,
          feature: placementFeature,
        });
      }
    }

    return placementByCode;
  }, new Map());
}

function normalizeNodeLocation(location: string | undefined): string | undefined {
  const normalized = location?.trim().toUpperCase();
  return normalized || undefined;
}

function getWorldNodeRegionCode(node: ProcessFlowGraphNode): string | undefined {
  const normalized = normalizeNodeLocation(node.location);
  const countryCode = normalized?.split('-')[0];
  return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined;
}

function getChinaNodeRegionCode(node: ProcessFlowGraphNode): string | undefined {
  const normalized = normalizeNodeLocation(node.location);
  const provinceMatch = normalized?.match(/^(CN-[A-Z]{2})(?:-|$)/);
  return provinceMatch ? chinaProvinceLocationAdcodes[provinceMatch[1]] : undefined;
}

function hashStringToUnit(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0x100000000;
}

function parseFiniteCoordinate(value: number | string | undefined): number | undefined {
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function getPropertyPoint(feature: LocalPolygonMapFeature): [number, number] | undefined {
  const labelLongitude = parseFiniteCoordinate(feature.properties?.LABEL_X);
  const labelLatitude = parseFiniteCoordinate(feature.properties?.LABEL_Y);

  if (labelLongitude !== undefined && labelLatitude !== undefined) {
    return [labelLongitude, labelLatitude];
  }

  const center = feature.properties?.center;
  if (center && center.length >= 2) {
    const [longitude, latitude] = center;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return [longitude, latitude];
    }
  }

  const centroid = feature.properties?.centroid;
  if (centroid && centroid.length >= 2) {
    const [longitude, latitude] = centroid;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return [longitude, latitude];
    }
  }

  return undefined;
}

function getRegionNodeIndexes(
  nodes: ProcessFlowGraphNode[],
  placements: Map<string, GeoRegionPlacement>,
  getNodeRegionCode: (node: ProcessFlowGraphNode) => string | undefined,
): Map<string, number> {
  const countByRegionCode = new Map<string, number>();

  return nodes.reduce<Map<string, number>>((indexByNodeId, node) => {
    const regionCode = getNodeRegionCode(node);
    if (!regionCode || !placements.has(regionCode)) {
      return indexByNodeId;
    }

    const regionIndex = countByRegionCode.get(regionCode) ?? 0;
    countByRegionCode.set(regionCode, regionIndex + 1);
    indexByNodeId.set(node.id, regionIndex);
    return indexByNodeId;
  }, new Map());
}

function projectFiniteGeoPoint(
  projectCoordinate: CoordinateProjector,
  longitude: number,
  latitude: number,
): [number, number] | undefined {
  const [x, y] = projectCoordinate(longitude, latitude);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : undefined;
}

function findProjectedPointInRegion(
  placement: GeoRegionPlacement,
  regionCode: string,
  regionIndex: number,
  node: ProcessFlowGraphNode,
  projectCoordinate: CoordinateProjector,
): [number, number] | undefined {
  const bounds = placement.bounds;
  const lonSpan = bounds.lonMax - bounds.lonMin;
  const latSpan = bounds.latMax - bounds.latMin;
  const seedX = hashStringToUnit(`${regionCode}:${node.id}:x`);
  const seedY = hashStringToUnit(`${regionCode}:${node.id}:y`);
  const xStep = 0.618033988749895;
  const yStep = 0.754877666246693;

  for (let attempt = 0; attempt < 256; attempt += 1) {
    const longitude = bounds.lonMin + ((seedX + (regionIndex + attempt) * xStep) % 1) * lonSpan;
    const latitude = bounds.latMin + ((seedY + (regionIndex + attempt) * yStep) % 1) * latSpan;

    if (geoContains(placement.feature, [longitude, latitude])) {
      const projectedPoint = projectFiniteGeoPoint(projectCoordinate, longitude, latitude);
      if (projectedPoint) {
        return projectedPoint;
      }
    }
  }

  const propertyPoint = getPropertyPoint(placement.feature);
  if (propertyPoint && geoContains(placement.feature, propertyPoint)) {
    const projectedPoint = projectFiniteGeoPoint(
      projectCoordinate,
      propertyPoint[0],
      propertyPoint[1],
    );
    if (projectedPoint) {
      return projectedPoint;
    }
  }

  const centerPoint: [number, number] = [
    (bounds.lonMin + bounds.lonMax) / 2,
    (bounds.latMin + bounds.latMax) / 2,
  ];
  if (geoContains(placement.feature, centerPoint)) {
    return projectFiniteGeoPoint(projectCoordinate, centerPoint[0], centerPoint[1]);
  }

  return undefined;
}

function createRegionPlacementLayoutTransform(
  nodes: ProcessFlowGraphNode[],
  frame: Pick<ProcessFlowGraphMapBackground, 'height' | 'width'>,
  placements: Map<string, GeoRegionPlacement>,
  getNodeRegionCode: (node: ProcessFlowGraphNode) => string | undefined,
  projectCoordinate: CoordinateProjector,
  fallbackPosition?: LayoutPositionTransform,
): LayoutPositionTransform {
  const regionIndexByNodeId = getRegionNodeIndexes(nodes, placements, getNodeRegionCode);

  return (x, y, z, node, nodeIndex) => {
    const regionCode = getNodeRegionCode(node);
    const placement = regionCode ? placements.get(regionCode) : undefined;
    const regionIndex = regionIndexByNodeId.get(node.id);
    const projectedPoint =
      regionCode && placement && regionIndex !== undefined
        ? findProjectedPointInRegion(placement, regionCode, regionIndex, node, projectCoordinate)
        : undefined;

    if (!projectedPoint) {
      return fallbackPosition?.(x, y, z, node, nodeIndex) ?? [x, y, z];
    }

    return [projectedPoint[0] - frame.width / 2, projectedPoint[1] - frame.height / 2, z];
  };
}

function createChinaMercatorFallbackLayoutTransform(
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
    const padding = 18;
    const chinaMap = buildChinaMercatorMap(mapData as ChinaMapData, [
      [padding, padding],
      [Math.max(padding + 1, frame.width - 20), Math.max(padding + 1, frame.height - 20)],
    ]);
    if (!chinaMap) {
      return undefined;
    }

    const displayPaths = chinaMap.features
      .map((feature, index) => {
        const adcode = getChinaRegionAdcode(feature);
        const code = adcode === undefined ? undefined : String(adcode);
        const path = chinaMap.pathGenerator(feature) ?? '';

        return {
          code,
          id: `${scope}-${code ?? index}`,
          label: feature.properties?.name || 'China region',
          path,
        };
      })
      .filter((path) => path.path);
    const chinaInsetFeature = mapData.features.find(
      (feature) =>
        feature.properties?.adcode === chinaInsetMapPathCode || feature.properties?.adchar === 'JD',
    );
    const chinaInsetPath = chinaInsetFeature
      ? (chinaMap.pathGenerator(rewindChinaMapFeature(chinaInsetFeature as ChinaMapFeature)) ?? '')
      : '';
    const paths = chinaInsetPath
      ? [
          ...displayPaths,
          {
            code: chinaInsetMapPathCode,
            id: `china-${chinaInsetMapPathCode}`,
            label: '南海诸岛',
            path: chinaInsetPath,
          },
        ]
      : displayPaths;

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
      createLayoutPositionTransform: (nodes) => {
        const placements = createRegionPlacementMap(
          chinaMap.features as LocalMapFeature[],
          (feature) => getLocalMapPathCode('china', feature),
        );
        const projectCoordinate: CoordinateProjector = (longitude, latitude) => {
          const projected = chinaMap.projection([longitude, latitude]);
          return projected ? [projected[0], projected[1]] : [NaN, NaN];
        };
        const fallbackPosition = createChinaMercatorFallbackLayoutTransform(
          frame,
          chinaMap.projection,
        );

        return createRegionPlacementLayoutTransform(
          nodes,
          frame,
          placements,
          getChinaNodeRegionCode,
          projectCoordinate,
          fallbackPosition,
        );
      },
    };
  }

  const projectCoordinate = projectWorldCoordinate(frame.width, frame.height);
  const worldFeatures = mapData.features.filter(shouldUseLocalWorldMapFeature);
  const paths = worldFeatures
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
    createLayoutPositionTransform: (nodes) =>
      createRegionPlacementLayoutTransform(
        nodes,
        frame,
        createRegionPlacementMap(worldFeatures, (feature) => getLocalMapPathCode(scope, feature)),
        getWorldNodeRegionCode,
        projectCoordinate,
      ),
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

function shouldUseGraphCacheObjectsApi(baseUrl: string): boolean {
  return !baseUrl || /\/storage\/v1\/s3\//i.test(baseUrl);
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
      const [layoutX, layoutY, layoutZ] = options.transformPosition?.(x, y, z, node, index) ?? [
        x,
        y,
        z,
      ];
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

  if (shouldUseGraphCacheObjectsApi(baseUrl)) {
    const result = await requestNationalCarbonGraphCacheObjectsApi({
      action: 'read_manifest_bundle',
    });

    if (result.error || !result.data) {
      throw new Error(
        `failed to read process-flow graph cache manifest bundle: ${
          result.error?.message ?? 'missing response'
        }`,
      );
    }

    return {
      activeManifest: result.data.activeManifest,
      buildManifest: result.data.buildManifest,
    };
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

function resolveBuildFileUrl(manifests: CacheManifests, fileKey: string): string {
  const signedUrl = manifests.buildManifest.files[fileKey]?.signedUrl;
  if (signedUrl) {
    return signedUrl;
  }

  if (!manifests.baseUrl) {
    throw new Error(`missing process-flow graph signed URL: ${fileKey}`);
  }

  return resolveCacheUrl(
    manifests.baseUrl,
    getBuildFilePath(manifests.activeManifest, manifests.buildManifest, fileKey),
  );
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
  const manifests = await loadCacheManifests();
  const { activeManifest, buildManifest } = manifests;
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
    fetchGzipJson<NodesPayload>(resolveBuildFileUrl(manifests, 'nodes')),
    fetchGzipJson<DictionariesPayload>(resolveBuildFileUrl(manifests, 'dictionaries')),
    fetchGzipJson<ClustersPayload>(resolveBuildFileUrl(manifests, 'clustersLevel1')),
    fetchGzipJson<ClustersPayload>(resolveBuildFileUrl(manifests, 'clustersLevel3')),
    fetchGzipJson<SearchPayload>(resolveBuildFileUrl(manifests, 'searchFlows')),
    fetchGzipJson<LookupPayload>(resolveBuildFileUrl(manifests, 'nodeLookup')),
    fetchGzipBinary(resolveBuildFileUrl(manifests, 'edges')),
    fetchGzipBinary(resolveBuildFileUrl(manifests, 'adjacency')),
    fetchGzipBinary(resolveBuildFileUrl(manifests, 'sphere3d')),
    fetchGzipBinary(resolveBuildFileUrl(manifests, 'expanded2d')),
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

async function loadProcessFlowGraphGeoMapViewFromCacheUncached(
  scope: ProcessFlowGraphMapScope,
): Promise<ProcessFlowGraphGeoMapView | undefined> {
  const manifests = await loadCacheManifests();
  const { activeManifest, buildManifest } = manifests;
  const fileKeys = geoMapCacheFileKeys[scope];
  const requiredFileKeys = [fileKeys.view, fileKeys.edges, fileKeys.adjacency, fileKeys.layout];

  if (!requiredFileKeys.every((fileKey) => hasBuildFile(buildManifest, fileKey))) {
    return undefined;
  }
  assertSchemaVersion(buildManifest.schemaVersion, processFlowGraphSchemaVersion, 'build manifest');

  const [viewPayload, edgesBuffer, adjacencyBuffer, layoutBuffer] = await Promise.all([
    fetchGzipJson<GeoMapViewPayload>(resolveBuildFileUrl(manifests, fileKeys.view)),
    fetchGzipBinary(resolveBuildFileUrl(manifests, fileKeys.edges)),
    fetchGzipBinary(resolveBuildFileUrl(manifests, fileKeys.adjacency)),
    fetchGzipBinary(resolveBuildFileUrl(manifests, fileKeys.layout)),
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
  const layoutPositionTransform = backgroundResolution.createLayoutPositionTransform?.(nodes);

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
          transformPosition: layoutPositionTransform,
        }),
        sphere3d: {},
      },
      nodes,
      schemaVersion: processFlowGraphSchemaVersion,
      stats: viewPayload.stats,
    },
  };
}

export function loadProcessFlowGraphGeoMapViewFromCache(
  scope: ProcessFlowGraphMapScope,
): Promise<ProcessFlowGraphGeoMapView | undefined> {
  const cachedView = geoMapViewCache[scope];
  if (cachedView) {
    return Promise.resolve(cachedView);
  }

  const pendingRequest = geoMapViewRequests[scope];
  if (pendingRequest) {
    return pendingRequest;
  }

  const request = loadProcessFlowGraphGeoMapViewFromCacheUncached(scope)
    .then((cachedGeoMapView) => {
      if (cachedGeoMapView) {
        geoMapViewCache[scope] = cachedGeoMapView;
      }

      return cachedGeoMapView;
    })
    .finally(() => {
      if (geoMapViewRequests[scope] === request) {
        delete geoMapViewRequests[scope];
      }
    });

  geoMapViewRequests[scope] = request;
  return request;
}
