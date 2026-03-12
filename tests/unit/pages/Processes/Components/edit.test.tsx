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
const mockUpdateReviewsAfterCheckData = jest.fn();
const mockUpdateUnReviewToUnderReview = jest.fn();

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: function () {
    return {};
  },
  checkReferences: (...args: any[]) => mockCheckReferences(...args),
  checkVersions: (...args: any[]) => mockCheckVersions(...args),
  dealProcress: (...args: any[]) => mockDealProcress(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getErrRefTab: (...args: any[]) => mockGetErrRefTab(...args),
  updateReviewsAfterCheckData: (...args: any[]) => mockUpdateReviewsAfterCheckData(...args),
  updateUnReviewToUnderReview: (...args: any[]) => mockUpdateUnReviewToUnderReview(...args),
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
          state_code: 50,
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
    mockUpdateReviewsAfterCheckData.mockResolvedValue({});
    mockUpdateUnReviewToUnderReview.mockResolvedValue([]);
    mockGetRefsOfCurrentVersion.mockResolvedValue({ oldRefs: [] });
    mockGetRefsOfNewVersion.mockResolvedValue({ newRefs: [], oldRefs: [] });
    mockUpdateRefsData.mockImplementation((data: any) => data);
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

  it('renders the result toolbar button as disabled when no process id is available', () => {
    render(<ProcessEdit {...baseProps} id='' buttonType='toolResultIcon' />);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByRole('dialog', { name: 'Edit process' })).not.toBeInTheDocument();
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
