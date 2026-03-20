import LcaProfileSummary, {
  DEFAULT_LCA_PROFILE_LIMIT,
  buildLcaProfileModel,
} from '@/pages/Processes/Components/lcaProfileSummary';
import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('umi', () => require('@/tests/mocks/umi').createUmiMock());
jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());
jest.mock('@/components/AlignedNumber', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ value }: { value: unknown }) => React.createElement('span', null, String(value)),
  };
});

const buildRow = (
  id: string,
  label: string,
  value: number,
  unit = 'kg CO2-eq',
  zhLabel?: string,
) => ({
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

  it('falls back to raw keys and placeholder labels when descriptions or units are missing', () => {
    const model = buildLcaProfileModel(
      [
        {
          key: 'fallback-key',
          referenceToLCIAMethodDataSet: {},
          meanAmount: 3,
          referenceQuantityDesc: undefined,
        } as any,
        {
          referenceToLCIAMethodDataSet: {},
          meanAmount: 1,
          referenceQuantityDesc: undefined,
        } as any,
      ],
      'en',
    );

    expect(model.items[0]).toMatchObject({
      key: 'fallback-key',
      title: 'fallback-key',
      unit: '-',
    });
    expect(model.items[1]).toMatchObject({
      key: '-',
      title: '-',
      unit: '-',
    });
  });

  it('renders nothing while loading an empty profile and shows placeholder summaries afterward', () => {
    const { rerender, container } = render(
      React.createElement(LcaProfileSummary, { rows: [], lang: 'en', loading: true }),
    );

    expect(container).toBeEmptyDOMElement();

    rerender(React.createElement(LcaProfileSummary, { rows: [], lang: 'en', loading: false }));

    expect(screen.getByText('LCIA Profile')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
  });

  it('renders populated summaries, formatted values, and relative-magnitude rows', () => {
    render(
      React.createElement(LcaProfileSummary, {
        rows: [
          buildRow('impact-1', 'Climate change', 42),
          buildRow('impact-2', 'Acidification', -21),
        ],
        lang: 'en',
        loading: true,
      }),
    );

    expect(screen.getByText('Impact categories')).toBeInTheDocument();
    expect(screen.getByText('Non-zero categories')).toBeInTheDocument();
    expect(screen.getByText('Largest positive category')).toBeInTheDocument();
    expect(screen.getAllByText('Climate change').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('kg CO2-eq').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('uses the default loading=false prop when loading is omitted', () => {
    render(
      React.createElement(LcaProfileSummary, {
        rows: [buildRow('impact-3', 'Water use', 3)],
        lang: 'en',
      }),
    );

    expect(screen.getAllByText('Water use').length).toBeGreaterThanOrEqual(2);
  });
});
