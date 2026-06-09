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
  area?: PlacementArea;
  key: string;
  spread: number;
  x: number;
  y: number;
};

type SceneBounds = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

type PlacementArea = {
  bounds: SceneBounds;
  contains: (point: [number, number]) => boolean;
};

type ScenePolygon = [number, number][][];

type InvertibleProjection = ((coordinate: [number, number]) => [number, number] | null) & {
  invert: (point: [number, number]) => [number, number] | null;
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

function projectGeometryRing(
  ring: number[][],
  projection: (coordinate: [number, number]) => [number, number] | null,
  width: number,
  height: number,
): [number, number][] {
  return ring.map(
    (position) => projectCoordinate(projection, [position[0], position[1]], width, height)!,
  );
}

function projectGeometryPolygons(
  geometry: Geometry,
  projection: (coordinate: [number, number]) => [number, number] | null,
  width: number,
  height: number,
): ScenePolygon[] {
  if (geometry.type === 'Polygon') {
    return [
      geometry.coordinates.map((ring) =>
        projectGeometryRing(ring as number[][], projection, width, height),
      ),
    ];
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) =>
      polygon.map((ring) => projectGeometryRing(ring as number[][], projection, width, height)),
    );
  }

  return [];
}

function isPointInSceneRing([x, y]: [number, number], ring: [number, number][]): boolean {
  let isInside = false;

  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index, index += 1
  ) {
    const [currentX, currentY] = ring[index];
    const [previousX, previousY] = ring[previousIndex];
    const intersects =
      currentY > y !== previousY > y &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function isPointInScenePolygon(point: [number, number], polygon: ScenePolygon): boolean {
  const [outerRing, ...holes] = polygon;

  return Boolean(
    outerRing &&
    isPointInSceneRing(point, outerRing) &&
    !holes.some((hole) => isPointInSceneRing(point, hole)),
  );
}

function createScenePolygons(
  features: MapFeature[],
  projection: (coordinate: [number, number]) => [number, number] | null,
  width: number,
  height: number,
): ScenePolygon[] {
  return features.flatMap((feature) =>
    projectGeometryPolygons(feature.geometry, projection, width, height),
  );
}

function getScenePolygonsBounds(polygons: ScenePolygon[]): SceneBounds | undefined {
  const points = polygons.flatMap((polygon) => polygon.flat());

  if (!points.length) {
    return undefined;
  }

  const xValues = points.map(([x]) => x).filter(Number.isFinite);
  const yValues = points.map(([, y]) => y).filter(Number.isFinite);

  if (!xValues.length || !yValues.length) {
    return undefined;
  }

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  if (maxX <= minX || maxY <= minY) {
    return undefined;
  }

  return { maxX, maxY, minX, minY };
}

function createSceneContains(polygons: ScenePolygon[]): PlacementArea['contains'] {
  return (point) => polygons.some((polygon) => isPointInScenePolygon(point, polygon));
}

function createAnchor({
  area,
  coordinate,
  key,
  spread,
}: {
  area?: PlacementArea;
  coordinate: [number, number] | undefined;
  key: string;
  spread: number;
}): Anchor | undefined {
  return coordinate ? { area, key, spread, x: coordinate[0], y: coordinate[1] } : undefined;
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

function getWorldPrimaryLocation(location: string): string {
  if (location === 'CN' || location.startsWith('CN-')) {
    return 'CN';
  }

  return location;
}

function createFeaturePlacementArea({
  feature,
  height,
  projection,
  width,
}: {
  feature: MapFeature;
  height: number;
  projection: InvertibleProjection;
  width: number;
}): PlacementArea | undefined {
  const polygons = createScenePolygons([feature], projection, width, height);
  const bounds = getScenePolygonsBounds(polygons);

  if (!bounds) {
    return undefined;
  }

  return {
    bounds,
    contains: createSceneContains(polygons),
  };
}

function createFeatureCollectionPlacementArea({
  height,
  mapData,
  projection,
  width,
}: {
  height: number;
  mapData: MapData;
  projection: InvertibleProjection;
  width: number;
}): PlacementArea | undefined {
  const polygons = createScenePolygons(mapData.features, projection, width, height);
  const bounds = getScenePolygonsBounds(polygons);

  if (!bounds) {
    return undefined;
  }

  return {
    bounds,
    contains: createSceneContains(polygons),
  };
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
    const anchor = createAnchor({
      area: createFeaturePlacementArea({
        feature,
        height,
        projection: projection as InvertibleProjection,
        width,
      }),
      coordinate: projectedCoordinate,
      key: `province:${provinceCode}`,
      spread: 34,
    });

    if (anchor) {
      provinceAnchors.set(provinceCode, anchor);
    }
  });

  return provinceAnchors;
}

function getWorldCountryAnchorFeatures(features: MapFeature[]): MapFeature[] {
  const homepartFeatures = features.filter((feature) => feature.properties?.HOMEPART === 1);

  return homepartFeatures.length ? homepartFeatures : features;
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
        id: code ? `world:${code}:${index}` : `world:${index}`,
        label: getWorldLabel(feature),
        path,
      },
    ];
  });
  const countryAnchors = new Map<string, Anchor>();
  const featuresByCountryCode = displayFeatures.reduce<Map<string, MapFeature[]>>(
    (featuresByCode, feature) => {
      const code = getWorldCode(feature);
      if (!code) {
        return featuresByCode;
      }

      const features = featuresByCode.get(code) ?? [];
      features.push(feature);
      featuresByCode.set(code, features);

      return featuresByCode;
    },
    new Map<string, MapFeature[]>(),
  );

  featuresByCountryCode.forEach((features, code) => {
    const anchorFeatures = getWorldCountryAnchorFeatures(features);
    const anchorMapData: MapData = {
      ...displayMapData,
      features: anchorFeatures,
    };
    const primaryFeature = anchorFeatures.length === 1 ? anchorFeatures[0] : undefined;

    const labelCoordinate = primaryFeature
      ? getCoordinate([
          getNumber(primaryFeature.properties?.LABEL_X),
          getNumber(primaryFeature.properties?.LABEL_Y),
        ])
      : undefined;
    const projectedLabelCoordinate = labelCoordinate
      ? projectCoordinate(
          projection as (coordinate: [number, number]) => [number, number] | null,
          labelCoordinate,
          worldViewBox.width,
          worldViewBox.height,
        )
      : undefined;
    const centroidCoordinate = toSceneCoordinate(
      pathGenerator.centroid(anchorMapData) as [number, number],
      worldViewBox.width,
      worldViewBox.height,
    );
    const anchor = createAnchor({
      area: createFeatureCollectionPlacementArea({
        height: worldViewBox.height,
        mapData: anchorMapData,
        projection: projection as InvertibleProjection,
        width: worldViewBox.width,
      }),
      coordinate: projectedLabelCoordinate ?? centroidCoordinate,
      key: `country:${code}`,
      spread: 30,
    });

    if (anchor) {
      countryAnchors.set(code, anchor);
    }
  });

  Object.entries(countryCoordinateOverrides).forEach(([code, coordinate]) => {
    if (countryAnchors.has(code)) {
      return;
    }

    const anchor = createAnchor({
      coordinate: projectCoordinate(
        projection as (coordinate: [number, number]) => [number, number] | null,
        coordinate,
        worldViewBox.width,
        worldViewBox.height,
      ),
      key: `country:${code}`,
      spread: 30,
    });

    if (anchor) {
      countryAnchors.set(code, anchor);
    }
  });

  const regionAnchors = new Map<string, Anchor>();
  Object.entries(regionCoordinates).forEach(([code, coordinate]) => {
    const anchor = createAnchor({
      coordinate: projectCoordinate(
        projection as (coordinate: [number, number]) => [number, number] | null,
        coordinate,
        worldViewBox.width,
        worldViewBox.height,
      ),
      key: `region:${code}`,
      spread: 42,
    });

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
    createAnchor({
      coordinate: projectCoordinate(
        projection as (coordinate: [number, number]) => [number, number] | null,
        [104, 35],
        worldViewBox.width,
        worldViewBox.height,
      ),
      key: 'country:CN',
      spread: 34,
    })!;
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
  const chinaCountryArea = createFeatureCollectionPlacementArea({
    height: chinaViewBox.height,
    mapData: displayMapData,
    projection: projection as InvertibleProjection,
    width: chinaViewBox.width,
  });
  const chinaCountryCoordinate =
    toSceneCoordinate(
      pathGenerator.centroid(displayMapData) as [number, number],
      chinaViewBox.width,
      chinaViewBox.height,
    ) ?? ([0, 0] as [number, number]);
  const chinaCountryAnchor: Anchor = {
    area: chinaCountryArea,
    key: 'country:CN',
    spread: 40,
    x: chinaCountryCoordinate[0],
    y: chinaCountryCoordinate[1],
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
  flowAnchorHints?: Map<string, Anchor>,
): Anchor | undefined {
  const location = normalizeLocation(node.location);

  if (!location || location === 'NULL') {
    return node.kind === 'flow' ? flowAnchorHints?.get(node.id) : undefined;
  }

  if (scope === 'world') {
    const primaryLocation = getWorldPrimaryLocation(location);

    if (isCountryCode(primaryLocation)) {
      if (primaryLocation === 'CN') {
        return bundle.countryAnchors.get(primaryLocation) ?? bundle.chinaCountryAnchor;
      }

      return bundle.countryAnchors.get(primaryLocation);
    }

    return bundle.regionAnchors.get(primaryLocation);
  }

  if (location === 'CN') {
    return bundle.chinaCountryAnchor;
  }

  const provinceCode = getChinaProvinceLocationCode(location);
  if (provinceCode) {
    return bundle.provinceAnchors.get(provinceCode) ?? bundle.chinaCountryAnchor;
  }

  return undefined;
}

function buildFlowAnchorHints(
  data: ProcessFlowGraphData,
  scope: ProcessFlowGraphMapScope,
  bundle: ProjectionBundle,
): Map<string, Anchor> {
  const countsByFlowId = new Map<string, Map<string, { anchor: Anchor; count: number }>>();

  data.edges.forEach((edge) => {
    const processNodeIndex = data.indexes.nodeById[edge.processId];
    const processNode = processNodeIndex === undefined ? undefined : data.nodes[processNodeIndex];
    const processAnchor = processNode ? resolveAnchor(processNode, scope, bundle) : undefined;

    if (!processAnchor) {
      return;
    }

    const counts =
      countsByFlowId.get(edge.flowId) ?? new Map<string, { anchor: Anchor; count: number }>();
    const current = counts.get(processAnchor.key);
    counts.set(processAnchor.key, {
      anchor: processAnchor,
      count: (current?.count ?? 0) + 1,
    });
    countsByFlowId.set(edge.flowId, counts);
  });

  return Array.from(countsByFlowId.entries()).reduce<Map<string, Anchor>>(
    (anchorHints, [flowId, counts]) => {
      const selected = Array.from(counts.values()).reduce<
        { anchor: Anchor; count: number } | undefined
      >((best, candidate) => {
        if (!best || candidate.count > best.count) {
          return candidate;
        }
        if (candidate.count === best.count && candidate.anchor.key < best.anchor.key) {
          return candidate;
        }
        return best;
      }, undefined);

      if (selected) {
        anchorHints.set(flowId, selected.anchor);
      }

      return anchorHints;
    },
    new Map<string, Anchor>(),
  );
}

function getHaltonValue(index: number, base: number): number {
  let denominator = base;
  let remainingIndex = index;
  let result = 0;

  while (remainingIndex > 0) {
    result += (remainingIndex % base) / denominator;
    remainingIndex = Math.floor(remainingIndex / base);
    denominator *= base;
  }

  return result;
}

function getCompactDistributedPosition(
  anchor: Anchor,
  node: ProcessFlowGraphNode,
  anchorIndex: number,
  anchorCount: number,
): [number, number, number] {
  const hash = getStableHash(`${node.id}:${anchor.key}`);
  const columns = Math.max(1, Math.ceil(Math.sqrt(anchorCount)));
  const row = Math.floor(anchorIndex / columns);
  const column = anchorIndex % columns;
  const rows = Math.max(1, Math.ceil(anchorCount / columns));
  const xProgress = (column + 0.5) / columns;
  const yProgress = (row + 0.5) / rows;
  const xJitter = ((hash % 17) / 16 - 0.5) * Math.min(6, anchor.spread / Math.max(1, columns));
  const yJitter = (((hash >> 5) % 17) / 16 - 0.5) * Math.min(6, anchor.spread / Math.max(1, rows));

  return [
    anchor.x + (xProgress - 0.5) * anchor.spread * 1.6 + xJitter,
    anchor.y + (yProgress - 0.5) * anchor.spread * 1.2 + yJitter,
    node.kind === 'process' ? 0.6 : 0,
  ];
}

function getAreaDistributedPositions(anchor: Anchor, anchorCount: number): [number, number][] {
  if (!anchor.area) {
    return [];
  }

  const { bounds } = anchor.area;
  const seed = (getStableHash(anchor.key) % 997) + 1;
  const attempts = Math.max(128, Math.min(240000, anchorCount * 160));
  const positions: [number, number][] = [];

  for (let attempt = 0; attempt < attempts && positions.length < anchorCount; attempt += 1) {
    const sampleIndex = seed + attempt;
    const x = bounds.minX + (bounds.maxX - bounds.minX) * getHaltonValue(sampleIndex, 2);
    const y = bounds.minY + (bounds.maxY - bounds.minY) * getHaltonValue(sampleIndex, 3);

    if (anchor.area.contains([x, y])) {
      positions.push([x, y]);
    }
  }

  if (positions.length > 0 && positions.length < anchorCount) {
    const xNudge = Math.min(1.6, Math.max(0.18, (bounds.maxX - bounds.minX) / 900));
    const yNudge = Math.min(1.6, Math.max(0.18, (bounds.maxY - bounds.minY) / 900));

    for (let index = positions.length; index < anchorCount; index += 1) {
      const source = positions[index % positions.length];
      let nextPosition = source;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const sampleIndex = seed + index * 11 + attempt;
        const angle = getHaltonValue(sampleIndex, 5) * Math.PI * 2;
        const radius = 0.35 + getHaltonValue(sampleIndex, 7) * 0.65;
        const candidate: [number, number] = [
          source[0] + Math.cos(angle) * xNudge * radius,
          source[1] + Math.sin(angle) * yNudge * radius,
        ];

        if (anchor.area.contains(candidate)) {
          nextPosition = candidate;
          break;
        }
      }

      positions.push(nextPosition);
    }
  }

  return positions;
}

function getDistributedPosition(
  anchor: Anchor,
  node: ProcessFlowGraphNode,
  anchorIndex: number,
  anchorCount: number,
  areaPositions: [number, number][],
): [number, number, number] {
  const areaPosition = areaPositions[anchorIndex];

  if (areaPosition) {
    return [areaPosition[0], areaPosition[1], node.kind === 'process' ? 0.6 : 0];
  }

  return getCompactDistributedPosition(anchor, node, anchorIndex, anchorCount);
}

function buildGeoMapLayout(
  nodes: ProcessFlowGraphNode[],
  scope: ProcessFlowGraphMapScope,
  bundle: ProjectionBundle,
  flowAnchorHints: Map<string, Anchor>,
): ProcessFlowGraphLayout {
  const resolvedNodes = nodes.map((node) => ({
    anchor: resolveAnchor(node, scope, bundle, flowAnchorHints)!,
    node,
  }));
  const countByAnchor = resolvedNodes.reduce<Map<string, number>>((counts, { anchor }) => {
    counts.set(anchor.key, (counts.get(anchor.key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const areaPositionsByAnchor = new Map(
    Array.from(countByAnchor.entries()).map(([anchorKey, anchorCount]) => {
      const anchor = resolvedNodes.find(
        ({ anchor: candidate }) => candidate.key === anchorKey,
      )!.anchor;
      return [anchorKey, getAreaDistributedPositions(anchor, anchorCount)] as const;
    }),
  );
  const seenByAnchor = new Map<string, number>();

  return resolvedNodes.reduce<ProcessFlowGraphLayout>((layout, { anchor, node }) => {
    const anchorIndex = seenByAnchor.get(anchor.key) ?? 0;
    const anchorCount = countByAnchor.get(anchor.key)!;
    const areaPositions = areaPositionsByAnchor.get(anchor.key)!;
    seenByAnchor.set(anchor.key, anchorIndex + 1);
    layout[node.id] = getDistributedPosition(anchor, node, anchorIndex, anchorCount, areaPositions);
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
  const flowAnchorHints = buildFlowAnchorHints(data, scope, bundle);
  const visibleNodes = data.nodes.filter((node) =>
    Boolean(resolveAnchor(node, scope, bundle, flowAnchorHints)),
  );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = data.edges.filter(
    (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
  );
  const layout = buildGeoMapLayout(visibleNodes, scope, bundle, flowAnchorHints);

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
