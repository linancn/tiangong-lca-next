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
var mockMessageApi: any;
// eslint-disable-next-line no-var
var mockSetPassword: any;
// eslint-disable-next-line no-var
var mockGetCurrentUser: any;
// eslint-disable-next-line no-var
var mockHistory: any;

jest.mock('umi', () => {
  const React = require('react');
  const actual = jest.requireActual('@umijs/max');
  const useIntl = jest.fn(() => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }));
  const Helmet = ({ children }: any) => <>{children}</>;
  const SelectLang = () => <div data-testid='select-lang' />;
  return {
    __esModule: true,
    ...actual,
    Helmet,
    SelectLang,
    useIntl,
    default: { ...(actual.default || {}), Helmet, SelectLang, useIntl },
  };
});

jest.mock('@umijs/max', () => {
  const React = require('react');
  mockHistory = { push: jest.fn() };
  return {
    __esModule: true,
    FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    history: mockHistory,
    Helmet: ({ children }: any) => <>{children}</>,
    SelectLang: () => <div data-testid='select-lang' />,
    useIntl: () => ({
      formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    }),
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const LoginForm = ({ children, onFinish, submitter, fields }: any) => (
    <div data-testid='login-form'>
      <div data-testid='fields'>{JSON.stringify(fields)}</div>
      {children}
      <button
        type='button'
        data-testid='submit'
        disabled={submitter?.submitButtonProps?.loading}
        onClick={() =>
          onFinish?.({
            email: 'user@test.com',
            newPassword: 'NewPassword1!',
            confirmNewPassword: 'NewPassword1!',
          })
        }
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
  ProFormText.Password = ({ placeholder }: any) => (
    <input placeholder={toText(placeholder)} type='password' />
  );
  return { __esModule: true, LoginForm, ProConfigProvider, ProFormText, ProLayout };
});

jest.mock('antd', () => {
  const React = require('react');
  mockMessageApi = {
    open: jest.fn(),
    error: jest.fn(),
  };
  const App = ({ children }: any) => <div>{children}</div>;
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
  const message = {
    useMessage: () => [mockMessageApi, <div key='holder' data-testid='message-holder' />],
  };
  const theme = {
    defaultAlgorithm: 'default',
    darkAlgorithm: 'dark',
    useToken: () => ({
      token: {
        colorWarning: '#f90',
        colorSuccess: '#0f0',
        colorError: '#f00',
        borderRadius: 8,
        colorTextSecondary: '#8c8c8c',
        colorTextTertiary: '#bfbfbf',
        colorBgTextHover: '#f5f5f5',
      },
    }),
  };
  return { __esModule: true, App, ConfigProvider, Spin, Tabs, message, theme };
});

jest.mock('@/services/auth', () => {
  mockSetPassword = jest.fn();
  mockGetCurrentUser = jest.fn();
  return {
    __esModule: true,
    setPassword: (...args: any[]) => mockSetPassword(...args),
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  };
});

jest.mock('@/components', () => ({
  __esModule: true,
  Footer: () => <div data-testid='footer' />,
}));

const PasswordReset = require('@/pages/User/Login/password_reset').default;
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

describe('PasswordReset page (src/pages/User/Login/password_reset.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetPassword.mockResolvedValue({ status: 'ok' });
    mockGetCurrentUser.mockResolvedValue({ userid: 'u1', email: 'user@test.com' });
  });

  it('loads current user data and submits successfully', async () => {
    render(<PasswordReset />);

    await waitFor(() => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockSetPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        newPassword: 'NewPassword1!',
        confirmNewPassword: 'NewPassword1!',
      });
      expect(mockMessageApi.open).toHaveBeenCalledWith({
        type: 'success',
        content: 'Password reset successfully!',
        duration: 3,
      });
      expect(mockHistory.push).toHaveBeenCalledWith('/');
    });
  });

  it('does not show success toast when service returns error status', async () => {
    mockSetPassword.mockResolvedValueOnce({ status: 'error', message: 'fail' });

    render(<PasswordReset />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockSetPassword).toHaveBeenCalled();
    });
    expect(mockMessageApi.open).not.toHaveBeenCalled();
    expect(mockMessageApi.error).not.toHaveBeenCalled();
    expect(mockHistory.push).not.toHaveBeenCalled();
  });

  it('shows error toast when submit throws', async () => {
    mockSetPassword.mockRejectedValueOnce(new Error('boom'));

    render(<PasswordReset />);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockMessageApi.error).toHaveBeenCalledWith('Password reset failed, please try again.');
    });
    expect(mockHistory.push).not.toHaveBeenCalled();
  });
});
