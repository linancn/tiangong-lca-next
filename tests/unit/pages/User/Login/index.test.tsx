// @ts-nocheck
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

// eslint-disable-next-line no-var
var mockHistory: any = { push: jest.fn() };
// eslint-disable-next-line no-var
var mockLogin: jest.Mock = jest.fn();
// eslint-disable-next-line no-var
var mockMessageApi: any = {
  open: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
};
// eslint-disable-next-line no-var
var mockUseModelState: any = {
  initialState: {
    fetchUserInfo: jest.fn(),
  },
  setInitialState: undefined,
};
// eslint-disable-next-line no-var
var mockSetInitialState: jest.Mock = jest.fn((updater: any) => {
  if (typeof updater === 'function') {
    mockUseModelState = updater(mockUseModelState);
  } else {
    mockUseModelState = updater;
  }
});
// eslint-disable-next-line no-var
var mockSignUp: jest.Mock = jest.fn();

mockUseModelState.setInitialState = (...args: any[]) => mockSetInitialState(...args);

jest.mock('umi', () => {
  const React = require('react');

  return {
    __esModule: true,
    Helmet: ({ children }: any) => <>{children}</>,
    history: mockHistory,
    useIntl: () => ({
      locale: 'en-US',
      formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    }),
    useModel: () => mockUseModelState,
  };
});

jest.mock('@umijs/max', () => ({
  __esModule: true,
  Helmet: ({ children }: any) => <>{children}</>,
  FormattedMessage: ({ defaultMessage, id, values }: any) => {
    const baseText = defaultMessage ?? id;
    if (!values) {
      return baseText;
    }

    return Object.entries(values).reduce((text, [key, value]) => {
      return text.replace(`{${key}}`, toText(value));
    }, baseText);
  },
  history: mockHistory,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useModel: () => mockUseModelState,
}));

jest.mock('@/services/auth', () => {
  return {
    __esModule: true,
    login: (...args: any[]) => mockLogin(...args),
    signUp: (...args: any[]) => mockSignUp(...args),
  };
});

jest.mock('../../../../../config/branding', () => ({
  __esModule: true,
  getBrandTheme: (isDarkMode: boolean) => ({
    colorPrimary: isDarkMode ? '#111111' : '#1677ff',
    logo: isDarkMode ? 'dark-logo' : 'light-logo',
  }),
}));

jest.mock('../../../../../config/defaultSettings', () => ({
  __esModule: true,
  defaultAppTitle: 'Tiangong LCA',
  defaultLoginSubtitle: 'Sustainable life cycle data',
  getLocalizedAppTitle: () => 'Tiangong LCA',
  getLocalizedLoginSubtitle: () => 'Sustainable life cycle data',
}));

jest.mock('@/components', () => ({
  __esModule: true,
  Footer: () => <div data-testid='footer' />,
}));

jest.mock('@/pages/User/Login/Components/LoginTopActions', () => ({
  __esModule: true,
  default: ({ isDarkMode, onDarkModeToggle }: any) => (
    <div data-testid='login-top-actions'>
      <span>{isDarkMode ? 'dark' : 'light'}</span>
      <button type='button' onClick={onDarkModeToggle}>
        toggle-dark-mode
      </button>
    </div>
  ),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  LockOutlined: () => <span>lock-icon</span>,
  MailOutlined: () => <span>mail-icon</span>,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const LoginForm = ({ children, onFinish, submitter, initialValues, formRef }: any) => {
    React.useEffect(() => {
      if (formRef) {
        formRef.current = {
          validateFields: jest.fn().mockResolvedValue({
            email: 'user@test.com',
            password: 'Secret123!',
            confirmPassword: 'Secret123!',
            autoLogin: true,
          }),
        };
      }
    }, [formRef]);

    return (
      <div data-testid='login-form'>
        <div data-testid='initial-values'>{JSON.stringify(initialValues)}</div>
        {children}
        {submitter !== false ? (
          <button
            type='button'
            data-testid='login-submit'
            disabled={submitter?.submitButtonProps?.loading}
            onClick={() =>
              onFinish?.({
                email: 'user@test.com',
                password: 'Secret123!',
                autoLogin: true,
              })
            }
          >
            submit-login
          </button>
        ) : null}
      </div>
    );
  };

  const ProConfigProvider = ({ children }: any) => <div>{children}</div>;
  const ProFormCheckbox = ({ children }: any) => <label>{children}</label>;
  const ProFormText = ({ placeholder }: any) => <input placeholder={toText(placeholder)} />;
  ProFormText.Password = ({ placeholder }: any) => (
    <input placeholder={toText(placeholder)} type='password' />
  );
  const ProLayout = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    LoginForm,
    ProConfigProvider,
    ProFormCheckbox,
    ProFormText,
    ProLayout,
  };
});

jest.mock('antd', () => {
  const React = require('react');

  const Alert = ({ message }: any) => <div role='alert'>{message}</div>;
  const App = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, loading }: any) => (
    <button
      type='button'
      disabled={disabled || loading}
      onClick={() => {
        if (!disabled && !loading) {
          onClick?.();
        }
      }}
    >
      {toText(children)}
    </button>
  );
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Tabs = ({ items = [], activeKey, onChange }: any) => (
    <div data-testid='tabs'>
      {items.map((item: any) => (
        <button key={item.key} type='button' onClick={() => onChange?.(item.key)}>
          {item.key === activeKey ? `[active] ${toText(item.label)}` : toText(item.label)}
        </button>
      ))}
    </div>
  );
  const Typography = {
    Link: ({ children, href }: any) => <a href={href}>{toText(children)}</a>,
  };
  const message = {
    useMessage: () => [mockMessageApi, <div key='holder' data-testid='message-holder' />],
  };
  const theme = {
    darkAlgorithm: 'dark',
    defaultAlgorithm: 'default',
    useToken: () => ({
      token: {
        borderRadius: 8,
        colorError: '#ff4d4f',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
      },
    }),
  };

  return {
    __esModule: true,
    Alert,
    App,
    Button,
    ConfigProvider,
    Tabs,
    Typography,
    message,
    theme,
  };
});

const LoginPage = require('@/pages/User/Login').default;

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem('isDarkMode', 'false');
    mockLogin.mockResolvedValue({ status: 'ok' });
    mockSignUp.mockResolvedValue({ status: 'ok' });
    mockUseModelState.initialState = {
      fetchUserInfo: jest.fn().mockResolvedValue({ name: 'Current User' }),
    };
    mockUseModelState.setInitialState = (...args: any[]) => mockSetInitialState(...args);
  });

  it('submits the login flow successfully and redirects after fetching user info', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Secret123!',
        autoLogin: true,
        type: 'login',
      });
      expect(mockMessageApi.success).toHaveBeenCalledWith('Login successful!');
      expect(mockUseModelState.initialState.fetchUserInfo).toHaveBeenCalled();
      expect(mockHistory.push).toHaveBeenCalledWith('/');
    });
  });

  it('redirects to the redirect query parameter after a successful login', async () => {
    window.history.pushState({}, '', '/login?redirect=%2Ftedata%2Fprocesses');

    render(<LoginPage />);

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockHistory.push).toHaveBeenCalledWith('/tedata/processes');
    });

    window.history.pushState({}, '', '/');
  });

  it('shows the login error alert when the login service returns an error status', async () => {
    mockLogin.mockResolvedValueOnce({ status: 'error', type: 'login' });

    render(<LoginPage />);

    fireEvent.click(screen.getByTestId('login-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username/password');
    expect(mockHistory.push).not.toHaveBeenCalled();
  });

  it('submits the register flow and shows a success toast', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Secret123!',
        confirmPassword: 'Secret123!',
        autoLogin: true,
        type: 'register',
      });
      expect(mockMessageApi.open).toHaveBeenCalledWith({
        type: 'success',
        content:
          'The email has been sent successfully. Please check your inbox and follow the link to complete the process.',
        duration: 10,
      });
    });
  });

  it('shows the existed-account register toast and disables the sign-up button', async () => {
    mockSignUp.mockResolvedValueOnce({ status: 'existed' });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => {
      expect(mockMessageApi.open).toHaveBeenCalledWith({
        type: 'error',
        content: 'This email has already been registered. Try Login or Forgot Password?',
        duration: 10,
      });
    });
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeDisabled();
  });

  it('shows the register validation alert when sign-up returns a generic error status', async () => {
    mockSignUp.mockResolvedValueOnce({ status: 'error', type: 'register' });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Validation email failed to send.');
    expect(mockMessageApi.open).not.toHaveBeenCalled();
  });

  it('shows a generic login failure toast when the login request throws', async () => {
    mockLogin.mockRejectedValueOnce(new Error('network down'));

    render(<LoginPage />);

    fireEvent.click(screen.getByTestId('login-submit'));

    await waitFor(() => {
      expect(mockMessageApi.error).toHaveBeenCalledWith('Login failed, please try again!');
    });
    expect(mockHistory.push).not.toHaveBeenCalled();
  });

  it('toggles dark mode from the top actions and persists the updated preference', async () => {
    render(<LoginPage />);

    expect(screen.getByText('light')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'toggle-dark-mode' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('isDarkMode')).toBe('true');
      expect(mockSetInitialState).toHaveBeenCalled();
    });
  });
});
