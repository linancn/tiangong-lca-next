import {
  publishedLciaQueryMeta,
  publishedValuesByProcessId,
  shouldUsePublishedLciaResults,
} from '@/pages/Processes/Components/publishedLciaResults';

describe('publishedLciaResults helpers', () => {
  const originalFlag = process.env.APP_PUBLIC_LCIA_RESULTS_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.APP_PUBLIC_LCIA_RESULTS_ENABLED;
    } else {
      process.env.APP_PUBLIC_LCIA_RESULTS_ENABLED = originalFlag;
    }
  });

  it('enables published LCIA reads only for flagged open data', () => {
    process.env.APP_PUBLIC_LCIA_RESULTS_ENABLED = 'true';

    expect(shouldUsePublishedLciaResults('open_data')).toBe(true);
    expect(shouldUsePublishedLciaResults('current_user')).toBe(false);
    expect(shouldUsePublishedLciaResults(undefined)).toBe(false);

    process.env.APP_PUBLIC_LCIA_RESULTS_ENABLED = 'false';
    expect(shouldUsePublishedLciaResults('open_data')).toBe(false);
  });

  it('normalizes publication/package metadata and value maps defensively', () => {
    expect(
      publishedLciaQueryMeta({
        package: {
          snapshot_id: 'snapshot-snake',
          package_id: 'package-snake',
        },
        publication: {
          published_at: '2026-06-24T09:00:00Z',
        },
      } as any),
    ).toEqual({
      snapshotId: 'snapshot-snake',
      resultId: 'package-snake',
      source: 'published_package',
      computedAt: '2026-06-24T09:00:00Z',
    });

    expect(
      publishedLciaQueryMeta({
        package: {
          snapshotId: 'snapshot-camel',
          id: 'package-id-fallback',
        },
        publication: {
          publishedAt: '2026-06-24T10:00:00Z',
        },
      } as any),
    ).toEqual({
      snapshotId: 'snapshot-camel',
      resultId: 'package-id-fallback',
      source: 'published_package',
      computedAt: '2026-06-24T10:00:00Z',
    });

    expect(publishedLciaQueryMeta({ package: [], publication: null } as any)).toEqual({
      snapshotId: '-',
      resultId: '-',
      source: 'published_package',
      computedAt: '-',
    });
    expect(
      publishedLciaQueryMeta({
        package: {
          snapshotId: '   ',
          package_id: '',
        },
        publication: {
          publishedAt: '   ',
        },
      } as any),
    ).toEqual({
      snapshotId: '-',
      resultId: '-',
      source: 'published_package',
      computedAt: '-',
    });
    expect(publishedLciaQueryMeta(null)).toEqual({
      snapshotId: '-',
      resultId: '-',
      source: 'published_package',
      computedAt: '-',
    });

    expect(publishedValuesByProcessId({ values: { 'process-1': 12.5 } } as any)).toEqual({
      'process-1': 12.5,
    });
    expect(publishedValuesByProcessId({ values: [] } as any)).toEqual({});
    expect(publishedValuesByProcessId(undefined)).toEqual({});
  });
});
