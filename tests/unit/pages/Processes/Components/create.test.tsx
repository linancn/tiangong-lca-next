// @ts-nocheck
import ProcessCreate from '@/pages/Processes/Components/create';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let proFormApi: any = null;
let triggerValuesChange: ((_: any, values: any) => void) | null = null;
let latestProcessFormProps: any = null;

beforeEach(() => {
  proFormApi = null;
  triggerValuesChange = null;
  latestProcessFormProps = null;
});

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  CopyOutlined: () => <span>copy-icon</span>,
  PlusOutlined: () => <span>plus-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Spin,
    message,
  };
});

const { message: mockAntdMessage } = jest.requireMock('antd');

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...source };
    let cursor = next;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      cursor[key] = { ...(cursor[key] ?? {}) };
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
    return next;
  };

  const getNestedValue = (source: any, path: any[]) => {
    return path.reduce((acc, key) => (acc ? acc[key] : undefined), source);
  };

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
    const valuesRef = React.useRef({ ...initialValues });

    const buildApi = React.useCallback(() => {
      const api = {
        submit: async () => onFinish?.(),
        resetFields: () => {
          valuesRef.current = { ...initialValues };
        },
        getFieldsValue: () => ({ ...valuesRef.current }),
        setFieldsValue: (next: any) => {
          valuesRef.current = { ...valuesRef.current, ...next };
        },
        setFieldValue: (name: any, value: any) => {
          if (Array.isArray(name)) {
            valuesRef.current = setNestedValue(valuesRef.current, name, value);
          } else {
            valuesRef.current = { ...valuesRef.current, [name]: value };
          }
        },
        getFieldValue: (name: any) => {
          if (Array.isArray(name)) {
            return getNestedValue(valuesRef.current, name);
          }
          return valuesRef.current[name];
        },
      };
      if (formRef) {
        formRef.current = api;
      }
      proFormApi = api;
      return api;
    }, [formRef, initialValues, onFinish]);

    React.useEffect(() => {
      buildApi();
    });

    React.useEffect(() => {
      triggerValuesChange = onValuesChange;
    }, [onValuesChange]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {typeof children === 'function' ? children(valuesRef.current) : children}
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
  default: ({ onClick, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      create
    </button>
  ),
}));

jest.mock('@/services/general/util', () => {
  const actual = jest.requireActual('@/services/general/util');
  return {
    __esModule: true,
    ...actual,
    formatDateTime: () => '2024-01-01 00:00',
  };
});

const mockCreateProcess = jest.fn();
const mockGetProcessDetail = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  createProcess: (...args: any[]) => mockCreateProcess(...args),
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
}));

const mockGenProcessFromData = jest.fn();

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
}));

jest.mock('@/pages/Processes/Components/form', () => ({
  __esModule: true,
  ProcessForm: (props: any) => {
    latestProcessFormProps = props;
    return <div data-testid='process-form'>form</div>;
  },
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: () => 'generated-id',
}));

describe('ProcessCreate component', () => {
  const actionRef = { current: { reload: jest.fn() } };

  const baseProps = {
    lang: 'en',
    actionRef,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actionRef.current.reload.mockClear();
    mockCreateProcess.mockResolvedValue({ data: { id: 'generated-id' } });
  });

  it('submits new process and normalizes allocations when no fraction is set', async () => {
    render(<ProcessCreate {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    expect(screen.getByRole('dialog', { name: 'Create process' })).toBeInTheDocument();
    expect(latestProcessFormProps).toBeTruthy();

    await act(async () => {
      latestProcessFormProps.onExchangeDataCreate({
        '@dataSetInternalID': '0',
        exchangeDirection: 'OUTPUT',
        quantitativeReference: true,
      });
    });

    const currentValues = proFormApi?.getFieldsValue() ?? {};
    await act(async () => {
      proFormApi?.setFieldsValue({ processInformation: { name: 'New process' } });
      triggerValuesChange?.({}, { ...currentValues, processInformation: { name: 'New process' } });
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockCreateProcess).toHaveBeenCalledWith('generated-id', expect.any(Object));
    expect(mockAntdMessage.success).toHaveBeenCalled();
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('prevents submission when allocated fraction exceeds 100%', async () => {
    render(<ProcessCreate {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          allocations: { allocation: { '@allocatedFraction': '120%' } },
        },
      ]);
    });

    const currentValues = proFormApi?.getFieldsValue() ?? {};
    await act(async () => {
      proFormApi?.setFieldsValue({ processInformation: { name: 'Invalid process' } });
      triggerValuesChange?.(
        {},
        { ...currentValues, processInformation: { name: 'Invalid process' } },
      );
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockCreateProcess).not.toHaveBeenCalled();
    expect(mockAntdMessage.error).toHaveBeenCalledWith(
      expect.stringContaining('Allocated fraction total of output is greater than 100%'),
    );
  });

  it('loads existing data and overrides the version when creating a new version', async () => {
    mockGetProcessDetail.mockResolvedValue({
      data: {
        json: {
          processDataSet: {
            processInformation: {
              dataSetInformation: {
                name: 'Existing process',
              },
            },
          },
        },
      },
    });
    mockGenProcessFromData.mockReturnValue({
      administrativeInformation: {
        publicationAndOwnership: {
          'common:dataSetVersion': '01.01.000',
        },
      },
      exchanges: {
        exchange: [{ '@dataSetInternalID': '0' }],
      },
    });

    render(
      <ProcessCreate
        {...baseProps}
        actionType='createVersion'
        id='process-1'
        version='1.0.0'
        newVersion='02.00.000'
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0'));
    await waitFor(() =>
      expect(
        proFormApi?.getFieldValue([
          'administrativeInformation',
          'publicationAndOwnership',
          'common:dataSetVersion',
        ]),
      ).toBe('02.00.000'),
    );
    expect(latestProcessFormProps.formType).toBe('createVersion');
    expect(latestProcessFormProps.exchangeDataSource).toEqual([{ '@dataSetInternalID': '0' }]);
  });

  it('shows the duplicate-id error when createProcess returns a unique constraint violation', async () => {
    mockCreateProcess.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    render(<ProcessCreate {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    const currentValues = proFormApi?.getFieldsValue() ?? {};
    await act(async () => {
      proFormApi?.setFieldsValue({ processInformation: { name: 'Duplicate process' } });
      triggerValuesChange?.(
        {},
        { ...currentValues, processInformation: { name: 'Duplicate process' } },
      );
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockCreateProcess).toHaveBeenCalledWith('generated-id', expect.any(Object));
    expect(mockAntdMessage.error).toHaveBeenCalledWith('Data with the same ID already exists.');
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('opens automatically from imported data and reuses the imported UUID on submit', async () => {
    const importedId = '123e4567-e89b-12d3-a456-426614174000';
    mockGenProcessFromData.mockReturnValue({
      processInformation: {
        dataSetInformation: {
          name: 'Imported process',
        },
      },
      exchanges: {
        exchange: [],
      },
    });

    render(
      <ProcessCreate
        {...baseProps}
        importData={[
          {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  'common:UUID': importedId,
                },
              },
            },
          },
        ]}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Create process' })).toBeInTheDocument(),
    );

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockCreateProcess).toHaveBeenCalledWith(importedId, expect.any(Object));
    expect(mockAntdMessage.success).toHaveBeenCalled();
  });
});
