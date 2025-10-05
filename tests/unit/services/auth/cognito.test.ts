/**
 * Tests for Cognito bridge helpers
 * Path: src/services/auth/cognito.ts
 *
 * These helpers are triggered from account settings before updating Supabase data.
 * They should pass the session token to edge functions and remain no-ops when the
 * user is not authenticated.
 */

import { cognitoChangeEmail, cognitoChangePassword, cognitoSignUp } from '@/services/auth/cognito';
import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  FunctionRegion: {
    UsEast1: 'us-east-1',
  },
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const supabaseMock = supabase as unknown as {
  auth: {
    getSession: jest.Mock;
  };
  functions: {
    invoke: jest.Mock;
  };
};

describe('Auth Cognito helpers (src/services/auth/cognito.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sessionResponse = {
    data: {
      session: {
        access_token: 'access-token-123',
      },
    },
    error: null,
  };

  describe('cognitoSignUp', () => {
    it('invokes the sign_up_cognito edge function when a session exists', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce(sessionResponse);
      supabaseMock.functions.invoke.mockResolvedValueOnce({ data: null, error: null });

      await cognitoSignUp('Password1!');

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('sign_up_cognito', {
        headers: { Authorization: 'Bearer access-token-123' },
        body: { password: 'Password1!' },
        region: FunctionRegion.UsEast1,
      });
    });

    it('does not call the edge function when there is no active session', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      await cognitoSignUp('Password1!');

      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('cognitoChangePassword', () => {
    it('delegates to the change_password_cognito function with the session token', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce(sessionResponse);
      supabaseMock.functions.invoke.mockResolvedValueOnce({ data: null, error: null });

      await cognitoChangePassword('NewPass2@');

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('change_password_cognito', {
        headers: { Authorization: 'Bearer access-token-123' },
        body: { password: 'NewPass2@' },
        region: FunctionRegion.UsEast1,
      });
    });

    it('skips invocation when the user is logged out', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      await cognitoChangePassword('NewPass2@');

      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('cognitoChangeEmail', () => {
    it('invokes the change_email_cognito function with the token and new email', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce(sessionResponse);
      supabaseMock.functions.invoke.mockResolvedValueOnce({ data: null, error: null });

      await cognitoChangeEmail('new@example.com');

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('change_email_cognito', {
        headers: { Authorization: 'Bearer access-token-123' },
        body: { newEmail: 'new@example.com' },
        region: FunctionRegion.UsEast1,
      });
    });

    it('does nothing when no session is available', async () => {
      supabaseMock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

      await cognitoChangeEmail('new@example.com');

      expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    });
  });
});
