import {
  ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX,
  ANNUAL_SUPPLY_VOLUME_TEXT_PATTERN,
  deriveAnnualSupplyVolumeSuffix,
  formatAnnualSupplyVolumeText,
  normalizeAnnualSupplyVolumeMultiLang,
  normalizeAnnualSupplyVolumeText,
  parseAnnualSupplyVolumeText,
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

  it('formats numeric input with a derived suffix and keeps partial numeric edits visible', () => {
    expect(formatAnnualSupplyVolumeText('123', 'kg/year')).toBe('123 kg/year');
    expect(formatAnnualSupplyVolumeText('-', 'kg/year')).toBe('- kg/year');
    expect(formatAnnualSupplyVolumeText('', 'kg/year')).toBe('');
    expect(formatAnnualSupplyVolumeText('123', '')).toBe(
      `123 ${ANNUAL_SUPPLY_VOLUME_DEFAULT_SUFFIX}`,
    );
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
});
