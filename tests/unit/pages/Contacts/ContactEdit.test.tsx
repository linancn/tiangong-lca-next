// @ts-nocheck
import ContactEdit from '@/pages/Contacts/Components/edit';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  FormOutlined: () => <span>edit</span>,
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

  const Button = React.forwardRef(
    (
      { children, onClick, icon, disabled, type = 'button', ...rest }: any,
      ref: React.Ref<HTMLButtonElement>,
    ) => (
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
    ),
  );
  Button.displayName = 'MockButton';

  const Drawer = ({ open, onClose, title, extra, footer, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <div role='dialog' aria-label={label}>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) => (spinning ? <div>Loading...</div> : children);
  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  const theme = {
    useToken: () => ({
      token: {
        colorPrimary: '#1677ff',
        colorTextDescription: '#8c8c8c',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Drawer,
    ConfigProvider,
    Space,
    Spin,
    Tooltip,
    message,
    theme,
  };
});

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProFormContext = React.createContext<any>(null);

  const ProForm = ({ formRef, initialValues = {}, onValuesChange, onFinish, children }: any) => {
    const valuesRef = React.useRef({ ...initialValues });
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(() => {
      if (formRef) {
        formRef.current = {
          submit: async () => onFinish?.(),
          resetFields: () => {
            valuesRef.current = { ...initialValues };
            forceUpdate();
          },
          getFieldsValue: () => ({ ...valuesRef.current }),
          setFieldsValue: (next: any) => {
            valuesRef.current = { ...valuesRef.current, ...next };
            forceUpdate();
            onValuesChange?.({}, valuesRef.current);
          },
          setFieldValue: (name: any, value: any) => {
            if (Array.isArray(name)) {
              const next = { ...valuesRef.current };
              let cursor = next;
              for (let i = 0; i < name.length - 1; i += 1) {
                const key = name[i];
                cursor[key] = { ...(cursor[key] ?? {}) };
                cursor = cursor[key];
              }
              cursor[name[name.length - 1]] = value;
              valuesRef.current = next;
            } else {
              valuesRef.current = { ...valuesRef.current, [name]: value };
            }
            forceUpdate();
            onValuesChange?.({}, valuesRef.current);
          },
          getFieldValue: (name: any) => {
            if (Array.isArray(name)) {
              return name.reduce(
                (acc: any, key: string) => (acc ? acc[key] : undefined),
                valuesRef.current,
              );
            }
            return valuesRef.current[name];
          },
          validateFields: async () => valuesRef.current,
        };
      }
    });

    const contextValue = React.useMemo(
      () => ({
        values: valuesRef.current,
        setFieldValue: (name: any, value: any) => {
          if (Array.isArray(name)) {
            const next = { ...valuesRef.current };
            let cursor = next;
            for (let i = 0; i < name.length - 1; i += 1) {
              const key = name[i];
              cursor[key] = { ...(cursor[key] ?? {}) };
              cursor = cursor[key];
            }
            cursor[name[name.length - 1]] = value;
            valuesRef.current = next;
          } else {
            valuesRef.current = { ...valuesRef.current, [name]: value };
          }
          forceUpdate();
          onValuesChange?.({}, valuesRef.current);
        },
        setFieldsValue: (next: any) => {
          valuesRef.current = { ...valuesRef.current, ...next };
          forceUpdate();
          onValuesChange?.({}, valuesRef.current);
        },
      }),
      [onValuesChange],
    );

    return (
      <ProFormContext.Provider value={contextValue}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {typeof children === 'function' ? children(valuesRef.current) : children}
        </form>
      </ProFormContext.Provider>
    );
  };

  return {
    __esModule: true,
    ProForm,
    __ProFormContext: ProFormContext,
  };
});

jest.mock('@/pages/Contacts/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');
  return {
    __esModule: true,
    ContactForm: () => {
      const context =
        React.useContext(__ProFormContext) ?? ({ values: {}, setFieldValue: () => {} } as any);

      const shortName =
        context.values?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '';
      const email = context.values?.contactInformation?.dataSetInformation?.email ?? '';

      return (
        <div>
          <label htmlFor='edit-short-name'>Short Name</label>
          <input
            id='edit-short-name'
            value={shortName}
            onChange={(event) =>
              context.setFieldValue?.(
                ['contactInformation', 'dataSetInformation', 'common:shortName'],
                event.target.value,
              )
            }
          />
          <label htmlFor='edit-email'>Email</label>
          <input
            id='edit-email'
            value={email}
            onChange={(event) =>
              context.setFieldValue?.(
                ['contactInformation', 'dataSetInformation', 'email'],
                event.target.value,
              )
            }
          />
        </div>
      );
    },
  };
});

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: jest.fn().mockImplementation(() => ({ findProblemNodes: () => [] })),
  checkData: jest.fn(),
  getErrRefTab: jest.fn(),
  getAllRefObj: jest.fn(() => []),
  getRefTableName: jest.fn((type: string) => {
    const tableDict: Record<string, string> = {
      'contact data set': 'contacts',
      'source data set': 'sources',
      'unit group data set': 'unitgroups',
      'flow property data set': 'flowproperties',
      'flow data set': 'flows',
      'process data set': 'processes',
      'lifeCycleModel data set': 'lifecyclemodels',
    };
    return tableDict[type];
  }),
}));

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactDetail: jest.fn(),
  updateContact: jest.fn(),
}));

jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: jest.fn((dataset: any) => ({
    contactInformation: {
      dataSetInformation: {
        'common:shortName':
          dataset?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '',
        email: dataset?.contactInformation?.dataSetInformation?.email ?? '',
      },
    },
  })),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getDataDetail: jest.fn(() => Promise.resolve({ data: {} })),
  getDataDetailById: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangList: jest.fn((data: any) => data ?? []),
  getLang: jest.fn((data: any, lang: string) => {
    if (Array.isArray(data)) {
      const found = data.find((item: any) => item?.['@lang'] === lang);
      return found?.['#text'] ?? '';
    }
    return data?.['#text'] ?? '';
  }),
}));

const { getContactDetail: mockGetContactDetail, updateContact: mockUpdateContact } =
  jest.requireMock('@/services/contacts/api');

describe('ContactEdit component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContactDetail.mockResolvedValue({
      data: {
        json: {
          contactDataSet: {
            contactInformation: {
              dataSetInformation: {
                'common:shortName': 'Original contact',
                email: 'original@example.com',
              },
            },
          },
        },
      },
    });
    mockUpdateContact.mockResolvedValue({ data: [{ rule_verification: true }] });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('loads detail and saves updates', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });

    await waitFor(() =>
      expect(mockGetContactDetail).toHaveBeenCalledWith('contact-123', '01.00.000'),
    );

    const shortNameInput = within(drawer).getByDisplayValue('Original contact');
    await user.clear(shortNameInput);
    await user.type(shortNameInput, 'Updated contact');

    const emailInput = within(drawer).getByDisplayValue('original@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');

    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateContact).toHaveBeenCalledTimes(1));
    expect(mockUpdateContact).toHaveBeenCalledWith(
      'contact-123',
      '01.00.000',
      expect.objectContaining({
        contactInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'Updated contact',
            email: 'updated@example.com',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Save successfully!'),
    );
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
  });
});
