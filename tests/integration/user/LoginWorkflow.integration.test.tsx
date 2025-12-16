/**
 * Integration tests for the login/register workflow.
 * Paths under test:
 * - src/pages/User/Login/index.tsx
 *
 * User journeys covered:
 * - Successful login updates global state and redirects the user.
 * - Successful registration surfaces the success toast and prevents duplicate submissions.
 * - Failed login attempts surface inline validation messaging.
 * - Network errors during login fall back to the global error toast.
 */

import Login from '@/pages/User/Login';
import { login, signUp } from '@/services/auth';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../helpers/testUtils';
import { antdMocks } from '../../mocks/antd';
import { umiMocks } from '../../mocks/umi';
import { umijsMaxMocks } from '../../mocks/umijsMax';

jest.mock('@/services/auth', () => ({
  login: jest.fn(),
  signUp: jest.fn(),
}));

jest.mock('@umijs/max', () => {
  const umi = require('@/tests/mocks/umi');
  const { umijsMaxMocks: maxMocks, createUmijsMaxMock } = require('@/tests/mocks/umijsMax');
  umi.setUmiModel((model: string) => {
    if (model === '@@initialState') {
      return {
        initialState: { fetchUserInfo: maxMocks.fetchUserInfo },
        setInitialState: maxMocks.setInitialState,
      };
    }
    return {};
  });
  return createUmijsMaxMock();
});

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

const mockMessageApi = antdMocks.messageApi;

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

jest.mock('@/components', () => ({
  Footer: () => <div data-testid='footer' />,
}));

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

const mockHistoryPush = umiMocks.historyPush;
const mockFetchUserInfo = umijsMaxMocks.fetchUserInfo;
const mockSetInitialState = umijsMaxMocks.setInitialState;

type AuthResponse = {
  status: 'ok' | 'error' | 'existed';
  type?: string;
  currentAuthority?: string;
  message?: string;
};

type LoginBody = {
  email: string;
  password: string;
  confirmPassword?: string;
  autoLogin: boolean;
  type: 'login' | 'register';
};

type LoginMock = jest.Mock<Promise<AuthResponse>, [body: LoginBody]>;

const mockLogin = login as unknown as LoginMock;
const mockSignUp = signUp as unknown as LoginMock;

describe('Login workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryPush.mockClear();
    mockFetchUserInfo.mockReset();
    mockSetInitialState.mockReset();
    (Object.values(mockMessageApi) as Array<{ mockClear?: () => void }>).forEach((fn) =>
      fn.mockClear?.(),
    );
  });

  it('logs in successfully and redirects to the home page', async () => {
    mockLogin.mockResolvedValue({ status: 'ok' });
    mockFetchUserInfo.mockResolvedValue({ id: 'user-1' });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'P@ssword123' },
    });

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'P@ssword123',
      autoLogin: true,
      type: 'login',
    });

    await waitFor(() => expect(mockFetchUserInfo).toHaveBeenCalledTimes(1));
    expect(mockSetInitialState).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith('/');
    expect(mockMessageApi.success).toHaveBeenCalledWith('Login successful!');
  });

  it('handles registration success by showing toast and disabling follow-up submissions', async () => {
    mockSignUp.mockResolvedValue({ status: 'ok' });

    renderWithProviders(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'N3wP@ssword!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'N3wP@ssword!' },
    });

    const submit = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(submit);

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'N3wP@ssword!',
      confirmPassword: 'N3wP@ssword!',
      autoLogin: true,
      type: 'register',
    });

    expect(mockMessageApi.open).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        content:
          'The email has been sent successfully. Please check your inbox and follow the link to complete the process.',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign Up' })).toBeDisabled());
  });

  it('shows inline error messaging when login credentials are rejected', async () => {
    mockLogin.mockResolvedValue({ status: 'error', type: 'login' });

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'bad@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username/password');
  });

  it('falls back to a toast when the login request throws', async () => {
    mockLogin.mockRejectedValue(new Error('network down'));

    renderWithProviders(<Login />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'P@ssword123' },
    });

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockMessageApi.error).toHaveBeenCalledWith('Login failed, please try again!'),
    );
  });
});
