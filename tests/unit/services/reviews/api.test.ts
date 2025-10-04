/**
 * Tests for reviews service API functions
 * Path: src/services/reviews/api.ts
 */

import { FunctionRegion } from '@supabase/supabase-js';

const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: any[]) => mockFrom.apply(null, args),
    auth: {
      getSession: (...args: any[]) => mockAuthGetSession.apply(null, args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke.apply(null, args),
    },
  },
}));

const mockGetLifeCyclesByIds = jest.fn();

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCyclesByIds: (...args: any[]) => mockGetLifeCyclesByIds.apply(null, args),
}));

const mockGetPendingComment = jest.fn();
const mockGetReviewedComment = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getPendingComment: (...args: any[]) => mockGetPendingComment.apply(null, args),
  getReviewedComment: (...args: any[]) => mockGetReviewedComment.apply(null, args),
}));

const mockGetLangText = jest.fn();
const mockGenProcessName = jest.fn();

jest.mock('@/services/general/util', () => {
  const actual: any = jest.requireActual('@/services/general/util');
  return {
    __esModule: true,
    ...actual,
    getLangText: (...args: any[]) => mockGetLangText.apply(null, args),
    genProcessName: (...args: any[]) => mockGenProcessName.apply(null, args),
  };
});

let realGenProcessName: (...args: any[]) => any;

const mockGetUserId = jest.fn();

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: (...args: any[]) => mockGetUserId.apply(null, args),
}));

import * as reviewsApi from '@/services/reviews/api';

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  builder.in = jest.fn().mockReturnThis();
  return builder;
};

beforeAll(() => {
  realGenProcessName = jest.requireActual('@/services/general/util').genProcessName;
});

beforeEach(() => {
  mockFrom.mockReset();
  mockAuthGetSession.mockReset();
  mockFunctionsInvoke.mockReset();
  mockGetLifeCyclesByIds.mockReset();
  mockGetLifeCyclesByIds.mockResolvedValue({ data: [] });
  mockGetPendingComment.mockReset();
  mockGetPendingComment.mockResolvedValue({ data: [] });
  mockGetReviewedComment.mockReset();
  mockGetReviewedComment.mockResolvedValue({ data: [] });
  mockGetLangText.mockReset();
  mockGetLangText.mockImplementation((value: any, lang: string) => {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      const match = value.find((item: any) => item?.['@xml:lang'] === lang);
      return match?.['#text'] ?? '-';
    }
    if (typeof value === 'object') {
      if (value?.[lang]) return value[lang];
      if (value?.['#text']) return value['#text'];
    }
    return '-';
  });
  mockGenProcessName.mockReset();
  mockGenProcessName.mockImplementation((...args: any[]) => realGenProcessName(...args));
  mockGetUserId.mockReset();
  mockGetUserId.mockResolvedValue('user-default');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('addReviewsApi', () => {
  it('inserts review payload with default state code', async () => {
    const selectResult = { error: null };
    const selectMock = jest.fn().mockResolvedValue(selectResult);
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const payload = { json: { foo: 'bar' } };
    const result = await reviewsApi.addReviewsApi('review-1', payload);

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(insertMock).toHaveBeenCalledWith({
      id: 'review-1',
      json: payload,
      state_code: 0,
    });
    expect(selectMock).toHaveBeenCalled();
    expect(result).toEqual({ error: null });
  });
});

describe('updateReviewApi', () => {
  it('invokes edge function and adds modified_at when updating terminal states', async () => {
    const now = new Date('2024-05-01T12:34:56.000Z');
    jest.useFakeTimers().setSystemTime(now);

    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });
    const invokeResult = { data: { ok: true } };
    mockFunctionsInvoke.mockResolvedValueOnce(invokeResult);

    const data = { state_code: 1, reviewer_id: ['user-1'] };
    const result = await reviewsApi.updateReviewApi(['review-1'], data);

    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_review', {
      headers: { Authorization: 'Bearer token-123' },
      body: {
        reviewIds: ['review-1'],
        data: {
          ...data,
          modified_at: now.toISOString(),
        },
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual({ ok: true });
  });

  it('skips invocation when there is no active session', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await reviewsApi.updateReviewApi(['review-1'], { reviewer_id: ['user-1'] });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('passes payload as-is when state code does not require timestamp', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });
    const invokeResult = { data: { updated: true } };
    mockFunctionsInvoke.mockResolvedValueOnce(invokeResult);

    const updatePayload = { state_code: 5, reviewer_id: ['user-1'] };
    await reviewsApi.updateReviewApi(['review-2'], updatePayload);

    const invocation = mockFunctionsInvoke.mock.calls[0]?.[1];
    expect(invocation?.body?.data).toEqual(updatePayload);
  });
});

describe('getReviewerIdsApi', () => {
  it('returns reviewer ids when supabase responds with data', async () => {
    const supabaseResult = { data: { reviewer_id: ['user-1', 'user-2'] } };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewerIdsApi(['review-1']);

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(builder.select).toHaveBeenCalledWith('reviewer_id');
    expect(builder.in).toHaveBeenCalledWith('id', ['review-1']);
    expect(result).toEqual(['user-1', 'user-2']);
  });

  it('returns empty array when supabase payload is missing', async () => {
    const builder = createQueryBuilder({ data: null });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewerIdsApi(['review-1']);

    expect(result).toEqual([]);
  });

  test.failing('supports retrieving reviewers for multiple review ids', async () => {
    const builder = createQueryBuilder({});
    builder.single = jest.fn().mockRejectedValue(new Error('Multiple rows found'));
    mockFrom.mockReturnValueOnce(builder);

    await expect(reviewsApi.getReviewerIdsApi(['review-1', 'review-2'])).resolves.toEqual([
      'user-1',
    ]);
  });
});

describe('getReviewsDetail', () => {
  it('returns review detail for given id', async () => {
    const supabaseResult = { data: { id: 'review-1' } };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewsDetail('review-1');

    expect(builder.select).toHaveBeenCalledWith('*');
    expect(builder.eq).toHaveBeenCalledWith('id', 'review-1');
    expect(result).toEqual({ id: 'review-1' });
  });
});

describe('getReviewsDetailByReviewIds', () => {
  it('returns review list for ids', async () => {
    const supabaseResult = { data: [{ id: 'review-1' }, { id: 'review-2' }] };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewsDetailByReviewIds(['review-1', 'review-2']);

    expect(builder.in).toHaveBeenCalledWith('id', ['review-1', 'review-2']);
    expect(result).toEqual(supabaseResult.data);
  });
});

describe('getReviewsTableData', () => {
  it('returns empty dataset when no rows are found', async () => {
    const builder = createQueryBuilder({ data: [], count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewsTableData(
      { pageSize: 10, current: 1 },
      {},
      'unassigned',
      'en',
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', 0);
    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('hydrates table rows using lifecycle names for reviewed tab', async () => {
    const supabaseResult = {
      data: [
        {
          id: 'review-1',
          json: {
            data: {
              id: 'process-1',
              version: '1.0',
              name: {
                baseName: { en: 'Draft Base' },
                treatmentStandardsRoutes: { en: 'Draft Route' },
                mixAndLocationTypes: { en: 'Draft Mix' },
                functionalUnitFlowProperties: { en: 'Draft Unit' },
              },
            },
            team: { name: { en: 'Team Name' } },
            user: { name: 'Alice' },
          },
          created_at: '2024-04-01T10:00:00.000Z',
          modified_at: '2024-04-02T11:00:00.000Z',
          deadline: '2024-04-10T00:00:00.000Z',
        },
      ],
      count: 1,
    };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    mockGetUserId.mockResolvedValueOnce('user-1');
    mockGetReviewedComment.mockResolvedValueOnce({
      data: [{ review_id: 'review-1' }],
    });
    mockGetLifeCyclesByIds.mockResolvedValueOnce({
      data: [
        {
          id: 'process-1',
          version: '1.0',
          name: {
            baseName: { en: 'Model Base' },
            treatmentStandardsRoutes: { en: 'Model Route' },
            mixAndLocationTypes: { en: 'Model Mix' },
            functionalUnitFlowProperties: { en: 'Model Unit' },
          },
        },
      ],
    });

    const result = await reviewsApi.getReviewsTableData(
      { pageSize: 5, current: 2 },
      {},
      'reviewed',
      'en',
    );

    expect(builder.in).toHaveBeenCalledWith('id', ['review-1']);
    expect(mockGetLifeCyclesByIds).toHaveBeenCalledWith(['process-1']);
    expect(result).toEqual({
      data: [
        {
          key: 'review-1',
          id: 'review-1',
          isFromLifeCycle: true,
          name: 'Model Base; Model Route; Model Mix; Model Unit',
          teamName: 'Team Name',
          userName: 'Alice',
          createAt: '2024-04-01T10:00:00.000Z',
          modifiedAt: '2024-04-02T11:00:00.000Z',
          deadline: '2024-04-10T00:00:00.000Z',
          json: supabaseResult.data[0].json,
        },
      ],
      page: 2,
      success: true,
      total: 1,
    });
  });
});

describe('getReviewsByProcess', () => {
  it('queries reviews by process id and version', async () => {
    const supabaseResult = { data: [{ id: 'review-1' }], error: null };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewsByProcess('process-1', '1.0');

    expect(builder.filter).toHaveBeenCalledWith('json->data->>id', 'eq', 'process-1');
    expect(builder.filter).toHaveBeenCalledWith('json->data->>version', 'eq', '1.0');
    expect(result).toEqual(supabaseResult);
  });
});

describe('getNotifyReviews', () => {
  it('returns failure response when user is missing', async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en');

    expect(result).toEqual({ data: [], success: false, total: 0 });
  });

  it('returns notifications filtered by recent activity', async () => {
    const now = new Date('2024-05-01T08:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    mockGetUserId.mockResolvedValueOnce('user-1');

    const supabaseResult = {
      data: [
        {
          id: 'review-1',
          json: {
            data: {
              id: 'process-1',
              version: '1.0',
              name: {
                baseName: { en: 'Process Base' },
                treatmentStandardsRoutes: { en: 'Process Route' },
                mixAndLocationTypes: { en: 'Process Mix' },
                functionalUnitFlowProperties: { en: 'Process Unit' },
              },
            },
            team: { name: { en: 'Team Name' } },
            user: { name: 'Alice' },
            comment: { message: 'Need changes' },
          },
          modified_at: '2024-04-30T12:00:00.000Z',
          state_code: -1,
        },
      ],
      count: 1,
    };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    mockGetLifeCyclesByIds.mockResolvedValueOnce({ data: [] });

    const result = await reviewsApi.getNotifyReviews({ pageSize: 5, current: 3 }, 'en', 3);

    expect(builder.filter).toHaveBeenCalledWith('json->user->>id', 'eq', 'user-1');
    expect(builder.in).toHaveBeenCalledWith('state_code', [1, -1, 2]);
    expect(builder.gte).toHaveBeenCalledWith(
      'modified_at',
      new Date('2024-04-28T08:00:00.000Z').toISOString(),
    );
    expect(result).toEqual({
      data: [
        {
          key: 'review-1',
          id: 'review-1',
          isFromLifeCycle: false,
          name: 'Process Base; Process Route; Process Mix; Process Unit',
          teamName: 'Team Name',
          userName: 'Alice',
          modifiedAt: '2024-04-30T12:00:00.000Z',
          stateCode: -1,
          json: supabaseResult.data[0].json,
        },
      ],
      page: 3,
      success: true,
      total: 1,
    });
  });
});

describe('getLatestReviewOfMine', () => {
  it('returns null when no authenticated user', async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const result = await reviewsApi.getLatestReviewOfMine();

    expect(result).toBeNull();
  });

  it('returns latest review when user exists', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const supabaseResult = { data: [{ id: 'review-1' }] };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getLatestReviewOfMine();

    expect(builder.filter).toHaveBeenCalledWith('json->user->>id', 'eq', 'user-1');
    expect(builder.in).toHaveBeenCalledWith('state_code', [1, 2, -1]);
    expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(1);
    expect(result).toEqual([{ id: 'review-1' }]);
  });
});
