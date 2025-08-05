// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import '@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

import {
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { createClient } from '@supabase/supabase-js@2';

const userSupabase = createClient(
  Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('REMOTE_SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

const awsClient = new CognitoIdentityProviderClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
  },
});

async function changeEmail(currentEmail: string, newEmail: string) {
  try {
    // check if user exists
    const getUserCmd = new AdminGetUserCommand({
      UserPoolId: Deno.env.get('COGNITO_USER_POOL_ID') ?? '',
      Username: currentEmail,
    });

    await awsClient.send(getUserCmd);

    // if user exists, update the email attribute
    const updateUserAttributesCmd = new AdminUpdateUserAttributesCommand({
      UserPoolId: Deno.env.get('COGNITO_USER_POOL_ID') ?? '',
      Username: currentEmail,
      UserAttributes: [
        {
          Name: 'email',
          Value: newEmail,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
    });

    await awsClient.send(updateUserAttributesCmd);

    return { success: true, userExists: true };
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.log(`User not found: ${currentEmail}, ignoring email change.`);
      return { success: true, userExists: false };
    }

    console.error(`Error changing email for user ${currentEmail}:`, error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get the session or user object
  const authHeader = req.headers.get('Authorization');

  // If no Authorization header, return error immediately
  if (!authHeader) {
    return new Response('Unauthorized Request', { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  const userData = await userSupabase.auth.getUser(token);

  if (!userData?.data || !userData.data.user) {
    return new Response('User Not Found', { status: 404 });
  }

  const user = userData.data.user;
  if (user?.role !== 'authenticated') {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json();
  const { newEmail } = body;

  if (!newEmail) {
    return new Response('New email is required', { status: 400 });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return new Response('Invalid email format', { status: 400 });
  }

  try {
    const result = await changeEmail(user.email!, newEmail);

    if (!result.userExists) {
      return new Response(
        JSON.stringify({
          message: 'User not found in Cognito',
          currentEmail: user.email,
          status: 'user_not_found',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    console.log(`Email changed successfully for user: ${user.email} -> ${newEmail}`);
    return new Response(
      JSON.stringify({
        message: 'Email changed successfully',
        currentEmail: user.email,
        newEmail: newEmail,
        status: 'email_changed',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error) {
    console.error(`Error during email change for ${user.email}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to change email',
        details: error.message,
        currentEmail: user.email,
        newEmail: newEmail,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }
});
