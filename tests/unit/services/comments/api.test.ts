/**
 * Tests for comments service API functions
 * Path: src/services/comments/api.ts
 *
 * Coverage focuses on:
 * - Comment CRUD operations (used in review workflow)
 * - Reviewer-specific comment updates (used in review progress tracking)
 * - Comment retrieval by review type (used in assigned/review tabs)
 * - Review state queries (used in comment filtering)
 */

import {
  addCommentApi,
  getCommentApi,
  getPendingComment,
  getRejectedComment,
  getRejectedCommentsByReviewIds,
  getReviewedComment,
  getReviewerIdsByReviewId,
  getUserManageComments,
  saveReviewCommentDraftApi,
  submitReviewCommentApi,
  updateCommentApi,
  updateCommentByreviewerApi,
} from '@/services/comments/api';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('@/services/users/api', () => ({
  getUserId: jest.fn(),
}));

jest.mock('@/services/general/api', () => ({
  createLegacyMutationRemovedError: (boundary: string) => ({
    message: 'Use explicit command endpoints instead',
    code: 'LEGACY_ENDPOINT_REMOVED',
    details: boundary,
    hint: '',
  }),
  invokeDatasetCommand: jest.fn(),
}));

const {
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
    functions: { invoke: mockFunctionsInvoke },
  },
} = jest.requireMock('@/services/supabase');

const { getUserId: mockGetUserId } = jest.requireMock('@/services/users/api');
const { invokeDatasetCommand: mockInvokeDatasetCommand } =
  jest.requireMock('@/services/general/api');

const createPagedCommentsQueryBuilder = (resolvedValue: any) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue(resolvedValue),
  };
  return builder;
};

describe('Comments API service (src/services/comments/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('review workflow comment command wrappers', () => {
    it('saves comment drafts through the review command boundary', async () => {
      const commandResult = {
        data: [{ comment: { review_id: 'review-123' } }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      mockInvokeDatasetCommand.mockResolvedValue(commandResult);

      const result = await saveReviewCommentDraftApi('review-123', { foo: 'bar' });

      expect(mockInvokeDatasetCommand).toHaveBeenCalledWith('app_review_save_comment_draft', {
        reviewId: 'review-123',
        json: { foo: 'bar' },
      });
      expect(result).toEqual(commandResult);
    });

    it('submits review comments and forwards reviewer reject state when provided', async () => {
      const submitResult = {
        data: [{ comment: { review_id: 'review-123' } }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      mockInvokeDatasetCommand
        .mockResolvedValueOnce(submitResult)
        .mockResolvedValueOnce(submitResult);

      const defaultSubmit = await submitReviewCommentApi('review-123', { summary: 'ok' });
      const rejectSubmit = await submitReviewCommentApi(
        'review-123',
        { comment: { message: 'reject' } },
        -3,
      );

      expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(1, 'app_review_submit_comment', {
        reviewId: 'review-123',
        json: { summary: 'ok' },
      });
      expect(mockInvokeDatasetCommand).toHaveBeenNthCalledWith(2, 'app_review_submit_comment', {
        reviewId: 'review-123',
        json: { comment: { message: 'reject' } },
        commentState: -3,
      });
      expect(defaultSubmit).toEqual(submitResult);
      expect(rejectSubmit).toEqual(submitResult);
    });
  });

  describe('addCommentApi', () => {
    it('returns a structured deprecation error', async () => {
      const mockData = {
        review_id: 'review-123',
        reviewer_id: 'user-123',
        content: 'Test comment',
      };

      const result = await addCommentApi(mockData);

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: {
          message: 'Use explicit command endpoints instead',
          code: 'LEGACY_ENDPOINT_REMOVED',
          details: 'addCommentApi',
          hint: '',
        },
      });
    });
  });

  describe('updateCommentByreviewerApi', () => {
    it('returns a structured deprecation error', async () => {
      const result = await updateCommentByreviewerApi('review-123', 'user-123', {
        content: 'Updated',
      });

      expect(mockFrom).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: {
          message: 'Use explicit command endpoints instead',
          code: 'LEGACY_ENDPOINT_REMOVED',
          details: 'updateCommentByreviewerApi',
          hint: '',
        },
      });
    });
  });

  describe('updateCommentApi', () => {
    it('returns a structured deprecation error without touching legacy edge handlers', async () => {
      const result = await updateCommentApi('review-123', { content: 'Updated' }, 'assigned');

      expect(mockAuthGetSession).not.toHaveBeenCalled();
      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: {
          message: 'Use explicit command endpoints instead',
          code: 'LEGACY_ENDPOINT_REMOVED',
          details: 'updateCommentApi',
          hint: '',
        },
      });
    });
  });

  describe('getCommentApi', () => {
    it('fetches comments for review action type with current user as reviewer', async () => {
      mockGetUserId.mockResolvedValue('current-user-id');

      const mockData = [{ id: 'comment-1', content: 'Comment 1', reviewer_id: 'current-user-id' }];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEqReviewId = jest.fn().mockReturnThis();
      const mockEqReviewerId = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEqReviewId.mockReturnValue({
            eq: mockEqReviewerId,
          }),
        }),
      });

      const result = await getCommentApi('review-123', 'review');

      expect(mockGetUserId).toHaveBeenCalledTimes(1);
      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEqReviewId).toHaveBeenCalledWith('review_id', 'review-123');
      expect(mockEqReviewerId).toHaveBeenCalledWith('reviewer_id', 'current-user-id');
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('returns error when user ID is not available for review action', async () => {
      mockGetUserId.mockResolvedValue('');

      const result = await getCommentApi('review-123', 'review');

      expect(result).toEqual({ error: true, data: [] });
    });

    it('fetches admin-rejected comments without narrowing to the current reviewer', async () => {
      mockGetUserId.mockResolvedValue('current-user-id');

      const mockData = [{ id: 'comment-1', content: 'Admin rejected' }];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEqReviewId = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEqReviewId,
        }),
      });

      const result = await getCommentApi('review-123', 'admin-rejected');

      expect(mockGetUserId).toHaveBeenCalledTimes(1);
      expect(mockEqReviewId).toHaveBeenCalledWith('review_id', 'review-123');
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('treats reviewer-rejected comments the same as review comments for reviewer filtering', async () => {
      mockGetUserId.mockResolvedValue('current-user-id');

      const mockData = [{ id: 'comment-2', content: 'Rejected by reviewer' }];
      const mockSelect = jest.fn().mockReturnThis();
      const mockEqReviewId = jest.fn().mockReturnThis();
      const mockEqReviewerId = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEqReviewId.mockReturnValue({
            eq: mockEqReviewerId,
          }),
        }),
      });

      const result = await getCommentApi('review-123', 'reviewer-rejected');

      expect(mockEqReviewerId).toHaveBeenCalledWith('reviewer_id', 'current-user-id');
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('fetches all comments for assigned action type', async () => {
      const mockData = [
        { id: 'comment-1', content: 'Comment 1' },
        { id: 'comment-2', content: 'Comment 2' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEqReviewId = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEqReviewId,
        }),
      });

      const result = await getCommentApi('review-123', 'assigned');

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEqReviewId).toHaveBeenCalledWith('review_id', 'review-123');
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('returns error for invalid action type', async () => {
      const result = await getCommentApi('review-123', 'invalid' as any);

      expect(result).toEqual({ data: [], error: true });
    });
  });

  describe('getReviewedComment', () => {
    it('fetches reviewed comments for current user', async () => {
      mockGetUserId.mockResolvedValue('current-user-id');

      const mockData = [{ review_id: 'review-1' }, { review_id: 'review-2' }];

      const supabaseResult = { data: mockData, error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getReviewedComment();

      expect(mockGetUserId).toHaveBeenCalledTimes(1);
      expect(builder.select).toHaveBeenCalledWith('review_id, reviews!inner(*)', {
        count: 'exact',
      });
      expect(builder.eq).toHaveBeenCalledWith('reviewer_id', 'current-user-id');
      expect(builder.in).toHaveBeenCalledWith('state_code', [1, 2, -3]);
      expect(builder.filter).toHaveBeenCalledWith('reviews.state_code', 'gt', 0);
      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual(supabaseResult);
    });

    it('fetches reviewed comments for specific user ID', async () => {
      const supabaseResult = { data: [], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      await getReviewedComment(undefined, undefined, 'specific-user-id');

      expect(mockGetUserId).not.toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('reviewer_id', 'specific-user-id');
      expect(builder.in).toHaveBeenCalledWith('state_code', [1, 2, -3]);
      expect(builder.filter).toHaveBeenCalledWith('reviews.state_code', 'gt', 0);
      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
    });

    it('supports explicit paging and ascending sorting for reviewed comments', async () => {
      const supabaseResult = { data: [{ review_id: 'review-3' }], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getReviewedComment(
        { current: 2, pageSize: 5 },
        { created_at: 'ascend' } as any,
        'specific-user-id',
      );

      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(builder.range).toHaveBeenCalledWith(5, 9);
      expect(result).toEqual(supabaseResult);
    });

    it('returns error when user ID is not available', async () => {
      mockGetUserId.mockResolvedValue('');

      const result = await getReviewedComment();

      expect(result).toEqual({ error: true, data: [] });
    });

    it('falls back to default sort and paging when params or sort contain nullish values', async () => {
      const supabaseResult = { data: [{ review_id: 'review-nullish' }], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getReviewedComment(
        { current: null as any, pageSize: null as any },
        null as any,
        'specific-user-id',
      );

      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual(supabaseResult);
    });
  });

  describe('getPendingComment', () => {
    it('fetches pending comments for current user', async () => {
      mockGetUserId.mockResolvedValue('current-user-id');

      const mockData = [{ review_id: 'review-1' }];

      const supabaseResult = { data: mockData, error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getPendingComment();

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'reviewer_id', 'current-user-id');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'state_code', 0);
      expect(builder.filter).toHaveBeenCalledWith('reviews.state_code', 'gt', 0);
      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual(supabaseResult);
    });

    it('returns error when user ID is not available', async () => {
      mockGetUserId.mockResolvedValue('');

      const result = await getPendingComment();

      expect(result).toEqual({ error: true, data: [] });
    });

    it('supports explicit paging and ascending sorting for pending comments', async () => {
      const supabaseResult = { data: [{ review_id: 'review-pending' }], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getPendingComment(
        { current: 3, pageSize: 2 },
        { created_at: 'ascend' } as any,
        'specific-user-id',
      );

      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(builder.range).toHaveBeenCalledWith(4, 5);
      expect(result).toEqual(supabaseResult);
    });

    it('falls back to default sort when the pending-comments sort input is null', async () => {
      const supabaseResult = { data: [{ review_id: 'review-pending-defaults' }], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getPendingComment({ current: 1, pageSize: 1 }, null as any, 'user-1');

      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 0);
      expect(result).toEqual(supabaseResult);
    });
  });

  describe('getRejectedComment', () => {
    it('fetches rejected comments for the reviewer with paging and sort applied', async () => {
      const supabaseResult = { data: [{ review_id: 'review-rejected' }], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getRejectedComment(
        { current: 2, pageSize: 4 },
        { created_at: 'ascend' } as any,
        'specific-user-id',
      );

      expect(builder.eq).toHaveBeenNthCalledWith(1, 'reviewer_id', 'specific-user-id');
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'state_code', -1);
      expect(builder.eq).toHaveBeenNthCalledWith(3, 'reviews.state_code', -1);
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(builder.range).toHaveBeenCalledWith(4, 7);
      expect(result).toEqual(supabaseResult);
    });

    it('returns error when user ID is not available for rejected comments', async () => {
      mockGetUserId.mockResolvedValue('');

      const result = await getRejectedComment();

      expect(result).toEqual({ error: true, data: [] });
    });

    it('falls back to default sort and paging for rejected comments when inputs are nullish', async () => {
      const supabaseResult = { data: [{ review_id: 'review-rejected-defaults' }], error: null };
      const builder = createPagedCommentsQueryBuilder(supabaseResult);
      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getRejectedComment(
        { current: null as any, pageSize: null as any },
        null as any,
        'specific-user-id',
      );

      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual(supabaseResult);
    });
  });

  describe('getUserManageComments', () => {
    it('fetches all user management comments with specific state codes', async () => {
      const mockData = [
        { review_id: 'review-1', state_code: 0, reviewer_id: 'user-1' },
        { review_id: 'review-2', state_code: 1, reviewer_id: 'user-2' },
      ];

      const mockFilter = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        filter: mockFilter,
      };

      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getUserManageComments();

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(builder.select).toHaveBeenCalledWith(
        'review_id,state_code,reviewer_id,reviews!inner(state_code)',
      );
      expect(builder.in).toHaveBeenCalledWith('state_code', [0, 1, 2]);
      expect(mockFilter).toHaveBeenCalledWith('reviews.state_code', 'gt', 0);
      expect(result).toEqual({ data: mockData, error: null });
    });
  });

  describe('getReviewerIdsByReviewId', () => {
    it('fetches reviewer IDs and state codes for a review', async () => {
      const mockData = [
        { reviewer_id: 'user-1', state_code: 0 },
        { reviewer_id: 'user-2', state_code: 1 },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getReviewerIdsByReviewId('review-123');

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockSelect).toHaveBeenCalledWith('state_code,reviewer_id');
      expect(mockEq).toHaveBeenCalledWith('review_id', 'review-123');
      expect(result).toEqual(mockData);
    });

    it('returns null when data is null', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getReviewerIdsByReviewId('review-123');

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockSelect).toHaveBeenCalledWith('state_code,reviewer_id');
      expect(mockEq).toHaveBeenCalledWith('review_id', 'review-123');
      expect(result).toBeNull();
    });
  });

  describe('getRejectedCommentsByReviewIds', () => {
    it('fetches rejected comment payloads for the provided review ids', async () => {
      const mockResult = {
        data: [{ json: { reason: 'Rejected' } }],
        error: null,
      };
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockResult),
      };

      (mockFrom as jest.Mock).mockReturnValue(builder);

      const result = await getRejectedCommentsByReviewIds(['review-1', 'review-2']);

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(builder.select).toHaveBeenCalledWith('json');
      expect(builder.in).toHaveBeenCalledWith('review_id', ['review-1', 'review-2']);
      expect(builder.eq).toHaveBeenCalledWith('state_code', -1);
      expect(result).toEqual(mockResult);
    });
  });
});
