import { listOAuthGrants, revokeOAuthGrant } from '@/services/auth';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMessage = { error: jest.fn(), success: jest.fn() };
const mockConfirm = jest.fn();

jest.mock('@/contexts/AntdAppContext', () => ({
  useAntdAppApi: () => ({ message: mockMessage, modal: { confirm: mockConfirm } }),
}));

jest.mock('@umijs/max', () => ({
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any, values: Record<string, unknown> = {}) =>
      String(defaultMessage ?? id).replace(/\{(\w+)\}/gu, (placeholder, key) =>
        values[key] === undefined ? placeholder : String(values[key]),
      ),
  }),
}));

jest.mock('@/services/auth', () => ({
  listOAuthGrants: jest.fn(),
  revokeOAuthGrant: jest.fn(),
}));

const OAuthConnections = require('@/pages/Account/OAuthConnections').default;

const mockListGrants = jest.mocked(listOAuthGrants);
const mockRevokeGrant = jest.mocked(revokeOAuthGrant);
const originalNodeEnv = process.env.NODE_ENV;

const grant = {
  client: {
    id: 'client-1',
    name: 'TianGong CLI',
    uri: 'https://lca.tiangong.earth',
    logo_uri: '',
  },
  scopes: ['openid', 'email'],
  granted_at: '2026-08-31T08:00:00.000Z',
};

describe('OAuthConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    window.history.replaceState({}, '', '/');
    mockListGrants.mockResolvedValue({ data: [grant], error: null } as any);
    mockRevokeGrant.mockResolvedValue({ data: {}, error: null } as any);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    window.history.replaceState({}, '', '/');
  });

  it('lists grants without exposing password-equivalent controls', async () => {
    render(<OAuthConnections />);

    expect(await screen.findByText('TianGong CLI')).toBeInTheDocument();
    expect(screen.queryByText(/^Permissions:/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'appstore' })).not.toBeInTheDocument();
    expect(screen.getByText(/^Authorized /u)).toBeInTheDocument();
    expect(screen.getByText('1 connected applications')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.queryByText(/API Key/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy compatibility/u)).not.toBeInTheDocument();
  });

  it.each(['/?mockOAuthConnections=1#/account', '/#/account?mockOAuthConnections=1'])(
    'uses OAuth APIs even when an obsolete preview flag is present: %s',
    async (url) => {
      process.env.NODE_ENV = 'development';
      window.history.pushState({}, '', url);
      const user = userEvent.setup();
      render(<OAuthConnections />);

      expect(await screen.findByText('TianGong CLI')).toBeInTheDocument();
      expect(screen.queryByText('LCA Data Studio')).not.toBeInTheDocument();
      expect(screen.getByText('1 connected applications')).toBeInTheDocument();
      expect(mockListGrants).toHaveBeenCalledTimes(1);

      await user.click(screen.getAllByRole('button', { name: /Disconnect/u })[0]);
      const confirmation = mockConfirm.mock.calls[0][0];
      await act(async () => {
        await confirmation.onOk();
      });

      expect(mockRevokeGrant).toHaveBeenCalledWith('client-1');
      expect(screen.queryByText('TianGong CLI')).not.toBeInTheDocument();
      expect(await screen.findByText('No applications are connected.')).toBeInTheDocument();
    },
  );

  it.each([{ scopes: ['profile', 'offline_access', 'custom_scope', 'profile'] }, { scopes: [] }])(
    'keeps application details without a permissions summary: $scopes',
    async ({ scopes }) => {
      mockListGrants.mockResolvedValueOnce({ data: [{ ...grant, scopes }], error: null } as any);
      render(<OAuthConnections />);
      expect(await screen.findByText('TianGong CLI')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Disconnect/u })).toBeInTheDocument();
      expect(screen.queryByText(/^Permissions:/u)).not.toBeInTheDocument();
      expect(screen.queryByText(/custom_scope|No additional permissions/u)).not.toBeInTheDocument();
    },
  );

  it('revokes the selected grant after explicit confirmation', async () => {
    const user = userEvent.setup();
    render(<OAuthConnections />);

    await user.click(await screen.findByRole('button', { name: /Disconnect/u }));
    const confirmation = mockConfirm.mock.calls[0][0];
    await act(async () => {
      await confirmation.onOk();
    });

    expect(mockRevokeGrant).toHaveBeenCalledWith('client-1');
    expect(mockMessage.success).toHaveBeenCalledWith('Application disconnected.');
    await waitFor(() => expect(screen.queryByText('TianGong CLI')).not.toBeInTheDocument());
  });

  it('keeps the grant visible and reports a failed revocation', async () => {
    const user = userEvent.setup();
    const revokeError = new Error('revoke failed');
    mockRevokeGrant.mockResolvedValueOnce({ data: null, error: revokeError } as any);
    render(<OAuthConnections />);

    await user.click(await screen.findByRole('button', { name: /Disconnect/u }));
    const confirmation = mockConfirm.mock.calls[0][0];
    await act(async () => {
      await expect(confirmation.onOk()).rejects.toBe(revokeError);
    });

    expect(mockMessage.error).toHaveBeenCalledWith(
      'The connection could not be revoked. Try again.',
    );
    expect(screen.getByText('TianGong CLI')).toBeInTheDocument();
  });

  it('shows a retryable error instead of an empty grant list on transport failure', async () => {
    mockListGrants.mockResolvedValueOnce({ data: null, error: new Error('offline') } as any);
    const user = userEvent.setup();
    render(<OAuthConnections />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Retry',
      }),
    );
    expect(mockListGrants).toHaveBeenCalledTimes(2);
  });

  it('renders a successful empty grant result and preserves an invalid backend timestamp', async () => {
    mockListGrants.mockResolvedValueOnce({ data: [], error: null } as any);
    const { unmount } = render(<OAuthConnections />);
    expect(await screen.findByText('No applications are connected.')).toBeInTheDocument();
    unmount();

    mockListGrants.mockResolvedValueOnce({
      data: [{ ...grant, granted_at: 'not-a-date' }],
      error: null,
    } as any);
    render(<OAuthConnections />);
    expect(await screen.findByText('Authorized not-a-date')).toBeInTheDocument();
  });
});
