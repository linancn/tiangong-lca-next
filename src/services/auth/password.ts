import { supabase } from '@/services/supabase';

/**
 * Change user password
 * @param body - Password change parameters
 * @returns Result with status and message
 */
export async function changePassword(body: Auth.PasswordChangeParams): Promise<Auth.LoginResult> {
  const { data } = await supabase.auth.signInWithPassword({
    email: body.email ?? '',
    password: body.currentPassword ?? '',
  });

  if (data.user !== null) {
    const { error } = await supabase.auth.updateUser({
      email: body.email ?? '',
      password: body.confirmNewPassword ?? '',
    });
    if (error) {
      return {
        status: 'error',
        message: 'User not found',
        type: body.type,
        currentAuthority: 'guest',
      };
    } else {
      return { status: 'ok', type: body.type, currentAuthority: data.user.role };
    }
  } else {
    return {
      status: 'error',
      message: 'Password incorrect',
      type: body.type,
      currentAuthority: 'guest',
    };
  }
}

/**
 * Set new password (for password reset)
 * @param body - New password parameters
 * @returns Result with status and user authority
 */
export async function setPassword(body: any): Promise<Auth.LoginResult> {
  const { data, error } = await supabase.auth.updateUser({
    email: body.email ?? '',
    password: body.confirmNewPassword ?? '',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  } else {
    return { status: 'ok', type: body.type, currentAuthority: data.user.role };
  }
}

/**
 * Send password reset email
 * @param body - Email parameters
 * @returns Result with status and message
 */
export async function forgotPasswordSendEmail(body: Auth.LoginParams): Promise<Auth.LoginResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(body.email ?? '', {
    redirectTo: 'https://lca.tiangong.earth/user/login/password_reset',
  });

  if (error) {
    return { status: 'error', message: error.message, type: body.type, currentAuthority: 'guest' };
  }
  return { status: 'ok', type: body.type, currentAuthority: 'guest' };
}
