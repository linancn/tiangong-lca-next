/**
 * Tests for authentication API functions
 * Path: src/services/auth/api.ts
 *
 * Coverage focuses on:
 * - Current user resolution from Supabase claims (used by initial state & account pages)
 * - Login / signup flows triggered from the login page
 * - Notification timestamp updates invoked from notification components
 * - Magic link, logout, and reauthentication handling
 */

import {
  getCurrentUser,
  getFreshUserMetadata,
  login,
  logout,
  reauthenticate,
  sendMagicLink,
  signUp,
  updateDataNotificationTime,
  updateTeamNotificationTime,
} from '@/services/auth/api';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getClaims: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signInWithOtp: jest.fn(),
      signUp: jest.fn(),
      reauthenticate: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

const authMock = (
  supabase as unknown as {
    auth: {
      getClaims: jest.Mock;
      signInWithPassword: jest.Mock;
      signOut: jest.Mock;
      signInWithOtp: jest.Mock;
      signUp: jest.Mock;
      reauthenticate: jest.Mock;
      updateUser: jest.Mock;
      getUser: jest.Mock;
    };
  }
).auth;

describe('Auth API service (src/services/auth/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('maps Supabase claims to the Auth.CurrentUser shape used in UI', async () => {
      const claims = {
        email: 'user@example.com',
        sub: 'user-123',
        role: 'member',
        user_metadata: {
          display_name: 'User Example',
          team_id: 'team-456',
          update_data_notification_time: 1700000000000,
          update_team_notification_time: 1700001000000,
        },
      };
      authMock.getClaims.mockResolvedValueOnce({ data: { claims }, error: null });

      const result = await getCurrentUser();

      expect(authMock.getClaims).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        name: 'User Example',
        userid: 'user-123',
        teamid: 'team-456',
        email: 'user@example.com',
        role: 'member',
        update_data_notification_time: 1700000000000,
        update_team_notification_time: 1700001000000,
      });
    });

    it('falls back to email when display name metadata is missing', async () => {
      const claims = {
        email: 'missing-name@example.com',
        sub: 'user-789',
        role: 'guest',
        user_metadata: {},
      };
      authMock.getClaims.mockResolvedValueOnce({ data: { claims }, error: null });

      const result = await getCurrentUser();

      expect(result).toEqual({
        name: 'missing-name@example.com',
        userid: 'user-789',
        teamid: undefined,
        email: 'missing-name@example.com',
        role: 'guest',
        update_data_notification_time: undefined,
        update_team_notification_time: undefined,
      });
    });

    it('returns null when Supabase does not provide claims (user logged out)', async () => {
      authMock.getClaims.mockResolvedValueOnce({ data: { claims: null }, error: null });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('authenticates with Supabase and propagates the resulting authority', async () => {
      authMock.signInWithPassword.mockResolvedValueOnce({
        data: { user: { role: 'admin' } },
        error: null,
      });

      const result = await login({ email: 'user@example.com', password: 'secret', type: 'login' });

      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
      });
      expect(result).toEqual({ status: 'ok', type: 'login', currentAuthority: 'admin' });
    });

    it('returns an error status when Supabase rejects the credentials', async () => {
      authMock.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await login({ email: 'user@example.com', password: 'wrong', type: 'login' });

      expect(result).toEqual({ status: 'error', type: 'login', currentAuthority: 'guest' });
    });

    it('uses empty-string fallback for missing credentials', async () => {
      authMock.signInWithPassword.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });

      const result = await login({ type: 'login' } as any);

      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: '',
        password: '',
      });
      expect(result).toEqual({ status: 'ok', type: 'login', currentAuthority: 'member' });
    });
  });

  describe('logout', () => {
    it('delegates to Supabase signOut and returns the underlying error', async () => {
      authMock.signOut.mockResolvedValueOnce({ error: null });

      const result = await logout();

      expect(authMock.signOut).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });

  describe('sendMagicLink', () => {
    it('requests an OTP login link and reports success', async () => {
      authMock.signInWithOtp.mockResolvedValueOnce({ error: null });

      const result = await sendMagicLink({ email: 'user@example.com', type: 'magic' });

      expect(authMock.signInWithOtp).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(result).toEqual({ status: 'ok', type: 'magic', currentAuthority: 'guest' });
    });

    it('surfaces Supabase errors to the caller for UI notifications', async () => {
      authMock.signInWithOtp.mockResolvedValueOnce({ error: { message: 'Mailbox unreachable' } });

      const result = await sendMagicLink({ email: 'user@example.com', type: 'magic' });

      expect(result).toEqual({
        status: 'error',
        message: 'Mailbox unreachable',
        type: 'magic',
        currentAuthority: 'guest',
      });
    });

    it('uses empty email fallback for magic link requests', async () => {
      authMock.signInWithOtp.mockResolvedValueOnce({ error: null });

      const result = await sendMagicLink({ type: 'magic' } as any);

      expect(authMock.signInWithOtp).toHaveBeenCalledWith({ email: '' });
      expect(result).toEqual({ status: 'ok', type: 'magic', currentAuthority: 'guest' });
    });
  });

  describe('signUp', () => {
    it('creates an account and returns ok for the registration flow', async () => {
      authMock.signUp.mockResolvedValueOnce({
        data: { user: { role: 'authenticated' } },
        error: null,
      });

      const result = await signUp({
        email: 'user@example.com',
        confirmPassword: 'Password123!',
        type: 'register',
      });

      expect(authMock.signUp).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
      });
      expect(result).toEqual({ status: 'ok', type: 'register', currentAuthority: 'guest' });
    });

    it('returns existed when Supabase reports an existing user with empty role', async () => {
      authMock.signUp.mockResolvedValueOnce({
        data: { user: { role: '' } },
        error: null,
      });

      const result = await signUp({
        email: 'user@example.com',
        confirmPassword: 'Password123!',
        type: 'register',
      });

      expect(result).toEqual({ status: 'existed', type: 'register', currentAuthority: 'guest' });
    });

    it('returns error when Supabase does not provide signup data', async () => {
      authMock.signUp.mockResolvedValueOnce({ data: null, error: { message: 'Signup failed' } });

      const result = await signUp({
        email: 'user@example.com',
        confirmPassword: 'Password123!',
        type: 'register',
      });

      expect(result).toEqual({ status: 'error', type: 'register', currentAuthority: 'guest' });
    });

    it('uses empty password fallback when confirmPassword is missing', async () => {
      authMock.signUp.mockResolvedValueOnce({
        data: { user: { role: 'authenticated' } },
        error: null,
      });

      const result = await signUp({
        email: 'user@example.com',
        type: 'register',
      } as any);

      expect(authMock.signUp).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: '',
      });
      expect(result).toEqual({ status: 'ok', type: 'register', currentAuthority: 'guest' });
    });
  });

  describe('reauthenticate', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('returns ok and propagates the refreshed authority', async () => {
      authMock.reauthenticate.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });

      const result = await reauthenticate();

      expect(result).toEqual({ status: 'ok', currentAuthority: 'member' });
    });

    it('returns an error result when Supabase reauthentication fails', async () => {
      authMock.reauthenticate.mockResolvedValueOnce({
        data: null,
        error: { message: 'Token expired' },
      });

      const result = await reauthenticate();

      expect(result).toEqual({
        status: 'error',
        message: 'Token expired',
        currentAuthority: 'guest',
      });
    });

    it('falls back to guest authority when role is unavailable', async () => {
      authMock.reauthenticate.mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      });

      const result = await reauthenticate();

      expect(result).toEqual({
        status: 'ok',
        currentAuthority: 'guest',
      });
    });
  });

  describe('updateTeamNotificationTime', () => {
    it('updates the timestamp used by TeamNotification component', async () => {
      const mockTime = new Date('2024-01-01T00:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockTime);
      authMock.updateUser.mockResolvedValueOnce({ error: null });

      try {
        const result = await updateTeamNotificationTime();

        expect(authMock.updateUser).toHaveBeenCalledWith({
          data: { update_team_notification_time: mockTime.getTime() },
        });
        expect(result).toEqual({ error: null });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('updateDataNotificationTime', () => {
    it('updates the timestamp used by DataNotification component', async () => {
      const mockTime = new Date('2024-01-02T12:34:56Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockTime);
      authMock.updateUser.mockResolvedValueOnce({ error: null });

      try {
        const result = await updateDataNotificationTime();

        expect(authMock.updateUser).toHaveBeenCalledWith({
          data: { update_data_notification_time: mockTime.getTime() },
        });
        expect(result).toEqual({ error: null });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getFreshUserMetadata', () => {
    it('returns null when getUser fails or user is absent', async () => {
      authMock.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'expired' },
      });

      const result = await getFreshUserMetadata();

      expect(result).toBeNull();
    });

    it('maps fresh metadata when user exists', async () => {
      authMock.getUser.mockResolvedValueOnce({
        data: {
          user: {
            user_metadata: {
              update_data_notification_time: 111,
              update_team_notification_time: 222,
            },
          },
        },
        error: null,
      });

      const result = await getFreshUserMetadata();

      expect(result).toEqual({
        update_data_notification_time: 111,
        update_team_notification_time: 222,
      });
    });
  });
});
