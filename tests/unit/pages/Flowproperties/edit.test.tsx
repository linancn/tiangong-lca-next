// @ts-nocheck
import FlowpropertiesEdit from '@/pages/Flowproperties/Components/edit';
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

  const theme = {
    useToken: () => ({
      token: {
        colorError: '#ff4d4f',
        colorPrimary: '#1677ff',
        colorTextDescription: '#888',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Tooltip,
    Spin,
    message,
    theme,
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

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});

    const setFieldValue = React.useCallback(
      (path: any[], value: any) => {
        setValues((prev: any) => {
          const next = setNestedValue(prev, path, value);
          onValuesChange?.({}, next);
          return next;
        });
      },
      [onValuesChange],
    );

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
        validateFields: jest.fn(() => Promise.resolve()),
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

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: {
    footer_right: 'footer_right',
  },
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

const mockGetFlowpropertyDetail = jest.fn(async () => ({
  data: {
    json: {
      flowPropertyDataSet: {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:name': [{ '#text': 'Existing name', '@lang': 'en' }],
          },
        },
      },
    },
    version: '1.0.0',
  },
}));

const mockUpdateFlowproperties = jest.fn(async () => ({
  data: [{ rule_verification: true }],
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyDetail: (...args: any[]) => mockGetFlowpropertyDetail(...args),
  updateFlowproperties: (...args: any[]) => mockUpdateFlowproperties(...args),
}));

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: jest.fn((payload: any) => payload ?? {}),
}));

const refCheckContextValue = { refCheckData: [] };
jest.mock('@/contexts/refCheckContext', () => {
  const React = require('react');
  const RefCheckContext = React.createContext(refCheckContextValue);
  return {
    __esModule: true,
    RefCheckContext,
    useRefCheckContext: () => refCheckContextValue,
  };
});

const updateReferenceContextValue = { referenceValue: 0 };
jest.mock('@/contexts/updateReferenceContext', () => {
  const React = require('react');
  const UpdateReferenceContext = React.createContext(updateReferenceContextValue);
  return {
    __esModule: true,
    UpdateReferenceContext,
    useUpdateReferenceContext: () => updateReferenceContextValue,
  };
});

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  checkData: jest.fn(),
  ReffPath: jest.fn(() => ({
    findProblemNodes: () => [],
  })),
  getErrRefTab: jest.fn(() => ''),
}));

describe('FlowpropertiesEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates flow property and reloads list on success', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const updateErrRef = jest.fn();

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesEdit
          id='fp-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          lang='en'
          updateErrRef={updateErrRef}
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-1', '1.0.0'));

    const nameInput = await screen.findByLabelText(/flow property name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated name');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockUpdateFlowproperties).toHaveBeenCalledWith(
        'fp-1',
        '1.0.0',
        expect.objectContaining({
          flowPropertiesInformation: expect.any(Object),
        }),
      ),
    );

    const { message } = jest.requireMock('antd');
    expect(message.success).toHaveBeenCalledWith('Saved successfully!');
    expect(updateErrRef).toHaveBeenCalledWith(null);
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
