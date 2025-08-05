import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { corsHeaders } from './cors.ts';

export interface AuthResult {
  isAuthenticated: boolean;
  userId?: string;
  response?: Response;
  email?: string;
}

// Create Cognito JWT verifier for access tokens
const verifier = CognitoJwtVerifier.create({
  userPoolId: 'us-east-1_SnSYiMoND',
  tokenUse: 'access',
  clientId: '3p182unuqch7rahbp0trs1sprv',
});

/**
 * Authenticate Cognito JWT access token
 * @param token - JWT access token
 * @returns AuthResult containing authentication status and user information
 */
export async function authenticateCognitoToken(token: string): Promise<AuthResult> {
  try {
    // Verify JWT token directly with AWS Cognito
    const payload = await verifier.verify(token);

    // Extract user information from token payload
    const userId = (payload.sub as string) || (payload['cognito:username'] as string);
    const email = (payload.email as string) || (payload['cognito:email'] as string);

    if (!userId) {
      return {
        isAuthenticated: false,
        response: new Response('Invalid token: missing user ID', {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }),
      };
    }

    return {
      isAuthenticated: true,
      userId,
      email,
    };
  } catch (error) {
    console.error('Cognito token verification failed:', error);
    return {
      isAuthenticated: false,
      response: new Response(error instanceof Error ? error.message : 'Token verification failed', {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }
}
