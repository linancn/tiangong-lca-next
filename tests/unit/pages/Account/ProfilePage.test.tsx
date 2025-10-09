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
      Object.entries(rulesRef.current).forEach(([field, rules]) => {
        const value = values[field];
        (rules ?? []).forEach((rule) => {
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
        });
      });
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
      const values = (await internalFormRef.current?.validateFields?.()) ?? {};
      await onFinish?.(values);
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

  ProFormText.Password = ({ fieldProps, ...rest }: any) => (
    <Form.Item {...rest}>
      <Input.Password {...sanitizeFieldProps(fieldProps)} placeholder={rest.placeholder} />
    </Form.Item>
  );

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
});
