import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';

export type ChinaFeatureProperties = {
  adcode?: number | string;
  name?: string;
};
export type ChinaMapFeature = Feature<Geometry, ChinaFeatureProperties>;
export type ChinaMapData = FeatureCollection<Geometry, ChinaFeatureProperties>;
export type ChinaMapExtent = [[number, number], [number, number]];

export type ChinaMercatorMap = {
  features: ChinaMapFeature[];
  pathGenerator: ReturnType<typeof geoPath>;
  projection: GeoProjection;
};

export function getChinaRegionAdcode(feature: ChinaMapFeature): number | undefined {
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

function rewindChinaMapFeature(feature: ChinaMapFeature): ChinaMapFeature {
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

export function getDisplayChinaMapFeatures(mapData: ChinaMapData): ChinaMapFeature[] {
  return mapData.features
    .filter((feature) => {
      const adcode = getChinaRegionAdcode(feature);
      return Boolean(feature.properties?.name) && Boolean(adcode) && adcode !== 100000;
    })
    .map(rewindChinaMapFeature);
}

export function buildChinaMercatorMap(
  mapData: ChinaMapData,
  extent: ChinaMapExtent,
): ChinaMercatorMap | undefined {
  const features = getDisplayChinaMapFeatures(mapData);

  if (!features.length) {
    return undefined;
  }

  const displayMapData: ChinaMapData = {
    ...mapData,
    features,
  };
  const projection = geoMercator().fitExtent(extent, displayMapData);

  return {
    features,
    pathGenerator: geoPath(projection),
    projection,
  };
}
