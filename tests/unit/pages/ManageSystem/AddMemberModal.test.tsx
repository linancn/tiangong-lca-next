// @ts-nocheck

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
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  addSystemMemberApi: jest.fn(),
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

  const FormContext = React.createContext(null);

  const Form = React.forwardRef(({ children }: any, ref: any) => {
    const [values, setValues] = React.useState<Record<string, any>>({});
    const rulesRef = React.useRef<Record<string, any[]>>({});

    const registerRules = React.useCallback((name: string, rules: any[] = []) => {
      rulesRef.current[name] = rules;
    }, []);

    const setFieldValue = React.useCallback((name: string, value: any) => {
      setValues((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetFields = React.useCallback(() => {
      setValues({});
    }, []);

    const validateFields = React.useCallback(async () => {
      const errors: any[] = [];
      Object.entries(rulesRef.current).forEach(([field, rules]) => {
        const value = values[field];
        (rules ?? []).forEach((rule) => {
          const messageText = toText(rule.message) || 'Validation failed';
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({ name: [field], errors: [messageText] });
          }
          if (rule.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors.push({ name: [field], errors: [messageText] });
            }
          }
        });
      });
      if (errors.length) {
        const error = new Error('Validation failed');
        error.errorFields = errors;
        throw error;
      }
      return values;
    }, [values]);

    React.useImperativeHandle(ref, () => ({
      validateFields,
      resetFields,
    }));

    const contextValue = React.useMemo(
      () => ({ values, setFieldValue, registerRules }),
      [values, setFieldValue, registerRules],
    );

    return (
      <FormContext.Provider value={contextValue}>
        <form data-testid='form'>{children}</form>
      </FormContext.Provider>
    );
  });
  Form.displayName = 'MockForm';

  const FormItem = ({ name, rules = [], label, children }: any) => {
    const context = React.useContext(FormContext);
    const fieldName = Array.isArray(name) ? name.join('.') : name;

    React.useEffect(() => {
      if (fieldName) {
        context?.registerRules?.(fieldName, rules);
      }
    }, [context, fieldName, rules]);

    const value = fieldName ? (context?.values?.[fieldName] ?? '') : '';

    const handleChange = (event: any) => {
      const nextValue = event?.target ? event.target.value : event;
      if (fieldName) {
        context?.setFieldValue?.(fieldName, nextValue);
      }
      if (children?.props?.onChange) {
        children.props.onChange(event);
      }
    };

    return (
      <div data-testid={`form-item-${fieldName}`}>
        {label ? <label>{toText(label)}</label> : null}
        {React.cloneElement(children, {
          value,
          onChange: handleChange,
        })}
      </div>
    );
  };

  Form.Item = FormItem;

  const Input = React.forwardRef(({ value = '', onChange, ...rest }: any, ref: any) => (
    <input ref={ref} value={value ?? ''} onChange={(event) => onChange?.(event)} {...rest} />
  ));
  Input.displayName = 'MockInput';

  const Modal = ({ open, title, children, onCancel, onOk, confirmLoading }: any) =>
    open ? (
      <div data-testid='modal'>
        <header>{toText(title)}</header>
        <div>{children}</div>
        <button type='button' onClick={() => onCancel?.()}>
          cancel
        </button>
        <button type='button' disabled={confirmLoading} onClick={() => onOk?.()}>
          ok
        </button>
      </div>
    ) : null;

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    ConfigProvider,
    Form,
    Input,
    Modal,
    message,
  };
});

import AddMemberModal from '@/pages/ManageSystem/Components/AddMemberModal';
import { addSystemMemberApi } from '@/services/roles/api';
import { message } from 'antd';
import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../helpers/testUtils';

const mockAddSystemMemberApi = addSystemMemberApi as jest.MockedFunction<any>;

const renderModal = (props: any = {}) => {
  const onCancel = jest.fn();
  const onSuccess = jest.fn();

  return {
    onCancel,
    onSuccess,
    ...renderWithProviders(
      <AddMemberModal open onCancel={onCancel} onSuccess={onSuccess} {...props} />,
    ),
  };
};

describe('ManageSystem AddMemberModal', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Object.values(message).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('submits email successfully and closes modal', async () => {
    mockAddSystemMemberApi.mockResolvedValue({ success: true } as any);

    const { onCancel, onSuccess } = renderModal();

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'member@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddSystemMemberApi).toHaveBeenCalledWith('member@example.com');
    });

    expect(message.success).toHaveBeenCalledWith('Member added successfully!');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows not registered error without closing the modal', async () => {
    mockAddSystemMemberApi.mockResolvedValue({
      success: false,
      error: 'notRegistered',
    } as any);

    const { onCancel, onSuccess } = renderModal();

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'unknown@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddSystemMemberApi).toHaveBeenCalledWith('unknown@example.com');
    });

    expect(message.error).toHaveBeenCalledWith('User is not registered!');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows generic failure when the api rejects the add request', async () => {
    mockAddSystemMemberApi.mockResolvedValue({
      success: false,
      error: 'unexpected',
    } as any);

    renderModal();

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'error@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddSystemMemberApi).toHaveBeenCalledWith('error@example.com');
    });

    expect(message.error).toHaveBeenCalledWith('Failed to add member!');
  });

  it('does not call api when email is missing', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddSystemMemberApi).not.toHaveBeenCalled();
    });
    expect(message.success).not.toHaveBeenCalled();
    expect(message.error).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('does not call api when email format is invalid', async () => {
    renderModal();

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'invalid-email' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddSystemMemberApi).not.toHaveBeenCalled();
    });
    expect(message.success).not.toHaveBeenCalled();
    expect(message.error).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('invokes onCancel when cancel button is clicked', async () => {
    const { onCancel } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockAddSystemMemberApi).not.toHaveBeenCalled();
  });
});
