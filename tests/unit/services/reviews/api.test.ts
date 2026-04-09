/**
 * Tests for reviews service API functions
 * Path: src/services/reviews/api.ts
 */

const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockInvokeDatasetCommand = jest.fn();
const mockRpc = jest.fn();

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
    rpc: (...args: any[]) => mockRpc.apply(null, args),
  },
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  createLegacyMutationRemovedError: (boundary: string) => ({
    message: 'Use explicit command endpoints instead',
    code: 'LEGACY_ENDPOINT_REMOVED',
    details: boundary,
    hint: '',
  }),
  invokeDatasetCommand: (...args: any[]) => mockInvokeDatasetCommand.apply(null, args),
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
const mockGenProcessName = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetailByIdAndVersion: (...args: any[]) =>
    mockGetProcessDetailByIdAndVersion.apply(null, args),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessName: (...args: any[]) => mockGenProcessName.apply(null, args),
}));

const mockGetLangText = jest.fn();

jest.mock('@/services/general/util', () => {
  return {
    __esModule: true,
    getLangText: (...args: any[]) => mockGetLangText.apply(null, args),
  };
});

const mockGetUserId = jest.fn();
let realGenProcessName: (...args: any[]) => any;

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
  realGenProcessName = jest.requireActual('@/services/processes/util').genProcessName;
});

beforeEach(() => {
  mockFrom.mockReset();
  mockAuthGetSession.mockReset();
  mockAuthGetSession.mockResolvedValue({
    data: {
      session: {
        user: { id: 'user-default' },
        access_token: 'access-token',
      },
    },
  });
  mockFunctionsInvoke.mockReset();
  mockInvokeDatasetCommand.mockReset();
  mockRpc.mockReset();
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
  mockGenProcessName.mockReset();
  mockGenProcessName.mockImplementation((...args: any[]) => realGenProcessName(...args));
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
  mockGetUserId.mockReset();
  mockGetUserId.mockResolvedValue('user-default');
});

afterEach(() => {
  jest.useRealTimers();
});

describe('addReviewsApi', () => {
  it('returns a structured deprecation error', async () => {
    const payload = { json: { foo: 'bar' } };
    const result = await reviewsApi.addReviewsApi('review-1', payload);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: {
        message: 'Use explicit command endpoints instead',
        code: 'LEGACY_ENDPOINT_REMOVED',
        details: 'addReviewsApi',
        hint: '',
      },
    });
  });
});

describe('submitDatasetReviewApi', () => {
  it('delegates review submission to the dataset command boundary', async () => {
    const commandResult = {
      data: [{ review: { id: 'review-1' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    mockInvokeDatasetCommand.mockResolvedValue(commandResult);

    const result = await reviewsApi.submitDatasetReviewApi(
      'processes',
      '11111111-1111-4111-8111-111111111111',
      '01.00.000',
    );

    expect(mockInvokeDatasetCommand).toHaveBeenCalledWith('app_dataset_submit_review', {
      id: '11111111-1111-4111-8111-111111111111',
      version: '01.00.000',
      table: 'processes',
    });
    expect(result).toBe(commandResult);
  });
});

describe('review workflow command wrappers', () => {
  it('saves reviewer assignment drafts through the admin review command', async () => {
    mockInvokeDatasetCommand
      .mockResolvedValueOnce({
        data: [{ review: { id: 'review-1' } }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      })
      .mockResolvedValueOnce({
        data: [{ review: { id: 'review-2' } }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

    const result = await reviewsApi.saveReviewAssignmentDraftApi(
      ['review-1', 'review-2'],
      ['user-1', 'user-2'],
    );

    expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(
      1,
      'admin_review_save_assignment_draft',
      {
        reviewId: 'review-1',
        reviewerIds: ['user-1', 'user-2'],
      },
    );
    expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(
      2,
      'admin_review_save_assignment_draft',
      {
        reviewId: 'review-2',
        reviewerIds: ['user-1', 'user-2'],
      },
    );
    expect(result).toEqual({
      data: [{ review: { id: 'review-1' } }, { review: { id: 'review-2' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });

  it('assigns reviewers with an explicit deadline through the admin review command', async () => {
    const commandResult = {
      data: [{ review: { id: 'review-1' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    mockInvokeDatasetCommand.mockResolvedValue(commandResult);

    const result = await reviewsApi.assignReviewersApi(
      ['review-1'],
      ['user-3'],
      '2026-04-10T12:00:00.000Z',
    );

    expect(mockInvokeDatasetCommand).toHaveBeenCalledWith('admin_review_assign_reviewers', {
      reviewId: 'review-1',
      reviewerIds: ['user-3'],
      deadline: '2026-04-10T12:00:00.000Z',
    });
    expect(result).toEqual(commandResult);
  });

  it('assigns reviewers with a null deadline when none is provided', async () => {
    const commandResult = {
      data: [{ review: { id: 'review-1' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    mockInvokeDatasetCommand.mockResolvedValue(commandResult);

    await reviewsApi.assignReviewersApi(['review-1'], ['user-3']);

    expect(mockInvokeDatasetCommand).toHaveBeenCalledWith('admin_review_assign_reviewers', {
      reviewId: 'review-1',
      reviewerIds: ['user-3'],
      deadline: null,
    });
  });

  it('returns the first batch error while flattening null command data', async () => {
    mockInvokeDatasetCommand
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'assignment failed' },
        count: null,
        status: 409,
        statusText: 'CONFLICT',
      });

    const result = await reviewsApi.saveReviewAssignmentDraftApi(
      ['review-1', 'review-2'],
      ['user-1'],
    );

    expect(result).toEqual({
      data: [],
      error: { message: 'assignment failed' },
      count: null,
      status: 409,
      statusText: 'CONFLICT',
    });
  });

  it('assigns reviewers with a null deadline and flattens empty batch payload rows', async () => {
    mockInvokeDatasetCommand
      .mockResolvedValueOnce({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      })
      .mockResolvedValueOnce({
        data: [{ review: { id: 'review-2' } }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

    const result = await reviewsApi.assignReviewersApi(['review-1', 'review-2'], ['user-9']);

    expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(1, 'admin_review_assign_reviewers', {
      reviewId: 'review-1',
      reviewerIds: ['user-9'],
      deadline: null,
    });
    expect(result).toEqual({
      data: [{ review: { id: 'review-2' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });

  it('revokes reviewers through the admin review command', async () => {
    const commandResult = {
      data: [{ review: { id: 'review-1' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    mockInvokeDatasetCommand.mockResolvedValue(commandResult);

    const result = await reviewsApi.revokeReviewerApi('review-1', 'user-9');

    expect(mockInvokeDatasetCommand).toHaveBeenCalledWith('admin_review_revoke_reviewer', {
      reviewId: 'review-1',
      reviewerId: 'user-9',
    });
    expect(result).toEqual(commandResult);
  });

  it('approves and rejects reviews through the admin review commands', async () => {
    const approveResult = {
      data: [{ review: { id: 'review-1' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    const rejectResult = {
      data: [{ review: { id: 'review-1' } }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    mockInvokeDatasetCommand
      .mockResolvedValueOnce(approveResult)
      .mockResolvedValueOnce(rejectResult);

    const approve = await reviewsApi.approveReviewApi('review-1', 'processes');
    const reject = await reviewsApi.rejectReviewApi('review-1', 'lifecyclemodels', 'Needs fixes');

    expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(1, 'admin_review_approve', {
      reviewId: 'review-1',
      table: 'processes',
    });
    expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(2, 'admin_review_reject', {
      reviewId: 'review-1',
      table: 'lifecyclemodels',
      reason: 'Needs fixes',
    });
    expect(approve).toEqual(approveResult);
    expect(reject).toEqual(rejectResult);
  });
});

describe('updateReviewApi', () => {
  it('returns a structured deprecation error without calling legacy edge handlers', async () => {
    const result = await reviewsApi.updateReviewApi(['review-1'], { reviewer_id: ['user-1'] });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: {
        message: 'Use explicit command endpoints instead',
        code: 'LEGACY_ENDPOINT_REMOVED',
        details: 'updateReviewApi',
        hint: '',
      },
    });
  });
});

describe('getReviewerIdsApi', () => {
  it('returns deduplicated reviewer ids when supabase responds with multiple rows', async () => {
    const supabaseResult = {
      data: [{ reviewer_id: ['user-1', 'user-2'] }, { reviewer_id: ['user-2', 'user-3'] }],
    };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewerIdsApi(['review-1', 'review-2']);

    expect(mockFrom).toHaveBeenCalledWith('reviews');
    expect(builder.select).toHaveBeenCalledWith('reviewer_id');
    expect(builder.in).toHaveBeenCalledWith('id', ['review-1', 'review-2']);
    expect(result).toEqual(['user-1', 'user-2', 'user-3']);
  });

  it('returns empty array when supabase payload is missing', async () => {
    const builder = createQueryBuilder({ data: null });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewerIdsApi(['review-1']);

    expect(result).toEqual([]);
  });

  it('ignores reviewer rows whose reviewer_id is not an array', async () => {
    const builder = createQueryBuilder({
      data: [{ reviewer_id: ['user-1'] }, { reviewer_id: 'user-2' }, { reviewer_id: null }, {}],
    });
    mockFrom.mockReturnValueOnce(builder);

    const result = await reviewsApi.getReviewerIdsApi(['review-1']);

    expect(result).toEqual(['user-1']);
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

  it('resolves pending comments with getUserId when userData is omitted', async () => {
    mockGetUserId.mockResolvedValueOnce('pending-reviewer');
    mockGetPendingComment.mockResolvedValueOnce({ data: [], error: null });

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 1 },
      {},
      'pending',
      'en',
    );

    expect(mockGetPendingComment).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'pending-reviewer',
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

  it('falls back to review payload fields when no lifecycle model matches', async () => {
    mockGetUserId.mockResolvedValueOnce('reviewer-fallback');
    mockGetReviewedComment.mockResolvedValueOnce({
      data: [
        {
          reviews: {
            id: 'review-fallback',
            created_at: '2024-06-01T00:00:00.000Z',
            modified_at: '2024-06-02T00:00:00.000Z',
            json: {
              data: {
                id: 'process-fallback',
                version: '02.00.000',
                name: {
                  baseName: { en: 'Fallback Base' },
                  treatmentStandardsRoutes: { en: 'Fallback Route' },
                  mixAndLocationTypes: { en: 'Fallback Mix' },
                  functionalUnitFlowProperties: { en: 'Fallback Unit' },
                },
              },
              user: { email: 'fallback@example.com' },
            },
          },
        },
      ],
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      {} as any,
      {},
      'reviewed',
      'en',
    );

    expect(mockGetReviewedComment).toHaveBeenCalledWith({} as any, {}, 'reviewer-fallback');
    expect(result).toEqual({
      data: [
        {
          key: 'review-fallback',
          id: 'review-fallback',
          isFromLifeCycle: false,
          name: 'Fallback Base; Fallback Route; Fallback Mix; Fallback Unit',
          teamName: '-',
          userName: 'fallback@example.com',
          createAt: '2024-06-01T00:00:00.000Z',
          modifiedAt: '2024-06-02T00:00:00.000Z',
          deadline: undefined,
          json: {
            data: {
              id: 'process-fallback',
              version: '02.00.000',
              name: {
                baseName: { en: 'Fallback Base' },
                treatmentStandardsRoutes: { en: 'Fallback Route' },
                mixAndLocationTypes: { en: 'Fallback Mix' },
                functionalUnitFlowProperties: { en: 'Fallback Unit' },
              },
            },
            user: { email: 'fallback@example.com' },
          },
          modelData: null,
        },
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('uses lifecycle fallbacks and missing-user placeholders for reviewer-rejected rows', async () => {
    mockGetUserId.mockResolvedValueOnce('reviewer-fallback');
    mockGetRejectedComment.mockResolvedValueOnce({
      data: [
        {
          reviews: {
            id: 'review-rejected-fallback',
            created_at: '2024-07-01T00:00:00.000Z',
            modified_at: '2024-07-02T00:00:00.000Z',
            json: {
              data: {
                id: 'process-model-fallback',
                version: '01.00.000',
              },
              user: {},
            },
          },
        },
      ],
      count: 1,
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'process-model-fallback',
          version: '01.00.000',
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {},
              },
            },
          },
          json_tg: { version: 'tg-fallback' },
        },
      ],
    });

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 1 },
      {},
      'reviewer-rejected',
      'en',
    );

    expect(mockGetRejectedComment).toHaveBeenCalledWith(
      { pageSize: 10, current: 1 },
      {},
      'reviewer-fallback',
    );
    expect(result.data[0]).toMatchObject({
      isFromLifeCycle: true,
      name: '-',
      userName: '-',
    });
  });

  it('falls back to "-" when a matched lifecycle model name resolves to an empty process name', async () => {
    mockGetReviewedComment.mockResolvedValueOnce({
      data: [
        {
          reviews: {
            id: 'review-member-empty-model-name',
            created_at: '2024-07-01T00:00:00.000Z',
            modified_at: '2024-07-02T00:00:00.000Z',
            json: { data: { id: 'model-process', version: '01.00.000' }, user: { email: 'x@y.z' } },
          },
        },
      ],
      count: 1,
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'model-process',
          version: '01.00.000',
          json: {
            lifeCycleModelDataSet: { lifeCycleModelInformation: { dataSetInformation: {} } },
          },
        },
      ],
    });
    mockGenProcessName.mockReturnValueOnce('');

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 1 },
      {},
      'reviewed',
      'en',
      { user_id: 'reviewer-1' },
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(result.data[0].name).toBe('-');
  });

  it('falls back to "-" when a non-lifecycle review row has no process name payload', async () => {
    mockGetReviewedComment.mockResolvedValueOnce({
      data: [
        {
          reviews: {
            id: 'review-member-empty-review-name',
            created_at: '2024-07-01T00:00:00.000Z',
            modified_at: '2024-07-02T00:00:00.000Z',
            json: { data: { id: 'plain-process', version: '01.00.000' }, user: { email: 'x@y.z' } },
          },
        },
      ],
      count: 1,
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });
    mockGenProcessName.mockReturnValueOnce('');

    const result = await reviewsApi.getReviewsTableDataOfReviewMember(
      { pageSize: 10, current: 1 },
      {},
      'reviewed',
      'en',
      { user_id: 'reviewer-1' },
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(result.data[0].name).toBe('-');
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
      comments: [{ state_code: 1 }, { state_code: -3 }, { state_code: -2 }],
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
    expect(builder.filter).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('page', 2);
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      id: 'review-10',
      comments: [{ state_code: 1 }, { state_code: -3 }],
      isFromLifeCycle: false,
      teamName: 'Ops Team',
      userName: 'Alice Reviewer',
      modelData: null,
    });
    expect(result.data[0].name).toContain('Review Base');
  });

  it('falls back to an empty comments array when assigned review comments are not arrays', async () => {
    const reviewRow = {
      id: 'review-10-no-array-comments',
      created_at: '2024-04-01T00:00:00.000Z',
      modified_at: '2024-04-03T00:00:00.000Z',
      deadline: null,
      comments: { state_code: 1 },
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
      { pageSize: 10, current: 1 },
      {},
      'assigned',
      'en',
    );

    expect(result.data[0]).toMatchObject({
      id: 'review-10-no-array-comments',
      comments: [],
      isFromLifeCycle: false,
    });
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

  it('maps admin-rejected rows with lifecycle model metadata and fallbacks', async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: 'review-admin-model',
          created_at: '2024-06-01T00:00:00.000Z',
          modified_at: '2024-06-03T00:00:00.000Z',
          deadline: '2024-06-20T00:00:00.000Z',
          comments: [],
          json: {
            data: {
              id: 'model-backed-process',
              version: '03.00.000',
              name: {
                baseName: { en: 'Unused Base' },
                treatmentStandardsRoutes: { en: 'Unused Route' },
                mixAndLocationTypes: { en: 'Unused Mix' },
                functionalUnitFlowProperties: { en: 'Unused Unit' },
              },
            },
            user: { email: 'admin-fallback@example.com' },
          },
        },
      ],
    });
    mockFrom.mockReturnValueOnce(builder);
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'model-backed-process',
          version: '03.00.000',
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Model Admin Base' },
                    treatmentStandardsRoutes: { en: 'Model Admin Route' },
                    mixAndLocationTypes: { en: 'Model Admin Mix' },
                    functionalUnitFlowProperties: { en: 'Model Admin Unit' },
                  },
                },
              },
            },
          },
          json_tg: { version: 'tg-admin' },
        },
      ],
    });

    const result = await reviewsApi.getReviewsTableDataOfReviewAdmin(
      {} as any,
      {},
      'admin-rejected',
      'en',
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', -1);
    expect(result).toEqual({
      data: [
        {
          key: 'review-admin-model',
          id: 'review-admin-model',
          isFromLifeCycle: true,
          name: 'Model Admin Base; Model Admin Route; Model Admin Mix; Model Admin Unit',
          teamName: '-',
          userName: 'admin-fallback@example.com',
          createAt: '2024-06-01T00:00:00.000Z',
          modifiedAt: '2024-06-03T00:00:00.000Z',
          deadline: '2024-06-20T00:00:00.000Z',
          json: {
            data: {
              id: 'model-backed-process',
              version: '03.00.000',
              name: {
                baseName: { en: 'Unused Base' },
                treatmentStandardsRoutes: { en: 'Unused Route' },
                mixAndLocationTypes: { en: 'Unused Mix' },
                functionalUnitFlowProperties: { en: 'Unused Unit' },
              },
            },
            user: { email: 'admin-fallback@example.com' },
          },
          comments: [],
          modelData: {
            id: 'model-backed-process',
            version: '03.00.000',
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {
                    name: {
                      baseName: { en: 'Model Admin Base' },
                      treatmentStandardsRoutes: { en: 'Model Admin Route' },
                      mixAndLocationTypes: { en: 'Model Admin Mix' },
                      functionalUnitFlowProperties: { en: 'Model Admin Unit' },
                    },
                  },
                },
              },
            },
            json_tg: { version: 'tg-admin' },
          },
        },
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('uses lifecycle and user fallbacks for admin rows when names are missing', async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: 'review-admin-fallback',
          created_at: '2024-08-01T00:00:00.000Z',
          modified_at: '2024-08-02T00:00:00.000Z',
          json: {
            data: {
              id: 'model-admin-fallback',
              version: '09.00.000',
            },
            user: {},
          },
          comments: [],
        },
      ],
    });
    mockFrom.mockReturnValueOnce(builder);
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'model-admin-fallback',
          version: '09.00.000',
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {},
              },
            },
          },
        },
      ],
    });

    const result = await reviewsApi.getReviewsTableDataOfReviewAdmin(
      { pageSize: 10, current: 1 },
      {},
      'admin-rejected',
      'en',
    );

    expect(result.data[0]).toMatchObject({
      isFromLifeCycle: true,
      name: '-',
      userName: '-',
    });
  });

  it('falls back to "-" when a non-lifecycle admin row has no process name payload', async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: 'review-admin-empty-review-name',
          created_at: '2024-08-01T00:00:00.000Z',
          modified_at: '2024-08-02T00:00:00.000Z',
          json: {
            data: { id: 'plain-admin-process', version: '01.00.000' },
            user: { email: 'x@y.z' },
          },
          comments: [],
        },
      ],
    });
    mockFrom.mockReturnValueOnce(builder);
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });
    mockGenProcessName.mockReturnValueOnce('');

    const result = await reviewsApi.getReviewsTableDataOfReviewAdmin(
      { pageSize: 10, current: 1 },
      {},
      'admin-rejected',
      'en',
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(result.data[0].name).toBe('-');
  });
});

describe('getNotifyReviews', () => {
  it('returns failure response when session is missing', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en');

    expect(result).toEqual({ data: [], success: false, total: 0 });
  });

  it('loads notifications from qry_notification_get_my_data_items', async () => {
    mockRpc.mockResolvedValueOnce({
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
          total_count: 1,
        },
      ],
      error: null,
    });

    const result = await reviewsApi.getNotifyReviews({ pageSize: 5, current: 3 }, 'en', 3);

    expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_data_items', {
      p_page: 3,
      p_page_size: 5,
      p_days: 3,
    });
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
        },
      ],
      page: 3,
      success: true,
      total: 1,
    });
  });

  it('returns empty success response when no notifications are found', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 0);

    expect(result).toEqual({ data: [], success: true, total: 0 });
  });

  it('returns failure response when rpc payload is malformed', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 0);

    expect(result).toEqual({ data: [], success: false, total: 0 });
  });

  it('maps lifecycle-backed notifications with page and total fallbacks', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'review-notify-model',
          json: {
            data: {
              id: 'process-notify-model',
              version: '04.00.000',
              name: {
                baseName: { en: 'Unused Notify Base' },
                treatmentStandardsRoutes: { en: 'Unused Notify Route' },
                mixAndLocationTypes: { en: 'Unused Notify Mix' },
                functionalUnitFlowProperties: { en: 'Unused Notify Unit' },
              },
            },
            user: {},
          },
          modified_at: '2024-06-05T12:00:00.000Z',
          state_code: 2,
          total_count: 1,
        },
      ],
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'process-notify-model',
          version: '04.00.000',
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Notify Model Base' },
                    treatmentStandardsRoutes: { en: 'Notify Model Route' },
                    mixAndLocationTypes: { en: 'Notify Model Mix' },
                    functionalUnitFlowProperties: { en: 'Notify Model Unit' },
                  },
                },
              },
            },
          },
        },
      ],
    });

    const result = await reviewsApi.getNotifyReviews({} as any, 'en', 0);

    expect(result).toEqual({
      data: [
        {
          key: 'review-notify-model',
          id: 'review-notify-model',
          isFromLifeCycle: true,
          name: 'Notify Model Base; Notify Model Route; Notify Model Mix; Notify Model Unit',
          teamName: '-',
          userName: '-',
          modifiedAt: '2024-06-05T12:00:00.000Z',
          stateCode: 2,
          json: {
            data: {
              id: 'process-notify-model',
              version: '04.00.000',
              name: {
                baseName: { en: 'Unused Notify Base' },
                treatmentStandardsRoutes: { en: 'Unused Notify Route' },
                mixAndLocationTypes: { en: 'Unused Notify Mix' },
                functionalUnitFlowProperties: { en: 'Unused Notify Unit' },
              },
            },
            user: {},
          },
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
  });

  it('uses review payload fallbacks and missing-user placeholders when no model matches', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'review-notify-fallback',
          json: {
            data: {
              id: 'process-notify-fallback',
              version: '05.00.000',
            },
            user: {},
          },
          modified_at: '2024-06-06T12:00:00.000Z',
          state_code: 1,
          total_count: 1,
        },
      ],
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 0);

    expect(result.data[0]).toMatchObject({
      isFromLifeCycle: false,
      name: '-',
      userName: '-',
    });
  });

  it('falls back to "-" when a matched notification lifecycle model name resolves empty', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'review-notify-empty-model-name',
          json: { data: { id: 'notify-model', version: '01.00.000' }, user: { email: 'x@y.z' } },
          modified_at: '2024-06-06T12:00:00.000Z',
          state_code: 1,
          total_count: 1,
        },
      ],
      error: null,
    });
    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'notify-model',
          version: '01.00.000',
          json: {
            lifeCycleModelDataSet: { lifeCycleModelInformation: { dataSetInformation: {} } },
          },
        },
      ],
    });
    mockGenProcessName.mockReturnValueOnce('');

    const result = await reviewsApi.getNotifyReviews({ pageSize: 10, current: 1 }, 'en', 0);

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(result.data[0].name).toBe('-');
  });

  it('uses default paging and zero totals when notification rows omit total_count', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'review-notify-no-total',
          json: {
            data: {
              id: 'process-notify-no-total',
              version: '06.00.000',
            },
            user: {},
          },
          modified_at: '2024-06-07T12:00:00.000Z',
          state_code: 3,
        },
      ],
      error: null,
    });

    mockGetLifeCyclesByIdAndVersion.mockResolvedValueOnce({ data: [] });

    const result = await reviewsApi.getNotifyReviews({} as any, 'en', 0);

    expect(result).toEqual({
      data: [
        {
          key: 'review-notify-no-total',
          id: 'review-notify-no-total',
          isFromLifeCycle: false,
          name: '-',
          teamName: '-',
          userName: '-',
          modifiedAt: '2024-06-07T12:00:00.000Z',
          stateCode: 3,
          json: {
            data: {
              id: 'process-notify-no-total',
              version: '06.00.000',
            },
            user: {},
          },
        },
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });
});

describe('getNotifyReviewsCount', () => {
  it('returns failure response when session is missing', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const result = await reviewsApi.getNotifyReviewsCount();

    expect(result).toEqual({ success: false, total: 0 });
  });

  it('uses qry_notification_get_my_data_count with the last view time filter', async () => {
    mockRpc.mockResolvedValueOnce({ data: 5, error: null });

    const lastViewTime = new Date('2024-05-01T00:00:00.000Z').getTime();
    const result = await reviewsApi.getNotifyReviewsCount(3, lastViewTime);

    expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_data_count', {
      p_days: 3,
      p_last_view_at: new Date(lastViewTime).toISOString(),
    });
    expect(result).toEqual({ success: true, total: 5 });
  });

  it('reports rpc errors as failed notification counts', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db failed' } });

    const result = await reviewsApi.getNotifyReviewsCount(7);

    expect(result).toEqual({ success: false, total: 0 });
  });

  it('returns success without a last view timestamp when filters are disabled', async () => {
    mockRpc.mockResolvedValueOnce({ data: 2, error: null });

    const result = await reviewsApi.getNotifyReviewsCount(0);

    expect(mockRpc).toHaveBeenCalledWith('qry_notification_get_my_data_count', {
      p_days: 0,
      p_last_view_at: null,
    });
    expect(result).toEqual({ success: true, total: 2 });
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

  it('skips empty model entries and keeps valid grouped process rows', async () => {
    mockGetProcessDetailByIdAndVersion.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'process-valid',
          version: '01.00.000',
          state_code: 20,
          json: {
            processDataSet: {
              processInformation: {
                dataSetInformation: {},
              },
            },
          },
        },
      ],
    });

    const result = await reviewsApi.getLifeCycleModelSubTableDataBatch(
      [
        {
          reviewId: 'review-empty',
          modelData: null as any,
        },
        {
          reviewId: 'review-valid',
          modelData: {
            id: 'model-valid',
            version: '01.00.000',
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  technology: {
                    processes: {
                      processInstance: [
                        {
                          referenceToProcess: {
                            '@refObjectId': 'process-valid',
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

    expect(mockGetProcessDetailByIdAndVersion).toHaveBeenCalledWith([
      { id: 'process-valid', version: '01.00.000' },
    ]);
    expect(result).toEqual({
      data: {
        'review-valid': [
          {
            key: 'process-valid',
            id: 'process-valid',
            version: '01.00.000',
            name: '-',
            sourceType: 'processInstance',
            submodelType: undefined,
          },
        ],
      },
      success: true,
    });
  });

  it('ignores returned process rows that do not belong to any requested review key', async () => {
    mockGetProcessDetailByIdAndVersion.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'unexpected-process',
          version: '77.00.000',
          state_code: 20,
          json: {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  name: {
                    baseName: { en: 'Unexpected Base' },
                    treatmentStandardsRoutes: { en: 'Unexpected Route' },
                    mixAndLocationTypes: { en: 'Unexpected Mix' },
                    functionalUnitFlowProperties: { en: 'Unexpected Unit' },
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

    expect(result).toEqual({ data: {}, success: true });
  });
});
