import {
  buildOAuthLoginPath,
  decideOAuthAuthorization,
  getOAuthAuthorizationDetails,
  getVerifiedOAuthSubject,
  isSafeOAuthCallbackUrl,
  listOAuthGrants,
  parseOAuthAuthorizationId,
  revokeOAuthGrant,
} from '@/services/auth/oauth';
import { supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getClaims: jest.fn(),
      oauth: {
        getAuthorizationDetails: jest.fn(),
        approveAuthorization: jest.fn(),
        denyAuthorization: jest.fn(),
        listGrants: jest.fn(),
        revokeGrant: jest.fn(),
      },
    },
  },
}));

const auth = supabase.auth as unknown as {
  getClaims: jest.Mock;
  oauth: {
    getAuthorizationDetails: jest.Mock;
    approveAuthorization: jest.Mock;
    denyAuthorization: jest.Mock;
    listGrants: jest.Mock;
    revokeGrant: jest.Mock;
  };
};

const authorizationId = '123e4567-e89b-42d3-a456-426614174000';

describe('OAuth auth service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts one UUID authorization_id and rejects malformed or duplicate values', () => {
    expect(parseOAuthAuthorizationId(`?authorization_id=${authorizationId.toUpperCase()}`)).toBe(
      authorizationId,
    );
    expect(parseOAuthAuthorizationId('')).toBeNull();
    expect(parseOAuthAuthorizationId('?authorization_id=javascript:alert(1)')).toBeNull();
    expect(
      parseOAuthAuthorizationId(
        `?authorization_id=${authorizationId}&authorization_id=${authorizationId}`,
      ),
    ).toBeNull();
  });

  it('builds a same-origin relative login continuation and rejects arbitrary redirects', () => {
    expect(buildOAuthLoginPath(authorizationId)).toBe(
      `/user/login?redirect=${encodeURIComponent(
        `/oauth/consent?authorization_id=${authorizationId}`,
      )}`,
    );
    expect(() => buildOAuthLoginPath('https://evil.example/callback')).toThrow(
      'Invalid OAuth authorization request',
    );
  });

  it.each([
    ['https://mcp.tiangong.earth/callback?code=one', true],
    ['http://127.0.0.1:43821/callback', true],
    ['http://localhost:43821/callback', true],
    ['http://[::1]:43821/callback', true],
    ['http://mcp.example/callback', false],
    ['javascript:alert(1)', false],
    ['data:text/html,unsafe', false],
    ['https://user:password@example.com/callback', false],
    ['/relative/callback', false],
  ])('validates OAuth callback %s as %s', (callback, expected) => {
    expect(isSafeOAuthCallbackUrl(callback)).toBe(expected);
  });

  it('uses getClaims for identity verification', async () => {
    auth.getClaims.mockResolvedValueOnce({
      data: { claims: { sub: 'user-1' } },
      error: null,
    });
    expect(await getVerifiedOAuthSubject()).toBe('user-1');

    auth.getClaims.mockResolvedValueOnce({ data: null, error: new Error('invalid') });
    expect(await getVerifiedOAuthSubject()).toBeNull();
  });

  it('delegates authorization details and decisions to the Supabase OAuth API', async () => {
    const detailsResponse = { data: { authorization_id: authorizationId }, error: null };
    auth.oauth.getAuthorizationDetails.mockResolvedValueOnce(detailsResponse);
    await expect(getOAuthAuthorizationDetails(authorizationId)).resolves.toBe(detailsResponse);
    expect(auth.oauth.getAuthorizationDetails).toHaveBeenCalledWith(authorizationId);

    const decisionResponse = {
      data: { redirect_url: 'https://mcp.tiangong.earth/callback?code=one' },
      error: null,
    };
    auth.oauth.approveAuthorization.mockResolvedValueOnce(decisionResponse);
    auth.oauth.denyAuthorization.mockResolvedValueOnce(decisionResponse);

    await expect(decideOAuthAuthorization(authorizationId, 'approve')).resolves.toBe(
      decisionResponse,
    );
    expect(auth.oauth.approveAuthorization).toHaveBeenCalledWith(authorizationId, {
      skipBrowserRedirect: true,
    });
    await expect(decideOAuthAuthorization(authorizationId, 'deny')).resolves.toBe(decisionResponse);
    expect(auth.oauth.denyAuthorization).toHaveBeenCalledWith(authorizationId, {
      skipBrowserRedirect: true,
    });
  });

  it('lists and revokes user grants through Supabase Auth', async () => {
    const grantsResponse = { data: [], error: null };
    const revokeResponse = { data: {}, error: null };
    auth.oauth.listGrants.mockResolvedValueOnce(grantsResponse);
    auth.oauth.revokeGrant.mockResolvedValueOnce(revokeResponse);

    await expect(listOAuthGrants()).resolves.toBe(grantsResponse);
    await expect(revokeOAuthGrant('client-1')).resolves.toBe(revokeResponse);
    expect(auth.oauth.revokeGrant).toHaveBeenCalledWith({ clientId: 'client-1' });
  });
});
