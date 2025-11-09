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
  getReviewedComment,
  getReviewerIdsByReviewId,
  getUserManageComments,
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

const {
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
    functions: { invoke: mockFunctionsInvoke },
  },
} = jest.requireMock('@/services/supabase');

const { getUserId: mockGetUserId } = jest.requireMock('@/services/users/api');

describe('Comments API service (src/services/comments/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addCommentApi', () => {
    it('inserts a new comment and returns error status', async () => {
      const mockData = {
        review_id: 'review-123',
        reviewer_id: 'user-123',
        content: 'Test comment',
      };

      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({ error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        upsert: mockUpsert.mockReturnValue({
          select: mockSelect,
        }),
      });

      const result = await addCommentApi(mockData);

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockUpsert).toHaveBeenCalledWith(mockData);
      expect(result).toEqual({ error: null });
    });

    it('returns error when upsert fails', async () => {
      const mockError = { message: 'Insert failed' };
      const mockUpsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({ error: mockError });

      (mockFrom as jest.Mock).mockReturnValue({
        upsert: mockUpsert.mockReturnValue({
          select: mockSelect,
        }),
      });

      const result = await addCommentApi({});

      expect(result).toEqual({ error: mockError });
    });
  });

  describe('updateCommentByreviewerApi', () => {
    it('updates comment by reviewer and review IDs', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq1.mockReturnValue({
            eq: mockEq2,
          }),
        }),
      });

      const result = await updateCommentByreviewerApi('review-123', 'user-123', {
        content: 'Updated',
      });

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Updated' });
      expect(mockEq1).toHaveBeenCalledWith('reviewer_id', 'user-123');
      expect(mockEq2).toHaveBeenCalledWith('review_id', 'review-123');
      expect(result).toEqual({ error: null });
    });
  });

  describe('updateCommentApi', () => {
    it('updates comment via edge function with valid session', async () => {
      const mockSession = {
        data: { session: { access_token: 'test-token' } },
      };
      const mockResult = { data: { success: true }, error: null };

      (mockAuthGetSession as jest.Mock).mockResolvedValue(mockSession);
      (mockFunctionsInvoke as jest.Mock).mockResolvedValue(mockResult);

      const result = await updateCommentApi('review-123', { content: 'Updated' }, 'assigned');

      expect(mockAuthGetSession).toHaveBeenCalledTimes(1);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_comment', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          id: 'review-123',
          data: { content: 'Updated' },
          tabType: 'assigned',
        },
        region: 'us-east-1',
      });
      expect(result).toEqual({ success: true });
    });

    it('returns undefined when session is not available', async () => {
      (mockAuthGetSession as jest.Mock).mockResolvedValue({ data: { session: null } });

      const result = await updateCommentApi('review-123', {}, 'review');

      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('logs error when edge function fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockSession = {
        data: { session: { access_token: 'test-token' } },
      };
      const mockError = { message: 'Update failed' };

      (mockAuthGetSession as jest.Mock).mockResolvedValue(mockSession);
      (mockFunctionsInvoke as jest.Mock).mockResolvedValue({
        error: mockError,
        data: null,
      });

      const result = await updateCommentApi('review-123', {}, 'assigned');

      expect(consoleSpy).toHaveBeenCalledWith('error', mockError);
      expect(result).toBeNull();

      consoleSpy.mockRestore();
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

      const mockSelect = jest.fn().mockReturnThis();
      const mockEqReviewerId = jest.fn().mockReturnThis();
      const mockInState = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEqReviewerId.mockReturnValue({
            in: mockInState,
          }),
        }),
      });

      const result = await getReviewedComment();

      expect(mockGetUserId).toHaveBeenCalledTimes(1);
      expect(mockSelect).toHaveBeenCalledWith('review_id');
      expect(mockEqReviewerId).toHaveBeenCalledWith('reviewer_id', 'current-user-id');
      expect(mockInState).toHaveBeenCalledWith('state_code', [1, 2]);
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('fetches reviewed comments for specific user ID', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEqReviewerId = jest.fn().mockReturnThis();
      const mockInState = jest.fn().mockResolvedValue({ data: [], error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEqReviewerId.mockReturnValue({
            in: mockInState,
          }),
        }),
      });

      await getReviewedComment('specific-user-id');

      expect(mockGetUserId).not.toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledWith('review_id');
      expect(mockEqReviewerId).toHaveBeenCalledWith('reviewer_id', 'specific-user-id');
      expect(mockInState).toHaveBeenCalledWith('state_code', [1, 2]);
    });

    it('returns error when user ID is not available', async () => {
      mockGetUserId.mockResolvedValue('');

      const result = await getReviewedComment();

      expect(result).toEqual({ error: true, data: [] });
    });
  });

  describe('getPendingComment', () => {
    it('fetches pending comments for current user', async () => {
      mockGetUserId.mockResolvedValue('current-user-id');

      const mockData = [{ review_id: 'review-1' }];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq1.mockReturnValue({
            eq: mockEq2,
          }),
        }),
      });

      const result = await getPendingComment();

      expect(mockEq2).toHaveBeenCalledWith('state_code', 0);
      expect(result).toEqual({ data: mockData, error: null });
    });

    it('returns error when user ID is not available', async () => {
      mockGetUserId.mockResolvedValue('');

      const result = await getPendingComment();

      expect(result).toEqual({ error: true, data: [] });
    });
  });

  describe('getUserManageComments', () => {
    it('fetches all user management comments with specific state codes', async () => {
      const mockData = [
        { review_id: 'review-1', state_code: 0, reviewer_id: 'user-1' },
        { review_id: 'review-2', state_code: 1, reviewer_id: 'user-2' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUserManageComments();

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockSelect).toHaveBeenCalledWith('review_id,state_code,reviewer_id');
      expect(mockIn).toHaveBeenCalledWith('state_code', [0, 1, 2]);
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
});
