import { supabase } from '@/services/supabase';

/**
 * Get current authenticated user information
 * @returns Current user data or null if not authenticated
 */
export async function getCurrentUser(): Promise<Auth.CurrentUser | null> {
  const { data } = await supabase.auth.getUser();
  if (data?.user === null) {
    return null;
  }
  const user: Auth.CurrentUser = {
    name: data?.user?.user_metadata?.display_name ?? data?.user?.email,
    userid: data?.user?.id,
    teamid: data?.user?.user_metadata?.team_id,
    email: data?.user?.email,
    role: data?.user?.role,
  };
  return user;
}

/**
 * User login with email and password
 * @param body - Login parameters including email and password
 * @returns Login result with status and user authority
 */
export async function login(body: Auth.LoginParams): Promise<Auth.LoginResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email ?? '',
    password: body.password ?? '',
  });
  if (error) {
    return { status: 'error', type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: data.user.role };
}

/**
 * User logout
 * @returns Error if logout failed, null if successful
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  return error;
}

/**
 * Send magic link for passwordless login
 * @param body - Login parameters with email
 * @returns Result with status and message
 */
export async function sendMagicLink(body: Auth.LoginParams): Promise<Auth.LoginResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email: body.email ?? '',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}

/**
 * User registration with email and password
 * @param body - Registration parameters
 * @returns Registration result with status
 */
export async function signUp(body: Auth.LoginParams): Promise<Auth.LoginResult> {
  const { data, error } = await supabase.auth.signUp({
    email: body.email ?? '',
    password: body.confirmPassword ?? '',
  });

  if (!data || error) {
    return { status: 'error', type: body.type, currentAuthority: 'guest' };
  }
  if (data.user?.role === '') {
    return { status: 'existed', type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}

/**
 * Re-authenticate current user
 * @returns Reauthentication result
 */
export async function reauthenticate(): Promise<Auth.LoginResult> {
  const { data, error } = await supabase.auth.reauthenticate();

  console.log(data, error);

  if (error) {
    return { status: 'error', message: error.message, currentAuthority: 'guest' };
  }
  return { status: 'ok', currentAuthority: data?.user?.role ?? 'guest' };
}

export async function updateTeamNotificationTime() {
  const { error } = await supabase.auth.updateUser({
    data: {
      update_team_notification_time: new Date().getTime(),
    },
  });
  return {
    error,
  };
}

export async function updateDataNotificationTime() {
  const { error } = await supabase.auth.updateUser({
    data: {
      update_data_notification_time: new Date().getTime(),
    },
  });
  return {
    error,
  };
}
