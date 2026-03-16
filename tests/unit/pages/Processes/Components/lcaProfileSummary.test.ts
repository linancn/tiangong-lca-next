import {
  DEFAULT_LCA_PROFILE_LIMIT,
  buildLcaProfileModel,
} from '@/pages/Processes/Components/lcaProfileSummary';
import type { LCIAResultTable } from '@/services/lciaMethods/data';

const buildRow = (
  id: string,
  label: string,
  value: number,
  unit = 'kg CO2-eq',
  zhLabel?: string,
): LCIAResultTable => ({
  key: id,
  referenceToLCIAMethodDataSet: {
    '@refObjectId': id,
    '@type': 'LCIA method data set',
    '@uri': `../lciamethods/${id}.xml`,
    '@version': '01.00.000',
    'common:shortDescription': [
      {
        '@xml:lang': 'en',
        '#text': label,
      },
      ...(zhLabel
        ? [
            {
              '@xml:lang': 'zh',
              '#text': zhLabel,
            },
          ]
        : []),
    ] as any,
  },
  meanAmount: value,
  referenceQuantityDesc: unit,
});

describe('buildLcaProfileModel', () => {
  it('sorts rows by absolute magnitude and builds summary peaks', () => {
    const model = buildLcaProfileModel(
      [
        buildRow('impact-1', 'Climate change', 42, 'kg CO2-eq'),
        buildRow('impact-2', 'Acidification', -21, 'mol H+-eq'),
        buildRow('impact-3', 'Water use', 0),
      ],
      'en',
    );

    expect(model.totalCount).toBe(3);
    expect(model.nonZeroCount).toBe(2);
    expect(model.topAbsoluteItem?.key).toBe('impact-1');
    expect(model.topPositiveItem?.key).toBe('impact-1');
    expect(model.topNegativeItem?.key).toBe('impact-2');
    expect(model.items[0].normalizedValue).toBe(1);
    expect(model.items[1].normalizedValue).toBeCloseTo(0.5);
    expect(model.items[1].direction).toBe('negative');
    expect(model.items[2].direction).toBe('neutral');
  });

  it('prefers locale-matched labels and respects the top-item limit', () => {
    const rows = Array.from({ length: DEFAULT_LCA_PROFILE_LIMIT + 2 }).map((_, index) =>
      buildRow(
        `impact-${index}`,
        `Impact ${index}`,
        DEFAULT_LCA_PROFILE_LIMIT + 2 - index,
        'pt',
        `影响 ${index}`,
      ),
    );

    const model = buildLcaProfileModel(rows, 'zh', 3);

    expect(model.items[0].title).toBe('影响 0');
    expect(model.topItems).toHaveLength(3);
    expect(model.topItems.map((item) => item.key)).toEqual(['impact-0', 'impact-1', 'impact-2']);
  });

  it('returns an empty top list when every value is zero', () => {
    const model = buildLcaProfileModel(
      [buildRow('impact-1', 'Climate change', 0), buildRow('impact-2', 'Acidification', 0)],
      'en',
    );

    expect(model.nonZeroCount).toBe(0);
    expect(model.topItems).toEqual([]);
    expect(model.topPositiveItem).toBeUndefined();
    expect(model.topNegativeItem).toBeUndefined();
  });
});
