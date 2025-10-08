// @ts-nocheck

jest.mock('@ant-design/icons', () => {
  const React = require('react');
  return {
    __esModule: true,
    CrownOutlined: () => <span data-testid='icon-crown' />,
    DeleteOutlined: () => <span data-testid='icon-delete' />,
    PlusOutlined: () => <span data-testid='icon-plus' />,
    QuestionCircleOutlined: () => <span data-testid='icon-question' />,
    UserAddOutlined: () => <span data-testid='icon-user-add' />,
    UserOutlined: () => <span data-testid='icon-user' />,
  };
});

jest.mock('@umijs/max', () => {
  const history = {
    replace: jest.fn(),
    push: jest.fn(),
  };
  return {
    __esModule: true,
    FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    useIntl: () => ({
      locale: 'en-US',
      formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    }),
    history,
  };
});

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'unit-test-team-id'),
}));

jest.mock('@/components/LangTextItem/form', () => {
  const React = require('react');
  const { Form } = require('antd');
  const FormContext = Form.__Context;

  const toText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(toText).join('');
    if (node?.props?.defaultMessage) return node.props.defaultMessage;
    if (node?.props?.id) return node.props.id;
    if (node?.props?.children) return toText(node.props.children);
    return '';
  };

  const MockLangTextItemForm = ({ name, label, setRuleErrorState }: any) => {
    const context = React.useContext(FormContext);
    const baseName = Array.isArray(name) ? name.join('.') : name;
    const fieldKey = `${baseName}-en`;
    const value = context?.values?.[fieldKey] ?? '';
    return (
      <div data-testid={`lang-${fieldKey}`}>
        <label htmlFor={`input-${fieldKey}`}>{toText(label)}</label>
        <input
          id={`input-${fieldKey}`}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            context?.setFieldValue?.(fieldKey, nextValue);
            setRuleErrorState?.(false);
          }}
        />
      </div>
    );
  };

  return {
    __esModule: true,
    default: MockLangTextItemForm,
  };
});

jest.mock('@/components/RequiredMark', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ label }: any) => <span>{label}</span>,
  };
});

jest.mock('@/services/supabase/storage', () => ({
  __esModule: true,
  getBase64: jest.fn(() => Promise.resolve('data:image/mock;base64')),
  getThumbFileUrls: jest.fn(() => Promise.resolve([{ status: 'done', thumbUrl: 'thumb' }])),
  isImage: jest.fn(() => true),
  removeLogoApi: jest.fn(() => Promise.resolve(null)),
  uploadLogoApi: jest.fn(() => Promise.resolve({ data: { path: 'uploaded-logo.png' } })),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  createTeamMessage: jest.fn(),
  delRoleApi: jest.fn(),
  getUserRoles: jest.fn(),
  reInvitedApi: jest.fn(),
  updateRoleApi: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  editTeamMessage: jest.fn(),
  getTeamMembersApi: jest.fn(),
  getTeamMessageApi: jest.fn(),
  addTeamMemberApi: jest.fn(),
}));

jest.mock('antd', () => {
  const React = require('react');

  const toText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(toText).join('');
    if (node?.props?.defaultMessage) return node.props.defaultMessage;
    if (node?.props?.id) return node.props.id;
    if (node?.props?.children) return toText(node.props.children);
    return '';
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const FormContext = React.createContext<any>(null);

  const Form = React.forwardRef(({ children, initialValues = {} }: any, ref: any) => {
    const [values, setValues] = React.useState<Record<string, any>>(initialValues);
    const rulesRef = React.useRef<Record<string, any[]>>({});

    const registerRules = React.useCallback((name: string, rules: any[] = []) => {
      rulesRef.current[name] = rules;
    }, []);

    const setFieldValue = React.useCallback((name: string, value: any) => {
      setValues((previous) => ({ ...previous, [name]: value }));
    }, []);

    const resetFields = React.useCallback(() => {
      setValues(initialValues ?? {});
    }, [initialValues]);

    const setFieldsValue = React.useCallback((fields: Record<string, any> = {}) => {
      setValues((previous) => ({ ...previous, ...fields }));
    }, []);

    const validateFields = React.useCallback(async () => {
      const errors: any[] = [];
      Object.entries(rulesRef.current).forEach(([field, rules]) => {
        if (field === 'lightLogo' || field === 'darkLogo') {
          return;
        }
        const value = values[field];
        (rules ?? []).forEach((rule) => {
          const messageText = toText(rule.message) || 'Validation failed';
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({ name: [field], errors: [messageText] });
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

  const FormItem = ({
    name,
    label,
    rules = [],
    children,
    valuePropName = 'value',
    getValueProps,
    normalize,
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

    const rawValue = fieldName ? context?.values?.[fieldName] : undefined;
    const valueProps = getValueProps
      ? getValueProps(rawValue)
      : {
          [valuePropName]:
            rawValue !== undefined
              ? rawValue
              : valuePropName === 'checked'
                ? false
                : valuePropName === 'value'
                  ? ''
                  : rawValue,
        };

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

      if (normalize) {
        nextValue = normalize(nextValue, rawValue, context?.values ?? {});
      }

      if (fieldName) {
        context?.setFieldValue?.(fieldName, nextValue);
      }

      if (children?.props?.onChange) {
        children.props.onChange(eventOrValue);
      }
    };

    return (
      <div data-testid={`form-item-${fieldName ?? 'unnamed'}`} data-status={validateStatus ?? ''}>
        {label ? <label>{toText(label)}</label> : null}
        {React.isValidElement(children)
          ? React.cloneElement(children, {
              ...valueProps,
              onChange: handleChange,
            })
          : children}
        {help ? <div>{toText(help)}</div> : null}
      </div>
    );
  };

  Form.Item = FormItem;

  const Input = React.forwardRef(({ value = '', onChange, ...rest }: any, ref: any) => (
    <input ref={ref} value={value ?? ''} onChange={(event) => onChange?.(event)} {...rest} />
  ));
  Input.displayName = 'MockInput';

  const Switch = ({ checked = false, onChange, disabled }: any) => (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange?.(!checked);
      }}
    >
      {checked ? 'on' : 'off'}
    </button>
  );

  const Upload = () => <div data-testid='upload' />;

  const Button = React.forwardRef((props: any, ref: any) => {
    const { children, onClick, disabled, icon, ...rest } = props ?? {};
    return (
      <button
        ref={ref}
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

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

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      'aria-label': label,
      title: label,
    });
  };

  const Modal = ({ open }: any) => (open ? <div data-testid='modal'>modal</div> : null);

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Flex,
    Form,
    Input,
    Modal,
    Spin,
    Switch,
    Tabs,
    Tooltip,
    Upload,
    message,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const { Form } = require('antd');

  const ProForm = ({ formRef, onFinish, submitter, children, disabled }: any) => {
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

    const defaultButton = (
      <button
        type='button'
        onClick={handleSubmit}
        data-testid='pro-form-submit'
        disabled={disabled}
      >
        submit
      </button>
    );

    const renderedSubmitter = submitter?.render?.(null, [defaultButton]) ?? [defaultButton];
    const submitNodes = Array.isArray(renderedSubmitter) ? renderedSubmitter : [renderedSubmitter];

    return (
      <Form ref={internalFormRef}>
        <fieldset disabled={disabled}>{children}</fieldset>
        <div data-testid='pro-form-submitter'>
          {submitNodes.map((node, index) => (
            <React.Fragment key={`submit-${index}`}>{node}</React.Fragment>
          ))}
        </div>
      </Form>
    );
  };

  const ProTable = ({ actionRef, toolBarRender }: any) => {
    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: jest.fn(),
        };
      }
    }, [actionRef]);

    const toolbarNodes = toolBarRender?.() ?? [];
    const toolbar = Array.isArray(toolbarNodes) ? toolbarNodes : [toolbarNodes];

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-toolbar'>
          {toolbar.map((node, index) => (
            <React.Fragment key={`toolbar-${index}`}>{node}</React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const PageContainer = ({ title, children }: any) => (
    <div data-testid='page-container'>
      <div data-testid='page-container-title'>{title}</div>
      <div>{children}</div>
    </div>
  );

  return {
    __esModule: true,
    ProForm,
    ProTable,
    PageContainer,
  };
});

import Team from '@/pages/Teams';
import { createTeamMessage, getUserRoles } from '@/services/roles/api';
import { editTeamMessage, getTeamMembersApi, getTeamMessageApi } from '@/services/teams/api';
import { message } from 'antd';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

const mockCreateTeamMessage = createTeamMessage as jest.MockedFunction<any>;
const mockGetUserRoles = getUserRoles as jest.MockedFunction<any>;
const mockGetTeamMessageApi = getTeamMessageApi as jest.MockedFunction<any>;
const mockEditTeamMessage = editTeamMessage as jest.MockedFunction<any>;
const mockGetTeamMembersApi = getTeamMembersApi as jest.MockedFunction<any>;

const setWindowLocation = (search: string) => {
  const path = `/team${search.startsWith('?') ? search : `?${search}`}`;
  window.history.pushState({}, '', path);
};

const resetMessages = () => {
  Object.values(message).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
};

describe('Team page validations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMessages();
    mockGetTeamMembersApi.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    } as any);
  });

  it('prevents submission when rank requires logos but none are provided', async () => {
    setWindowLocation('?action=create');

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Homepage Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Team without logos' },
    });

    const switches = screen.getAllByRole('switch');
    const rankSwitch = switches[1];
    fireEvent.click(rankSwitch);

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(screen.getByText('Please upload light logo!')).toBeInTheDocument();
    });
    expect(screen.getByText('Please upload dark logo!')).toBeInTheDocument();
    expect(mockCreateTeamMessage).not.toHaveBeenCalled();
    expect(message.error).not.toHaveBeenCalled();
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
  });

  it('shows error message when fetching team details fails', async () => {
    setWindowLocation('?action=edit');

    mockGetUserRoles.mockResolvedValue({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValue({
      data: [],
      error: new Error('Network failure'),
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to get details, please refresh!');
    });
  });
});
