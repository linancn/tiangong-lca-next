import { supabase } from '@/services/supabase';

/**
 * Change user email address
 * @param body - Email change parameters
 * @returns Result with status and message
 */
export async function changeEmail(body: Auth.EmailChangeParams): Promise<Auth.LoginResult> {
  if (body.email !== null) {
    const { error } = await supabase.auth.updateUser({
      email: body.newEmail ?? '',
    });
    if (error) {
      return {
        status: 'error',
        message: error.message,
        type: body.type,
      };
    } else {
      return { status: 'ok', type: body.type };
    }
  } else {
    return {
      status: 'error',
      message: 'An error occurred, please try again later!',
      type: body.type,
    };
  }
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
    },
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  } else {
    return { status: 'ok', type: body.type, currentAuthority: data.user.role };
  }
}
