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

const mockGetLifeCyclesByIdAndVersion = jest.fn();

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCyclesByIdAndVersion: (...args: any[]) =>
    mockGetLifeCyclesByIdAndVersion.apply(null, args),
}));

const mockGetPendingComment = jest.fn();
const mockGetReviewedComment = jest.fn();
const mockGetRejectedComment = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getPendingComment: (...args: any[]) => mockGetPendingComment.apply(null, args),
  getReviewedComment: (...args: any[]) => mockGetReviewedComment.apply(null, args),
  getRejectedComment: (...args: any[]) => mockGetRejectedComment.apply(null, args),
}));

const mockGetProcessDetailByIdAndVersion = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetailByIdAndVersion: (...args: any[]) =>
    mockGetProcessDetailByIdAndVersion.apply(null, args),
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
    gt: jest.fn().mockReturnThis(),
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
  mockGetLifeCyclesByIdAndVersion.mockReset();
  mockGetLifeCyclesByIdAndVersion.mockResolvedValue({ data: [] });
  mockGetPendingComment.mockReset();
  mockGetPendingComment.mockResolvedValue({ data: [] });
  mockGetReviewedComment.mockReset();
  mockGetReviewedComment.mockResolvedValue({ data: [] });
  mockGetRejectedComment.mockReset();
  mockGetRejectedComment.mockResolvedValue({ data: [] });
  mockGetProcessDetailByIdAndVersion.mockReset();
  mockGetProcessDetailByIdAndVersion.mockResolvedValue({ success: true, data: [] });
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
    expect(result).toEqual(invokeResult.data);
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

  it('propagates invoke errors while preserving payload shape', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'token-456',
        },
      },
    });
    const invokeResult = {
      data: null,
      error: { message: 'invoke failed' },
    };
    mockFunctionsInvoke.mockResolvedValueOnce(invokeResult);

    const response = await reviewsApi.updateReviewApi(['review-3'], { reviewer_id: ['user-9'] });

    expect(response).toEqual({ error: invokeResult.error });
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

describe('getRejectReviewsByProcess', () => {
  it('queries rejected reviews by process id and version', async () => {
    const supabaseResult = { data: [{ id: 'review-1' }], error: null };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getRejectReviewsByProcess('process-1', '1.0');

    expect(builder.select).toHaveBeenCalledWith('id');
    expect(builder.filter).toHaveBeenCalledWith('json->data->>id', 'eq', 'process-1');
    expect(builder.filter).toHaveBeenCalledWith('json->data->>version', 'eq', '1.0');
    expect(builder.eq).toHaveBeenCalledWith('state_code', -1);
    expect(result).toEqual(supabaseResult);
  });
});

describe('getReviewsTableDataOfReviewMember', () => {
  it('returns empty table when reviewer user id cannot be resolved', async () => {
    mockGetUserId.mockResolvedValueOnce(undefined);

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 1 },
      {},
      'reviewed',
      'en',
    );

    expect(mockGetReviewedComment).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('returns empty table when pending comment query returns error', async () => {
    mockGetPendingComment.mockResolvedValueOnce({ error: { message: 'db failed' }, data: null });

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 1 },
      {},
      'pending',
      'en',
      { user_id: 'reviewer-1' },
    );

    expect(mockGetPendingComment).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'reviewer-1',
    );
    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('maps reviewer-rejected comments with lifecycle model enrichment', async () => {
    const commentPayload = {
      data: [
        {
          reviews: {
            id: 'review-1',
            created_at: '2024-04-01T00:00:00.000Z',
            modified_at: '2024-04-02T00:00:00.000Z',
            deadline: '2024-04-20T00:00:00.000Z',
            json: {
              data: {
                id: 'process-1',
                version: '01.00.000',
                name: {
                  baseName: { en: 'Fallback Base' },
                  treatmentStandardsRoutes: { en: 'Fallback Route' },
                  mixAndLocationTypes: { en: 'Fallback Mix' },
                  functionalUnitFlowProperties: { en: 'Fallback Unit' },
                },
              },
              team: { name: { en: 'Team A' } },
              user: { email: 'reviewer@example.com' },
            },
          },
        },
      ],
      count: 1,
      error: null,
    };
    mockGetRejectedComment.mockResolvedValueOnce(commentPayload);
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'process-1',
          version: '01.00.000',
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Model Base' },
                    treatmentStandardsRoutes: { en: 'Model Route' },
                    mixAndLocationTypes: { en: 'Model Mix' },
                    functionalUnitFlowProperties: { en: 'Model Unit' },
                  },
                },
              },
            },
          },
          json_tg: { version: 'tg' },
        },
      ],
    });

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 2 },
      { modified_at: 'descend' },
      'reviewer-rejected',
      'en',
      { user_id: 'reviewer-1' },
    );

    expect(mockGetRejectedComment).toHaveBeenCalledWith(
      { pageSize: 10, current: 2 },
      { modified_at: 'descend' },
      'reviewer-1',
    );
    expect(mockGetLifeCyclesByIdAndVersion).toHaveBeenCalledWith([
      { id: 'process-1', version: '01.00.000' },
    ]);
    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result).toHaveProperty('page', 2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: 'review-1',
      isFromLifeCycle: true,
      teamName: 'Team A',
      userName: 'reviewer@example.com',
      deadline: '2024-04-20T00:00:00.000Z',
      modelData: {
        id: 'process-1',
        version: '01.00.000',
      },
    });
    expect(result.data[0].name).toContain('Model Base');
  });
});

describe('getReviewsTableDataOfReviewAdmin', () => {
  it('returns empty table for unassigned type when no rows exist', async () => {
    const builder = createQueryBuilder({ data: [], count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewsTableDataOfReviewAdmin(
      { pageSize: 10, current: 1 },
      {},
      'unassigned',
      'en',
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', 0);
    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('applies assigned query filters and maps table data', async () => {
    const reviewRow = {
      id: 'review-10',
      created_at: '2024-04-01T00:00:00.000Z',
      modified_at: '2024-04-03T00:00:00.000Z',
      deadline: null,
      comments: [{ state_code: 1 }],
      json: {
        data: {
          id: 'process-2',
          version: '01.00.000',
          name: {
            baseName: { en: 'Review Base' },
            treatmentStandardsRoutes: { en: 'Review Route' },
            mixAndLocationTypes: { en: 'Review Mix' },
            functionalUnitFlowProperties: { en: 'Review Unit' },
          },
        },
        team: { name: { en: 'Ops Team' } },
        user: { name: 'Alice Reviewer' },
      },
    };
    const builder = createQueryBuilder({ data: [reviewRow], count: 1 });
    mockFrom.mockReturnValueOnce(builder);
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });

    const result = await reviewsApi.getReviewsTableDataOfReviewAdmin(
      { pageSize: 10, current: 2 },
      {},
      'assigned',
      'en',
    );

    expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
    expect(builder.eq).toHaveBeenCalledWith('state_code', 1);
    expect(builder.select).toHaveBeenCalledWith('*, comments(state_code)');
    expect(builder.filter).toHaveBeenCalledWith('comments.state_code', 'gte', 0);
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('page', 2);
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      id: 'review-10',
      comments: [{ state_code: 1 }],
      isFromLifeCycle: false,
      teamName: 'Ops Team',
      userName: 'Alice Reviewer',
      modelData: null,
    });
    expect(result.data[0].name).toContain('Review Base');
  });

  it('returns default empty response when query result has no data field', async () => {
    const builder = createQueryBuilder({ count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewsTableDataOfReviewAdmin(
      { pageSize: 10, current: 1 },
      { modified_at: 'ascend' },
      'admin-rejected',
      'en',
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', -1);
    expect(result).toEqual({ data: [], success: true, total: 0 });
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

    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });

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

  it('returns empty success response when no notifications are found', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const builder = createQueryBuilder({ data: [], count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 0);

    expect(builder.gte).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('returns failure response when query payload is malformed', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const builder = createQueryBuilder({ data: undefined, count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 0);

    expect(result).toEqual({ data: [], success: false, total: 0 });
  });
});

describe('getNotifyReviewsCount', () => {
  it('returns failure response when user is missing', async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const result = await reviewsApi.getNotifyReviewsCount();

    expect(result).toEqual({ success: false, total: 0 });
  });

  it('uses last view time filter when provided', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const builder = createQueryBuilder({ count: 5, error: null });
    mockFrom.mockReturnValueOnce(builder);

    const lastViewTime = new Date('2024-05-01T00:00:00.000Z').getTime();
    const result = await reviewsApi.getNotifyReviewsCount(3, lastViewTime);

    expect(builder.gt).toHaveBeenCalledWith('modified_at', new Date(lastViewTime).toISOString());
    expect(builder.gte).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, total: 5 });
  });

  it('uses time filter and reports failure when query has error', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const builder = createQueryBuilder({ count: null, error: { message: 'db failed' } });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getNotifyReviewsCount(7);

    expect(builder.gte).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, total: 0 });
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

describe('getLifeCycleModelSubTableDataBatch', () => {
  it('returns empty success when input array is empty', async () => {
    const result = await reviewsApi.getLifeCycleModelSubTableDataBatch([], 'en');

    expect(result).toEqual({ data: {}, success: true });
  });

  it('returns empty success when no process references exist in models', async () => {
    const result = await reviewsApi.getLifeCycleModelSubTableDataBatch(
      [
        {
          reviewId: 'review-1',
          modelData: {
            id: 'model-1',
            version: '01.00.000',
            json: {},
            json_tg: {},
          },
        },
      ],
      'en',
    );

    expect(mockGetProcessDetailByIdAndVersion).not.toHaveBeenCalled();
    expect(result).toEqual({ data: {}, success: true });
  });

  it('returns failure when batch process fetch fails', async () => {
    mockGetProcessDetailByIdAndVersion.mockResolvedValueOnce({ success: false, data: null });

    const result = await reviewsApi.getLifeCycleModelSubTableDataBatch(
      [
        {
          reviewId: 'review-1',
          modelData: {
            id: 'model-1',
            version: '01.00.000',
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  technology: {
                    processes: {
                      processInstance: [
                        {
                          referenceToProcess: {
                            '@refObjectId': 'process-1',
                            '@version': '01.00.000',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            json_tg: {},
          },
        },
      ],
      'en',
    );

    expect(mockGetProcessDetailByIdAndVersion).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: {}, success: false });
  });

  it('groups process details by review and removes duplicate process entries', async () => {
    mockGetProcessDetailByIdAndVersion.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'process-1',
          version: '01.00.000',
          state_code: 20,
          json: {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Process 1' },
                    treatmentStandardsRoutes: { en: 'Route 1' },
                    mixAndLocationTypes: { en: 'Mix 1' },
                    functionalUnitFlowProperties: { en: 'Unit 1' },
                  },
                },
              },
            },
          },
        },
        {
          id: 'process-2',
          version: '01.00.000',
          state_code: 20,
          json: {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Process 2' },
                    treatmentStandardsRoutes: { en: 'Route 2' },
                    mixAndLocationTypes: { en: 'Mix 2' },
                    functionalUnitFlowProperties: { en: 'Unit 2' },
                  },
                },
              },
            },
          },
        },
        {
          id: 'process-3',
          version: '02.00.000',
          state_code: 10,
          json: {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Process 3' },
                    treatmentStandardsRoutes: { en: 'Route 3' },
                    mixAndLocationTypes: { en: 'Mix 3' },
                    functionalUnitFlowProperties: { en: 'Unit 3' },
                  },
                },
              },
            },
          },
        },
      ],
    });

    const result = await reviewsApi.getLifeCycleModelSubTableDataBatch(
      [
        {
          reviewId: 'review-a',
          modelData: {
            id: 'model-1',
            version: '01.00.000',
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  technology: {
                    processes: {
                      processInstance: [
                        {
                          referenceToProcess: {
                            '@refObjectId': 'process-1',
                            '@version': '01.00.000',
                          },
                        },
                        {
                          referenceToProcess: {
                            '@refObjectId': 'process-1',
                            '@version': '01.00.000',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            json_tg: {
              submodels: [{ id: 'process-2', type: 'secondary' }],
            },
          },
        },
        {
          reviewId: 'review-b',
          modelData: {
            id: 'model-2',
            version: '02.00.000',
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  technology: {
                    processes: {
                      processInstance: [
                        {
                          referenceToProcess: {
                            '@refObjectId': 'process-1',
                            '@version': '01.00.000',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            json_tg: {
              submodels: [{ id: 'process-3', type: 'primary' }],
            },
          },
        },
      ],
      'en',
    );

    const processParams = mockGetProcessDetailByIdAndVersion.mock.calls[0][0];
    expect(processParams).toHaveLength(3);
    expect(processParams).toEqual(
      expect.arrayContaining([
        { id: 'process-1', version: '01.00.000' },
        { id: 'process-2', version: '01.00.000' },
        { id: 'process-3', version: '02.00.000' },
      ]),
    );
    expect(result.success).toBe(true);
    expect(result.data['review-a']).toHaveLength(2);
    expect(result.data['review-b']).toHaveLength(1);
    expect(result.data['review-a'].find((it: any) => it.id === 'process-2')).toMatchObject({
      id: 'process-2',
      sourceType: 'submodel',
      submodelType: 'secondary',
    });
    expect(result.data['review-a'].find((it: any) => it.id === 'process-1')?.sourceType).toBe(
      'processInstance',
    );
    expect(result.data['review-a'][0].name).toContain('Process');
  });
});
