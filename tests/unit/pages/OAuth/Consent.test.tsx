import {
  buildOAuthLoginPath,
  decideOAuthAuthorization,
  getOAuthAuthorizationDetails,
  getVerifiedOAuthSubject,
  redirectToOAuthCallback,
} from '@/services/auth';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
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

  it('renders phone and unknown scopes while safely falling back for a malformed display URI', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      data: { ...details, redirect_uri: 'not-a-url', scope: 'phone custom_scope' },
      error: null,
    } as any);
    render(<OAuthConsentPage />);

    expect(await screen.findByText('not-a-url')).toBeInTheDocument();
    expect(screen.getByText('Read your phone number')).toBeInTheDocument();
    expect(screen.getByText('Request the custom_scope identity permission')).toBeInTheDocument();
  });

  it('renders an explicit empty identity-scope state', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      data: { ...details, scope: '   ' },
      error: null,
    } as any);
    render(<OAuthConsentPage />);
    expect(
      await screen.findByText('No additional identity information requested'),
    ).toBeInTheDocument();
  });

  it('shows a bounded unavailable state for stale authorization details', async () => {
    mockGetAuthorizationDetails.mockResolvedValueOnce({
      data: null,
      error: new Error('expired'),
    } as any);
    const user = userEvent.setup();
    render(<OAuthConsentPage />);

    expect(
      await screen.findByText(
        'This authorization request is invalid, expired, or no longer available.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Return to TianGong LCA' }));
    expect(mockReplace).toHaveBeenCalledWith('/account');
  });

  it('ignores a verified-session result after unmount', async () => {
    const subject = deferred<string | null>();
    mockGetVerifiedOAuthSubject.mockReturnValueOnce(subject.promise);
    const { unmount } = render(<OAuthConsentPage />);
    unmount();
    await act(async () => subject.resolve('user-1'));
    expect(mockGetAuthorizationDetails).not.toHaveBeenCalled();
  });

  it('ignores authorization details that resolve after unmount', async () => {
    const authorization = deferred<any>();
    mockGetAuthorizationDetails.mockReturnValueOnce(authorization.promise);
    const { unmount } = render(<OAuthConsentPage />);
    await waitFor(() => expect(mockGetAuthorizationDetails).toHaveBeenCalled());
    unmount();
    await act(async () => authorization.resolve({ data: details, error: null }));
    expect(mockRedirectToCallback).not.toHaveBeenCalled();
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

  it('reports a failed decision and permits a later retry', async () => {
    const user = userEvent.setup();
    mockDecideAuthorization
      .mockResolvedValueOnce({ data: null, error: new Error('stale') } as any)
      .mockResolvedValueOnce({
        data: { redirect_url: 'https://mcp.tiangong.earth/callback?code=retry' },
        error: null,
      } as any);
    render(<OAuthConsentPage />);

    await user.click(await screen.findByRole('button', { name: /Allow connection/u }));
    expect(
      await screen.findByText(
        'This authorization request is invalid, expired, or no longer available.',
      ),
    ).toBeInTheDocument();
  });

  it('fails closed when a decision response contains an unsafe callback', async () => {
    const user = userEvent.setup();
    mockDecideAuthorization.mockResolvedValueOnce({
      data: { redirect_url: 'javascript:alert(1)' },
      error: null,
    } as any);
    mockRedirectToCallback.mockReturnValueOnce(false);
    render(<OAuthConsentPage />);

    await user.click(await screen.findByRole('button', { name: /Allow connection/u }));
    expect(
      await screen.findByText('The application returned an unsafe callback. Nothing was shared.'),
    ).toBeInTheDocument();
  });

  it('serializes duplicate decision events before the first response settles', async () => {
    const pending = deferred<any>();
    mockDecideAuthorization.mockReturnValueOnce(pending.promise);
    render(<OAuthConsentPage />);
    const button = await screen.findByRole('button', { name: /Allow connection/u });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(mockDecideAuthorization).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({
        data: { redirect_url: 'https://mcp.tiangong.earth/callback?code=one' },
        error: null,
      });
    });
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
