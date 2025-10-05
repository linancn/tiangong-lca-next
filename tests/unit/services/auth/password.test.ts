/**
 * Tests for password-related authentication helpers
 * Path: src/services/auth/password.ts
 *
 * Covered behaviours mirror account settings and password reset flows:
 * - Validating the current password before allowing updates
 * - Updating a password after OTP reset
 * - Sending the password reset email with the expected redirect
 */

import { changePassword, forgotPasswordSendEmail, setPassword } from '@/services/auth/password';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

const authMock = (
  supabase as unknown as {
    auth: {
      signInWithPassword: jest.Mock;
      updateUser: jest.Mock;
      resetPasswordForEmail: jest.Mock;
    };
  }
).auth;

describe('Auth password helpers (src/services/auth/password.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('changePassword', () => {
    it('verifies the current password then updates it via Supabase', async () => {
      authMock.signInWithPassword.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });
      authMock.updateUser.mockResolvedValueOnce({ error: null });

      const result = await changePassword({
        email: 'user@example.com',
        currentPassword: 'CurrentPass1!',
        confirmNewPassword: 'NewPass2@',
        type: 'changePassword',
      });

      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'CurrentPass1!',
      });
      expect(authMock.updateUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'NewPass2@',
      });
      expect(result).toEqual({ status: 'ok', type: 'changePassword', currentAuthority: 'member' });
    });

    it('returns an error when Supabase cannot update the user', async () => {
      authMock.signInWithPassword.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });
      authMock.updateUser.mockResolvedValueOnce({ error: { message: 'User does not exist' } });

      const result = await changePassword({
        email: 'user@example.com',
        currentPassword: 'CurrentPass1!',
        confirmNewPassword: 'NewPass2@',
        type: 'changePassword',
      });

      expect(result).toEqual({
        status: 'error',
        message: 'User not found',
        type: 'changePassword',
        currentAuthority: 'guest',
      });
    });

    it('returns a password incorrect error when credentials are invalid', async () => {
      authMock.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await changePassword({
        email: 'user@example.com',
        currentPassword: 'WrongPass!',
        confirmNewPassword: 'NewPass2@',
        type: 'changePassword',
      });

      expect(authMock.updateUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        status: 'error',
        message: 'Password incorrect',
        type: 'changePassword',
        currentAuthority: 'guest',
      });
    });
  });

  describe('setPassword', () => {
    it('updates the password after a reset flow', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: { user: { role: 'member' } },
        error: null,
      });

      const result = await setPassword({
        email: 'user@example.com',
        confirmNewPassword: 'ResetPass3#',
        type: 'reset',
      });

      expect(authMock.updateUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'ResetPass3#',
      });
      expect(result).toEqual({ status: 'ok', type: 'reset', currentAuthority: 'member' });
    });

    it('propagates Supabase errors so the reset page can display them', async () => {
      authMock.updateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Token invalid' },
      });

      const result = await setPassword({
        email: 'user@example.com',
        confirmNewPassword: 'ResetPass3#',
        type: 'reset',
      });

      expect(result).toEqual({
        status: 'error',
        message: 'Token invalid',
        type: 'reset',
        currentAuthority: 'guest',
      });
    });
  });

  describe('forgotPasswordSendEmail', () => {
    it('requests Supabase to send the reset email with the expected redirect URL', async () => {
      authMock.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

      const result = await forgotPasswordSendEmail({
        email: 'user@example.com',
        type: 'forgot',
      });

      expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
        redirectTo: 'https://lca.tiangong.earth/user/login/password_reset',
      });
      expect(result).toEqual({ status: 'ok', type: 'forgot', currentAuthority: 'guest' });
    });

    it('returns error details when Supabase cannot send the email', async () => {
      authMock.resetPasswordForEmail.mockResolvedValueOnce({
        error: { message: 'User not found' },
      });

      const result = await forgotPasswordSendEmail({
        email: 'missing@example.com',
        type: 'forgot',
      });

      expect(result).toEqual({
        status: 'error',
        message: 'User not found',
        type: 'forgot',
        currentAuthority: 'guest',
      });
    });
  });
});
