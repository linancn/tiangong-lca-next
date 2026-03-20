// @ts-nocheck
/**
 * Unit tests for src/pages/Account/index.tsx.
 *
 * Focus:
 * - API key generation workflow (success and failure branches).
 */

import Profile from '@/pages/Account';
import {
  changeEmail,
  changePassword,
  cognitoChangeEmail,
  cognitoChangePassword,
  cognitoSignUp,
  getCurrentUser,
  login,
  setProfile,
} from '@/services/auth';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import { renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

const mockSetInitialState = jest.fn();

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
  useModel: (model: string) => {
    if (model === '@@initialState') {
      return {
        setInitialState: mockSetInitialState,
        initialState: {
          currentUser: {
            name: 'Alice',
          },
        },
      };
    }
    return {};
  },
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  IdcardOutlined: () => <span data-testid='icon-idcard' />,
  LockOutlined: () => <span data-testid='icon-lock' />,
  MailOutlined: () => <span data-testid='icon-mail' />,
  UserOutlined: () => <span data-testid='icon-user' />,
}));

jest.mock('antd', () => {
  const React = require('react');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const FormContext = React.createContext<any>(null);

  const Form = React.forwardRef(({ children, initialValues = {} }: any, ref: any) => {
    const [values, setValues] = React.useState<Record<string, any>>(initialValues ?? {});
    const rulesRef = React.useRef<Record<string, any[]>>({});

    const registerRules = React.useCallback((name: string, rules: any[] = []) => {
      if (!name) return;
      rulesRef.current[name] = rules;
    }, []);

    const setFieldValue = React.useCallback((name: string, value: any) => {
      if (!name) return;
      setValues((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetFields = React.useCallback(() => {
      setValues(initialValues ?? {});
    }, [initialValues]);

    const setFieldsValue = React.useCallback((fields: Record<string, any> = {}) => {
      setValues((previous) => ({ ...previous, ...fields }));
    }, []);

    const getFieldValue = React.useCallback(
      (name: string) => (name ? values[name] : undefined),
      [values],
    );

    const validateFields = React.useCallback(async () => {
      const errors: any[] = [];
      for (const [field, rules] of Object.entries(rulesRef.current)) {
        const value = values[field];
        for (const rule of rules ?? []) {
          const messageText = toText(rule?.message) || 'Validation failed';
          if (
            rule?.required &&
            (value === undefined || value === null || value === '' || Number.isNaN(value))
          ) {
            errors.push({ name: [field], errors: [messageText] });
          }
          if (rule?.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
            errors.push({ name: [field], errors: [messageText] });
          }
          if (
            rule?.type === 'email' &&
            typeof value === 'string' &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) {
            errors.push({ name: [field], errors: [messageText] });
          }
          if (typeof rule?.validator === 'function') {
            try {
              await rule.validator({}, value);
            } catch (error: any) {
              errors.push({
                name: [field],
                errors: [error?.message || messageText],
              });
            }
          }
        }
      }
      if (errors.length) {
        const submitError: any = new Error('Validation failed');
        submitError.errorFields = errors;
        throw submitError;
      }
      return values;
    }, [values]);

    React.useImperativeHandle(
      ref,
      () => ({
        validateFields,
        resetFields,
        setFieldsValue,
        getFieldValue,
      }),
      [validateFields, resetFields, setFieldsValue, getFieldValue],
    );

    const contextValue = React.useMemo(
      () => ({
        values,
        setFieldValue,
        registerRules,
      }),
      [values, setFieldValue, registerRules],
    );

    return (
      <FormContext.Provider value={contextValue}>
        <form data-testid='form'>{children}</form>
      </FormContext.Provider>
    );
  });
  Form.displayName = 'MockForm';
  Form.__Context = FormContext;

  const FormItem = ({
    name,
    label,
    rules = [],
    children,
    valuePropName = 'value',
    help,
    validateStatus,
  }: any) => {
    const context = React.useContext(FormContext);
    const fieldName = Array.isArray(name) ? name.join('.') : name;

    React.useEffect(() => {
      if (fieldName) {
        context?.registerRules?.(fieldName, rules);
      }
    }, [context, fieldName, rules]);

    const currentValue =
      fieldName !== undefined && fieldName !== null ? context?.values?.[fieldName] : undefined;
    const valueProps =
      currentValue !== undefined
        ? { [valuePropName]: currentValue }
        : valuePropName === 'checked'
          ? { checked: false }
          : { [valuePropName]: '' };

    const handleChange = (eventOrValue: any) => {
      let nextValue = eventOrValue;
      if (valuePropName === 'checked') {
        if (typeof eventOrValue === 'boolean') {
          nextValue = eventOrValue;
        } else if (eventOrValue?.target) {
          nextValue = eventOrValue.target.checked;
        }
      } else if (eventOrValue?.target) {
        nextValue = eventOrValue.target.value;
      }
      if (fieldName) {
        context?.setFieldValue?.(fieldName, nextValue);
      }
      if (children?.props?.onChange) {
        children.props.onChange(eventOrValue);
      }
    };

    const controlId = fieldName ? `form-field-${fieldName}` : undefined;

    return (
      <div data-testid={`form-item-${fieldName ?? 'unnamed'}`} data-status={validateStatus ?? ''}>
        {label ? <label htmlFor={controlId}>{toText(label)}</label> : null}
        {React.isValidElement(children)
          ? React.cloneElement(children, {
              ...(controlId ? { id: controlId } : {}),
              ...valueProps,
              onChange: handleChange,
            })
          : children}
        {help ? <div>{toText(help)}</div> : null}
      </div>
    );
  };

  Form.Item = FormItem;

  const Input = React.forwardRef(
    ({ value = '', onChange, type = 'text', ...rest }: any, ref: any) => (
      <input
        ref={ref}
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange?.(event)}
        {...rest}
      />
    ),
  );
  Input.displayName = 'MockInput';

  const Password = React.forwardRef(({ value = '', onChange, ...rest }: any, ref: any) => (
    <input
      ref={ref}
      type='password'
      value={value ?? ''}
      onChange={(event) => onChange?.(event)}
      {...rest}
    />
  ));
  Password.displayName = 'MockPasswordInput';

  const TextArea = React.forwardRef(({ value = '', onChange, ...rest }: any, ref: any) => {
    const textareaProps = { ...(rest ?? {}) };
    delete textareaProps.autoSize;
    return (
      <textarea
        ref={ref}
        value={value ?? ''}
        onChange={(event) => onChange?.(event)}
        {...textareaProps}
      />
    );
  });
  TextArea.displayName = 'MockTextArea';

  Input.Password = Password;
  Input.TextArea = TextArea;

  const Tabs = ({ items = [], activeKey, onChange }: any) => (
    <div data-testid='tabs'>
      {items.map((item: any) => (
        <div key={item.key}>
          <button type='button' onClick={() => onChange?.(item.key)}>
            {toText(item.label)}
          </button>
          {item.key === activeKey ? <div>{item.children}</div> : null}
        </div>
      ))}
    </div>
  );

  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const Flex = ({ children }: any) => <div data-testid='flex'>{children}</div>;

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  const theme = {
    useToken: () => ({
      token: {
        colorWarning: 'orange',
        colorSuccess: 'green',
        colorError: 'red',
      },
    }),
  };

  return {
    __esModule: true,
    ConfigProvider,
    Flex,
    Form,
    Input,
    Spin,
    Tabs,
    message,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const { Form, Input } = require('antd');

  const sanitizeFieldProps = (props: Record<string, any> = {}) => {
    const clone = { ...(props ?? {}) };
    delete clone.statusRender;
    delete clone.strengthText;
    delete clone.autoSize;
    return clone;
  };

  const ProForm = ({ formRef, onFinish, submitter, children }: any) => {
    const internalFormRef = React.useRef<any>(null);

    React.useEffect(() => {
      if (formRef) {
        formRef.current = internalFormRef.current;
      }
    });

    const handleSubmit = async (event?: any) => {
      event?.preventDefault?.();
      try {
        if (formRef) {
          formRef.current = internalFormRef.current;
        }
        const values = (await internalFormRef.current?.validateFields?.()) ?? {};
        await onFinish?.(values);
      } catch (error) {
        return false;
      }
    };

    const submitText = submitter?.searchConfig?.submitText ?? 'submit';

    const defaultButton = (
      <button
        key='submit-default'
        type='button'
        onClick={handleSubmit}
        data-testid='pro-form-submit'
      >
        {submitText}
      </button>
    );

    const renderedSubmitter = submitter?.render?.(null, [defaultButton]) ?? [defaultButton];
    const submitNodes = Array.isArray(renderedSubmitter) ? renderedSubmitter : [renderedSubmitter];

    return (
      <Form ref={internalFormRef}>
        <fieldset>{typeof children === 'function' ? children({}) : children}</fieldset>
        <div data-testid='pro-form-submitter'>
          {submitNodes.map((node, index) => (
            <React.Fragment key={`submit-${index}`}>{node}</React.Fragment>
          ))}
        </div>
      </Form>
    );
  };

  const ProFormText = ({ name, label, rules, fieldProps, placeholder, tooltip }: any) => (
    <Form.Item name={name} label={label} rules={rules} tooltip={tooltip}>
      <Input placeholder={placeholder} {...sanitizeFieldProps(fieldProps)} />
    </Form.Item>
  );

  const ProFormPassword = ({ fieldProps, ...rest }: any) => {
    const context = React.useContext(Form.__Context);
    const fieldValue = context?.values?.[rest.name];
    const statusNode =
      typeof fieldProps?.statusRender === 'function' ? fieldProps.statusRender(fieldValue) : null;

    return (
      <>
        <Form.Item {...rest}>
          <Input.Password {...sanitizeFieldProps(fieldProps)} placeholder={rest.placeholder} />
        </Form.Item>
        {statusNode ? <div data-testid={`status-${rest.name}`}>{toText(statusNode)}</div> : null}
      </>
    );
  };
  ProFormPassword.displayName = 'MockProFormPassword';
  ProFormText.Password = ProFormPassword;

  const PageContainer = ({ title, children }: any) => (
    <div data-testid='page-container'>
      <h1>{toText(title)}</h1>
      <div>{children}</div>
    </div>
  );

  return {
    __esModule: true,
    ProForm,
    ProFormText,
    PageContainer,
  };
});

jest.mock('@/services/auth', () => ({
  __esModule: true,
  changeEmail: jest.fn(),
  changePassword: jest.fn(),
  cognitoChangeEmail: jest.fn(),
  cognitoChangePassword: jest.fn(),
  cognitoSignUp: jest.fn(),
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  setProfile: jest.fn(),
}));

const mockSetProfile = setProfile as jest.MockedFunction<any>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<any>;
const mockChangePassword = changePassword as jest.MockedFunction<any>;
const mockChangeEmail = changeEmail as jest.MockedFunction<any>;
const mockCognitoChangePassword = cognitoChangePassword as jest.MockedFunction<any>;
const mockCognitoChangeEmail = cognitoChangeEmail as jest.MockedFunction<any>;
const mockCognitoSignUp = cognitoSignUp as jest.MockedFunction<any>;
const mockLogin = login as jest.MockedFunction<any>;

describe('Account profile page (unit)', () => {
  beforeAll(() => {
    if (typeof global.btoa === 'undefined') {
      global.btoa = (input: string) => Buffer.from(input, 'binary').toString('base64');
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetInitialState.mockReset();

    mockGetCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Alice',
      role: 'admin',
    } as any);

    mockSetProfile.mockResolvedValue({ status: 'ok' } as any);
    mockChangePassword.mockResolvedValue({ status: 'ok' } as any);
    mockChangeEmail.mockResolvedValue({ status: 'ok' } as any);
    mockCognitoChangePassword.mockResolvedValue(undefined as any);
    mockCognitoChangeEmail.mockResolvedValue(undefined as any);
    mockCognitoSignUp.mockResolvedValue(undefined as any);
    mockLogin.mockResolvedValue({ status: 'ok' } as any);
  });

  it('loads and updates basic profile information successfully', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('spin').getAttribute('data-spinning')).toBe('false'),
    );

    const emailField = screen.getByLabelText('Email') as HTMLInputElement;
    expect(emailField.value).toBe('user@example.com');
    expect(emailField).toBeDisabled();

    const roleField = screen.getByLabelText('Role') as HTMLInputElement;
    expect(roleField.value).toBe('admin');
    expect(roleField).toBeDisabled();

    const nicknameField = screen.getByLabelText('Nickname') as HTMLInputElement;
    expect(nicknameField.value).toBe('Alice');

    await user.clear(nicknameField);
    await user.type(nicknameField, 'Alice Prime');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(mockSetProfile).toHaveBeenCalledTimes(1));
    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        name: 'Alice Prime',
        role: 'admin',
      }),
    );

    expect(message.success).toHaveBeenCalledWith('Edit Successfully!');
    expect(mockSetInitialState).toHaveBeenCalledTimes(1);

    const updater = mockSetInitialState.mock.calls[0][0];
    const updatedState = updater({ currentUser: { name: 'Old Name', locale: 'en-US' } });
    expect(updatedState.currentUser.name).toBe('Alice Prime');
    expect(updatedState.currentUser.locale).toBe('en-US');
  });

  it('handles unexpected errors during profile update gracefully', async () => {
    mockSetProfile.mockRejectedValueOnce(new Error('network down'));

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('spin').getAttribute('data-spinning')).toBe('false'),
    );

    const nicknameField = screen.getByLabelText('Nickname') as HTMLInputElement;
    await user.clear(nicknameField);
    await user.type(nicknameField, 'Alice Error');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith('An error occurred while updating the profile.'),
    );

    expect(mockSetProfile).toHaveBeenCalledTimes(1);
    expect(mockSetInitialState).not.toHaveBeenCalled();
    expect(message.success).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByTestId('spin').getAttribute('data-spinning')).toBe('false'),
    );
  });

  it('shows backend feedback when profile update returns a business error', async () => {
    mockSetProfile.mockResolvedValueOnce({ status: 'error', message: 'Update denied' } as any);

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    const nicknameField = screen.getByLabelText('Nickname') as HTMLInputElement;
    await user.clear(nicknameField);
    await user.type(nicknameField, 'Alice Denied');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Update denied'));
    expect(mockSetInitialState).not.toHaveBeenCalled();
  });

  it('changes password successfully and resets the password form', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    const currentPassword = screen.getByLabelText('Current Password') as HTMLInputElement;
    const newPassword = screen.getByLabelText('New Password') as HTMLInputElement;
    const confirmNewPassword = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

    await user.type(currentPassword, 'Abcdefg1!');
    await user.type(newPassword, 'Abcdefg2!');
    await user.type(confirmNewPassword, 'Abcdefg2!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(mockCognitoChangePassword).toHaveBeenCalledWith('Abcdefg2!'));
    expect(mockChangePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPassword: 'Abcdefg1!',
        newPassword: 'Abcdefg2!',
        confirmNewPassword: 'Abcdefg2!',
      }),
    );
    expect(message.success).toHaveBeenCalledWith('Password changed successfully!');
    expect(currentPassword.value).toBe('');
    expect(newPassword.value).toBe('');
    expect(confirmNewPassword.value).toBe('');
  });

  it('shows specific feedback when password change reports invalid current password', async () => {
    mockChangePassword.mockResolvedValueOnce({
      status: 'error',
      message: 'Password incorrect',
    } as any);

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('New Password'), 'Abcdefg2!');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Abcdefg2!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Invalid current password'));
  });

  it('shows specific feedback when password change reports a missing user', async () => {
    mockChangePassword.mockResolvedValueOnce({
      status: 'error',
      message: 'User not found',
    } as any);

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('New Password'), 'Abcdefg2!');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Abcdefg2!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('User not found'));
  });

  it('falls back to backend text when password change returns an unknown business error', async () => {
    mockChangePassword.mockResolvedValueOnce({
      status: 'error',
      message: 'Password policy rejected',
    } as any);

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('New Password'), 'Abcdefg2!');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Abcdefg2!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Password policy rejected'));
  });

  it('shows a generic error when password change throws unexpectedly', async () => {
    mockCognitoChangePassword.mockRejectedValueOnce(new Error('cognito password failed'));

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('New Password'), 'Abcdefg2!');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Abcdefg2!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith(
        'A system error occurred while changing the password. Please try again later.',
      ),
    );
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('blocks password submission when the new password matches the current password', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('New Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Abcdefg1!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(mockCognitoChangePassword).not.toHaveBeenCalled());
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('blocks password submission when the confirmation does not match', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.type(screen.getByLabelText('New Password'), 'Abcdefg2!');
    await user.type(screen.getByLabelText('Confirm New Password'), 'Abcdefg3!');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(mockCognitoChangePassword).not.toHaveBeenCalled());
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('changes email successfully after cognito update', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Email' }));

    await user.type(screen.getByLabelText('New Email'), 'alice.next@example.com');
    await user.type(screen.getByLabelText('Confirm New Email'), 'alice.next@example.com');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() =>
      expect(mockCognitoChangeEmail).toHaveBeenCalledWith('alice.next@example.com'),
    );
    expect(mockChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        newEmail: 'alice.next@example.com',
        confirmNewEmail: 'alice.next@example.com',
      }),
    );
    expect(message.success).toHaveBeenCalledWith(
      'Verification email sent successfully! Please update your email via the email link.',
    );
  });

  it('shows backend feedback when email change fails', async () => {
    mockChangeEmail.mockResolvedValueOnce({
      status: 'error',
      message: 'Email already exists',
    } as any);

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Email' }));

    await user.type(screen.getByLabelText('New Email'), 'alice.next@example.com');
    await user.type(screen.getByLabelText('Confirm New Email'), 'alice.next@example.com');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Email already exists'));
  });

  it('shows a generic error when email change throws unexpectedly', async () => {
    mockCognitoChangeEmail.mockRejectedValueOnce(new Error('cognito email failed'));

    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Email' }));

    await user.type(screen.getByLabelText('New Email'), 'alice.next@example.com');
    await user.type(screen.getByLabelText('Confirm New Email'), 'alice.next@example.com');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith('An error occurred while changing the email.'),
    );
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it('blocks email submission when the confirmation email does not match', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Email' }));

    await user.type(screen.getByLabelText('New Email'), 'alice.next@example.com');
    await user.type(screen.getByLabelText('Confirm New Email'), 'alice.other@example.com');

    const submitButtons = screen.getAllByRole('button', { name: /submit/i });
    await user.click(submitButtons[0]);

    await waitFor(() => expect(mockCognitoChangeEmail).not.toHaveBeenCalled());
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it('renders password strength feedback in the password and API key tabs', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    expect(screen.getByTestId('status-newPassword')).toHaveTextContent('Strength: Weak');

    const newPassword = screen.getByLabelText('New Password');
    await user.type(newPassword, 'Abcdefg1!');
    expect(screen.getByTestId('status-newPassword')).toHaveTextContent('Strength: Medium');

    await user.type(newPassword, 'More1!');
    expect(screen.getByTestId('status-newPassword')).toHaveTextContent('Strength: Strong');

    await user.click(screen.getByRole('button', { name: 'Generate API Key' }));

    expect(screen.getByTestId('status-currentPassword')).toHaveTextContent('Strength: Weak');

    const currentPassword = screen.getByLabelText('Current Password');
    await user.type(currentPassword, 'Abcdefg1!');
    expect(screen.getByTestId('status-currentPassword')).toHaveTextContent('Strength: Medium');

    await user.type(currentPassword, 'More1!');
    expect(screen.getByTestId('status-currentPassword')).toHaveTextContent('Strength: Strong');
  });

  it('generates an API key after validating credentials successfully', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    const generateTab = screen.getByRole('button', { name: 'Generate API Key' });
    await user.click(generateTab);

    const passwordField = screen.getByLabelText('Current Password') as HTMLInputElement;
    await user.type(passwordField, 'Abcdefg1!');

    const generateButton = screen.getByRole('button', { name: 'Generate Key' });
    await user.click(generateButton);

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Abcdefg1!',
      }),
    );

    expect(mockCognitoSignUp).toHaveBeenCalledWith('Abcdefg1!');

    const payload = JSON.stringify({ email: 'user@example.com', password: 'Abcdefg1!' }, null, 0);
    const encodedKey = btoa(payload);

    expect(message.success).toHaveBeenCalledWith('API Key generated successfully!');
    expect(screen.getByDisplayValue(encodedKey)).toBeInTheDocument();

    const baseTab = screen.getByRole('button', { name: 'Basic Information' });
    await user.click(baseTab);

    await waitFor(() => expect(screen.queryByDisplayValue(encodedKey)).not.toBeInTheDocument());
  });

  it('surfaces an error when credentials are invalid during API key generation', async () => {
    mockLogin.mockResolvedValueOnce({ status: 'error' } as any);

    const user = userEvent.setup();
    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    const generateTab = screen.getByRole('button', { name: 'Generate API Key' });
    await user.click(generateTab);

    const passwordField = screen.getByLabelText('Current Password') as HTMLInputElement;
    await user.type(passwordField, 'Abcdefg1!');

    const generateButton = screen.getByRole('button', { name: 'Generate Key' });
    await user.click(generateButton);

    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(message.error).toHaveBeenCalledWith('Invalid credentials. Please check your password.');
    expect(mockCognitoSignUp).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument();
  });

  it('shows a generic error when API key generation throws after login succeeds', async () => {
    mockCognitoSignUp.mockRejectedValueOnce(new Error('cognito failed'));

    const user = userEvent.setup();
    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Generate API Key' }));
    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');

    const generateButton = screen.getByRole('button', { name: 'Generate Key' });
    await user.click(generateButton);

    await waitFor(() =>
      expect(message.error).toHaveBeenCalledWith(
        'A system error occurred while generating the API key. Please try again later.',
      ),
    );
    expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument();
  });

  it('clears the generated API key when leaving the API key tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Profile />);

    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Generate API Key' }));
    await user.type(screen.getByLabelText('Current Password'), 'Abcdefg1!');
    await user.click(screen.getByRole('button', { name: 'Generate Key' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Make sure to copy it to a secure location. This key will not be shown again.',
        ),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Basic Information' }));

    await waitFor(() => {
      expect(
        screen.queryByText(
          'Make sure to copy it to a secure location. This key will not be shown again.',
        ),
      ).not.toBeInTheDocument();
    });
  });
});
