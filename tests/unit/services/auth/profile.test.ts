/**
 * Tests for profile-related authentication helpers
 * Path: src/services/auth/profile.ts
 *
 * These scenarios reflect the account settings page usage:
 * - Changing the primary email
 * - Loading and updating profile metadata
 */

import { changeEmail, getAccountProfile, setProfile } from '@/services/auth/profile';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

const authMock = (
  supabase as unknown as {
    auth: {
      getUser: jest.Mock;
      refreshSession: jest.Mock;
      updateUser: jest.Mock;
    };
  }
).auth;

describe('Auth profile helpers (src/services/auth/profile.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.refreshSession.mockResolvedValue({ data: {}, error: null });
  });

  describe('getAccountProfile', () => {
    it('loads the latest organization directly from the Auth user record', async () => {
      authMock.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-1',
            email: 'alice@example.com',
            role: 'authenticated',
            user_metadata: {
              display_name: 'Alice',
              organization: 'Tsinghua University',
              team_id: 'team-1',
            },
          },
        },
        error: null,
      });

      await expect(getAccountProfile()).resolves.toEqual({
        name: 'Alice',
        organization: 'Tsinghua University',
        userid: 'user-1',
        teamid: 'team-1',
        email: 'alice@example.com',
        role: 'authenticated',
      });
    });

    it('normalizes missing or non-string organization metadata for the form', async () => {
      authMock.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-1',
            email: 'alice@example.com',
            role: 'authenticated',
            user_metadata: { organization: { legacy: true } },
          },
        },
        error: null,
      });

      await expect(getAccountProfile()).resolves.toEqual(
        expect.objectContaining({ name: 'alice@example.com', organization: '' }),
      );
    });

    it('returns null when there is no authenticated user', async () => {
      authMock.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      await expect(getAccountProfile()).resolves.toBeNull();
    });

    it('surfaces Auth read errors to the account page', async () => {
      const error = new Error('Session expired');
      authMock.getUser.mockResolvedValueOnce({ data: { user: null }, error });

      await expect(getAccountProfile()).rejects.toBe(error);
    });
  });

  describe('changeEmail', () => {
    it('updates the email when the account page submits a new value', async () => {
      authMock.updateUser.mockResolvedValueOnce({ error: null });

      const result = await changeEmail({
        email: 'current@example.com',
        newEmail: 'new@example.com',
        type: 'changeEmail',
      });

      expect(authMock.updateUser).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(result).toEqual({ status: 'ok', type: 'changeEmail' });
    });

    it('returns Supabase error messages for UI feedback', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        error: { message: 'Email already taken' },
      });

      const result = await changeEmail({
        email: 'current@example.com',
        newEmail: 'new@example.com',
        type: 'changeEmail',
      });

      expect(result).toEqual({
        status: 'error',
        message: 'Email already taken',
        type: 'changeEmail',
      });
    });

    it('fails fast when the existing email is not provided', async () => {
      const result = await changeEmail({
        email: undefined,
        newEmail: 'new@example.com',
        type: 'changeEmail',
      });

      expect(authMock.updateUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'error',
        message: 'An error occurred, please try again later!',
        type: 'changeEmail',
      });
    });

    it('falls back to an empty email payload when the new email is missing', async () => {
      authMock.updateUser.mockResolvedValueOnce({ error: null });

      const result = await changeEmail({
        email: 'current@example.com',
        newEmail: undefined,
        type: 'changeEmail',
      });

      expect(authMock.updateUser).toHaveBeenCalledWith({
        email: '',
      });
      expect(result).toEqual({ status: 'ok', type: 'changeEmail' });
    });
  });

  describe('setProfile', () => {
    it('updates display name and trimmed organization metadata', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });

      const result = await setProfile({
        name: 'Updated Name',
        organization: '  TianGong Initiative  ',
        type: 'profile',
      });

      expect(authMock.updateUser).toHaveBeenCalledWith({
        data: {
          display_name: 'Updated Name',
          organization: 'TianGong Initiative',
        },
      });
      expect(authMock.refreshSession).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'ok', type: 'profile', currentAuthority: 'member' });
    });

    it('returns error details when Supabase rejects the update', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      const result = await setProfile({
        name: 'Updated Name',
        type: 'profile',
      });

      expect(result).toEqual({
        status: 'error',
        message: 'Update failed',
        type: 'profile',
        currentAuthority: 'guest',
      });
      expect(authMock.refreshSession).not.toHaveBeenCalled();
    });

    it('falls back to an empty display name when the profile form omits the value', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });

      const result = await setProfile({
        name: undefined,
        type: 'profile',
      });

      expect(authMock.updateUser).toHaveBeenCalledWith({
        data: { display_name: '', organization: '' },
      });
      expect(result).toEqual({ status: 'ok', type: 'profile', currentAuthority: 'member' });
    });

    it('keeps a successful metadata update successful when session refresh fails', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });
      authMock.refreshSession.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(
        setProfile({ name: 'Updated Name', organization: 'TianGong Initiative', type: 'profile' }),
      ).resolves.toEqual({ status: 'ok', type: 'profile', currentAuthority: 'member' });
    });
  });
});
