import {
  getDataListColumnField,
  getDataListColumnWidth,
  getDataListScrollX,
} from '@/components/ResponsiveDataList/columnSizing';

// The viewport needs the same six-column budget even when the service omits metadata.
describe('dataset column sizing', () => {
  it('reserves a readable name and the six displayed base columns when input columns are absent', () => {
    expect(getDataListScrollX([])).toBe(908);
    expect(getDataListScrollX([{ dataIndex: 'name', width: 360 }])).toBe(908);
  });

  it.each(['name', 'shortName', 'baseName'])('keeps the %s name alias fluid', (dataIndex) => {
    expect(getDataListColumnWidth({ dataIndex, width: 360 })).toBeUndefined();
    expect(getDataListScrollX([{ dataIndex, width: 360 }])).toBe(908);
  });

  it.each([
    ['location', 128],
    ['locationOfSupply', 128],
    ['referenceYear', 100],
    ['dataType', 160],
    ['datasetType', 160],
    ['typeOfDataSet', 160],
    ['flowType', 160],
    ['datasetKind', 160],
    ['version', 128],
    ['index', 72],
  ])(
    'gives %s its compact metadata width rather than the caller legacy width',
    (dataIndex, width) => {
      expect(getDataListColumnWidth({ dataIndex, width: 360 })).toBe(width);
      expect(getDataListScrollX([{ dataIndex, width: 360 }])).toBe(908);
    },
  );

  it('recognizes an unnamed native index column without counting it as an extra business column', () => {
    expect(getDataListColumnField({ valueType: 'index' })).toBe('');
    expect(getDataListColumnWidth({ valueType: 'index', width: 400 })).toBe(72);
    expect(getDataListScrollX([{ valueType: 'index', width: 400 }])).toBe(908);
  });

  it.each(['modifiedAt', 'modified_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at'])(
    'keeps %s compact without changing the actual date field',
    (key) => {
      const column = { key, width: 300 };
      expect(getDataListColumnField(column)).toBe(key);
      expect(getDataListColumnWidth(column)).toBe(156);
      expect(getDataListScrollX([column])).toBe(1064);
      expect(column).toEqual({ key, width: 300 });
    },
  );

  it('excludes hidden business columns and row classifications while preserving explicit operation width', () => {
    const columns = Object.freeze([
      Object.freeze({ dataIndex: 'shortName', width: 360 }),
      Object.freeze({ dataIndex: 'classification', width: 220 }),
      Object.freeze({ dataIndex: 'hiddenDetail', hideInTable: true, width: 500 }),
      Object.freeze({ dataIndex: 'option', width: 184 }),
      Object.freeze({ key: 'detail', width: 208 }),
    ]);
    expect(getDataListScrollX(columns)).toBe(908 + 184 + 208);
    expect(columns[0].width).toBe(360);
    expect(columns).toHaveLength(5);
  });

  it.each([undefined, '40%', 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'keeps the scroll budget finite and readable for an unspecified or invalid business width (%s)',
    (width) => {
      const budget = getDataListScrollX([{ key: 'detail', width }]);
      expect(Number.isFinite(budget)).toBe(true);
      expect(budget).toBe(908 + 144);
    },
  );

  it('keeps native percentage business widths while using a numeric fallback for scroll sizing', () => {
    expect(getDataListColumnWidth({ key: 'detail', width: '40%' })).toBe('40%');
    expect(getDataListColumnWidth({ key: 'detail' })).toBe(144);
    expect(getDataListColumnField({ dataIndex: 'detail', key: 'other' })).toBe('detail');
  });
});
