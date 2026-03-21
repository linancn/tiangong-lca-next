// @ts-nocheck

let mockUmiLocation = { pathname: '/', search: '' };

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
    useLocation: () => mockUmiLocation,
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

jest.mock('@/pages/Teams/Components/AddMemberModal', () => ({
  __esModule: true,
  default: ({ open, onCancel, onSuccess, teamId }: any) =>
    open ? (
      <div data-testid='add-member-modal'>
        <div>{teamId}</div>
        <button type='button' onClick={() => onSuccess?.()}>
          modal-success
        </button>
        <button type='button' onClick={() => onCancel?.()}>
          modal-cancel
        </button>
      </div>
    ) : null,
}));

const mockModalConfirm = jest.fn();
let mockUploadFileName = 'logo.png';

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

  const Upload = ({ beforeUpload, onRemove, fileList = [], disabled }: any) => (
    <div data-testid='upload'>
      <button
        type='button'
        disabled={disabled}
        onClick={() =>
          beforeUpload?.({
            name: mockUploadFileName,
            type: 'image/png',
          })
        }
      >
        upload-file
      </button>
      {fileList?.length > 0 ? (
        <button type='button' disabled={disabled} onClick={() => onRemove?.()}>
          remove-file
        </button>
      ) : null}
    </div>
  );

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
    Modal: {
      confirm: (config: any) => mockModalConfirm(config),
    },
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
  const mockToText = (node: any): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(mockToText).join('');
    if (node?.props?.defaultMessage) return node.props.defaultMessage;
    if (node?.props?.id) return node.props.id;
    if (node?.props?.children) return mockToText(node.props.children);
    return '';
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

  const ProTable = ({ actionRef, toolBarRender, request, columns = [], headerTitle }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);
    const requestRef = React.useRef(request);
    requestRef.current = request;

    const reload = React.useCallback(async () => {
      const result = await requestRef.current?.({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
      return result;
    }, []);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
        };
      }
      void reload();
    }, [actionRef, reload]);

    const toolbarNodes = toolBarRender?.() ?? [];
    const toolbar = Array.isArray(toolbarNodes) ? toolbarNodes : [toolbarNodes];

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>{mockToText(headerTitle)}</div>
        <div data-testid='pro-table-toolbar'>
          {toolbar.map((node, index) => (
            <React.Fragment key={`toolbar-${index}`}>{node}</React.Fragment>
          ))}
        </div>
        {rows.map((row: any, rowIndex: number) => (
          <div key={`${row.user_id ?? row.email ?? rowIndex}`} data-testid={`team-row-${rowIndex}`}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${column.key ?? column.dataIndex ?? columnIndex}`}>
                {column.render
                  ? column.render(row[column.dataIndex], row, rowIndex)
                  : row[column.dataIndex]}
              </div>
            ))}
          </div>
        ))}
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
import {
  createTeamMessage,
  delRoleApi,
  getUserRoles,
  reInvitedApi,
  updateRoleApi,
} from '@/services/roles/api';
import { getBase64, isImage, removeLogoApi, uploadLogoApi } from '@/services/supabase/storage';
import { editTeamMessage, getTeamMembersApi, getTeamMessageApi } from '@/services/teams/api';
import { act } from '@testing-library/react';
import { history } from '@umijs/max';
import { message } from 'antd';
import {
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../helpers/testUtils';

const mockCreateTeamMessage = createTeamMessage as jest.MockedFunction<any>;
const mockDelRoleApi = delRoleApi as jest.MockedFunction<any>;
const mockGetBase64 = getBase64 as jest.MockedFunction<any>;
const mockGetUserRoles = getUserRoles as jest.MockedFunction<any>;
const mockIsImage = isImage as jest.MockedFunction<any>;
const mockReInvitedApi = reInvitedApi as jest.MockedFunction<any>;
const mockRemoveLogoApi = removeLogoApi as jest.MockedFunction<any>;
const mockGetTeamMessageApi = getTeamMessageApi as jest.MockedFunction<any>;
const mockEditTeamMessage = editTeamMessage as jest.MockedFunction<any>;
const mockGetTeamMembersApi = getTeamMembersApi as jest.MockedFunction<any>;
const mockUpdateRoleApi = updateRoleApi as jest.MockedFunction<any>;
const mockUploadLogoApi = uploadLogoApi as jest.MockedFunction<any>;
const mockHistory = history as { replace: jest.Mock; push: jest.Mock };

const setWindowLocation = (search: string) => {
  const normalizedSearch = search.startsWith('?') ? search : `?${search}`;
  const path = `/team${normalizedSearch}`;
  mockUmiLocation = { pathname: '/team', search: normalizedSearch };
  window.history.pushState({}, '', path);
};

const resetMessages = () => {
  Object.values(message).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
};

const memberRows = [
  {
    user_id: 'owner-1',
    team_id: 'team-123',
    role: 'owner',
    display_name: 'Owner User',
    email: 'owner@example.com',
  },
  {
    user_id: 'member-1',
    team_id: 'team-123',
    role: 'member',
    display_name: 'Member User',
    email: 'member@example.com',
  },
  {
    user_id: 'admin-1',
    team_id: 'team-123',
    role: 'admin',
    display_name: 'Admin User',
    email: 'admin@example.com',
  },
  {
    user_id: 'rejected-1',
    team_id: 'team-123',
    role: 'rejected',
    display_name: 'Rejected User',
    email: 'rejected@example.com',
  },
];

describe('Team page validations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUmiLocation = { pathname: '/', search: '' };
    resetMessages();
    mockUploadFileName = 'logo.png';
    mockGetTeamMembersApi.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    } as any);
    mockUpdateRoleApi.mockResolvedValue({ error: null } as any);
    mockDelRoleApi.mockResolvedValue({ error: null } as any);
    mockReInvitedApi.mockResolvedValue(null as any);
    mockIsImage.mockReturnValue(true);
    mockGetBase64.mockResolvedValue('data:image/mock;base64');
    mockUploadLogoApi.mockResolvedValue({ data: { path: 'uploaded-logo.png' } } as any);
    mockRemoveLogoApi.mockResolvedValue(null as any);
    mockModalConfirm.mockReset();
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

  it('creates a team successfully and redirects back into edit mode', async () => {
    setWindowLocation('?action=create');
    const originalLocation = window.location;
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadSpy,
      },
    });
    mockCreateTeamMessage.mockResolvedValueOnce(null);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Created Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Fresh team description' },
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(mockCreateTeamMessage).toHaveBeenCalledWith(
        'unit-test-team-id',
        expect.objectContaining({
          title: [{ '#text': 'Created Team', '@xml:lang': 'en' }],
          description: [{ '#text': 'Fresh team description', '@xml:lang': 'en' }],
        }),
        undefined,
        undefined,
      );
    });
    expect(message.success).toHaveBeenCalledWith('Edit Successfully!');
    expect(mockHistory.replace).toHaveBeenCalledWith('/team?action=edit');
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows a generic error when team creation fails', async () => {
    setWindowLocation('?action=create');
    mockCreateTeamMessage.mockResolvedValueOnce(new Error('create failed') as any);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Broken Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Broken description' },
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to update team information.');
    });
    expect(mockHistory.replace).not.toHaveBeenCalled();
  });

  it('logs thrown submit errors from team creation', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      setWindowLocation('?action=create');
      mockCreateTeamMessage.mockRejectedValueOnce(new Error('create crashed'));

      renderWithProviders(<Team />);

      fireEvent.change(screen.getByLabelText('Team Name'), {
        target: { value: 'Exploding Team' },
      });
      fireEvent.change(screen.getByLabelText('Team Description'), {
        target: { value: 'Exploding description' },
      });

      fireEvent.click(screen.getByTestId('pro-form-submit'));

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
      });
      expect(message.success).not.toHaveBeenCalled();
      expect(mockHistory.replace).not.toHaveBeenCalled();
    } finally {
      consoleLogSpy.mockRestore();
    }
  });

  it('loads existing team details and submits edit updates successfully', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
            lightLogo: 'logos/light.png',
            darkLogo: 'logos/dark.png',
          },
        },
      ],
      error: null,
    } as any);
    mockEditTeamMessage.mockResolvedValueOnce({ error: null } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(mockEditTeamMessage).toHaveBeenCalledWith(
        'team-123',
        expect.objectContaining({
          title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
          description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
          lightLogo: 'logos/light.png',
          darkLogo: 'logos/dark.png',
        }),
        -1,
        true,
      );
    });
    expect(message.success).toHaveBeenCalledWith('Edit Successfully!');
  });

  it('shows a generic error when edit submission fails', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
            lightLogo: 'logos/light.png',
            darkLogo: 'logos/dark.png',
          },
        },
      ],
      error: null,
    } as any);
    mockEditTeamMessage.mockResolvedValueOnce({ error: new Error('edit failed') } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to update team information.');
    });
  });

  it('falls back to empty localized fields and preserves array logos from sparse team detail payloads', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: 0,
          is_public: false,
          json: {
            lightLogo: ['logos/light-array.png'],
            darkLogo: ['logos/dark-array.png'],
          },
        },
      ],
      error: null,
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    expect(screen.getByLabelText('Team Name')).toHaveValue('');
    expect(screen.getByLabelText('Team Description')).toHaveValue('');
    expect(screen.getAllByRole('button', { name: 'remove-file' })).toHaveLength(2);
  });

  it('falls back to empty localized fields when the team detail omits json entirely', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
        },
      ],
      error: null,
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    expect(screen.getByLabelText('Team Name')).toHaveValue('');
    expect(screen.getByLabelText('Team Description')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'remove-file' })).not.toBeInTheDocument();
  });

  it('returns early when edit mode has no resolved team id', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ role: 'owner' }],
      success: true,
    } as any);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'No Team Id' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Still editable' },
    });
    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(mockEditTeamMessage).not.toHaveBeenCalled();
    });
  });

  it('returns early after successful uploads when edit mode still has no resolved team id', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ role: 'owner' }],
      success: true,
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetUserRoles).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'No Team Id Upload' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Still no team id' },
    });

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
    await waitFor(() => {
      expect(uploadButtons[0]).not.toBeDisabled();
      expect(uploadButtons[1]).not.toBeDisabled();
    });
    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'remove-file' })).toHaveLength(2);
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(mockUploadLogoApi).toHaveBeenCalledTimes(2);
    });
    expect(mockEditTeamMessage).not.toHaveBeenCalled();
  });

  it('loads edit mode without stored logos and allows add-member modal cancel', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: false,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
          },
        },
      ],
      error: null,
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByTestId('add-member-modal')).toHaveTextContent('team-123');

    fireEvent.click(screen.getByRole('button', { name: 'modal-cancel' }));
    await waitFor(() => {
      expect(screen.queryByTestId('add-member-modal')).not.toBeInTheDocument();
    });
  });

  it('updates local logo state through upload and remove interactions', async () => {
    setWindowLocation('?action=create');

    renderWithProviders(<Team />);

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });

    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'remove-file' })).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'remove-file' })[1]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'remove-file' })).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'remove-file' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'remove-file' })).not.toBeInTheDocument();
    });
  });

  it('uploads new logos before saving a newly created team', async () => {
    setWindowLocation('?action=create');
    const originalLocation = window.location;
    const reloadSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadSpy,
      },
    });
    mockCreateTeamMessage.mockResolvedValueOnce(null);

    try {
      renderWithProviders(<Team />);

      fireEvent.change(screen.getByLabelText('Team Name'), {
        target: { value: 'Uploaded Team' },
      });
      fireEvent.change(screen.getByLabelText('Team Description'), {
        target: { value: 'Uploaded description' },
      });

      const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
      await act(async () => {
        fireEvent.click(uploadButtons[0]);
        fireEvent.click(uploadButtons[1]);
        await Promise.resolve();
      });

      fireEvent.click(screen.getByTestId('pro-form-submit'));

      await waitFor(() => {
        expect(mockUploadLogoApi).toHaveBeenCalledTimes(2);
      });
      expect(mockCreateTeamMessage).toHaveBeenCalledWith(
        'unit-test-team-id',
        expect.objectContaining({
          title: [{ '#text': 'Uploaded Team', '@xml:lang': 'en' }],
          description: [{ '#text': 'Uploaded description', '@xml:lang': 'en' }],
          lightLogo: '../sys-files/uploaded-logo.png',
          darkLogo: '../sys-files/uploaded-logo.png',
        }),
        undefined,
        undefined,
      );
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('uses an empty suffix when uploaded logo filenames have no extension', async () => {
    setWindowLocation('?action=create');
    mockUploadFileName = '';
    mockCreateTeamMessage.mockResolvedValueOnce(new Error('skip create') as any);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Suffixless Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Suffixless description' },
    });

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(mockUploadLogoApi).toHaveBeenCalledWith('', expect.anything(), '');
    });
  });

  it('toggles homepage visibility off and clears logo validation state', async () => {
    setWindowLocation('?action=create');
    mockCreateTeamMessage.mockResolvedValueOnce(new Error('skip create'));

    renderWithProviders(<Team />);

    const showInHomeSwitch = screen.getAllByRole('switch')[1];
    fireEvent.click(showInHomeSwitch);
    fireEvent.click(showInHomeSwitch);
    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(screen.queryByText('Please upload light logo!')).not.toBeInTheDocument();
      expect(screen.queryByText('Please upload dark logo!')).not.toBeInTheDocument();
    });
  });

  it('aborts saving when a light logo file is not an image', async () => {
    setWindowLocation('?action=create');
    mockIsImage.mockReturnValueOnce(false);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Invalid Logo Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Invalid logo description' },
    });

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Only image files can be uploaded!');
    });
    expect(mockCreateTeamMessage).not.toHaveBeenCalled();
    expect(mockUploadLogoApi).not.toHaveBeenCalled();
  });

  it('aborts saving when the dark logo file is not an image', async () => {
    setWindowLocation('?action=create');
    mockIsImage.mockReturnValueOnce(true).mockReturnValueOnce(false);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Invalid Dark Logo Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Invalid dark logo description' },
    });

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Only image files can be uploaded!');
    });
    expect(mockUploadLogoApi).toHaveBeenCalledTimes(1);
    expect(mockCreateTeamMessage).not.toHaveBeenCalled();
  });

  it('aborts saving when a logo upload throws', async () => {
    setWindowLocation('?action=create');
    mockUploadLogoApi.mockRejectedValueOnce(new Error('upload failed'));

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Broken Upload Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Broken upload description' },
    });

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to upload logo.');
    });
    expect(mockCreateTeamMessage).not.toHaveBeenCalled();
  });

  it('aborts saving when a logo upload resolves without a stored path', async () => {
    setWindowLocation('?action=create');
    mockUploadLogoApi
      .mockResolvedValueOnce({ data: { path: 'light-logo.png' } } as any)
      .mockResolvedValueOnce({ data: {} } as any);

    renderWithProviders(<Team />);

    fireEvent.change(screen.getByLabelText('Team Name'), {
      target: { value: 'Missing Path Team' },
    });
    fireEvent.change(screen.getByLabelText('Team Description'), {
      target: { value: 'Missing path description' },
    });

    const uploadButtons = screen.getAllByRole('button', { name: 'upload-file' });
    await act(async () => {
      fireEvent.click(uploadButtons[0]);
      fireEvent.click(uploadButtons[1]);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByTestId('pro-form-submit'));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to upload logo.');
    });
    expect(mockUploadLogoApi).toHaveBeenCalledTimes(2);
    expect(mockCreateTeamMessage).not.toHaveBeenCalled();
  });

  it('loads team members and handles owner actions across the members tab', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
            lightLogo: 'logos/light.png',
            darkLogo: 'logos/dark.png',
          },
        },
      ],
      error: null,
    } as any);
    mockGetTeamMembersApi.mockResolvedValue({
      data: memberRows,
      success: true,
      total: memberRows.length,
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    await waitFor(() => {
      expect(mockGetTeamMembersApi).toHaveBeenCalledWith(
        { current: 1, pageSize: 10 },
        {},
        'team-123',
      );
    });
    expect(screen.getByTestId('pro-table-header')).toHaveTextContent('My Team / Members Message');
    expect(screen.getByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('rejected@example.com')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        within(screen.getByTestId('pro-table-toolbar')).getByRole('button', { name: 'Add' }),
      );
      await Promise.resolve();
    });
    expect(screen.getByTestId('add-member-modal')).toHaveTextContent('team-123');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'modal-success' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockGetTeamMembersApi).toHaveBeenCalledTimes(2);
    });

    const memberRow = screen.getByTestId('team-row-1');
    await act(async () => {
      fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-123', 'member-1', 'admin');
    });
    expect(message.success).toHaveBeenCalledWith('Action success!');

    const adminRow = screen.getByTestId('team-row-2');
    await act(async () => {
      fireEvent.click(within(adminRow).getByRole('button', { name: 'Set Member' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith('team-123', 'admin-1', 'member');
    });

    const rejectedRow = screen.getByTestId('team-row-3');
    await act(async () => {
      fireEvent.click(within(rejectedRow).getByRole('button', { name: 're-invite' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockReInvitedApi).toHaveBeenCalledWith('rejected-1', 'team-123');
    });

    fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockModalConfirm).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await mockModalConfirm.mock.calls[0][0].onOk();
    });

    await waitFor(() => {
      expect(mockDelRoleApi).toHaveBeenCalledWith('team-123', 'member-1');
    });
    expect(message.success).toHaveBeenCalledWith('Action success!');
    expect(mockGetTeamMembersApi).toHaveBeenCalledTimes(6);
  });

  it('renders invited members and enables delete actions for admin users', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'admin' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
            lightLogo: 'logos/light.png',
            darkLogo: 'logos/dark.png',
          },
        },
      ],
      error: null,
    } as any);
    mockGetTeamMembersApi.mockResolvedValueOnce({
      data: [
        {
          user_id: 'invite-1',
          team_id: 'team-123',
          role: 'is_invited',
          display_name: 'Invited User',
          email: 'invited@example.com',
        },
        memberRows[1],
      ],
      success: true,
      total: 2,
    } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    expect(await screen.findByText('Invited')).toBeInTheDocument();

    const deleteButtons = screen
      .getAllByTestId('icon-delete')
      .map((icon) => icon.closest('button'));
    expect(deleteButtons.some((button) => button?.hasAttribute('disabled'))).toBe(false);
  });

  it('falls back to an empty member table when the member request omits data and success', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
            lightLogo: 'logos/light.png',
            darkLogo: 'logos/dark.png',
          },
        },
      ],
      error: null,
    } as any);
    mockGetTeamMembersApi.mockResolvedValueOnce({} as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    await waitFor(() => {
      expect(mockGetTeamMembersApi).toHaveBeenCalledWith(
        { current: 1, pageSize: 10 },
        {},
        'team-123',
      );
    });
    expect(screen.queryByText('member@example.com')).not.toBeInTheDocument();
  });

  it('short-circuits rejected users in the members tab', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'rejected' }],
      success: true,
    } as any);

    renderWithProviders(<Team />);

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    await waitFor(() => {
      expect(mockGetTeamMembersApi).not.toHaveBeenCalled();
    });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(mockGetTeamMessageApi).not.toHaveBeenCalled();
  });

  it('shows action errors in the members tab', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      setWindowLocation('?action=edit');
      mockGetUserRoles.mockResolvedValueOnce({
        data: [{ team_id: 'team-123', role: 'owner' }],
        success: true,
      } as any);
      mockGetTeamMessageApi.mockResolvedValueOnce({
        data: [
          {
            rank: -1,
            is_public: true,
            json: {
              title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
              description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
              lightLogo: 'logos/light.png',
              darkLogo: 'logos/dark.png',
            },
          },
        ],
        error: null,
      } as any);
      mockGetTeamMembersApi.mockResolvedValue({
        data: memberRows,
        success: true,
        total: memberRows.length,
      } as any);
      mockUpdateRoleApi.mockRejectedValueOnce(new Error('update failed'));
      mockReInvitedApi.mockResolvedValueOnce({ message: 'invite failed' } as any);
      mockDelRoleApi.mockResolvedValueOnce({ error: new Error('delete failed') } as any);

      renderWithProviders(<Team />);

      await waitFor(() => {
        expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
      });
      await act(async () => {
        await Promise.resolve();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

      await waitFor(() => {
        expect(screen.getByText('member@example.com')).toBeInTheDocument();
      });

      const memberRow = screen.getByTestId('team-row-1');
      await act(async () => {
        fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      const rejectedRow = screen.getByTestId('team-row-3');
      await act(async () => {
        fireEvent.click(within(rejectedRow).getByRole('button', { name: 're-invite' }));
        await Promise.resolve();
      });
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Action failed!');
      });

      fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));
      await waitFor(() => {
        expect(mockModalConfirm).toHaveBeenCalledTimes(1);
      });
      await act(async () => {
        await mockModalConfirm.mock.calls[0][0].onOk();
      });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Action failed!');
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('shows inline member-action errors when apis return error objects', async () => {
    setWindowLocation('?action=edit');
    mockGetUserRoles.mockResolvedValueOnce({
      data: [{ team_id: 'team-123', role: 'owner' }],
      success: true,
    } as any);
    mockGetTeamMessageApi.mockResolvedValueOnce({
      data: [
        {
          rank: -1,
          is_public: true,
          json: {
            title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
            description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
            lightLogo: 'logos/light.png',
            darkLogo: 'logos/dark.png',
          },
        },
      ],
      error: null,
    } as any);
    mockGetTeamMembersApi.mockResolvedValue({
      data: memberRows,
      success: true,
      total: memberRows.length,
    } as any);
    mockUpdateRoleApi.mockResolvedValueOnce({ error: new Error('role failed') } as any);

    renderWithProviders(<Team />);

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
    });
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

    await waitFor(() => {
      expect(screen.getByText('member@example.com')).toBeInTheDocument();
    });

    const memberRow = screen.getByTestId('team-row-1');
    await act(async () => {
      fireEvent.click(within(memberRow).getByRole('button', { name: 'Set Admin' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Action failed!');
    });
  });

  it('logs delete and request failures in the members tab', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      setWindowLocation('?action=edit');
      mockGetUserRoles.mockResolvedValueOnce({
        data: [{ team_id: 'team-123', role: 'owner' }],
        success: true,
      } as any);
      mockGetTeamMessageApi.mockResolvedValueOnce({
        data: [
          {
            rank: -1,
            is_public: true,
            json: {
              title: [{ '@xml:lang': 'en', '#text': 'Existing Team' }],
              description: [{ '@xml:lang': 'en', '#text': 'Existing Description' }],
              lightLogo: 'logos/light.png',
              darkLogo: 'logos/dark.png',
            },
          },
        ],
        error: null,
      } as any);
      mockGetTeamMembersApi.mockRejectedValueOnce(new Error('members failed')).mockResolvedValue({
        data: memberRows,
        success: true,
        total: memberRows.length,
      } as any);
      mockDelRoleApi.mockRejectedValueOnce(new Error('delete crashed'));

      renderWithProviders(<Team />);

      await waitFor(() => {
        expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-123');
      });
      await act(async () => {
        await Promise.resolve();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Team Information' }));
      fireEvent.click(screen.getByRole('button', { name: 'Team Members' }));

      await waitFor(() => {
        expect(screen.getByText('member@example.com')).toBeInTheDocument();
      });

      const memberRow = screen.getByTestId('team-row-1');
      fireEvent.click(within(memberRow).getByRole('button', { name: 'Delete' }));
      await waitFor(() => {
        expect(mockModalConfirm).toHaveBeenCalledTimes(1);
      });
      await act(async () => {
        await mockModalConfirm.mock.calls[0][0].onOk();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
