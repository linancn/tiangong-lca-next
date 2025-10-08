// @ts-nocheck
import FlowpropertiesCreate from '@/pages/Flowproperties/Components/create';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockIntl = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-flowproperty-id'),
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

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {children}
    </button>
  );

  const Drawer = ({ open, title, extra, footer, onClose, children }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'drawer'}>
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

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Tooltip,
    Spin,
    message,
    ConfigProvider,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      cursor[key] = cursor[key] ? { ...cursor[key] } : {};
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
    return next;
  };

  const ProForm = ({ formRef, initialValues = {}, onFinish, children }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});

    const setFieldValue = React.useCallback((path: any[], value: any) => {
      setValues((prev: any) => setNestedValue(prev, path, value));
    }, []);

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        submit: async () => {
          await onFinish?.();
        },
        setFieldsValue: (next: any) => {
          setValues((prev: any) => ({ ...prev, ...next }));
        },
        resetFields: () => {
          setValues(initialValues ?? {});
        },
        getFieldsValue: () => ({ ...values }),
        setFieldValue,
      };
    }, [formRef, onFinish, initialValues, setFieldValue, values]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {typeof children === 'function' ? children(values) : children}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
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

jest.mock('@/pages/Flowproperties/Components/form', () => {
  const React = require('react');
  return {
    __esModule: true,
    FlowpropertyForm: ({ formRef }: any) => {
      const [name, setName] = React.useState('');
      React.useEffect(() => {
        formRef.current?.setFieldsValue({
          flowPropertiesInformation: {
            dataSetInformation: {
              'common:name': [{ '#text': name, '@lang': 'en' }],
            },
          },
        });
      }, [formRef, name]);
      return (
        <div>
          <label htmlFor='flowproperty-name-input'>Flow property name</label>
          <input
            id='flowproperty-name-input'
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      );
    },
  };
});

const mockCreateFlowproperties = jest.fn(async () => ({
  data: [{ id: 'fp-created', version: '1.0.0' }],
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  createFlowproperties: (...args: any[]) => mockCreateFlowproperties(...args),
  getFlowpropertyDetail: jest.fn(),
}));

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: jest.fn((payload: any) => payload ?? {}),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  formatDateTime: jest.fn(() => '2024-01-01T00:00:00Z'),
}));

describe('FlowpropertiesCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a flow property and reloads table on success', async () => {
    const actionRef: any = { current: { reload: jest.fn() } };

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesCreate actionRef={actionRef} lang='en' onClose={jest.fn()} />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    const nameInput = await screen.findByLabelText(/flow property name/i);
    await userEvent.type(nameInput, 'GWP');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockCreateFlowproperties).toHaveBeenCalledWith(
        'generated-flowproperty-id',
        expect.objectContaining({
          flowPropertiesInformation: expect.any(Object),
        }),
      ),
    );

    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Created successfully!');
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
