import {
  buildOAuthLoginPath,
  decideOAuthAuthorization,
  getOAuthAuthorizationDetails,
  getVerifiedOAuthSubject,
  redirectToOAuthCallback,
} from '@/services/auth';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authorizationId = '123e4567-e89b-42d3-a456-426614174000';
const mockReplace = jest.fn();
let mockSearch = `?authorization_id=${authorizationId}`;

jest.mock('umi', () => ({
  Helmet: ({ children }: any) => <>{children}</>,
  history: { replace: mockReplace },
  useLocation: () => ({ pathname: '/oauth/consent', search: mockSearch }),
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any, values: Record<string, unknown> = {}) =>
      String(defaultMessage ?? id).replace(/\{(\w+)\}/gu, (placeholder, key) =>
        values[key] === undefined ? placeholder : String(values[key]),
      ),
  }),
}));

jest.mock('@/services/auth', () => ({
  buildOAuthLoginPath: jest.fn(),
  decideOAuthAuthorization: jest.fn(),
  getOAuthAuthorizationDetails: jest.fn(),
  getVerifiedOAuthSubject: jest.fn(),
  parseOAuthAuthorizationId: jest.requireActual('@/services/auth/oauth').parseOAuthAuthorizationId,
  redirectToOAuthCallback: jest.fn(),
}));

const OAuthConsentPage = require('@/pages/OAuth/Consent').default;

const mockGetVerifiedOAuthSubject = jest.mocked(getVerifiedOAuthSubject);
const mockGetAuthorizationDetails = jest.mocked(getOAuthAuthorizationDetails);
const mockDecideAuthorization = jest.mocked(decideOAuthAuthorization);
const mockRedirectToCallback = jest.mocked(redirectToOAuthCallback);
const mockBuildLoginPath = jest.mocked(buildOAuthLoginPath);

const details = {
  authorization_id: authorizationId,
  redirect_uri: 'http://127.0.0.1:43821/callback',
  client: {
    id: 'client-1',
    name: 'TianGong CLI',
    uri: 'https://lca.tiangong.earth',
    logo_uri: '',
  },
  user: { id: 'user-1', email: 'user@example.com' },
  scope: 'openid email profile',
};

describe('OAuth consent page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch = `?authorization_id=${authorizationId}`;
    mockGetVerifiedOAuthSubject.mockResolvedValue('user-1');
    mockGetAuthorizationDetails.mockResolvedValue({ data: details, error: null } as any);
    mockRedirectToCallback.mockReturnValue(true);
    mockBuildLoginPath.mockReturnValue('/user/login?redirect=safe-relative-path');
  });

  it('fails closed without calling Supabase for a malformed authorization ID', async () => {
    mockSearch = '?authorization_id=javascript:alert(1)';

    render(<OAuthConsentPage />);

    expect(
      await screen.findByText('This authorization request is malformed or incomplete.'),
    ).toBeInTheDocument();
    expect(mockGetVerifiedOAuthSubject).not.toHaveBeenCalled();
    expect(mockGetAuthorizationDetails).not.toHaveBeenCalled();
  });

  it('preserves only the validated authorization ID across login', async () => {
    mockGetVerifiedOAuthSubject.mockResolvedValueOnce(null);

    render(<OAuthConsentPage />);

    await waitFor(() => expect(mockBuildLoginPath).toHaveBeenCalledWith(authorizationId));
    expect(mockReplace).toHaveBeenCalledWith('/user/login?redirect=safe-relative-path');
    expect(mockGetAuthorizationDetails).not.toHaveBeenCalled();
  });

  it('renders registered client details and requested identity scopes', async () => {
    render(<OAuthConsentPage />);

    expect(await screen.findByText('Allow TianGong CLI to connect?')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1:43821/callback')).toBeInTheDocument();
    expect(screen.getByText('Confirm your TianGong LCA identity')).toBeInTheDocument();
    expect(screen.getByText('Read your email address')).toBeInTheDocument();
    expect(screen.getByText('Read your basic profile')).toBeInTheDocument();
    expect(screen.getByText('Signed in as user@example.com')).toBeInTheDocument();
  });

  it('approves through Supabase and redirects only through the callback validator', async () => {
    const user = userEvent.setup();
    const redirectUrl = 'http://127.0.0.1:43821/callback?code=one&state=two';
    mockDecideAuthorization.mockResolvedValueOnce({
      data: { redirect_url: redirectUrl },
      error: null,
    } as any);

    render(<OAuthConsentPage />);
    await user.click(await screen.findByRole('button', { name: /Allow connection/u }));

    await waitFor(() =>
      expect(mockDecideAuthorization).toHaveBeenCalledWith(authorizationId, 'approve'),
    );
    expect(mockRedirectToCallback).toHaveBeenCalledWith(redirectUrl);
  });

  it('denies through Supabase without approving the request', async () => {
    const user = userEvent.setup();
    const redirectUrl = 'https://mcp.tiangong.earth/callback?error=access_denied';
    mockDecideAuthorization.mockResolvedValueOnce({
      data: { redirect_url: redirectUrl },
      error: null,
    } as any);

    render(<OAuthConsentPage />);
    await user.click(await screen.findByRole('button', { name: /Deny/u }));

    await waitFor(() =>
      expect(mockDecideAuthorization).toHaveBeenCalledWith(authorizationId, 'deny'),
    );
    expect(mockRedirectToCallback).toHaveBeenCalledWith(redirectUrl);
  });

  it('handles an already-consented redirect without rendering another approval', async () => {
    const redirectUrl = 'https://mcp.tiangong.earth/callback?code=existing';
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      data: { redirect_url: redirectUrl },
      error: null,
    } as any);

    render(<OAuthConsentPage />);

    await waitFor(() => expect(mockRedirectToCallback).toHaveBeenCalledWith(redirectUrl));
    expect(screen.queryByRole('button', { name: /Allow connection/u })).not.toBeInTheDocument();
  });

  it('shows a bounded error when Supabase returns an unsafe callback', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      data: { redirect_url: 'javascript:alert(1)' },
      error: null,
    } as any);
    mockRedirectToCallback.mockReturnValueOnce(false);

    render(<OAuthConsentPage />);

    expect(
      await screen.findByText('The application returned an unsafe callback. Nothing was shared.'),
    ).toBeInTheDocument();
  });
});
