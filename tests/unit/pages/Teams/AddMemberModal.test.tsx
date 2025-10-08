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

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  addTeamMemberApi: jest.fn(),
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

    const setFieldsValue = React.useCallback((fields: Record<string, any> = {}) => {
      setValues((previous) => ({ ...previous, ...fields }));
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
      setFieldsValue,
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
  Form.__Context = FormContext;

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

import AddMemberModal from '@/pages/Teams/Components/AddMemberModal';
import { addTeamMemberApi } from '@/services/teams/api';
import { message } from 'antd';
import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../helpers/testUtils';

const mockAddTeamMemberApi = addTeamMemberApi as jest.MockedFunction<any>;

const renderModal = (props: any = {}) => {
  const onCancel = jest.fn();
  const onSuccess = jest.fn();

  return {
    onCancel,
    onSuccess,
    ...renderWithProviders(
      <AddMemberModal
        open
        teamId='team-123'
        onCancel={onCancel}
        onSuccess={onSuccess}
        {...props}
      />,
    ),
  };
};

describe('AddMemberModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(message).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        fn.mockClear();
      }
    });
  });

  it('submits email successfully and closes modal', async () => {
    mockAddTeamMemberApi.mockResolvedValue({ error: null } as any);

    const { onCancel, onSuccess } = renderModal();

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'teammate@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddTeamMemberApi).toHaveBeenCalledWith('team-123', 'teammate@example.com');
    });

    expect(message.success).toHaveBeenCalledWith('Member added successfully!');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('surfaces exists error without closing the modal', async () => {
    mockAddTeamMemberApi.mockResolvedValue({
      error: { message: 'exists' },
    } as any);

    const { onCancel, onSuccess } = renderModal();

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'duplicate@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddTeamMemberApi).toHaveBeenCalledWith('team-123', 'duplicate@example.com');
    });

    expect(message.error).toHaveBeenCalledWith('User already exists in the team!');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('does not call api when teamId is missing', async () => {
    mockAddTeamMemberApi.mockResolvedValue({ error: null } as any);

    renderModal({ teamId: null });

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'no-team@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddTeamMemberApi).not.toHaveBeenCalled();
    });
    expect(message.success).not.toHaveBeenCalled();
  });
});
