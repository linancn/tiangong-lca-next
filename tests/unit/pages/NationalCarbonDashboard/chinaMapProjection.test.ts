import {
  buildChinaMercatorMap,
  getChinaRegionAdcode,
  getDisplayChinaMapFeatures,
  type ChinaMapData,
  type ChinaMapFeature,
} from '@/pages/NationalCarbonDashboard/chinaMapProjection';

function createPolygonFeature(adcode: number | string, name?: string): ChinaMapFeature {
  return {
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
      adcode,
      name,
    },
    type: 'Feature',
  };
}

function createMultiPolygonFeature(adcode: number | string, name?: string): ChinaMapFeature {
  return {
    geometry: {
      coordinates: [
        [
          [
            [116, 39],
            [117, 39],
            [117, 40],
            [116, 40],
            [116, 39],
          ],
        ],
      ],
      type: 'MultiPolygon',
    },
    properties: {
      adcode,
      name,
    },
    type: 'Feature',
  };
}

describe('NationalCarbonDashboard china map projection', () => {
  it('normalizes province adcodes from number and string properties', () => {
    expect(getChinaRegionAdcode(createPolygonFeature(440000, '广东省'))).toBe(440000);
    expect(getChinaRegionAdcode(createPolygonFeature('110000', '北京市'))).toBe(110000);
    expect(getChinaRegionAdcode(createPolygonFeature('not-a-code', '未知'))).toBeUndefined();
    expect(
      getChinaRegionAdcode({ ...createPolygonFeature(440000), properties: {} }),
    ).toBeUndefined();
  });

  it('keeps displayable province features and rewinds polygon rings the same way for all callers', () => {
    const pointFeature: ChinaMapFeature = {
      geometry: {
        coordinates: [113, 23],
        type: 'Point',
      },
      properties: {
        adcode: 810000,
        name: '香港特别行政区',
      },
      type: 'Feature',
    };
    const mapData: ChinaMapData = {
      features: [
        createPolygonFeature(440000, '广东省'),
        createMultiPolygonFeature('110000', '北京市'),
        pointFeature,
        createPolygonFeature(100000, '中国'),
        createPolygonFeature(320000),
        createPolygonFeature('bad-code', '未知区域'),
      ],
      type: 'FeatureCollection',
    };

    const features = getDisplayChinaMapFeatures(mapData);

    expect(features.map((feature) => getChinaRegionAdcode(feature))).toEqual([
      440000, 110000, 810000,
    ]);
    expect(features[0].geometry.type).toBe('Polygon');
    expect(
      features[0].geometry.type === 'Polygon' && features[0].geometry.coordinates[0][1],
    ).toEqual([110, 25]);
    expect(features[1].geometry.type).toBe('MultiPolygon');
    expect(
      features[1].geometry.type === 'MultiPolygon' && features[1].geometry.coordinates[0][0][1],
    ).toEqual([116, 40]);
    expect(features[2]).toEqual(pointFeature);
  });

  it('builds one mercator projection and path generator for local China GeoJSON callers', () => {
    const mapData: ChinaMapData = {
      features: [
        createPolygonFeature(440000, '广东省'),
        createMultiPolygonFeature('110000', '北京市'),
      ],
      type: 'FeatureCollection',
    };

    const chinaMap = buildChinaMercatorMap(mapData, [
      [18, 18],
      [1080, 700],
    ]);

    expect(chinaMap).toBeDefined();
    expect(chinaMap?.features).toHaveLength(2);
    const [x, y] = chinaMap?.pathGenerator.centroid(chinaMap.features[0]) ?? [];
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
    expect(chinaMap?.pathGenerator(chinaMap.features[0])).toContain('M');
    expect(
      buildChinaMercatorMap({ features: [], type: 'FeatureCollection' }, [
        [18, 18],
        [1080, 700],
      ]),
    ).toBeUndefined();
  });
});
