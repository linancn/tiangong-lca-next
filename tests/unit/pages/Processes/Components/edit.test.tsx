// @ts-nocheck
import ProcessEdit from '@/pages/Processes/Components/edit';
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
  FormOutlined: () => <span>form-icon</span>,
  ProductOutlined: () => <span>product-icon</span>,
}));

jest.mock('@/components/AISuggestion', () => ({
  __esModule: true,
  default: ({ onClose }: any) => (
    <div>
      suggestion
      <button type='button' onClick={() => onClose?.()}>
        close-suggestion
      </button>
    </div>
  ),
}));

jest.mock('@/components/ValidationIssueModal', () => ({
  __esModule: true,
  showValidationIssueModal: jest.fn(),
}));

jest.mock('@/contexts/refCheckContext', () => ({
  __esModule: true,
  RefCheckContext: {
    Provider: ({ children }: any) => <div>{children}</div>,
  },
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowDetail: jest.fn(() =>
    Promise.resolve({ data: { json: { flowDataSet: {} }, version: '1' } }),
  ),
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: jest.fn(() => ({})),
  genFlowNameJson: jest.fn(() => []),
}));

jest.mock('@/services/lciaMethods/data', () => ({
  __esModule: true,
}));

const mockUpdateProcess = jest.fn();
const mockGetProcessDetail = jest.fn();
const updateNodeCbMock = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  updateProcess: (...args: any[]) => mockUpdateProcess(...args),
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
}));

const mockGenProcessFromData = jest.fn();
const mockGenProcessJsonOrdered = jest.fn();
const mockBuildValidationIssues = jest.fn(() => []);
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
  genProcessJsonOrdered: (...args: any[]) => mockGenProcessJsonOrdered(...args),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: jest.fn(() => Promise.resolve('team-1')),
}));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: function () {
    return {};
  },
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  checkReferences: jest.fn(() => Promise.resolve({ findProblemNodes: () => [] })),
  checkVersions: jest.fn(() => Promise.resolve()),
  dealProcress: jest.fn(),
  getAllRefObj: jest.fn(() => []),
  getErrRefTab: jest.fn(() => ''),
  mapValidationIssuesToRefCheckData: jest.fn(() => []),
  updateReviewsAfterCheckData: jest.fn(),
  updateUnReviewToUnderReview: jest.fn(() => Promise.resolve()),
  validateDatasetWithSdk: (...args: any[]) => mockValidateDatasetWithSdk(...args),
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
  const FormComponent = ({ children }: any) => <div>{children}</div>;
  FormComponent.Item = ({ children }: any) => <div>{children}</div>;
  const Input = (props: any) => <input {...props} />;

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
    Form: FormComponent,
    Input,
    message,
  };
});

const { message: mockAntdMessage } = jest.requireMock('antd');

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
    const valuesRef = React.useRef({ ...initialValues });

    React.useEffect(() => {
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
        },
        getFieldValue: (name: any) => {
          if (Array.isArray(name)) {
            return name.reduce((acc, key) => (acc ? acc[key] : undefined), valuesRef.current);
          }
          return valuesRef.current[name];
        },
      };
      if (formRef) {
        formRef.current = api;
      }
      proFormApi = api;
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

jest.mock('@/pages/Processes/Components/form', () => ({
  __esModule: true,
  ProcessForm: (props: any) => {
    latestProcessFormProps = props;
    return <div data-testid='process-form'>form</div>;
  },
}));

describe('ProcessEdit component', () => {
  const actionRef = { current: { reload: jest.fn() } };
  const setViewDrawerVisible = jest.fn();
  const baseProps = {
    id: 'process-1',
    version: '1.0.0',
    lang: 'en',
    buttonType: 'icon',
    actionRef,
    setViewDrawerVisible,
    updateNodeCb: updateNodeCbMock,
    showRules: false,
  };

  const processDataset = {
    processInformation: { name: 'Existing process' },
    administrativeInformation: { note: 'keep existing admin info' },
    exchanges: {
      exchange: [
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actionRef.current.reload.mockClear();
    mockBuildValidationIssues.mockReset().mockReturnValue([]);
    mockValidateDatasetWithSdk.mockReset().mockReturnValue({ success: true, issues: [] });
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          json: { processDataSet: processDataset },
          state_code: 50,
          rule_verification: true,
        },
      ],
    });
    mockGetProcessDetail.mockResolvedValue({
      data: {
        json: { processDataSet: processDataset },
        state_code: 10,
        rule_verification: false,
      },
    });
    mockGenProcessFromData.mockReturnValue({ ...processDataset });
  });

  it('loads process data and submits updates successfully', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });

    expect(latestProcessFormProps).toBeTruthy();

    const currentValues = proFormApi?.getFieldsValue() ?? {};
    await act(async () => {
      proFormApi?.setFieldsValue({ processInformation: { name: 'Updated name' } });
      triggerValuesChange?.({}, { ...currentValues, processInformation: { name: 'Updated name' } });
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    await waitFor(() =>
      expect(mockUpdateProcess).toHaveBeenCalledWith('process-1', '1.0.0', expect.any(Object)),
    );
    expect(mockAntdMessage.success).toHaveBeenCalled();
    expect(actionRef.current.reload).toHaveBeenCalled();
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(updateNodeCbMock).toHaveBeenCalledWith({
      '@refObjectId': 'process-1',
      '@version': '1.0.0',
      '@type': 'process data set',
    });
  });

  it('auto opens without rendering the trigger icon', async () => {
    render(<ProcessEdit {...baseProps} autoOpen={true} />);

    expect(screen.getByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();
    expect(screen.queryByText('form-icon')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });
  });

  it('blocks submission when allocated fractions exceed 100%', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalled();
    });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          allocations: { allocation: { '@allocatedFraction': '150%' } },
        },
      ]);
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).not.toHaveBeenCalled();
    expect(mockAntdMessage.error).toHaveBeenCalledWith(
      expect.stringContaining('Allocated fraction total of output is greater than 100%'),
    );
  });

  it('does not save an empty payload when data check is clicked before process detail loads', async () => {
    mockGetProcessDetail.mockImplementation(() => new Promise(() => {}));

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() => {
      expect(mockUpdateProcess).not.toHaveBeenCalled();
    });
  });

  it('uses the latest form snapshot when data check saves the process', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });

    await act(async () => {
      proFormApi?.setFieldsValue({
        processInformation: { name: 'Updated from form snapshot' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));
    });

    await waitFor(() => {
      expect(mockUpdateProcess).toHaveBeenCalledWith(
        'process-1',
        '1.0.0',
        expect.objectContaining({
          processInformation: { name: 'Updated from form snapshot' },
          administrativeInformation: { note: 'keep existing admin info' },
        }),
      );
    });
  });

  it('keeps the current tab when data check finds exchange issues', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: {
            processDataSet: {
              processInformation: { name: 'Existing process' },
              exchanges: {
                exchange: [],
              },
            },
          },
          state_code: 10,
          rule_verification: false,
        },
      ],
    });
    mockGenProcessFromData.mockImplementation((dataset: any) => ({
      processInformation: dataset?.processInformation ?? { name: 'Existing process' },
      exchanges: dataset?.exchanges ?? { exchange: [] },
    }));

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });

    expect(latestProcessFormProps.activeTabKey).toBe('processInformation');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));
    });

    await waitFor(() => {
      expect(mockUpdateProcess).toHaveBeenCalledWith('process-1', '1.0.0', expect.any(Object));
    });

    expect(latestProcessFormProps.activeTabKey).toBe('processInformation');
    expect(mockAntdMessage.error).toHaveBeenCalledWith('Please select exchanges');
  });

  it('maps quantitative reference sdk issues to exchanges instead of process information', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: processDataset },
          state_code: 10,
          rule_verification: false,
        },
      ],
    });
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [
        {
          path: [
            'processDataSet',
            'processInformation',
            'quantitativeReference',
            'referenceToReferenceFlow',
          ],
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));
    });

    await waitFor(() => {
      expect(mockBuildValidationIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          sdkInvalidTabNames: ['exchanges'],
        }),
      );
    });

    expect(mockAntdMessage.error).toHaveBeenCalledWith('exchanges：Data check failed!');
  });
});
