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

  const deepMerge = (target: any, source: any): any => {
    const base = Array.isArray(target) ? [...target] : { ...(target ?? {}) };
    Object.entries(source ?? {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        base[key] = deepMerge(base[key], value);
      } else {
        base[key] = value;
      }
    });
    return base;
  };

  const setDeepValue = (object: any, path: any[], value: any) => {
    if (!path.length) return;
    const [head, ...rest] = path;
    if (rest.length === 0) {
      object[head] = value;
      return;
    }
    if (!object[head] || typeof object[head] !== 'object') {
      object[head] = {};
    }
    setDeepValue(object[head], rest, value);
  };

  const buildNestedValue = (path: any[], value: any): any => {
    if (!path.length) {
      return value;
    }
    const [head, ...rest] = path;
    if (!rest.length) {
      return { [head]: value };
    }
    return { [head]: buildNestedValue(rest, value) };
  };

  const ProForm = ({ formRef, initialValues = {}, onValuesChange, onFinish, children }: any) => {
    const initialRef = React.useRef(initialValues);
    const [values, setValues] = React.useState<any>(initialValues ?? {});
    const pendingChangeRef = React.useRef<any>(null);

    const handleSetFieldValue = React.useCallback((pathInput: any, nextValue: any) => {
      const path = Array.isArray(pathInput) ? pathInput : [pathInput];
      setValues((previous: any) => {
        const draft = JSON.parse(JSON.stringify(previous ?? {}));
        setDeepValue(draft, path, nextValue);
        const changed = buildNestedValue(path, nextValue);
        pendingChangeRef.current = { changed, nextValues: draft };
        return draft;
      });
    }, []);

    const handleSetFieldsValue = React.useCallback((next: any = {}) => {
      setValues((previous: any) => {
        const merged = deepMerge(previous, next);
        pendingChangeRef.current = { changed: next, nextValues: merged };
        return merged;
      });
    }, []);

    const handleResetFields = React.useCallback(() => {
      setValues(initialRef.current ?? {});
    }, []);

    const handleGetFieldsValue = React.useCallback(() => values, [values]);

    const handleSubmit = React.useCallback(async () => onFinish?.(), [onFinish]);

    React.useImperativeHandle(formRef, () => ({
      getFieldsValue: handleGetFieldsValue,
      setFieldsValue: handleSetFieldsValue,
      resetFields: handleResetFields,
      setFieldValue: handleSetFieldValue,
      submit: handleSubmit,
      validateFields: async () => values,
    }));

    React.useEffect(() => {
      if (pendingChangeRef.current) {
        const { changed, nextValues } = pendingChangeRef.current;
        pendingChangeRef.current = null;
        onValuesChange?.(changed, nextValues);
      }
    }, [values, onValuesChange]);

    const contextValue = React.useMemo(
      () => ({
        values,
        setFieldValue: handleSetFieldValue,
        setFieldsValue: handleSetFieldsValue,
      }),
      [values, handleSetFieldValue, handleSetFieldsValue],
    );

    return (
      <ProFormContext.Provider value={contextValue}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {typeof children === 'function' ? children(values) : children}
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
