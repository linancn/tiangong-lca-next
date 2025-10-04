/**
 * Tests for user service API functions
 * Path: src/services/users/api.ts
 *
 * Coverage focuses on:
 * - User lookup by IDs and emails (used in team management, review assignment)
 * - Current user ID retrieval (heavily used across the app for permission checks)
 * - User info and contact management (used in profile and contact forms)
 */

import {
  getUserDetail,
  getUserEmailByUserIds,
  getUserId,
  getUserIdByEmail,
  getUserInfoByEmail,
  getUsersByIds,
  updateUserContact,
} from '@/services/users/api';

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

jest.mock('@/services/auth', () => ({
  getCurrentUser: jest.fn(),
}));

const {
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
    functions: { invoke: mockFunctionsInvoke },
  },
} = jest.requireMock('@/services/supabase');

const { getCurrentUser: mockGetCurrentUser } = jest.requireMock('@/services/auth');

describe('Users API service (src/services/users/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsersByIds', () => {
    it('fetches user details for multiple user IDs', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', display_name: 'User One' },
        { id: 'user-2', email: 'user2@example.com', display_name: 'User Two' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: mockUsers, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUsersByIds(['user-1', 'user-2']);

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith(
        'id, raw_user_meta_data->email,raw_user_meta_data->display_name',
      );
      expect(mockIn).toHaveBeenCalledWith('id', ['user-1', 'user-2']);
      expect(result).toEqual(mockUsers);
    });

    it('returns null when an error occurs', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUsersByIds(['user-1']);

      expect(result).toBeNull();
    });

    it('handles exceptions gracefully', async () => {
      (mockFrom as jest.Mock).mockImplementation(() => {
        throw new Error('Connection error');
      });

      const result = await getUsersByIds(['user-1']);

      expect(result).toBeNull();
    });
  });

  describe('getUserIdByEmail', () => {
    it('finds a user ID by email address', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await getUserIdByEmail('user@example.com');

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(mockEq).toHaveBeenCalledWith('raw_user_meta_data->>email', 'user@example.com');
      expect(result).toBe('user-123');
    });

    it('returns null when user is not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'Not found' } });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await getUserIdByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUserEmailByUserIds', () => {
    it('retrieves email addresses for given user IDs', async () => {
      const mockData = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUserEmailByUserIds(['user-1', 'user-2']);

      expect(result).toEqual(mockData);
    });

    it('returns empty array when data is null', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockIn = jest.fn().mockResolvedValue({ data: null, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          in: mockIn,
        }),
      });

      const result = await getUserEmailByUserIds(['user-1']);

      expect(result).toEqual([]);
    });
  });

  describe('getUserId', () => {
    it('extracts user ID from current user session', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userid: 'current-user-id',
        name: 'Current User',
        email: 'current@example.com',
        role: 'member',
      } as any);

      const result = await getUserId();

      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(result).toBe('current-user-id');
    });

    it('returns empty string when no user is logged in', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await getUserId();

      expect(result).toBe('');
    });

    it('returns empty string when userid is undefined', async () => {
      mockGetCurrentUser.mockResolvedValue({
        name: 'User',
        email: 'user@example.com',
        role: 'guest',
      } as any);

      const result = await getUserId();

      expect(result).toBe('');
    });
  });

  describe('getUserInfoByEmail', () => {
    it('fetches user info including contact details', async () => {
      const mockUserData = {
        id: 'user-123',
        raw_user_meta_data: { email: 'user@example.com', display_name: 'User' },
        contact: { phone: '123-456-7890' },
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockUserData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await getUserInfoByEmail('user@example.com');

      expect(result).toEqual({
        user: mockUserData,
        contact: { phone: '123-456-7890' },
        success: true,
      });
    });

    it('returns null contact when user has no contact info', async () => {
      const mockUserData = {
        id: 'user-123',
        raw_user_meta_data: { email: 'user@example.com' },
        contact: null,
      };

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockUserData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await getUserInfoByEmail('user@example.com');

      expect(result).toEqual({
        user: mockUserData,
        contact: null,
        success: true,
      });
    });

    it('returns error when user lookup fails', async () => {
      const mockError = { message: 'User not found' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: null, error: mockError });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await getUserInfoByEmail('notfound@example.com');

      expect(result).toEqual({
        user: null,
        contact: null,
        success: false,
        error: mockError,
      });
    });
  });

  describe('updateUserContact', () => {
    it('updates user contact info via edge function', async () => {
      const mockSession = {
        data: { session: { access_token: 'test-token' } },
      };
      const mockResult = { data: { success: true }, error: null };

      mockAuthGetSession.mockResolvedValue(mockSession);
      mockFunctionsInvoke.mockResolvedValue(mockResult);

      const contactInfo = { phone: '123-456-7890', address: '123 Main St' };
      const result = await updateUserContact('user-123', contactInfo);

      expect(mockAuthGetSession).toHaveBeenCalledTimes(1);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_user', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: { userId: 'user-123', data: { contact: contactInfo } },
        region: 'us-east-1',
      });
      expect(result).toEqual(mockResult);
    });

    it('returns empty result when session is not available', async () => {
      mockAuthGetSession.mockResolvedValue({ data: { session: null } });

      const result = await updateUserContact('user-123', { phone: '123' });

      expect(mockFunctionsInvoke).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });

  describe('getUserDetail', () => {
    it('fetches contact details for the current user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userid: 'current-user-id',
        name: 'Current User',
        email: 'current@example.com',
        role: 'member',
      } as any);

      const mockContact = { phone: '123-456-7890' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSingle = jest
        .fn()
        .mockResolvedValue({ data: { contact: mockContact }, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await getUserDetail();

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('contact');
      expect(mockEq).toHaveBeenCalledWith('id', 'current-user-id');
      expect(result).toEqual({ data: { contact: mockContact }, error: null });
    });
  });
});
