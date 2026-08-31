import { supabase } from '@/services/supabase';

/**
 * Get the account profile from the authoritative Auth user record.
 * Unlike JWT claims, this reflects user metadata changes immediately.
 */
export async function getAccountProfile(): Promise<Auth.CurrentUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    return null;
  }

  const organization = user.user_metadata?.organization;

  return {
    name: user.user_metadata?.display_name || user.email,
    organization: typeof organization === 'string' ? organization : '',
    userid: user.id,
    teamid: user.user_metadata?.team_id,
    email: user.email,
    role: user.role,
  };
}

/**
 * Change user email address
 * @param body - Email change parameters
 * @returns Result with status and message
 */
export async function changeEmail(body: Auth.EmailChangeParams): Promise<Auth.LoginResult> {
  if (!body?.email) {
    return {
      status: 'error',
      message: 'An error occurred, please try again later!',
      type: body.type,
    };
  }

  const response = await supabase.auth.updateUser({
    email: body.newEmail ?? '',
  });
  const error = response?.error;

  if (error) {
    return {
      status: 'error',
      message: error.message,
      type: body.type,
    };
  }

  return { status: 'ok', type: body.type };
}

/**
 * Update user profile information
 * @param body - Profile update parameters
 * @returns Result with status and user authority
 */
export async function setProfile(body: Auth.ProfileUpdateParams): Promise<Auth.LoginResult> {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: body.name ?? '',
      organization: body.organization?.trim() ?? '',
    },
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  }

  // Refresh claims when possible, but do not turn a successful metadata write into a false failure.
  try {
    await supabase.auth.refreshSession();
  } catch {
    // Account profile reads use getUser(), so the saved value remains immediately observable.
  }

  return { status: 'ok', type: body.type, currentAuthority: data.user.role };
}
