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
    mockListGrants.mockResolvedValue({ data: [grant], error: null } as any);
    mockRevokeGrant.mockResolvedValue({ data: {}, error: null } as any);
  });

  it('lists grants without exposing password-equivalent controls', async () => {
    render(<OAuthConnections />);

    expect(await screen.findByText('TianGong CLI')).toBeInTheDocument();
    expect(screen.getByText('openid')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.queryByText(/API Key/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy compatibility/u)).not.toBeInTheDocument();
  });

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
