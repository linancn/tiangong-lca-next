/**
 * Tests for profile-related authentication helpers
 * Path: src/services/auth/profile.ts
 *
 * These scenarios reflect the account settings page usage:
 * - Changing the primary email
 * - Updating the display name stored in user metadata
 */

import { changeEmail, setProfile } from '@/services/auth/profile';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
    },
  },
}));

const authMock = (
  supabase as unknown as {
    auth: {
      updateUser: jest.Mock;
    };
  }
).auth;

describe('Auth profile helpers (src/services/auth/profile.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        email: null,
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
  });

  describe('setProfile', () => {
    it('updates the display name metadata used across the app bar and profile forms', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });

      const result = await setProfile({
        name: 'Updated Name',
        type: 'profile',
      });

      expect(authMock.updateUser).toHaveBeenCalledWith({
        data: { display_name: 'Updated Name' },
      });
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
    });
  });
});
