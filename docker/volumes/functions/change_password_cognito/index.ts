// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import '@supabase/functions-js/edge-runtime.d.ts';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

import {
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
// Use shared supabaseClient and unified auth middleware (same as sign_up_cognito)

const awsClient = new CognitoIdentityProviderClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
  },
});

async function changePassword(email: string, password: string) {
  try {
    // check if user exists
    const getUserCmd = new AdminGetUserCommand({
      UserPoolId: Deno.env.get('COGNITO_USER_POOL_ID') ?? '',
      Username: email,
    });

    await awsClient.send(getUserCmd);

    // if user exists, set the new password
    const setPasswordCmd = new AdminSetUserPasswordCommand({
      UserPoolId: Deno.env.get('COGNITO_USER_POOL_ID') ?? '',
      Username: email,
      Password: password,
      Permanent: true,
    });

    await awsClient.send(setPasswordCmd);

    return { success: true, userExists: true };
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.log(`User not found: ${email}, ignoring password change.`);
      return { success: true, userExists: false };
    }

    console.error(`Error changing password for user ${email}:`, error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate (JWT only)
  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    allowedMethods: [AuthMethod.JWT],
    serviceApiKey: Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY') ?? '',
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  const user = authResult.user;
  if (!user) {
    return new Response('User Not Found', {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { password } = body;

  if (!password) {
    return new Response('Password is required', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await changePassword(user.email!, password);

    if (!result.userExists) {
      return new Response(
        JSON.stringify({
          message: 'User not found in Cognito',
          email: user.email,
          status: 'user_not_found',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    console.log(`Password changed successfully for user: ${user.email}`);
    return new Response(
      JSON.stringify({
        message: 'Password changed successfully',
        email: user.email,
        status: 'password_changed',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error) {
    console.error(`Error during password change for ${user.email}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to change password',
        details: error.message,
        email: user.email,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
