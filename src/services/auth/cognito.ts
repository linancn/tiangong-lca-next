import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

/**
 * Sign up user in Cognito (AWS integration)
 * @param password - User password
 */
export async function cognitoSignUp(password: string): Promise<void> {
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    await supabase.functions.invoke('sign_up_cognito', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { password },
      region: FunctionRegion.UsEast1,
    });
  }
}

/**
 * Change password in Cognito (AWS integration)
 * @param password - New password
 */
export async function cognitoChangePassword(password: string): Promise<void> {
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    await supabase.functions.invoke('change_password_cognito', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { password },
      region: FunctionRegion.UsEast1,
    });
  }
}

/**
 * Change email in Cognito (AWS integration)
 * @param newEmail - New email address
 */
export async function cognitoChangeEmail(newEmail: string): Promise<void> {
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    await supabase.functions.invoke('change_email_cognito', {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
      },
      body: { newEmail },
      region: FunctionRegion.UsEast1,
    });
  }
}
