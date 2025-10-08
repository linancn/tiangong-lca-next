// @ts-nocheck
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

jest.mock('@/services/auth', () => ({
  login: jest.fn(),
  signUp: jest.fn(),
}));

jest.mock('@umijs/max', () => {
  const React = require('react');
  const mockHistoryPush = jest.fn();
  const mockFetchUserInfo = jest.fn();
  const mockSetInitialState = jest.fn();

  const renderWithValues = (message, values) => {
    if (!values) {
      return message;
    }
    const parts = message.split(/(\{[^}]+\})/g);
    return parts.map((part, index) => {
      const match = part.match(/^\{(.+)\}$/);
      if (match) {
        const value = values[match[1]];
        return <React.Fragment key={index}>{value}</React.Fragment>;
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  return {
    __esModule: true,
    FormattedMessage: ({ defaultMessage, id, values }) => (
      <span>{renderWithValues(defaultMessage ?? id, values)}</span>
    ),
    useIntl: () => ({
      locale: 'en-US',
      formatMessage: ({ defaultMessage, id }) => defaultMessage ?? id,
    }),
    useModel: (model) => {
      if (model === '@@initialState') {
        return {
          initialState: {
            fetchUserInfo: mockFetchUserInfo,
          },
          setInitialState: mockSetInitialState,
        };
      }
      return {};
    },
    history: {
      push: mockHistoryPush,
    },
    SelectLang: (props) => <div data-testid='select-lang' {...props} />,
    Helmet: ({ children }) => <>{children}</>,
    __mockHistoryPush: mockHistoryPush,
    __mockFetchUserInfo: mockFetchUserInfo,
    __mockSetInitialState: mockSetInitialState,
  };
});

jest.mock('@ant-design/icons', () => ({
  LockOutlined: () => <span data-testid='icon-lock' />,
  MailOutlined: () => <span data-testid='icon-mail' />,
}));

const mockMessageApi = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  open: jest.fn(),
};

jest.mock('antd', () => {
  const React = require('react');

  const Tabs = ({ items = [], activeKey, onChange }) => (
    <div data-testid='tabs'>
      {(items ?? []).map((item) => (
        <button
          type='button'
          key={item.key}
          data-active={item.key === activeKey ? 'true' : 'false'}
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  const Button = ({ children, onClick, disabled, type, loading }) => (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      onClick={onClick}
      disabled={disabled}
      data-loading={loading ? 'true' : 'false'}
    >
      {children}
    </button>
  );

  const Alert = ({ message }) => <div role='alert'>{message}</div>;

  const ConfigProvider = ({ children }) => <>{children}</>;
  const App = ({ children }) => <>{children}</>;

  return {
    __esModule: true,
    App,
    Alert,
    Button,
    ConfigProvider,
    Tabs,
    Typography: {
      Link: ({ children, ...rest }) => <a {...rest}>{children}</a>,
    },
    message: {
      useMessage: () => [mockMessageApi, <div key='message-holder' data-testid='message-holder' />],
    },
    theme: {
      defaultAlgorithm: 'default',
      darkAlgorithm: 'dark',
      useToken: () => ({
        token: {
          colorWarning: 'orange',
          colorSuccess: 'green',
          colorError: 'red',
        },
      }),
    },
  };
});

jest.mock('@/components', () => ({
  Footer: () => <div data-testid='footer' />,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const FormContext = React.createContext(null);

  const LoginFormMock = ({ children, formRef, initialValues = {}, onFinish, submitter = {} }) => {
    const [values, setValues] = React.useState({ ...initialValues });

    React.useImperativeHandle(formRef, () => ({
      validateFields: () => Promise.resolve({ ...values }),
      setFieldsValue: (nextValues) => setValues((prev) => ({ ...prev, ...nextValues })),
    }));

    const setFieldValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

    const handleSubmit = (event) => {
      event.preventDefault();
      onFinish?.({ ...values });
    };

    return (
      <form onSubmit={handleSubmit} data-testid='login-form'>
        <FormContext.Provider value={{ values, setFieldValue }}>
          {typeof children === 'function' ? children({}) : children}
        </FormContext.Provider>
        {submitter !== false ? (
          <button
            type='submit'
            data-testid='login-submit'
            disabled={submitter?.submitButtonProps?.disabled}
            data-loading={submitter?.submitButtonProps?.loading ? 'true' : 'false'}
          >
            Login
          </button>
        ) : null}
      </form>
    );
  };

  const ProFormText = ({ name, placeholder, fieldProps = {} }) => {
    const ctx = React.useContext(FormContext);
    const value = ctx?.values?.[name] ?? '';
    const inputType = fieldProps.type ?? 'text';

    return (
      <label>
        {placeholder ?? name}
        <input
          aria-label={placeholder ?? name}
          name={name}
          value={value}
          type={inputType}
          onChange={(event) => ctx?.setFieldValue?.(name, event.target.value)}
        />
      </label>
    );
  };

  const ProFormPassword = (props) => (
    <ProFormText {...props} fieldProps={{ ...(props.fieldProps ?? {}), type: 'password' }} />
  );

  ProFormText.Password = ProFormPassword;

  const ProFormCheckbox = ({ name, children }) => {
    const ctx = React.useContext(FormContext);
    const checked = Boolean(ctx?.values?.[name]);
    return (
      <label>
        <input
          type='checkbox'
          name={name}
          checked={checked}
          onChange={(event) => ctx?.setFieldValue?.(name, event.target.checked)}
        />
        <span>{children}</span>
      </label>
    );
  };

  const ProConfigProvider = ({ children }) => <>{children}</>;
  const ProLayout = ({ children }) => <div data-testid='pro-layout'>{children}</div>;

  return {
    __esModule: true,
    LoginForm: LoginFormMock,
    ProFormCheckbox,
    ProFormText,
    ProConfigProvider,
    ProLayout,
  };
});

const umi = require('@umijs/max');
const mockHistoryPush = umi.__mockHistoryPush;
const mockFetchUserInfo = umi.__mockFetchUserInfo;
const mockSetInitialState = umi.__mockSetInitialState;

const mockLogin = login;
const mockSignUp = signUp;

describe('Login workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistoryPush.mockClear();
    mockFetchUserInfo.mockReset();
    mockSetInitialState.mockReset();
    Object.values(mockMessageApi).forEach((fn) => fn.mockClear?.());
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
