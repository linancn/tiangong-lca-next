// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import '@supabase/functions-js/edge-runtime.d.ts';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

import {
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
// Using shared supabaseClient and unified auth middleware (see sign_up_cognito)

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

  // Authenticate the request via unified middleware (JWT only, like sign_up_cognito)
  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    allowedMethods: [AuthMethod.JWT],
    serviceApiKey: Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY') ?? '',
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!; // Already formed with proper headers
  }

  const user = authResult.user;
  if (!user) {
    return new Response('User Not Found', {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { newEmail } = body;

  if (!newEmail) {
    return new Response('New email is required', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return new Response('Invalid email format', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
