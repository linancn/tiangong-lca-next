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
var mockNotification: any;
// eslint-disable-next-line no-var
var mockForgotPasswordSendEmail: any;
// eslint-disable-next-line no-var
var mockGetCurrentUser: any;

jest.mock('umi', () => {
  const React = require('react');
  const actual = jest.requireActual('@umijs/max');
  const useIntl = jest.fn(() => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }));
  return {
    __esModule: true,
    ...actual,
    Helmet: ({ children }: any) => <>{children}</>,
    Link: ({ to, children }: any) => (
      <a href={to as any} data-testid='link'>
        {children}
      </a>
    ),
    SelectLang: () => <div data-testid='select-lang' />,
    useIntl,
    default: {
      ...(actual.default || {}),
      Helmet: ({ children }: any) => <>{children}</>,
      Link: ({ to, children }: any) => <a href={to as any}>{children}</a>,
      SelectLang: () => <div data-testid='select-lang' />,
      useIntl,
    },
  };
});

jest.mock('@umijs/max', () => {
  const React = require('react');
  return {
    __esModule: true,
    FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    Helmet: ({ children }: any) => <>{children}</>,
    Link: ({ to, children }: any) => (
      <a href={to as any} data-testid='link'>
        {children}
      </a>
    ),
    SelectLang: () => <div data-testid='select-lang' />,
    useIntl: () => ({
      formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    }),
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const LoginForm = ({ children, onFinish, submitter, initialValues }: any) => (
    <div data-testid='login-form'>
      <div data-testid='initial-values'>{JSON.stringify(initialValues)}</div>
      {children}
      <button
        type='button'
        data-testid='submit'
        disabled={submitter?.submitButtonProps?.disabled}
        onClick={() => onFinish?.({ email: 'user@test.com' })}
      >
        {toText(submitter?.searchConfig?.submitText) || 'submit'}
      </button>
    </div>
  );
  const ProConfigProvider = ({ children }: any) => <div>{children}</div>;
  const ProFormText = ({ placeholder, disabled }: any) => (
    <input placeholder={toText(placeholder)} disabled={disabled} />
  );
  const ProLayout = ({ children }: any) => <div>{children}</div>;
  return { __esModule: true, LoginForm, ProConfigProvider, ProFormText, ProLayout };
});

jest.mock('antd', () => {
  const React = require('react');
  mockNotification = {
    success: jest.fn(),
    error: jest.fn(),
  };
  const App = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(children)}
    </button>
  );
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;
  const Tabs = ({ items }: any) => (
    <div data-testid='tabs'>
      {items?.map((item: any) => (
        <span key={item.key}>{toText(item.label)}</span>
      ))}
    </div>
  );
  const theme = { defaultAlgorithm: 'default', darkAlgorithm: 'dark' };
  return {
    __esModule: true,
    App,
    Button,
    ConfigProvider,
    Spin,
    Tabs,
    notification: mockNotification,
    theme,
  };
});

jest.mock('@/services/auth', () => {
  mockForgotPasswordSendEmail = jest.fn();
  mockGetCurrentUser = jest.fn();
  return {
    __esModule: true,
    forgotPasswordSendEmail: (...args: any[]) => mockForgotPasswordSendEmail(...args),
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  };
});

jest.mock('@/components', () => ({
  __esModule: true,
  Footer: () => <div data-testid='footer' />,
}));

const PasswordForgot = require('@/pages/User/Login/password_forgot').default;
const umiModule = require('umi');
if (umiModule.useIntl) {
  jest.spyOn(umiModule, 'useIntl').mockImplementation(() => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }));
} else {
  umiModule.useIntl = jest.fn(() => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }));
}
umiModule.default = { ...(umiModule.default || {}), useIntl: umiModule.useIntl };

describe('PasswordForgot page (src/pages/User/Login/password_forgot.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ email: 'init@test.com' });
    mockForgotPasswordSendEmail.mockResolvedValue({ status: 'ok' });
  });

  it('submits successfully and shows back to login', async () => {
    const { App, Button, ConfigProvider, Spin, Tabs } = require('antd');
    const {
      LoginForm,
      ProConfigProvider,
      ProFormText,
      ProLayout,
    } = require('@ant-design/pro-components');
    expect(typeof App).toBe('function');
    expect(typeof Button).toBe('function');
    expect(typeof ConfigProvider).toBe('function');
    expect(typeof Spin).toBe('function');
    expect(typeof Tabs).toBe('function');
    expect(typeof LoginForm).toBe('function');
    expect(typeof ProConfigProvider).toBe('function');
    expect(typeof ProFormText).toBe('function');
    expect(typeof ProLayout).toBe('function');

    render(<PasswordForgot />);

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockForgotPasswordSendEmail).toHaveBeenCalledWith({ email: 'user@test.com' });
      expect(mockNotification.success).toHaveBeenCalled();
    });

    expect(screen.getByText('Back to Login')).toBeInTheDocument();
    expect(screen.getByTestId('submit')).toBeDisabled();
  });

  it('shows notification error when service returns failure', async () => {
    mockForgotPasswordSendEmail.mockResolvedValueOnce({ status: 'error', message: 'nope' });

    render(<PasswordForgot />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith({
        message: 'The email was not sent successfully, please try again!',
        description: 'nope',
        placement: 'top',
      });
    });
    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  it('handles thrown error by showing notification error', async () => {
    mockForgotPasswordSendEmail.mockRejectedValueOnce(new Error('boom'));

    render(<PasswordForgot />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockNotification.error).toHaveBeenCalledWith({
        message: 'The email was not sent successfully, please try again!',
        description: 'Error: boom',
        placement: 'top',
      });
    });
  });
});
