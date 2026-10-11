import {
  getPublishedClimateResults,
  PUBLISHED_CLIMATE_METHOD_ID,
  publishedProcessKey,
} from '@/services/dataProducts/publishedClimate';
import { queryExactPublishedLciaResults } from '@/services/dataProducts/api';

jest.mock('@/services/dataProducts/api', () => ({ queryExactPublishedLciaResults: jest.fn() }));
const query = jest.mocked(queryExactPublishedLciaResults);
const processes = [
  { id: 'process-a', version: '01.00.000' },
  { id: 'process-a', version: '01.00.001' },
];
const values = [
  { ...processes[0], status: 'available', value: 0, unit: 'kg CO2 Equivalents' },
  { ...processes[1], status: 'available', value: -0.125, unit: 'kg CO2 Equivalents' },
];
const envelope = () => ({
  mode: 'processes_one_impact_exact',
  impact_id: PUBLISHED_CLIMATE_METHOD_ID,
  publication: { id: 'publication-a' },
  package: { id: 'package-a' },
  rowCount: 2,
  values: values.map((row) => ({ ...row })),
});

describe('published climate results', () => {
  it('reads exact versions in one request and preserves zero and negative values', async () => {
    query.mockResolvedValue({ data: envelope(), error: null } as any);
    const result = await getPublishedClimateResults(processes);
    expect(query).toHaveBeenCalledWith({
      impactCategoryId: PUBLISHED_CLIMATE_METHOD_ID,
      processes,
    });
    expect(result.get(publishedProcessKey(processes[0]))?.value).toBe(0);
    expect(result.get(publishedProcessKey(processes[1]))?.value).toBe(-0.125);
  });

  it('preserves explicit missing values and does not call Edge for an empty page', async () => {
    const data = envelope();
    data.values[1] = { ...processes[1], status: 'missing', value: null, unit: '' } as any;
    query.mockResolvedValue({ data, error: null } as any);
    expect(
      (await getPublishedClimateResults(processes)).get(publishedProcessKey(processes[1]))?.value,
    ).toBeNull();
    query.mockClear();
    expect(await getPublishedClimateResults([])).toEqual(new Map());
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    (data: any) => {
      data.mode = 'processes_one_impact';
    },
    (data: any) => {
      data.impact_id = 'other-method';
    },
    (data: any) => {
      data.publication = null;
    },
    (data: any) => {
      data.package = {};
    },
    (data: any) => {
      data.publication.id = ' ';
    },
    (data: any) => {
      data.rowCount = 1;
    },
    (data: any) => {
      data.values = undefined;
    },
    (data: any) => {
      data.values.pop();
    },
    (data: any) => {
      data.values[1] = data.values[0];
    },
    (data: any) => {
      data.values[0].version = '02.00.000';
    },
    (data: any) => {
      data.values[0] = null;
    },
    (data: any) => {
      data.values[0].id = 123;
    },
    (data: any) => {
      data.values[0].version = null;
    },
    (data: any) => {
      data.values[0].value = '0';
    },
    (data: any) => {
      data.values[0].value = Infinity;
    },
    (data: any) => {
      data.values[0].unit = null;
    },
    (data: any) => {
      data.values[0].unit = '';
    },
    (data: any) => {
      data.values[0].status = 'unknown';
    },
    (data: any) => {
      data.values[0].status = 'missing';
    },
  ])(
    'rejects an inconsistent response rather than displaying a fabricated value (%#)',
    async (change) => {
      const data = envelope();
      change(data);
      query.mockResolvedValue({ data, error: null } as any);
      await expect(getPublishedClimateResults(processes)).rejects.toThrow(
        'invalid_published_climate_response',
      );
    },
  );

  it('rejects null data and query failures', async () => {
    query.mockResolvedValue({ data: null, error: null } as any);
    await expect(getPublishedClimateResults(processes)).rejects.toThrow(
      'invalid_published_climate_response',
    );
    query.mockResolvedValue({ data: null, error: { message: 'offline' } } as any);
    await expect(getPublishedClimateResults(processes)).rejects.toThrow(
      'published_climate_query_failed',
    );
  });

  it('rejects duplicate revisions and excessive batches before transport', async () => {
    await expect(getPublishedClimateResults([processes[0], processes[0]])).rejects.toThrow(
      'invalid_published_climate_selection',
    );
    await expect(
      getPublishedClimateResults(
        Array.from({ length: 101 }, (_, i) => ({ id: `process-${i}`, version: '01.00.000' })),
      ),
    ).rejects.toThrow('invalid_published_climate_selection');
  });
});
