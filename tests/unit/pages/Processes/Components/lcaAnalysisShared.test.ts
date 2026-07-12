const mockGetDataSource = jest.fn();
const mockGetLangJson = jest.fn();
const mockCacheAndDecompressMethod = jest.fn();
const mockGetDecompressedMethod = jest.fn();
const mockGetVerifiedDecompressedMethodEntry = jest.fn();

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: unknown[]) => mockGetDataSource(...args),
  getLangJson: (...args: unknown[]) => mockGetLangJson(...args),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: (...args: unknown[]) => mockCacheAndDecompressMethod(...args),
  getDecompressedMethod: (...args: unknown[]) => mockGetDecompressedMethod(...args),
  getVerifiedDecompressedMethodEntry: (...args: unknown[]) =>
    mockGetVerifiedDecompressedMethodEntry(...args),
}));

import {
  buildLcaProcessOptions,
  buildLcaProcessSelectionKey,
  buildMergedLcaRows,
  formatPercent,
  formatSourceLabel,
  getDefaultLcaDataScopeForPath,
  getLcaMethodMetaMap,
  loadImpactOptions,
  normalizeNumber,
  resolveLangText,
  toLcaRequestImpactId,
  toProgressPercent,
  toProgressStatus,
  UNKNOWN_LCIA_UNIT,
} from '@/pages/Processes/Components/lcaAnalysisShared';

const ALIASED_CANONICAL_METHOD_ID = '503699e0-eca9-4089-8bf8-e0f49c93e578';
const ALIASED_ARTIFACT_LOCATOR_ID = '9ec743ea-6b00-400d-a53b-61547a3fc03c';
const ALIASED_METHOD_VERSION = '01.01.000';

describe('lcaAnalysisShared', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDataSource.mockImplementation((pathname: unknown) => {
      if (typeof pathname !== 'string') {
        return '';
      }
      if (pathname.includes('/mydata')) {
        return 'my';
      }
      if (pathname.includes('/tgdata')) {
        return 'tg';
      }
      return '';
    });
    mockGetLangJson.mockImplementation((value) => value);
    mockCacheAndDecompressMethod.mockResolvedValue(true);
    mockGetDecompressedMethod.mockResolvedValue({
      files: [
        {
          id: 'impact-2',
          version: '02.00.000',
          description: [],
          referenceQuantity: {},
        },
        {
          id: 'impact-1',
          version: '01.00.000',
          description: [
            { '@xml:lang': 'en', '#text': 'Climate change' },
            { '@xml:lang': 'zh-CN', '#text': '气候变化' },
          ],
          referenceQuantity: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
          },
        },
        {
          id: '',
          version: '00.00.000',
          description: [{ '@xml:lang': 'en', '#text': 'ignored' }],
          referenceQuantity: {},
        },
      ],
    });
    mockGetVerifiedDecompressedMethodEntry.mockImplementation(async (...args: unknown[]) => {
      const data = await mockGetDecompressedMethod(...args);
      return data ? { data, sha256: 'verified' } : null;
    });
  });

  it('resolves language text, formats helpers, and normalizes numbers', () => {
    expect(resolveLangText('  direct text  ', 'en')).toBe('direct text');
    expect(
      resolveLangText(
        [
          { '@xml:lang': 'en', '#text': 'English' },
          { '@xml:lang': 'zh-CN', '#text': '中文' },
        ],
        'zh',
      ),
    ).toBe('中文');
    expect(resolveLangText([{ '@xml:lang': 'fr', '#text': 'Fallback' }], 'en')).toBe('Fallback');
    expect(resolveLangText([{ '#text': 'Missing lang still works' }], 'en')).toBe(
      'Missing lang still works',
    );
    expect(resolveLangText([{ '@xml:lang': 42, '#text': 7 }], 'en')).toBe('');
    expect(resolveLangText({ '#text': '  object text  ' }, 'en')).toBe('object text');
    expect(resolveLangText(42, 'en')).toBe('');

    expect(normalizeNumber('3.5')).toBe(3.5);
    expect(normalizeNumber('NaN')).toBe(0);
    expect(normalizeNumber(undefined)).toBe(0);
    expect(formatPercent(0.125)).toBe('12.5%');
    expect(formatSourceLabel('all_unit')).toBe('all unit');
    expect(toProgressPercent(Number.NaN)).toBe(0);
    expect(toProgressPercent(0)).toBe(0);
    expect(toProgressPercent(0.004)).toBe(1);
    expect(toProgressStatus('negative')).toBe('exception');
    expect(toProgressStatus('positive')).toBe('normal');
  });

  it('maps route data sources into default LCA scopes', () => {
    expect(getDefaultLcaDataScopeForPath('/mydata/processes')).toBe('public_plus_owner_draft');
    expect(getDefaultLcaDataScopeForPath('/tgdata/processes')).toBe('open_data');
    expect(getDefaultLcaDataScopeForPath('/processes')).toBeUndefined();
  });

  it('uses canonical impact ids only for the new private v2 scope', () => {
    expect(toLcaRequestImpactId(ALIASED_ARTIFACT_LOCATOR_ID, 'public_plus_owner_draft')).toBe(
      ALIASED_CANONICAL_METHOD_ID,
    );
    expect(toLcaRequestImpactId(ALIASED_CANONICAL_METHOD_ID, 'current_user')).toBe(
      ALIASED_ARTIFACT_LOCATOR_ID,
    );
    expect(toLcaRequestImpactId(ALIASED_CANONICAL_METHOD_ID, 'all_data')).toBe(
      ALIASED_ARTIFACT_LOCATOR_ID,
    );
    expect(toLcaRequestImpactId(ALIASED_CANONICAL_METHOD_ID, 'open_data')).toBe(
      ALIASED_ARTIFACT_LOCATOR_ID,
    );
  });

  it('builds process options with duplicate filtering and name/version fallbacks', () => {
    expect(buildLcaProcessSelectionKey('process-1', '02.00.000')).toBe('process-1:02.00.000');
    expect(buildLcaProcessSelectionKey('process-1', '')).toBe('process-1');
    expect(buildLcaProcessSelectionKey(undefined as any, undefined)).toBe('');

    expect(
      buildLcaProcessOptions([
        { id: 'process-1', name: undefined, version: undefined, key: 'p1' } as any,
        { id: 'process-1', name: 'duplicate', version: '02.00.000', key: 'p1-dup' } as any,
        { id: '', name: 'ignored', version: '01.00.000', key: 'ignored' } as any,
        { id: undefined, name: 'missing-id', version: '02.00.000', key: 'ignored-2' } as any,
        { id: 'process-2', name: 'Named', version: '03.00.000', key: 'p2' } as any,
      ]),
    ).toEqual([
      {
        selectionKey: 'process-1',
        value: 'process-1',
        processId: 'process-1',
        name: 'process-1',
        version: '-',
        label: 'process-1 (-)',
      },
      {
        selectionKey: 'process-2:03.00.000',
        value: 'process-2',
        processId: 'process-2',
        name: 'Named',
        version: '03.00.000',
        label: 'Named (03.00.000)',
      },
    ]);

    expect(
      buildLcaProcessOptions(
        [
          { id: 'process-1', name: 'first', version: '01.00.000', key: 'p1' } as any,
          { id: 'process-1', name: 'second', version: '02.00.000', key: 'p1-dup' } as any,
        ],
        { dedupeByProcessId: false },
      ),
    ).toEqual([
      {
        selectionKey: 'process-1:01.00.000',
        value: 'process-1',
        processId: 'process-1',
        name: 'first',
        version: '01.00.000',
        label: 'first (01.00.000)',
      },
      {
        selectionKey: 'process-1:02.00.000',
        value: 'process-1',
        processId: 'process-1',
        name: 'second',
        version: '02.00.000',
        label: 'second (02.00.000)',
      },
    ]);
  });

  it('loads impact options with label and unit fallbacks and sorts by label', async () => {
    mockGetDecompressedMethod.mockResolvedValueOnce({
      files: [
        undefined,
        {},
        {
          id: 'impact-2',
          version: '02.00.000',
          description: [],
          referenceQuantity: {},
        },
        {
          id: 'impact-1',
          version: '01.00.000',
          description: [
            { '@xml:lang': 'en', '#text': 'Climate change' },
            { '@xml:lang': 'zh-CN', '#text': '气候变化' },
          ],
          referenceQuantity: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
          },
        },
      ],
    });

    await expect(loadImpactOptions('zh')).resolves.toEqual([
      {
        value: 'impact-2',
        label: 'impact-2',
        unit: '-',
      },
      {
        value: 'impact-1',
        label: '气候变化',
        unit: 'kg CO2-eq',
      },
    ]);
  });

  it('fails closed when the reviewed method list is unavailable', async () => {
    mockGetVerifiedDecompressedMethodEntry.mockResolvedValueOnce(null);
    await expect(loadImpactOptions('en')).rejects.toThrow('load_lcia_method_list_failed');
  });

  it('returns an empty option list when verified method files are not array-shaped', async () => {
    mockGetVerifiedDecompressedMethodEntry.mockResolvedValueOnce({ data: { files: {} } });

    await expect(loadImpactOptions('en')).resolves.toEqual([]);
  });

  it('returns empty metadata for empty requests and maps selected method metadata', async () => {
    await expect(getLcaMethodMetaMap([])).resolves.toEqual(new Map());

    const meta = await getLcaMethodMetaMap(['impact-1', '', 'impact-missing']);

    expect(Array.from(meta.keys())).toEqual(['impact-1']);
    expect(mockGetLangJson).toHaveBeenCalledWith([{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }]);
    expect(meta.get('impact-1')).toEqual({
      description: [
        { '@xml:lang': 'en', '#text': 'Climate change' },
        { '@xml:lang': 'zh-CN', '#text': '气候变化' },
      ],
      version: '01.00.000',
      referenceQuantityDesc: [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
    });
  });

  it('returns empty metadata when the reviewed method list read rejects', async () => {
    mockGetVerifiedDecompressedMethodEntry.mockRejectedValueOnce(new Error('cache read failed'));

    await expect(getLcaMethodMetaMap(['impact-1'])).resolves.toEqual(new Map());
  });

  it('uses canonical selector/result ids while accepting canonical and locator metadata lookups', async () => {
    mockGetDecompressedMethod.mockResolvedValue({
      files: [
        {
          id: ALIASED_ARTIFACT_LOCATOR_ID,
          version: ALIASED_METHOD_VERSION,
          description: [{ '@xml:lang': 'en', '#text': 'Aliased method' }],
          referenceQuantity: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg alias-eq' }],
          },
        },
      ],
    });

    await expect(loadImpactOptions('en')).resolves.toEqual([
      {
        value: ALIASED_CANONICAL_METHOD_ID,
        label: 'Aliased method',
        unit: 'kg alias-eq',
      },
    ]);

    const canonicalMeta = await getLcaMethodMetaMap([ALIASED_CANONICAL_METHOD_ID]);
    expect(canonicalMeta.get(ALIASED_CANONICAL_METHOD_ID)).toMatchObject({
      version: ALIASED_METHOD_VERSION,
    });

    const locatorMeta = await getLcaMethodMetaMap([ALIASED_ARTIFACT_LOCATOR_ID]);
    expect(locatorMeta.get(ALIASED_ARTIFACT_LOCATOR_ID)).toBe(
      locatorMeta.get(ALIASED_CANONICAL_METHOD_ID),
    );

    const merged = buildMergedLcaRows(
      [
        {
          key: ALIASED_ARTIFACT_LOCATOR_ID,
          referenceToLCIAMethodDataSet: {
            '@refObjectId': ALIASED_ARTIFACT_LOCATOR_ID,
            '@version': ALIASED_METHOD_VERSION,
          },
          meanAmount: 0,
        },
      ] as any,
      [
        {
          impact_id: ALIASED_CANONICAL_METHOD_ID,
          impact_name: 'Aliased method',
          unit: 'kg alias-eq',
          value: 4,
        },
      ],
      canonicalMeta,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      key: ALIASED_CANONICAL_METHOD_ID,
      meanAmount: 4,
      referenceToLCIAMethodDataSet: {
        '@refObjectId': ALIASED_CANONICAL_METHOD_ID,
        '@uri': `../lciamethods/${ALIASED_ARTIFACT_LOCATOR_ID}.xml`,
      },
    });
  });

  it('ignores method entries whose ids are missing when building metadata maps', async () => {
    mockGetDecompressedMethod.mockResolvedValueOnce({
      files: [
        undefined,
        {},
        { referenceQuantity: {} },
        {
          id: 'impact-1',
          version: '01.00.000',
          description: [{ '@xml:lang': 'en', '#text': 'Climate change' }],
          referenceQuantity: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
          },
        },
      ],
    });

    const meta = await getLcaMethodMetaMap(['impact-1']);

    expect(Array.from(meta.keys())).toEqual(['impact-1']);
  });

  it('preserves an explicit row key and fills a missing reviewed method version', () => {
    const merged = buildMergedLcaRows(
      [
        {
          key: 'explicit-result-key',
          referenceToLCIAMethodDataSet: {
            '@refObjectId': ALIASED_ARTIFACT_LOCATOR_ID,
          },
          meanAmount: 1,
        },
      ] as any,
      [],
      new Map(),
    );

    expect(merged[0]).toMatchObject({
      key: 'explicit-result-key',
      referenceToLCIAMethodDataSet: {
        '@refObjectId': ALIASED_CANONICAL_METHOD_ID,
        '@version': ALIASED_METHOD_VERSION,
      },
    });
  });

  it('skips method entries whose ids are not strings', async () => {
    mockGetDecompressedMethod.mockResolvedValue({
      files: [
        { id: 42, description: [{ '@xml:lang': 'en', '#text': 'ignored' }] },
        {
          id: 'impact-1',
          version: '01.00.000',
          description: [{ '@xml:lang': 'en', '#text': 'Climate change' }],
          referenceQuantity: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
          },
        },
      ],
    });

    await expect(loadImpactOptions('en')).resolves.toEqual([
      {
        value: 'impact-1',
        label: 'Climate change',
        unit: 'kg CO2-eq',
      },
    ]);

    const meta = await getLcaMethodMetaMap(['impact-1']);
    expect(Array.from(meta.keys())).toEqual(['impact-1']);
  });

  it('merges solver rows into existing LCIA rows and appends missing rows with fallbacks', () => {
    const baseRows = [
      {
        key: 'impact-1',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'impact-1',
          '@version': '',
        },
        meanAmount: 1,
        referenceQuantityDesc: undefined,
      },
      {
        key: 'impact-orphan',
        referenceToLCIAMethodDataSet: {},
        meanAmount: 2,
        referenceQuantityDesc: 'legacy-unit',
      },
      {
        key: 'impact-keep',
        referenceToLCIAMethodDataSet: {
          '@refObjectId': 'impact-keep',
          '@version': '03.00.000',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Keep me' }],
        },
        meanAmount: 3,
        referenceQuantityDesc: 'existing-unit',
      },
    ] as any;

    const methodMetaById = new Map([
      [
        'impact-1',
        {
          description: [{ '@xml:lang': 'en', '#text': 'Climate change' }],
          version: '01.00.000',
          referenceQuantityDesc: [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
        },
      ],
      [
        'impact-2',
        {
          description: [{ '@xml:lang': 'en', '#text': 'Acidification' }],
          version: '02.00.000',
          referenceQuantityDesc: [{ '@xml:lang': 'en', '#text': 'mol H+-eq' }],
        },
      ],
    ]);

    const merged = buildMergedLcaRows(
      baseRows,
      [
        {
          impact_id: 'impact-1',
          impact_name: 'ignored existing name',
          unit: 'kg CO2-eq',
          value: 11,
        },
        {
          impact_id: 'impact-keep',
          impact_name: 'fallback keep',
          unit: UNKNOWN_LCIA_UNIT,
          value: -4,
        },
        {
          impact_id: 'impact-2',
          impact_name: 'Acidification',
          unit: 'mol H+-eq',
          value: 5,
        },
        {
          impact_id: 'impact-3',
          impact_name: '',
          unit: 'MJ',
          value: 7,
        },
        {
          impact_id: '',
          impact_name: ' ',
          unit: 'kWh',
          value: 9,
        },
      ],
      methodMetaById as any,
    );

    expect(merged[0]).toMatchObject({
      meanAmount: 11,
      referenceQuantityDesc: [{ '@xml:lang': 'en', '#text': 'kg CO2-eq' }],
      referenceToLCIAMethodDataSet: {
        '@refObjectId': 'impact-1',
        '@version': '01.00.000',
        'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Climate change' }],
      },
    });
    expect(merged[1]).toMatchObject({
      key: 'impact-orphan',
      meanAmount: 2,
      referenceQuantityDesc: 'legacy-unit',
    });
    expect(merged[2]).toMatchObject({
      meanAmount: -4,
      referenceQuantityDesc: 'existing-unit',
      referenceToLCIAMethodDataSet: {
        '@refObjectId': 'impact-keep',
        '@version': '03.00.000',
        'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Keep me' }],
      },
    });
    expect(merged[3]).toMatchObject({
      key: 'impact-2',
      meanAmount: 5,
      referenceQuantityDesc: [{ '@xml:lang': 'en', '#text': 'mol H+-eq' }],
      referenceToLCIAMethodDataSet: {
        '@refObjectId': 'impact-2',
        '@version': '02.00.000',
        '@uri': '../lciamethods/impact-2.xml',
      },
    });
    expect(merged[4]).toMatchObject({
      key: 'impact-3',
      meanAmount: 7,
      referenceQuantityDesc: { '@xml:lang': 'en', '#text': 'MJ' },
      referenceToLCIAMethodDataSet: {
        '@refObjectId': 'impact-3',
        '@version': '',
        'common:shortDescription': { '@xml:lang': 'en', '#text': 'impact-3' },
      },
    });
    expect(merged[5]).toMatchObject({
      key: '',
      meanAmount: 9,
      referenceQuantityDesc: { '@xml:lang': 'en', '#text': 'kWh' },
      referenceToLCIAMethodDataSet: {
        '@refObjectId': '',
        '@version': '',
        'common:shortDescription': { '@xml:lang': 'en', '#text': '-' },
      },
    });
  });

  it('keeps empty version and fallback descriptions when solver metadata is entirely missing', () => {
    const merged = buildMergedLcaRows(
      [
        {
          key: 'impact-empty',
          referenceToLCIAMethodDataSet: {
            '@refObjectId': 'impact-empty',
          },
          meanAmount: 0,
          referenceQuantityDesc: undefined,
        },
      ] as any,
      [
        {
          impact_id: 'impact-empty',
          impact_name: '',
          unit: UNKNOWN_LCIA_UNIT,
          value: 1,
        },
      ],
      new Map(),
    );

    expect(merged[0]).toMatchObject({
      meanAmount: 1,
      referenceQuantityDesc: undefined,
      referenceToLCIAMethodDataSet: {
        '@refObjectId': 'impact-empty',
        '@version': '',
        'common:shortDescription': { '@xml:lang': 'en', '#text': 'impact-empty' },
      },
    });
  });
});
