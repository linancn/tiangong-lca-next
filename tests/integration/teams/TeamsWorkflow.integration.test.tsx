// @ts-nocheck
/**
 * Teams management workflow integration tests
 * Covered paths:
 * - Owner creates a team with logo uploads, ensuring createTeamMessage/uploadLogoApi/removeLogoApi interactions fire
 * - Owner manages members (add, promote, demote, delete, re-invite) validating updateRoleApi/delRoleApi/reInvitedApi/addTeamMemberApi usage
 * - Role-based permissions keep owner actions enabled and prevent destructive controls against owners
 */

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
  const mockHistory = {
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
    history: mockHistory,
  };
});

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-team-id'),
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

  const MockLangTextItemForm = ({ label, name, setRuleErrorState }: any) => {
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
  getThumbFileUrls: jest.fn(() =>
    Promise.resolve([
      { status: 'done', thumbUrl: 'https://example.com/light-thumb.png' },
      { status: 'done', thumbUrl: 'https://example.com/dark-thumb.png' },
    ]),
  ),
  isImage: jest.fn(() => true),
  removeLogoApi: jest.fn(() => Promise.resolve(null)),
  uploadLogoApi: jest.fn(() =>
    Promise.resolve({
      data: { path: 'uploaded-logo.png' },
    }),
  ),
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
  addTeamMemberApi: jest.fn(),
  editTeamMessage: jest.fn(),
  getTeamMembersApi: jest.fn(),
  getTeamMessageApi: jest.fn(),
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
      setValues((previous) => ({
        ...previous,
        [name]: value,
      }));
    }, []);

    const resetFields = React.useCallback(() => {
      setValues(initialValues ?? {});
    }, [initialValues]);

    const setFieldsValue = React.useCallback((fields: Record<string, any> = {}) => {
      setValues((previous) => ({
        ...previous,
        ...fields,
      }));
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
      getFieldValue: (name: string) => values[name],
    }));

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
    rules = [],
    children,
    label,
    valuePropName = 'value',
    getValueProps,
    normalize,
    help,
    style,
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
      <div
        data-testid={`form-item-${fieldName ?? 'unnamed'}`}
        style={style}
        data-help={help ? 'true' : 'false'}
        data-status={validateStatus ?? ''}
      >
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

  const Upload = ({ beforeUpload, onRemove, disabled }: any) => {
    const idRef = React.useRef(`upload-${Math.random().toString(36).slice(2, 8)}`);

    return (
      <div data-testid={idRef.current}>
        <button
          type='button'
          onClick={() => {
            if (disabled) return;
            beforeUpload?.({
              name: `${idRef.current}.png`,
              type: 'image/png',
            });
          }}
        >
          upload
        </button>
        <button
          type='button'
          onClick={() => {
            if (disabled) return;
            onRemove?.();
          }}
        >
          remove
        </button>
      </div>
    );
  };

  const Button = React.forwardRef((props: any, ref: any) => {
    const { children, onClick, disabled, icon, type = 'button', ...rest } = props ?? {};
    return (
      <button
        ref={ref}
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        data-button-type={type}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      'aria-label': label,
      title: label,
    });
  };

  const Tabs = ({ items = [], activeKey, onChange, tabPosition }: any) => (
    <div data-testid='tabs' data-tab-position={tabPosition ?? 'top'}>
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

  const ModalComponent = ({ open, onCancel, onOk, confirmLoading, children, title }: any) =>
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

  const modalConfirm = jest.fn((config: any) => config);

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
    Modal: Object.assign(ModalComponent, { confirm: modalConfirm }),
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

  const ProTable = ({
    request,
    actionRef,
    columns = [],
    rowKey = 'id',
    toolBarRender,
    headerTitle,
  }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);
    const paramsRef = React.useRef({ current: 1, pageSize: 10 });

    const runRequest = React.useCallback(
      async (override = {}) => {
        paramsRef.current = { ...paramsRef.current, ...override };
        const result = await requestRef.current?.(paramsRef.current, {});
        setRows(result?.data ?? []);
        return result;
      },
      [setRows],
    );

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
      const handlers = {
        reload: () => runRequest(),
        setPageInfo: (info: any) => runRequest(info ?? {}),
      };
      if (actionRef) {
        actionRef.current = handlers;
      }
      globalThis.__teamsActionRef = handlers;
      return () => {
        if (globalThis.__teamsActionRef === handlers) {
          delete globalThis.__teamsActionRef;
        }
      };
    }, [actionRef, runRequest]);

    React.useEffect(() => {
      void runRequest();
    }, []);

    const renderContent = (content: any, keyPrefix: string) => {
      if (Array.isArray(content)) {
        return content.map((item, index) => (
          <React.Fragment key={`${keyPrefix}-${index}`}>{item}</React.Fragment>
        ));
      }
      return content;
    };

    const header = typeof headerTitle === 'function' ? headerTitle() : headerTitle;
    const toolbarNodes = toolBarRender?.() ?? [];
    const toolbar = Array.isArray(toolbarNodes) ? toolbarNodes : [toolbarNodes];

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>{header}</div>
        <div data-testid='pro-table-toolbar'>
          {toolbar.map((node, index) => (
            <React.Fragment key={`toolbar-${index}`}>{node}</React.Fragment>
          ))}
        </div>
        {rows.map((row, rowIndex) => {
          const identifier = rowKey && row[rowKey] ? row[rowKey] : rowIndex;
          return (
            <div data-testid={`pro-table-row-${identifier}`} key={`row-${identifier}`}>
              {(columns ?? []).map((column: any, columnIndex: number) => {
                const { dataIndex } = column;
                const value = dataIndex ? row[dataIndex] : undefined;
                const rendered = column.render
                  ? column.render(value, row, rowIndex)
                  : (value ?? column.title ?? null);
                return (
                  <div
                    key={`cell-${columnIndex}`}
                    data-testid={`pro-table-cell-${dataIndex ?? columnIndex}-${identifier}`}
                  >
                    {renderContent(rendered, `render-${columnIndex}`)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

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
import {
  createTeamMessage,
  delRoleApi,
  getUserRoles,
  reInvitedApi,
  updateRoleApi,
} from '@/services/roles/api';
import {
  getBase64,
  getThumbFileUrls,
  removeLogoApi,
  uploadLogoApi,
} from '@/services/supabase/storage';
import {
  addTeamMemberApi,
  editTeamMessage,
  getTeamMembersApi,
  getTeamMessageApi,
} from '@/services/teams/api';
import { history } from '@umijs/max';
import { message, Modal } from 'antd';
import { mockTeam } from '../../helpers/testData';
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../helpers/testUtils';

const mockGetUserRoles = getUserRoles as jest.MockedFunction<any>;
const mockCreateTeamMessage = createTeamMessage as jest.MockedFunction<any>;
const mockUpdateRoleApi = updateRoleApi as jest.MockedFunction<any>;
const mockDelRoleApi = delRoleApi as jest.MockedFunction<any>;
const mockReInvitedApi = reInvitedApi as jest.MockedFunction<any>;
const mockGetTeamMessageApi = getTeamMessageApi as jest.MockedFunction<any>;
const mockEditTeamMessage = editTeamMessage as jest.MockedFunction<any>;
const mockGetTeamMembersApi = getTeamMembersApi as jest.MockedFunction<any>;
const mockAddTeamMemberApi = addTeamMemberApi as jest.MockedFunction<any>;
const mockGetBase64 = getBase64 as jest.MockedFunction<any>;
const mockUploadLogoApi = uploadLogoApi as jest.MockedFunction<any>;
const mockRemoveLogoApi = removeLogoApi as jest.MockedFunction<any>;
const mockGetThumbFileUrls = getThumbFileUrls as jest.MockedFunction<any>;

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

const buildMemberRecord = (overrides: Record<string, any> = {}) => ({
  email: overrides.email ?? 'member@example.com',
  display_name: overrides.display_name ?? 'Member Example',
  role: overrides.role ?? 'member',
  user_id: overrides.user_id ?? 'member-1',
  team_id: overrides.team_id ?? 'team-123',
  ...overrides,
});

describe('Teams management workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMessages();
    mockGetBase64.mockResolvedValue('data:image/mock;base64');
    mockUploadLogoApi.mockResolvedValue({ data: { path: 'uploaded-logo.png' } } as any);
    mockGetThumbFileUrls.mockResolvedValue([
      { status: 'done', thumbUrl: 'https://example.com/light-thumb.png' },
      { status: 'done', thumbUrl: 'https://example.com/dark-thumb.png' },
    ] as any);
    mockRemoveLogoApi.mockResolvedValue(null as any);
  });

  it('creates a team with uploaded logos and acknowledges success', async () => {
    setWindowLocation('?action=create');
    mockGetUserRoles.mockResolvedValue({ data: [], success: true } as any);
    mockCreateTeamMessage.mockResolvedValue(null as any);
    mockEditTeamMessage.mockResolvedValue(null as any);
    const originalLocation = window.location;
    const locationMock: any = {
      hash: originalLocation.hash,
      host: originalLocation.host,
      hostname: originalLocation.hostname,
      href: originalLocation.href,
      origin: originalLocation.origin,
      pathname: originalLocation.pathname,
      port: originalLocation.port,
      protocol: originalLocation.protocol,
      search: originalLocation.search,
      ancestorOrigins: originalLocation.ancestorOrigins,
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      toString: () => originalLocation.href,
    };
    delete (window as any).location;
    (window as any).location = locationMock;

    try {
      renderWithProviders(<Team />);

      fireEvent.change(screen.getByLabelText('Team Name'), {
        target: { value: 'New Integration Team' },
      });
      fireEvent.change(screen.getByLabelText('Team Description'), {
        target: { value: 'Team created via integration test' },
      });

      const uploadButtons = screen.getAllByText('upload');
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);

      await waitFor(() => {
        expect(mockGetBase64).toHaveBeenCalledTimes(2);
      });

      fireEvent.click(screen.getByTestId('pro-form-submit'));

      await waitFor(() => {
        expect(mockCreateTeamMessage).toHaveBeenCalledTimes(1);
      });

      expect(mockUploadLogoApi).toHaveBeenCalledTimes(2);
      const [[lightUploadCall], [darkUploadCall]] = mockUploadLogoApi.mock.calls;
      expect(lightUploadCall).toBeDefined();
      expect(darkUploadCall).toBeDefined();

      const [, payload, rank, isPublic] = mockCreateTeamMessage.mock.calls[0];
      expect(payload.title?.[0]).toEqual({
        '#text': 'New Integration Team',
        '@xml:lang': 'en',
      });
      expect(payload.description?.[0]).toEqual({
        '#text': 'Team created via integration test',
        '@xml:lang': 'en',
      });
      expect(payload.lightLogo).toEqual('../sys-files/uploaded-logo.png');
      expect(payload.darkLogo).toEqual('../sys-files/uploaded-logo.png');
      expect(rank).toBeUndefined();
      expect(isPublic).toBeUndefined();

      expect(history.replace).toHaveBeenCalledWith('/team?action=edit');
      expect(message.success).toHaveBeenCalledWith('Edit Successfully!');
      expect(window.location.reload).toHaveBeenCalled();
    } finally {
      delete (window as any).location;
      (window as any).location = originalLocation;
    }
  });

  it('allows owner to manage members, assign permissions, and respect role protections', async () => {
    setWindowLocation('?action=edit');

    const members = [
      buildMemberRecord({
        email: 'member@example.com',
        display_name: 'Member Example',
        role: 'member',
        user_id: 'member-1',
      }),
      buildMemberRecord({
        email: 'admin@example.com',
        display_name: 'Admin Example',
        role: 'admin',
        user_id: 'admin-1',
      }),
      buildMemberRecord({
        email: 'rejected@example.com',
        display_name: 'Rejected Example',
        role: 'rejected',
        user_id: 'rejected-1',
      }),
      buildMemberRecord({
        email: 'owner@example.com',
        display_name: 'Owner Example',
        role: 'owner',
        user_id: 'owner-1',
      }),
    ];

    mockGetUserRoles.mockResolvedValue({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);

    mockGetTeamMessageApi.mockResolvedValue({
      data: [
        {
          ...mockTeam,
          id: 'team-123',
          rank: 0,
          is_public: true,
          json: {
            title: mockTeam.json.title,
            description: mockTeam.json.description,
            lightLogo: '../sys-files/light.png',
            darkLogo: '../sys-files/dark.png',
          },
        },
      ],
      error: null,
    } as any);

    mockGetTeamMembersApi.mockResolvedValue({
      data: members,
      success: true,
      total: members.length,
    } as any);

    mockUpdateRoleApi.mockResolvedValue({ error: null } as any);
    mockDelRoleApi.mockResolvedValue({ error: null } as any);
    mockReInvitedApi.mockResolvedValue(null as any);
    mockAddTeamMemberApi.mockResolvedValue({ error: null } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetUserRoles).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    await waitFor(() => {
      expect(mockGetTeamMembersApi).toHaveBeenCalled();
    });

    const memberRow = screen.getByTestId('pro-table-row-member@example.com');
    fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-123', 'member-1', 'admin');
    });
    expect(message.success).toHaveBeenCalledWith('Action success!');

    const adminRow = screen.getByTestId('pro-table-row-admin@example.com');
    fireEvent.click(within(adminRow).getByRole('button', { name: 'Set Member' }));

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-123', 'admin-1', 'member');
    });

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));
    const confirmConfig = (Modal.confirm as jest.Mock).mock.calls.at(-1)?.[0];
    await act(async () => {
      await confirmConfig.onOk?.();
    });

    expect(mockDelRoleApi).toHaveBeenCalledWith('team-123', 'member-1');

    const rejectedRow = screen.getByTestId('pro-table-row-rejected@example.com');
    fireEvent.click(within(rejectedRow).getByRole('button', { name: 're-invite' }));

    await waitFor(() => {
      expect(mockReInvitedApi).toHaveBeenCalledWith('rejected-1', 'team-123');
    });
    expect(message.success).toHaveBeenCalledWith('Action success!');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    const emailInput = within(screen.getByTestId('form-item-email')).getByRole('textbox');
    fireEvent.change(emailInput, {
      target: { value: 'new.member@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ok' }));

    await waitFor(() => {
      expect(mockAddTeamMemberApi).toHaveBeenCalledWith('team-123', 'new.member@example.com');
    });
    expect(message.success).toHaveBeenCalledWith('Member added successfully!');

    const ownerRow = screen.getByTestId('pro-table-row-owner@example.com');
    const ownerDeleteButton = within(ownerRow).getByRole('button', { name: 'Delete' });
    const ownerSetAdminButton = within(ownerRow).getByRole('button', { name: 'Set Admin' });
    const ownerSetMemberButton = within(ownerRow).getByRole('button', { name: 'Set Member' });

    expect(ownerDeleteButton).toBeDisabled();
    expect(ownerSetAdminButton).toBeDisabled();
    expect(ownerSetMemberButton).toBeDisabled();
  });
});
