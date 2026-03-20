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
let latestRefsDrawerProps: any = null;
let mockValidateFields = jest.fn();
let mockLatestAISuggestionJson: any = {
  processDataSet: {
    processInformation: { name: 'AI suggested process' },
    exchanges: { exchange: [] },
  },
};

beforeEach(() => {
  proFormApi = null;
  triggerValuesChange = null;
  latestProcessFormProps = null;
  latestRefsDrawerProps = null;
  mockValidateFields = jest.fn(async () => proFormApi?.getFieldsValue?.() ?? {});
  mockLatestAISuggestionJson = {
    processDataSet: {
      processInformation: { name: 'AI suggested process' },
      exchanges: { exchange: [] },
    },
  };
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
  default: ({ onClose, onLatestJsonChange }: any) => (
    <div>
      suggestion
      <button
        type='button'
        onClick={() => {
          onLatestJsonChange?.(mockLatestAISuggestionJson);
          onClose?.();
        }}
      >
        close-suggestion
      </button>
    </div>
  ),
}));

jest.mock('@/contexts/refCheckContext', () => ({
  __esModule: true,
  RefCheckContext: {
    Provider: ({ children }: any) => <div>{children}</div>,
  },
}));

const mockGetFlowDetail = jest.fn();

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowDetail: (...args: any[]) => mockGetFlowDetail(...args),
}));

const mockGenFlowFromData = jest.fn();
const mockGenFlowNameJson = jest.fn();

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: (...args: any[]) => mockGenFlowFromData(...args),
  genFlowNameJson: (...args: any[]) => mockGenFlowNameJson(...args),
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

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
  genProcessJsonOrdered: (...args: any[]) => mockGenProcessJsonOrdered(...args),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: jest.fn(() => Promise.resolve('team-1')),
}));

const mockCheckReferences = jest.fn();
const mockCheckVersions = jest.fn();
const mockDealProcress = jest.fn();
const mockGetAllRefObj = jest.fn();
const mockGetErrRefTab = jest.fn();
const mockBuildValidationIssues = jest.fn(() => []);
const mockMapValidationIssuesToRefCheckData = jest.fn(() => []);
const mockUpdateReviewsAfterCheckData = jest.fn();
const mockUpdateUnReviewToUnderReview = jest.fn();
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: function () {
    return {};
  },
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  checkReferences: (...args: any[]) => mockCheckReferences(...args),
  checkVersions: (...args: any[]) => mockCheckVersions(...args),
  dealProcress: (...args: any[]) => mockDealProcress(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getErrRefTab: (...args: any[]) => mockGetErrRefTab(...args),
  mapValidationIssuesToRefCheckData: (...args: any[]) =>
    mockMapValidationIssuesToRefCheckData(...args),
  updateReviewsAfterCheckData: (...args: any[]) => mockUpdateReviewsAfterCheckData(...args),
  updateUnReviewToUnderReview: (...args: any[]) => mockUpdateUnReviewToUnderReview(...args),
  validateDatasetWithSdk: (...args: any[]) => mockValidateDatasetWithSdk(...args),
}));

jest.mock('@/components/ValidationIssueModal', () => ({
  __esModule: true,
  showValidationIssueModal: jest.fn(),
}));

const mockGetRefsOfCurrentVersion = jest.fn();
const mockGetRefsOfNewVersion = jest.fn();
const mockUpdateRefsData = jest.fn();

jest.mock('@/pages/Utils/updateReference', () => ({
  __esModule: true,
  getRefsOfCurrentVersion: (...args: any[]) => mockGetRefsOfCurrentVersion(...args),
  getRefsOfNewVersion: (...args: any[]) => mockGetRefsOfNewVersion(...args),
  updateRefsData: (...args: any[]) => mockUpdateRefsData(...args),
}));

jest.mock('@/components/RefsOfNewVersionDrawer', () => ({
  __esModule: true,
  default: (props: any) => {
    latestRefsDrawerProps = props;
    if (!props.open) return null;
    return (
      <div data-testid='refs-drawer'>
        <button type='button' onClick={props.onKeep}>
          keep-current
        </button>
        <button type='button' onClick={() => props.onUpdate(props.dataSource)}>
          update-latest
        </button>
        <button type='button' onClick={props.onCancel}>
          cancel-refs
        </button>
      </div>
    );
  },
}));

const mockValidateEnhanced = jest.fn();

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createProcess: jest.fn(() => ({
    validateEnhanced: (...args: any[]) => mockValidateEnhanced(...args),
  })),
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'review-uuid'),
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

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>
          {extra}
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
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

  const ProForm = ({
    formRef,
    initialValues = {},
    onFinish,
    onValuesChange,
    submitter,
    children,
  }: any) => {
    const valuesRef = React.useRef({ ...initialValues });

    React.useEffect(() => {
      const api = {
        submit: async () => onFinish?.(),
        resetFields: () => {
          valuesRef.current = { ...initialValues };
        },
        validateFields: (...args: any[]) => mockValidateFields(...args),
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
        {submitter?.render?.() ?? null}
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

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildValidationIssues.mockReturnValue([]);
    actionRef.current.reload.mockClear();
    mockGetFlowDetail.mockResolvedValue({
      data: { json: { flowDataSet: {} }, version: '1.0.1' },
    });
    mockGenFlowFromData.mockReturnValue({
      flowInformation: {
        dataSetInformation: {
          name: { baseName: [{ '@xml:lang': 'en', '#text': 'Updated flow' }] },
        },
      },
    });
    mockGenFlowNameJson.mockReturnValue([{ '@xml:lang': 'en', '#text': 'Updated flow' }]);
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: processDataset },
          state_code: 10,
          rule_verification: true,
        },
      ],
    });
    mockGetProcessDetail.mockResolvedValue({
      data: {
        json: { processDataSet: processDataset },
        teamId: 'team-1',
        stateCode: 10,
        ruleVerification: false,
        state_code: 10,
        rule_verification: false,
      },
    });
    mockGenProcessFromData.mockReturnValue({ ...processDataset });
    mockCheckReferences.mockResolvedValue({ findProblemNodes: () => [] });
    mockCheckVersions.mockResolvedValue(undefined);
    mockDealProcress.mockImplementation(() => undefined);
    mockGetAllRefObj.mockReturnValue([]);
    mockGetErrRefTab.mockReturnValue('');
    mockMapValidationIssuesToRefCheckData.mockReturnValue([]);
    mockUpdateReviewsAfterCheckData.mockResolvedValue({});
    mockUpdateUnReviewToUnderReview.mockResolvedValue([]);
    mockGetRefsOfCurrentVersion.mockResolvedValue({ oldRefs: [] });
    mockGetRefsOfNewVersion.mockResolvedValue({ newRefs: [], oldRefs: [] });
    mockUpdateRefsData.mockImplementation((data: any) => data);
    mockValidateDatasetWithSdk.mockReturnValue({ success: true, issues: [] });
    mockValidateEnhanced.mockReturnValue({ success: true });
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

  it('saves successfully when updateNodeCb falls back to the default no-op handler', async () => {
    const propsWithoutNodeCb = { ...baseProps };
    delete propsWithoutNodeCb.updateNodeCb;

    render(<ProcessEdit {...propsWithoutNodeCb} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalled();
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Save successfully!');
  });

  it('handles validation-tab sync callbacks before saving', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onTabChange('validation');
    });
    await waitFor(() => expect(latestProcessFormProps.activeTabKey).toBe('validation'));
    await act(async () => {
      proFormApi?.setFieldValue(['modellingAndValidation', 'validation'], {
        review: [{ id: 'validation-review' }],
      });
      await latestProcessFormProps.onData();
    });
    await act(async () => {});
    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalled();
  });

  it('handles compliance-tab sync callbacks before saving', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onTabChange('complianceDeclarations');
    });
    await waitFor(() => expect(latestProcessFormProps.activeTabKey).toBe('complianceDeclarations'));
    await act(async () => {
      proFormApi?.setFieldValue(['modellingAndValidation', 'complianceDeclarations'], {
        compliance: [{ id: 'compliance-review' }],
      });
      await latestProcessFormProps.onData();
    });
    await act(async () => {});
    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalled();
  });

  it('handles validation-tab value changes through the form change handler', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onTabChange('validation');
    });
    await waitFor(() => expect(latestProcessFormProps.activeTabKey).toBe('validation'));

    await act(async () => {
      triggerValuesChange?.(
        {},
        {
          modellingAndValidation: {
            validation: { review: [{ id: 'validation-review' }] },
          },
        },
      );
    });

    expect(mockUpdateProcess).not.toHaveBeenCalled();
  });

  it('handles compliance-tab value changes through the form change handler', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onTabChange('complianceDeclarations');
    });
    await waitFor(() => expect(latestProcessFormProps.activeTabKey).toBe('complianceDeclarations'));

    await act(async () => {
      triggerValuesChange?.(
        {},
        {
          modellingAndValidation: {
            complianceDeclarations: { compliance: [{ id: 'compliance-review' }] },
          },
        },
      );
    });

    expect(mockUpdateProcess).not.toHaveBeenCalled();
  });

  it('handles generic-tab value changes through the form change handler', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onTabChange('technology');
    });
    await waitFor(() => expect(latestProcessFormProps.activeTabKey).toBe('technology'));

    await act(async () => {
      triggerValuesChange?.({}, {});
    });

    expect(mockUpdateProcess).not.toHaveBeenCalled();
  });

  it('handles generic-tab sync callbacks with empty values', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onTabChange('technology');
    });
    await waitFor(() => expect(latestProcessFormProps.activeTabKey).toBe('technology'));
    await act(async () => {
      await latestProcessFormProps.onData();
    });
    await act(async () => {});
    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalled();
  });

  it('creates exchange rows through the process-form callback with generated internal ids', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeDataCreate({
        exchangeDirection: 'INPUT',
        quantitativeReference: false,
      });
    });
    await waitFor(() => expect(latestProcessFormProps.exchangeDataSource).toHaveLength(2));
    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalledWith(
      'process-1',
      '1.0.0',
      expect.objectContaining({
        exchanges: {
          exchange: expect.arrayContaining([
            expect.objectContaining({
              '@dataSetInternalID': '1',
              exchangeDirection: 'INPUT',
            }),
          ]),
        },
      }),
    );
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

  it('falls back to zero when an allocated fraction string cannot be derived', async () => {
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
          allocations: {
            allocation: {
              '@allocatedFraction': {
                toString: () => undefined,
              },
            },
          },
        },
      ]);
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalled();
  });

  it('opens automatically when autoOpen is enabled', async () => {
    render(<ProcessEdit {...baseProps} autoOpen />);

    expect(await screen.findByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();
    expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
  });

  it('auto-fills a 100% allocation for the quantitative reference output when none is provided', async () => {
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
        },
      ]);
    });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalledWith(
      'process-1',
      '1.0.0',
      expect.objectContaining({
        exchanges: {
          exchange: [
            expect.objectContaining({
              allocations: {
                allocation: {
                  '@allocatedFraction': '100%',
                },
              },
            }),
          ],
        },
      }),
    );
  });

  it('applies the latest AI suggestion payload when the suggestion panel closes', async () => {
    mockLatestAISuggestionJson = {
      processDataSet: {
        processInformation: { name: 'AI applied process' },
        exchanges: { exchange: [] },
      },
    };
    mockGenProcessFromData.mockImplementation((payload: any) => {
      if (payload === mockLatestAISuggestionJson.processDataSet) {
        return {
          processInformation: { name: 'AI applied process' },
          exchanges: { exchange: [] },
        };
      }
      return { ...processDataset };
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'close-suggestion' }));

    expect(proFormApi?.getFieldsValue()).toEqual(
      expect.objectContaining({
        id: 'process-1',
        processInformation: { name: 'AI applied process' },
      }),
    );
  });

  it('falls back to an empty AI suggestion payload when no latest json was stored', async () => {
    mockLatestAISuggestionJson = undefined;
    mockGenProcessFromData.mockImplementation((payload: any) => {
      if (payload && Object.keys(payload).length > 0) {
        return { ...processDataset };
      }
      return {
        exchanges: { exchange: [] },
      };
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'close-suggestion' }));

    expect(proFormApi?.getFieldsValue()).toEqual(
      expect.objectContaining({
        id: 'process-1',
      }),
    );
  });

  it('falls back to an empty exchange list when an empty AI suggestion payload is applied', async () => {
    mockLatestAISuggestionJson = undefined;
    mockGenProcessFromData.mockImplementation((payload: any) => {
      if (payload && Object.keys(payload).length > 0) {
        return { ...processDataset };
      }
      return {};
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'close-suggestion' }));

    expect(proFormApi?.getFieldsValue()).toEqual(
      expect.objectContaining({
        id: 'process-1',
      }),
    );
  });

  it('falls back to an empty saved process dataset when data-check refresh returns no process json', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          state_code: 10,
          rule_verification: true,
        },
      ],
    });
    mockGenProcessFromData.mockImplementation((payload: any) => {
      if (payload && Object.keys(payload).length > 0) {
        return { ...processDataset };
      }
      return {};
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockUpdateProcess).toHaveBeenCalled());
  });

  it('opens the refs drawer when newer references exist and keeps the current versions on demand', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [{ id: 'flow-1', version: '2.0.0' }],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-1',
            '@version': '1.0.0',
          },
        },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();
    expect(latestRefsDrawerProps.dataSource).toEqual([{ id: 'flow-1', version: '2.0.0' }]);

    fireEvent.click(screen.getByRole('button', { name: 'keep-current' }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'process-1' }),
        [{ id: 'flow-1', version: '1.0.0' }],
        false,
      ),
    );
    expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0.0');
  });

  it('keeps exchange references unchanged when the latest flow lookup returns no data', async () => {
    mockGetFlowDetail.mockResolvedValueOnce({});
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-1',
            '@version': '1.0.0',
          },
        },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));

    await waitFor(() => expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0.0'));
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('resolves array-based flow references and filters invalid short descriptions during reference updates', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });
    mockGetFlowDetail.mockResolvedValueOnce({
      data: { json: {} },
      version: undefined,
    });
    mockGenFlowFromData.mockReturnValue({
      flowInformation: {
        dataSetInformation: {
          name: { baseName: [] },
        },
      },
    });
    mockGenFlowNameJson.mockReturnValue([
      { '@xml:lang': 'en' },
      { '#text': 'missing-lang' },
      { '@xml:lang': 'en', '#text': 'Valid flow name' },
    ]);

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          referenceToFlowDataSet: [
            {
              '@refObjectId': 'flow-1',
              '@version': '1.0.0',
            },
          ],
        },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));

    await waitFor(() => expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0.0'));
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('falls back to an empty short-description list when flow names are unavailable during reference updates', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });
    mockGetFlowDetail.mockResolvedValueOnce({
      data: { json: {} },
      version: '1.0.1',
    });
    mockGenFlowFromData.mockReturnValue({
      flowInformation: {
        dataSetInformation: {
          name: { baseName: [] },
        },
      },
    });
    mockGenFlowNameJson.mockReturnValue(undefined);

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-1',
            '@version': '1.0.0',
          },
        },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));

    await waitFor(() => expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0.0'));
  });

  it('updates references inline when no newer versions exist', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-1',
            '@version': '1.0.0',
          },
        },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));

    await waitFor(() => expect(mockUpdateRefsData).toHaveBeenCalled());
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
    expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0.0');
  });

  it('shows the open-data error when save fails with state_code 100', async () => {
    mockUpdateProcess.mockResolvedValue({
      error: { state_code: 100, message: 'open data' },
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockAntdMessage.error).toHaveBeenCalledWith('This data is open data, save failed');
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('shows the under-review error when save fails with state_code 20', async () => {
    mockUpdateProcess.mockResolvedValue({
      error: { state_code: 20, message: 'under review' },
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockAntdMessage.error).toHaveBeenCalledWith('Data is under review, save failed');
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('shows the backend message when save fails with a generic error', async () => {
    mockUpdateProcess.mockResolvedValue({
      error: { message: 'unexpected save error' },
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockAntdMessage.error).toHaveBeenCalledWith('unexpected save error');
  });

  it('blocks data check when the updated process is already under review', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: processDataset },
          state_code: 30,
          rule_verification: true,
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'This data set is under review and cannot be validated',
      ),
    );
  });

  it('stops review submission when the refreshed process detail is missing', async () => {
    mockGetProcessDetail.mockResolvedValue({});

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Submit review failed'));
    expect(mockUpdateReviewsAfterCheckData).not.toHaveBeenCalled();
  });

  it('does not continue review submission when the review creation call fails', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: processDataset },
          state_code: 10,
          rule_verification: true,
        },
      ],
    });
    mockUpdateReviewsAfterCheckData.mockResolvedValue({
      error: { message: 'review creation failed' },
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() => expect(mockUpdateReviewsAfterCheckData).toHaveBeenCalled());
    expect(mockUpdateUnReviewToUnderReview).not.toHaveBeenCalled();
    expect(mockAntdMessage.success).not.toHaveBeenCalledWith('Review submitted successfully');
  });

  it('applies the latest reference versions when the user confirms the update drawer', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [{ id: 'flow-1', version: '2.0.0' }],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onExchangeData([
        {
          '@dataSetInternalID': '0',
          exchangeDirection: 'OUTPUT',
          quantitativeReference: true,
          referenceToFlowDataSet: {
            '@refObjectId': 'flow-1',
            '@version': '1.0.0',
          },
        },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'update-latest' }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'process-1' }),
        [{ id: 'flow-1', version: '2.0.0' }],
        true,
      ),
    );
  });

  it('closes the refs drawer when the user cancels the reference update flow', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [{ id: 'flow-1', version: '2.0.0' }],
      oldRefs: [{ id: 'flow-1', version: '1.0.0' }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'Update Reference' }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'cancel-refs' }));
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('hides the review action when hideReviewButton is enabled', async () => {
    render(<ProcessEdit {...baseProps} hideReviewButton />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Reference' })).toBeInTheDocument();
  });

  it('closes the drawer when cancel is clicked', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit process' })).not.toBeInTheDocument(),
    );
  });

  it('closes the drawer from the icon button and drawer onClose handler', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close-icon' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit process' })).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit process' })).not.toBeInTheDocument(),
    );
  });

  it('stops data-check after save when the intermediate save result has an error', async () => {
    mockUpdateProcess.mockResolvedValue({
      error: { message: 'save before check failed' },
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('save before check failed'),
    );
    expect(mockAntdMessage.success).not.toHaveBeenCalledWith('Data check successfully!');
  });

  it('shows a validation error when data check runs without exchanges', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: { processInformation: { name: 'Existing process' } } },
          state_code: 10,
          rule_verification: true,
        },
      ],
    });
    mockGenProcessFromData.mockImplementation(() => ({
      processInformation: { name: 'Existing process' },
      exchanges: {},
    }));

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('Please select exchanges'),
    );
  });

  it('shows a validation error when exchanges do not contain exactly one quantitative reference', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: {
            processDataSet: {
              processInformation: { name: 'Existing process' },
              exchanges: {
                exchange: [
                  { exchangeDirection: 'OUTPUT', quantitativeReference: true },
                  { exchangeDirection: 'OUTPUT', quantitativeReference: true },
                ],
              },
            },
          },
          state_code: 10,
          rule_verification: true,
        },
      ],
    });
    mockGenProcessFromData.mockImplementation(() => ({
      processInformation: { name: 'Existing process' },
      exchanges: {
        exchange: [
          { exchangeDirection: 'OUTPUT', quantitativeReference: true },
          { exchangeDirection: 'OUTPUT', quantitativeReference: true },
        ],
      },
    }));

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'Exchange needs to have exactly one quantitative reference open',
      ),
    );
  });

  it.skip('surfaces current-process under-review version conflicts during data check', async () => {
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [
        {
          '@refObjectId': 'process-1',
          '@version': '1.0.0',
          underReviewVersion: '2.0.0',
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'The current dataset already has version ${underReviewVersion} under review. Your version ${version} cannot be submitted.',
      ),
    );
  });

  it.skip('surfaces current-process published-version conflicts during data check', async () => {
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [
        {
          '@refObjectId': 'process-1',
          '@version': '1.0.0',
          versionIsInTg: true,
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'The current dataset version is lower than the published version. Please create a new version based on the latest published version for corrections and updates, then submit for review.',
      ),
    );
  });

  it.skip('blocks review when referenced data is already under review', async () => {
    mockDealProcress.mockImplementation(
      (_processDetail: any, _unReview: any[], underReview: any[]) => {
        underReview.push({
          '@refObjectId': 'flow-1',
          '@version': '1.0.0',
          '@type': 'flow data set',
        });
      },
    );

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'Referenced data is under review, cannot initiate another review',
      ),
    );
  });

  it.skip('fails review submission when the saved process state is already under review', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: processDataset },
          state_code: 30,
          rule_verification: true,
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Submit review failed'));
  });

  it('surfaces tab-level check errors and triggers field validation after switching tabs', async () => {
    mockValidateDatasetWithSdk.mockReturnValueOnce({
      success: false,
      issues: [{ path: ['processDataSet', 'processInformation'] }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('processInformation：Data check failed!'),
    );

    await act(async () => {
      latestProcessFormProps.onTabChange('validation');
    });

    await waitFor(() => expect(mockValidateFields).toHaveBeenCalled());
  });

  it('falls back to a generic data-check error when issues do not map to a tab', async () => {
    mockValidateDatasetWithSdk.mockReturnValueOnce({
      success: false,
      issues: [{ path: ['processDataSet', undefined] }],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Data check failed!'));
  });

  it('treats missing reference-path results as an empty problem-node list', async () => {
    mockCheckReferences.mockResolvedValue(undefined);

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.success).toHaveBeenCalledWith('Data check successfully!'),
    );
  });

  it('surfaces reference-tab errors collected from missing, unverified, and problem refs', async () => {
    mockDealProcress.mockImplementation(
      (
        _processDetail: any,
        _unReview: any[],
        _underReview: any[],
        unRuleVerification: any[],
        nonExistentRef: any[],
      ) => {
        nonExistentRef.push({
          '@refObjectId': 'flow-1',
          '@version': '1.0.0',
          refTab: 'administrativeInformation',
        });
        unRuleVerification.push({
          '@refObjectId': 'source-1',
          '@version': '1.0.0',
          refTab: 'modellingAndValidation',
        });
      },
    );
    mockGetErrRefTab.mockImplementation((item: any) => item.refTab ?? null);
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [
        {
          '@refObjectId': 'contact-1',
          '@version': '1.0.0',
          refTab: 'technology',
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'administrativeInformation，modellingAndValidation，technology：Data check failed!',
      ),
    );
  });

  it('stops review submission when save does not return updated data', async () => {
    mockUpdateProcess.mockResolvedValue({
      error: { message: 'save failed before review' },
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('save failed before review'),
    );
    expect(mockUpdateReviewsAfterCheckData).not.toHaveBeenCalled();
  });

  it('normalizes LCIA results before saving', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onLciaResults([
        {
          referenceToLCIAMethodDataSet: { '@refObjectId': 'lcia-1', '@version': '1.0.0' },
          meanAmount: 12.5,
        },
      ]);
    });
    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalledWith(
      'process-1',
      '1.0.0',
      expect.objectContaining({
        LCIAResults: {
          LCIAResult: [
            {
              referenceToLCIAMethodDataSet: {
                '@refObjectId': 'lcia-1',
                '@version': '1.0.0',
              },
              meanAmount: '12.5',
            },
          ],
        },
      }),
    );
  });

  it('normalizes missing LCIA mean amounts to empty strings before saving', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    await act(async () => {
      latestProcessFormProps.onLciaResults([
        {
          referenceToLCIAMethodDataSet: { '@refObjectId': 'lcia-1', '@version': '1.0.0' },
          meanAmount: undefined,
        },
      ]);
    });
    await act(async () => {
      await proFormApi?.submit();
    });

    expect(mockUpdateProcess).toHaveBeenCalledWith(
      'process-1',
      '1.0.0',
      expect.objectContaining({
        LCIAResults: {
          LCIAResult: [
            {
              referenceToLCIAMethodDataSet: {
                '@refObjectId': 'lcia-1',
                '@version': '1.0.0',
              },
              meanAmount: '',
            },
          ],
        },
      }),
    );
  });

  it('submits through the footer save button', async () => {
    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateProcess).toHaveBeenCalled());
  });

  it('renders the result toolbar button as disabled when no process id is available', () => {
    render(<ProcessEdit {...baseProps} id='' buttonType='toolResultIcon' />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByRole('dialog', { name: 'Edit process' })).not.toBeInTheDocument();
  });

  it('renders the tool-icon trigger as disabled when requested', () => {
    render(<ProcessEdit {...baseProps} buttonType='toolIcon' disabled />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('opens from the tool-result toolbar variant', async () => {
    render(<ProcessEdit {...baseProps} buttonType='tool' />);

    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();
  });

  it('opens from the text-button edit variant', async () => {
    render(<ProcessEdit {...baseProps} buttonType='text' />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('dialog', { name: 'Edit process' })).toBeInTheDocument();
  });

  it('submits a review successfully after validation passes', async () => {
    mockUpdateProcess.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '1.0.0',
          json: { processDataSet: processDataset },
          state_code: 10,
          rule_verification: true,
        },
      ],
    });

    render(<ProcessEdit {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('dialog', { name: 'Edit process' });

    fireEvent.click(screen.getByRole('button', { name: 'Submit for Review' }));

    await waitFor(() =>
      expect(mockUpdateReviewsAfterCheckData).toHaveBeenCalledWith(
        'team-1',
        {
          id: 'process-1',
          version: '1.0.0',
          name: {},
        },
        'review-uuid',
      ),
    );
    expect(mockUpdateUnReviewToUnderReview).toHaveBeenCalledWith([], 'review-uuid');
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Review submitted successfully');
  });
});
