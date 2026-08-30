import { cognitoSignUp, listOAuthGrants, login, revokeOAuthGrant } from '@/services/auth';
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
  cognitoSignUp: jest.fn(),
  listOAuthGrants: jest.fn(),
  login: jest.fn(),
  revokeOAuthGrant: jest.fn(),
}));

const OAuthConnections = require('@/pages/Account/OAuthConnections').default;

const mockListGrants = jest.mocked(listOAuthGrants);
const mockRevokeGrant = jest.mocked(revokeOAuthGrant);
const mockLogin = jest.mocked(login);
const mockCognitoSignUp = jest.mocked(cognitoSignUp);

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
    mockLogin.mockResolvedValue({ status: 'ok' } as any);
    mockCognitoSignUp.mockResolvedValue(undefined);
  });

  it('lists grants and clearly retires password-encoded API keys', async () => {
    render(<OAuthConnections email='user@example.com' />);

    expect(screen.getByText('Password-encoded API keys are retired')).toBeInTheDocument();
    expect(await screen.findByText('TianGong CLI')).toBeInTheDocument();
    expect(screen.getByText('openid')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.queryByText('Generate API Key')).not.toBeInTheDocument();
  });

  it('revokes the selected grant after explicit confirmation', async () => {
    const user = userEvent.setup();
    render(<OAuthConnections email='user@example.com' />);

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
    render(<OAuthConnections email='user@example.com' />);

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
    render(<OAuthConnections email='user@example.com' />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Retry',
      }),
    );
    expect(mockListGrants).toHaveBeenCalledTimes(2);
  });

  it('renders a successful empty grant result and preserves an invalid backend timestamp', async () => {
    mockListGrants.mockResolvedValueOnce({ data: [], error: null } as any);
    const { unmount } = render(<OAuthConnections email='user@example.com' />);
    expect(await screen.findByText('No applications are connected.')).toBeInTheDocument();
    unmount();

    mockListGrants.mockResolvedValueOnce({
      data: [{ ...grant, granted_at: 'not-a-date' }],
      error: null,
    } as any);
    render(<OAuthConnections email='user@example.com' />);
    expect(await screen.findByText('Authorized not-a-date')).toBeInTheDocument();
  });

  it('keeps Cognito provisioning separate and never creates a password-derived key', async () => {
    const user = userEvent.setup();
    render(<OAuthConnections email='user@example.com' />);

    await user.click(await screen.findByText('Legacy compatibility provisioning'));
    await user.type(screen.getByLabelText('Current Password'), 'P@ssword123');
    await user.click(screen.getByRole('button', { name: /Provision legacy access/u }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'P@ssword123',
      }),
    );
    expect(mockCognitoSignUp).toHaveBeenCalledWith('P@ssword123');
    expect(mockMessage.success).toHaveBeenCalledWith('Legacy compatibility access provisioned.');
    expect(screen.queryByText('API Key')).not.toBeInTheDocument();
  });

  it('rejects invalid legacy credentials without provisioning Cognito', async () => {
    mockLogin.mockResolvedValueOnce({ status: 'error' } as any);
    const user = userEvent.setup();
    render(<OAuthConnections email='user@example.com' />);

    await user.click(await screen.findByText('Legacy compatibility provisioning'));
    await user.type(screen.getByLabelText('Current Password'), 'WrongP@ssword');
    await user.click(screen.getByRole('button', { name: /Provision legacy access/u }));

    await waitFor(() =>
      expect(mockMessage.error).toHaveBeenCalledWith(
        'Invalid credentials. Please check your password.',
      ),
    );
    expect(mockCognitoSignUp).not.toHaveBeenCalled();
  });

  it('uses an empty email fallback and reports a Cognito provisioning failure', async () => {
    mockCognitoSignUp.mockRejectedValueOnce(new Error('cognito failed'));
    const user = userEvent.setup();
    render(<OAuthConnections />);

    await user.click(await screen.findByText('Legacy compatibility provisioning'));
    await user.type(screen.getByLabelText('Current Password'), 'P@ssword123');
    await user.click(screen.getByRole('button', { name: /Provision legacy access/u }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({ email: '', password: 'P@ssword123' }),
    );
    expect(mockMessage.error).toHaveBeenCalledWith(
      'Legacy compatibility access could not be provisioned.',
    );
  });
});
