import {
  ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX,
  ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN,
  deriveAnnualSupplyVolumeSuffix,
  formatAnnualSupplyVolumeText,
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

  it('derives suffixes from the quantitative reference exchange', () => {
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

    expect(suffix).toBe('kg Steel slab');
    expect(normalizeAnnualSupplyVolumeText('100 old suffix', suffix)).toBe('100 kg Steel slab');
    expect(ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN.test('100 kg Steel slab')).toBe(true);
  });

  it('derives suffixes from fallback text shapes and output exchange fallback', () => {
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
    ).toBe('kg annual output');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'first-1',
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
    ).toBe('kg functional unit');
  });

  it('uses reference flow text and the default suffix when no better context exists', () => {
    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [
          {
            '@dataSetInternalID': 'first-1',
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
    ).toBe('钢板');

    expect(
      deriveAnnualSupplyVolumeSuffix({
        exchangeDataSource: [],
        lang: 'en',
      }),
    ).toBe(ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX);
  });
});
