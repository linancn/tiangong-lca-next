import {
  extractContributeDataError,
  getContributeDataErrorMessage,
} from '@/components/ContributeData/utils';

const buildIntl = (messages: Record<string, string>) => ({
  formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
    messages[id] ?? defaultMessage ?? id,
});

describe('ContributeData utils', () => {
  it('returns the top-level contribute error when present', () => {
    const error = { code: 'DATA_ALREADY_PUBLISHED', message: 'backend error' };

    expect(extractContributeDataError({ error })).toBe(error);
  });

  it('returns the nested contribute error from contribute results', () => {
    const nestedError = { code: 'DATA_ALREADY_PUBLISHED' };
    const itemError = 'fallback item error';

    expect(
      extractContributeDataError({
        contributeResults: [null, { data: { error: null } }, { data: { error: nestedError } }],
      }),
    ).toBe(nestedError);
    expect(
      extractContributeDataError({
        contributeResults: [{ data: { error: null } }, { error: itemError }],
      }),
    ).toBe(itemError);
  });

  it('returns null when no contribute error exists', () => {
    expect(extractContributeDataError(null)).toBeNull();
    expect(extractContributeDataError({})).toBeNull();
    expect(
      extractContributeDataError({ contributeResults: [{ data: { error: null } }] }),
    ).toBeNull();
  });

  it('maps DATA_ALREADY_PUBLISHED to the localized share-to-team message', () => {
    const enIntl = buildIntl({
      'component.contributeData.error.dataAlreadyPublished':
        'Open data cannot be shared to a team.',
      'component.contributeData.error.dataUnderReview':
        'Data under review cannot be contributed to a team.',
      'pages.action.error': 'Action failed',
    });
    const zhIntl = buildIntl({
      'component.contributeData.error.dataAlreadyPublished': '开放数据不能共享到团队。',
      'component.contributeData.error.dataUnderReview': '审核中数据不能贡献到团队。',
      'pages.action.error': '操作失败',
    });

    expect(
      getContributeDataErrorMessage(enIntl, {
        code: 'DATA_ALREADY_PUBLISHED',
        message: 'Published data cannot be reassigned to another team',
      }),
    ).toBe('Open data cannot be shared to a team.');
    expect(
      getContributeDataErrorMessage(zhIntl, {
        state_code: 100,
        message: 'Published data cannot be reassigned to another team',
      }),
    ).toBe('开放数据不能共享到团队。');
    expect(
      getContributeDataErrorMessage(zhIntl, {
        details: { state_code: 100 },
        message: 'Published data cannot be reassigned to another team',
      }),
    ).toBe('开放数据不能共享到团队。');
  });

  it('maps DATA_UNDER_REVIEW to the localized share-to-team message', () => {
    const enIntl = buildIntl({
      'component.contributeData.error.dataAlreadyPublished':
        'Open data cannot be shared to a team.',
      'component.contributeData.error.dataUnderReview':
        'Data under review cannot be contributed to a team.',
      'pages.action.error': 'Action failed',
    });
    const zhIntl = buildIntl({
      'component.contributeData.error.dataAlreadyPublished': '开放数据不能共享到团队。',
      'component.contributeData.error.dataUnderReview': '审核中数据不能贡献到团队。',
      'pages.action.error': '操作失败',
    });

    expect(
      getContributeDataErrorMessage(enIntl, {
        code: 'DATA_UNDER_REVIEW',
        message: 'Data is under review and cannot be reassigned',
      }),
    ).toBe('Data under review cannot be contributed to a team.');
    expect(
      getContributeDataErrorMessage(zhIntl, {
        review_state_code: 20,
        message: 'Data is under review and cannot be reassigned',
      }),
    ).toBe('审核中数据不能贡献到团队。');
    expect(
      getContributeDataErrorMessage(zhIntl, {
        details: { state_code: 20, review_state_code: 20 },
        message: 'Data is under review and cannot be reassigned',
      }),
    ).toBe('审核中数据不能贡献到团队。');
  });

  it('falls back to the original error message or a generic action failure', () => {
    const intl = buildIntl({
      'component.contributeData.error.dataAlreadyPublished':
        'Open data cannot be shared to a team.',
      'component.contributeData.error.dataUnderReview':
        'Data under review cannot be contributed to a team.',
      'pages.action.error': 'Action failed',
    });

    expect(getContributeDataErrorMessage(intl, { message: 'contribute failed' })).toBe(
      'contribute failed',
    );
    expect(getContributeDataErrorMessage(intl, 'plain string error')).toBe('plain string error');
    expect(getContributeDataErrorMessage(intl, { message: '   ' })).toBe('Action failed');
    expect(getContributeDataErrorMessage(intl, true)).toBe('Action failed');
  });
});
