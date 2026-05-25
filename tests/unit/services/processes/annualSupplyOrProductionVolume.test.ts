import {
  ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX,
  ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN,
  buildAnnualSupplyVolumeMultiLang,
  buildAnnualSupplyVolumeUnitLookupRows,
  deriveAnnualSupplyVolumeSuffix,
  formatAnnualSupplyVolumeText,
  getAnnualSupplyVolumeDisplayNumericText,
  getAnnualSupplyVolumeDisplaySuffixText,
  mergeAnnualSupplyVolumeUnitRows,
  normalizeAnnualSupplyVolumeMultiLang,
  normalizeAnnualSupplyVolumeText,
  parseAnnualSupplyVolumeText,
  sanitizeAnnualSupplyVolumeNumericInput,
} from '@/services/processes/annualSupplyOrProductionVolume';

describe('annualSupplyOrProductionVolume helpers', () => {
  it('parses full numeric text into editable numeric and suffix parts', () => {
    expect(parseAnnualSupplyVolumeText('123 kg/year')).toEqual({
      numericText: '123',
      suffixText: 'kg/year',
    });
    expect(parseAnnualSupplyVolumeText('-1.2E+3 kg Steel')).toEqual({
      numericText: '-1.2E+3',
      suffixText: 'kg Steel',
    });
  });

  it('parses empty and non-numeric legacy text without dropping the editable prefix', () => {
    expect(parseAnnualSupplyVolumeText('')).toEqual({
      numericText: '',
      suffixText: '',
    });
    expect(parseAnnualSupplyVolumeText('-')).toEqual({
      numericText: '',
      suffixText: '',
    });
    expect(parseAnnualSupplyVolumeText('legacy suffix text')).toEqual({
      numericText: 'legacy',
      suffixText: 'suffix text',
    });
  });

  it('formats numeric input with a derived suffix and keeps partial numeric edits visible', () => {
    expect(formatAnnualSupplyVolumeText('123', 'kg/year')).toBe('123 kg/year');
    expect(formatAnnualSupplyVolumeText('-', 'kg/year')).toBe('- kg/year');
    expect(formatAnnualSupplyVolumeText('', 'kg/year')).toBe('');
    expect(formatAnnualSupplyVolumeText('abc123', 'kg/year')).toBe('123 kg/year');
    expect(formatAnnualSupplyVolumeText('123', '')).toBe(
      `123 ${ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX}`,
    );
    expect(formatAnnualSupplyVolumeText('123', '', { useDefaultSuffix: false })).toBe('123');
    expect(formatAnnualSupplyVolumeText(123, 'kg/year')).toBe('');
  });

  it('sanitizes editable numeric input while keeping real-number partial states', () => {
    expect(sanitizeAnnualSupplyVolumeNumericInput('abc')).toBe('');
    expect(sanitizeAnnualSupplyVolumeNumericInput('abc123')).toBe('123');
    expect(sanitizeAnnualSupplyVolumeNumericInput('12abc')).toBe('12');
    expect(sanitizeAnnualSupplyVolumeNumericInput('1.2.3')).toBe('1.23');
    expect(sanitizeAnnualSupplyVolumeNumericInput('--1.2E++3')).toBe('-1.2E+3');
    expect(sanitizeAnnualSupplyVolumeNumericInput('.')).toBe('.');
    expect(sanitizeAnnualSupplyVolumeNumericInput('1E-')).toBe('1E-');
    expect(sanitizeAnnualSupplyVolumeNumericInput(123)).toBe('');
  });

  it('normalizes localized values with a suffix per language', () => {
    const normalized = normalizeAnnualSupplyVolumeMultiLang(
      [
        { '@xml:lang': 'en', '#text': '100 old suffix' },
        { '@xml:lang': 'zh', '#text': '200 旧后缀' },
      ],
      (item) => (item['@xml:lang'] === 'zh' ? '千克/年' : 'kg/year'),
    );

    expect(normalized).toEqual([
      { '@xml:lang': 'en', '#text': '100 kg/year' },
      { '@xml:lang': 'zh', '#text': '200 千克/年' },
    ]);
  });

  it('preserves existing annualized suffixes when no replacement unit is available', () => {
    const normalized = normalizeAnnualSupplyVolumeMultiLang(
      [
        { '@xml:lang': 'en', '#text': '3.6 MJ/year' },
        { '@xml:lang': 'zh', '#text': '3.6 MJ/年' },
      ],
      () => '',
    );

    expect(normalized).toEqual([
      { '@xml:lang': 'en', '#text': '3.6 MJ/year' },
      { '@xml:lang': 'zh', '#text': '3.6 MJ/年' },
    ]);
    expect(normalizeAnnualSupplyVolumeText('3.6 MJ/year', 'MJ')).toBe('3.6 MJ/year');
  });

  it('builds multilingual values from one numeric input and reads the displayed numeric value', () => {
    expect(
      buildAnnualSupplyVolumeMultiLang(
        'abc123',
        (lang) => (lang === 'zh' ? '千克 钢材' : 'kg Steel'),
        ['en', 'zh', 'en', ''],
      ),
    ).toEqual([
      { '@xml:lang': 'en', '#text': '123 kg Steel' },
      { '@xml:lang': 'zh', '#text': '123 千克 钢材' },
    ]);
    expect(buildAnnualSupplyVolumeMultiLang('', 'kg Steel')).toEqual([]);
    expect(buildAnnualSupplyVolumeMultiLang('500', 'kg Steel')).toEqual([
      { '@xml:lang': 'en', '#text': '500 kg Steel' },
      { '@xml:lang': 'zh', '#text': '500 kg Steel' },
    ]);
    expect(buildAnnualSupplyVolumeMultiLang('500', '')).toEqual([
      { '@xml:lang': 'en', '#text': '500' },
      { '@xml:lang': 'zh', '#text': '500' },
    ]);
    expect(
      getAnnualSupplyVolumeDisplayNumericText(
        [
          { '@xml:lang': 'en', '#text': '100 kg Steel' },
          { '@xml:lang': 'zh', '#text': '200 千克 钢材' },
        ],
        'zh',
      ),
    ).toBe('200');
    expect(
      getAnnualSupplyVolumeDisplayNumericText(
        [
          { '@xml:lang': 'en', '#text': '100 kg Steel' },
          { '@xml:lang': 'zh', '#text': '200 千克 钢材' },
        ],
        'de',
      ),
    ).toBe('100');
    expect(
      getAnnualSupplyVolumeDisplayNumericText([null, { '#text': '600 kg Steel' }] as never, 'de'),
    ).toBe('600');
    expect(getAnnualSupplyVolumeDisplayNumericText([], 'en')).toBe('');
    expect(getAnnualSupplyVolumeDisplayNumericText({ '#text': '300 kg Steel' }, 'en')).toBe('300');
    expect(getAnnualSupplyVolumeDisplayNumericText('400 kg Steel', 'en')).toBe('400');
    expect(getAnnualSupplyVolumeDisplaySuffixText('400 kg Steel', 'en')).toBe('kg Steel');
  });

  it('preserves an existing unit prefix when the derived suffix only has reference flow text', () => {
    expect(normalizeAnnualSupplyVolumeText('100', 'kg/year')).toBe('100 kg/year');
    expect(normalizeAnnualSupplyVolumeText('100 kg Steel', 'Steel')).toBe('100 kg Steel');
    expect(normalizeAnnualSupplyVolumeText('100 old suffix', 'Steel')).toBe('100 Steel');
    expect(normalizeAnnualSupplyVolumeText('100 old suffix', '', { useDefaultSuffix: false })).toBe(
      '100',
    );
  });

  it('normalizes object values with a shared suffix and leaves malformed values unchanged', () => {
    expect(
      normalizeAnnualSupplyVolumeMultiLang({ '@xml:lang': 'en', '#text': '50 old' }, 'kg'),
    ).toEqual({
      '@xml:lang': 'en',
      '#text': '50 kg',
    });
    expect(normalizeAnnualSupplyVolumeMultiLang(null, 'kg')).toBeNull();
    expect(normalizeAnnualSupplyVolumeMultiLang('100 old', 'kg')).toBe('100 old');
  });

  it('derives annualized unit suffixes from the quantitative reference exchange', () => {
    const suffix = deriveAnnualSupplyVolumeSuffix({
      exchangeDataSource: [
        {
          '@dataSetInternalID': 'input-1',
          exchangeDirection: 'Input',
          referenceToFlowDataSet: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Iron ore' }],
          },
        },
        {
          '@dataSetInternalID': 'output-1',
          exchangeDirection: 'Output',
          quantitativeReference: true,
          referenceToFlowDataSet: {
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel slab' }],
          },
          refUnitRes: {
            refUnitName: 'kg',
          },
        },
      ],
      lang: 'en',
    });

    expect(suffix).toBe('kg/year');
    expect(normalizeAnnualSupplyVolumeText('100 old suffix', suffix)).toBe('100 kg/year');
    expect(ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN.test('100 kg/year')).toBe(true);
  });

  it('derives suffixes from unit display names when a unit symbol is unavailable', () => {
    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'output-1',
            exchangeDirection: 'Output',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel slab' }],
            },
            refUnitRes: {
              name: [{ '@xml:lang': 'en', '#text': 'kilogram' }],
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('kilogram/year');
  });

  it('derives suffixes from fallback unit display shapes', () => {
    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'output-1',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
            },
            refUnitRes: {
              name: 'MJ',
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('MJ/year');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'output-1',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
            },
            refUnitRes: {
              name: [{ '@xml:lang': 'en', '#text': 'kilogram' }],
            },
          },
        ],
        lang: 'zh',
      }),
    ).toBe('kilogram/年');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'output-1',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
            },
            refUnitRes: {
              name: { '#text': 'cubic metre' },
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('cubic metre/year');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'output-1',
            quantitativeReference: true,
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
            },
            refUnitRes: {
              name: 123 as never,
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('');
  });

  it('builds unit lookup rows and merges resolved flow units into exchange rows', () => {
    const exchangeRows = [
      {
        '@dataSetInternalID': 'output-1',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-1',
          '@version': '01.00.000',
        },
      },
      {
        '@dataSetInternalID': 'output-2',
        referenceToFlowDataSet: [
          {
            '@refObjectId': 'flow-2',
            '@version': '01.00.000',
          },
        ],
      },
    ];

    expect(buildAnnualSupplyVolumeUnitLookupRows(exchangeRows)).toEqual([
      {
        referenceToFlowDataSetId: 'flow-1',
        referenceToFlowDataSetVersion: '01.00.000',
      },
      {
        referenceToFlowDataSetId: 'flow-2',
        referenceToFlowDataSetVersion: '01.00.000',
      },
    ]);

    expect(buildAnnualSupplyVolumeUnitLookupRows(null as never)).toEqual([]);
    expect(mergeAnnualSupplyVolumeUnitRows(null as never, [])).toEqual([]);

    expect(
      mergeAnnualSupplyVolumeUnitRows(exchangeRows, [
        {
          referenceToFlowDataSetId: 'flow-1',
          referenceToFlowDataSetVersion: '01.00.000',
          refUnitRes: { refUnitName: 'kg' },
        },
        {
          referenceToFlowDataSetId: 'flow-2',
          referenceToFlowDataSetVersion: '02.00.000',
          refUnitRes: { refUnitName: 'm3' },
        },
      ]),
    ).toEqual([
      {
        ...exchangeRows[0],
        refUnitRes: { refUnitName: 'kg' },
      },
      {
        ...exchangeRows[1],
        refUnitRes: { refUnitName: 'm3' },
      },
    ]);

    expect(mergeAnnualSupplyVolumeUnitRows(exchangeRows, null)).toEqual(exchangeRows);
  });

  it('uses only the annualized unit suffix from the selected reference exchange', () => {
    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'input-1',
            exchangeDirection: 'Input',
            referenceToFlowDataSet: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Iron ore' }],
            },
          },
          {
            '@dataSetInternalID': 'output-1',
            exchangeDirection: 'Output',
            quantitativeReference: true,
            functionalUnitOrOther: 'annual output' as unknown as { '#text': string },
            referenceToFlowDataSet: {
              'common:shortDescription': [{ '@xml:lang': 'zh', '#text': '钢板' }],
            },
            refUnitRes: {
              refUnitName: 'kg',
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('kg/year');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'first-1',
            quantitativeReference: true,
            functionalUnitOrOther: { '#text': 'functional unit' },
            referenceToFlowDataSet: {
              'common:shortDescription': [{ '@xml:lang': 'zh', '#text': '钢板' }],
            },
            refUnitRes: {
              refUnitName: 'kg',
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('kg/year');
  });

  it('leaves suffix blank when no reference unit can be resolved', () => {
    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'first-1',
            quantitativeReference: true,
            functionalUnitOrOther: 123 as unknown as { '#text': string },
            referenceToFlowDataSet: [
              {
                'common:shortDescription': [{ '@xml:lang': 'zh', '#text': '钢板' }],
              },
            ],
          },
        ],
        lang: 'en',
      }),
    ).toBe('');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'output-1',
            exchangeDirection: 'Output',
            quantitativeReference: false,
            referenceToFlowDataSet: {
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Steel' }],
            },
            refUnitRes: {
              refUnitName: 'kg',
            },
          },
        ],
        lang: 'en',
      }),
    ).toBe('');
  });
});
