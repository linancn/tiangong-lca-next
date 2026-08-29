import {
  completePasswordRecovery,
  getPasswordRecoveryUser,
  recordPasswordRecoverySession,
  subscribeToPasswordRecovery,
} from '@/services/auth/recovery';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const authMock = (
  supabase as unknown as {
    auth: {
      getUser: jest.Mock;
      onAuthStateChange: jest.Mock;
    };
  }
).auth;

const recoverySession = (expiresAt?: number) =>
  ({
    expires_at: expiresAt,
    user: {
      id: 'recovery-user',
    },
  }) as any;

describe('password recovery session helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records PASSWORD_RECOVERY and invokes the navigation callback', () => {
    const subscription = { unsubscribe: jest.fn() };
    let authCallback: ((event: string, session: any) => void) | undefined;
    authMock.onAuthStateChange.mockImplementationOnce((callback) => {
      authCallback = callback;
      return { data: { subscription } };
    });
    const onRecovery = jest.fn();

    expect(subscribeToPasswordRecovery(onRecovery)).toBe(subscription);
    authCallback?.('SIGNED_IN', recoverySession());
    expect(onRecovery).not.toHaveBeenCalled();

    authCallback?.('PASSWORD_RECOVERY', recoverySession(2_000_000_000));
    expect(onRecovery).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('tiangong.auth.password-recovery')).toBe(
      JSON.stringify({ userId: 'recovery-user', expiresAt: 2_000_000_000_000 }),
    );
  });

  it('does not fail application bootstrap when an isolated test omits the auth listener', () => {
    const listener = authMock.onAuthStateChange;
    (supabase.auth as any).onAuthStateChange = undefined;

    expect(subscribeToPasswordRecovery(jest.fn())).toBeUndefined();

    (supabase.auth as any).onAuthStateChange = listener;
  });

  it('does not fail application bootstrap when an isolated test omits the auth client', () => {
    const authClient = supabase.auth;
    (supabase as any).auth = undefined;

    expect(subscribeToPasswordRecovery(jest.fn())).toBeUndefined();

    (supabase as any).auth = authClient;
  });

  it('does not fail application bootstrap when an isolated listener mock returns nothing', () => {
    authMock.onAuthStateChange.mockReturnValueOnce(undefined);

    expect(subscribeToPasswordRecovery(jest.fn())).toBeUndefined();
  });

  it('uses a bounded fallback expiry when the recovery session omits expires_at', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1_000_000);

    recordPasswordRecoverySession(recoverySession());

    expect(sessionStorage.getItem('tiangong.auth.password-recovery')).toBe(
      JSON.stringify({ userId: 'recovery-user', expiresAt: 1_600_000 }),
    );
  });

  it('clears the marker when a recovery event has no user', () => {
    sessionStorage.setItem('tiangong.auth.password-recovery', 'existing');

    recordPasswordRecoverySession(null);

    expect(sessionStorage.getItem('tiangong.auth.password-recovery')).toBeNull();
  });

  it('returns the server-verified user when the marker is current and matches', async () => {
    recordPasswordRecoverySession(recoverySession(2_000_000_000));
    authMock.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'recovery-user',
          email: 'recover@example.com',
          role: 'authenticated',
          user_metadata: { display_name: 'Recovery User', team_id: 'team-1' },
        },
      },
      error: null,
    });

    await expect(getPasswordRecoveryUser()).resolves.toEqual({
      name: 'Recovery User',
      userid: 'recovery-user',
      teamid: 'team-1',
      email: 'recover@example.com',
      role: 'authenticated',
    });
  });

  it('falls back to email for the recovery user display name', async () => {
    recordPasswordRecoverySession(recoverySession(2_000_000_000));
    authMock.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'recovery-user',
          email: 'recover@example.com',
          role: 'authenticated',
          user_metadata: {},
        },
      },
      error: null,
    });

    await expect(getPasswordRecoveryUser()).resolves.toMatchObject({
      name: 'recover@example.com',
    });
  });

  it('rejects missing, expired, malformed, and structurally invalid markers', async () => {
    await expect(getPasswordRecoveryUser()).resolves.toBeNull();

    sessionStorage.setItem(
      'tiangong.auth.password-recovery',
      JSON.stringify({ userId: 'recovery-user', expiresAt: 1 }),
    );
    await expect(getPasswordRecoveryUser()).resolves.toBeNull();

    sessionStorage.setItem('tiangong.auth.password-recovery', '{broken');
    await expect(getPasswordRecoveryUser()).resolves.toBeNull();
    expect(sessionStorage.getItem('tiangong.auth.password-recovery')).toBeNull();

    sessionStorage.setItem(
      'tiangong.auth.password-recovery',
      JSON.stringify({ userId: 42, expiresAt: 'later' }),
    );
    await expect(getPasswordRecoveryUser()).resolves.toBeNull();
    expect(authMock.getUser).not.toHaveBeenCalled();
  });

  it.each([
    { response: { data: { user: null }, error: null }, label: 'missing user' },
    {
      response: { data: { user: { id: 'another-user' } }, error: null },
      label: 'mismatched user',
    },
    {
      response: { data: { user: null }, error: { message: 'invalid token' } },
      label: 'provider error',
    },
  ])('clears the marker for $label', async ({ response }) => {
    recordPasswordRecoverySession(recoverySession(2_000_000_000));
    authMock.getUser.mockResolvedValueOnce(response);

    await expect(getPasswordRecoveryUser()).resolves.toBeNull();
    expect(sessionStorage.getItem('tiangong.auth.password-recovery')).toBeNull();
  });

  it('clears the marker after a successful password update', () => {
    recordPasswordRecoverySession(recoverySession(2_000_000_000));

    completePasswordRecovery();

    expect(sessionStorage.getItem('tiangong.auth.password-recovery')).toBeNull();
  });
});
