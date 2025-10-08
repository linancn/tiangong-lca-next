// @ts-nocheck
import ContactCreate from '@/pages/Contacts/Components/create';
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

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-contact-create'),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  CopyOutlined: () => <span>copy</span>,
  PlusOutlined: () => <span>plus</span>,
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
  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };
  const Spin = ({ spinning, children }: any) => (spinning ? <div>Loading...</div> : children);

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

    const handleSubmit = React.useCallback(async () => {
      return onFinish?.();
    }, [onFinish]);

    React.useImperativeHandle(formRef, () => ({
      getFieldsValue: handleGetFieldsValue,
      setFieldsValue: handleSetFieldsValue,
      resetFields: handleResetFields,
      setFieldValue: handleSetFieldValue,
      submit: handleSubmit,
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

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(tooltip) || 'button'}
    </button>
  ),
}));

jest.mock('@/pages/Contacts/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');
  return {
    __esModule: true,
    ContactForm: ({ onData }: any) => {
      const context =
        React.useContext(__ProFormContext) ?? ({ values: {}, setFieldValue: () => {} } as any);

      const shortName =
        context.values?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '';

      return (
        <div>
          <label htmlFor='contact-short-name'>Short Name</label>
          <input
            id='contact-short-name'
            value={shortName}
            onChange={(event) => {
              context.setFieldValue?.(
                ['contactInformation', 'dataSetInformation', 'common:shortName'],
                event.target.value,
              );
              onData?.();
            }}
          />
        </div>
      );
    },
  };
});

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  createContact: jest.fn(),
  getContactDetail: jest.fn(),
}));

jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: jest.fn(() => ({})),
}));

const { createContact: mockCreateContact } = jest.requireMock('@/services/contacts/api');

describe('ContactCreate component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateContact.mockResolvedValue({ data: [{ id: 'contact-new' }] });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('submits new contact and triggers reload', async () => {
    const user = userEvent.setup();

    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <ContactCreate lang='en' actionRef={actionRef as any} onClose={jest.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));

    const drawer = await screen.findByRole('dialog', { name: 'Create Contact' });

    const shortNameInput = within(drawer).getByLabelText('Short Name');
    await user.type(shortNameInput, 'My Contact');

    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCreateContact).toHaveBeenCalledTimes(1));
    expect(mockCreateContact).toHaveBeenCalledWith(
      'uuid-contact-create',
      expect.objectContaining({
        contactInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'My Contact',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Created successfully!'),
    );
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Create Contact' })).not.toBeInTheDocument(),
    );
  });
});
