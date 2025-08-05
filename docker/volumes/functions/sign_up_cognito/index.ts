// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import '@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
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

async function signUpUser(email: string, password: string) {
  try {
    const createCmd = new AdminCreateUserCommand({
      UserPoolId: Deno.env.get('COGNITO_USER_POOL_ID') ?? '',
      Username: email,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
    });

    const createResult = await awsClient.send(createCmd);

    const setPasswordCmd = new AdminSetUserPasswordCommand({
      UserPoolId: Deno.env.get('COGNITO_USER_POOL_ID') ?? '',
      Username: email,
      Password: password,
      Permanent: true,
    });

    await awsClient.send(setPasswordCmd);

    return { success: true, result: createResult, userExists: false };
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log(`User already exists: ${email}`);
      return { success: true, result: null, userExists: true };
    }

    console.error(`Error creating user ${email}:`, error);
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
  const { password } = body;

  if (!password) {
    return new Response('Password is required', { status: 400 });
  }

  try {
    const result = await signUpUser(user.email!, password);

    if (result.userExists) {
      return new Response(
        JSON.stringify({
          message: 'User already exists',
          email: user.email,
          status: 'already_registered',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    console.log(`User registration completed successfully: ${user.email}`);
    return new Response(
      JSON.stringify({
        message: 'User created successfully',
        userId: result.result?.User?.Username,
        userStatus: result.result?.User?.UserStatus,
        email: user.email,
        status: 'created',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (error) {
    console.error(`Error during user registration for ${user.email}:`, error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create user',
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
