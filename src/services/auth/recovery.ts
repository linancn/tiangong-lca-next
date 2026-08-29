import { supabase } from '@/services/supabase';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const RECOVERY_MARKER_KEY = 'tiangong.auth.password-recovery';
const RECOVERY_MARKER_FALLBACK_TTL_MS = 10 * 60 * 1000;

type RecoveryMarker = {
  userId: string;
  expiresAt: number;
};

const clearRecoveryMarker = () => {
  sessionStorage.removeItem(RECOVERY_MARKER_KEY);
};

const readRecoveryMarker = (): RecoveryMarker | null => {
  const serialized = sessionStorage.getItem(RECOVERY_MARKER_KEY);
  if (!serialized) {
    return null;
  }

  try {
    const marker = JSON.parse(serialized) as Partial<RecoveryMarker>;
    if (typeof marker.userId !== 'string' || typeof marker.expiresAt !== 'number') {
      clearRecoveryMarker();
      return null;
    }
    return marker as RecoveryMarker;
  } catch {
    clearRecoveryMarker();
    return null;
  }
};

const toCurrentUser = (user: User): Auth.CurrentUser => ({
  name: user.user_metadata?.display_name ?? user.email,
  userid: user.id,
  teamid: user.user_metadata?.team_id,
  email: user.email,
  role: user.role,
});

export const recordPasswordRecoverySession = (session: Session | null) => {
  if (!session?.user.id) {
    clearRecoveryMarker();
    return;
  }

  const marker: RecoveryMarker = {
    userId: session.user.id,
    expiresAt: session.expires_at
      ? session.expires_at * 1000
      : Date.now() + RECOVERY_MARKER_FALLBACK_TTL_MS,
  };
  sessionStorage.setItem(RECOVERY_MARKER_KEY, JSON.stringify(marker));
};

export const subscribeToPasswordRecovery = (onRecovery: () => void) => {
  // Several non-auth application tests intentionally provide a minimal Supabase
  // mock. Keep application bootstrap compatible with those isolated runtimes;
  // the real client always exposes this method.
  const authClient = Reflect.get(supabase as object, 'auth');
  if (authClient === null || (typeof authClient !== 'object' && typeof authClient !== 'function')) {
    return undefined;
  }
  const onAuthStateChange = Reflect.get(authClient, 'onAuthStateChange');
  if (typeof onAuthStateChange !== 'function') {
    return undefined;
  }

  const result = Reflect.apply(onAuthStateChange, authClient, [
    (event: AuthChangeEvent, session: Session | null) => {
      if (event !== 'PASSWORD_RECOVERY') {
        return;
      }
      recordPasswordRecoverySession(session);
      onRecovery();
    },
  ]) as { data?: { subscription?: { unsubscribe: () => void } } } | undefined;
  return result?.data?.subscription;
};

export const getPasswordRecoveryUser = async (): Promise<Auth.CurrentUser | null> => {
  const marker = readRecoveryMarker();
  if (!marker) {
    return null;
  }
  if (marker.expiresAt <= Date.now()) {
    clearRecoveryMarker();
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== marker.userId) {
    clearRecoveryMarker();
    return null;
  }
  return toCurrentUser(data.user);
};

export const completePasswordRecovery = () => {
  clearRecoveryMarker();
};
