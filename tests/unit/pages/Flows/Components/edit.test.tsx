// @ts-nocheck
import FlowsEdit from '@/pages/Flows/Components/edit';
import userEvent from '@testing-library/user-event';
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let latestRefsDrawerProps: any = null;
const mockParentRefCheckContext = { refCheckData: [] as any[] };
const mockCheckData = jest.fn(async () => {});
const mockFindProblemNodes = jest.fn(() => []);
const mockGetErrRefTab = jest.fn(() => '');
const mockBuildValidationIssues = jest.fn(() => []);
const mockEnrichValidationIssuesWithOwner = jest.fn(async (issues: any[]) => issues);
const mockValidateEnhanced = jest.fn(() => ({ success: true }));
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));
const mockJsonToList = jest.fn((value: any) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
});
let latestFlowFormProps: any = null;

jest.mock(
  'umi',
  () => ({
    __esModule: true,
    FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    useIntl: () => ({
      formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    }),
  }),
  { virtual: true },
);

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  FormOutlined: () => <span>edit</span>,
}));

jest.mock('@/components/ValidationIssueModal', () => ({
  __esModule: true,
  showValidationIssueModal: jest.fn(),
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const Button = ({ children, onClick, disabled, icon, type }: any) => (
    <button
      type='button'
      data-button-type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, footer, children, onClose, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
    return (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </section>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spinning'>{children}</div> : <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    ConfigProvider,
    Button,
    Drawer,
    Space,
    Spin,
    Tooltip,
    message,
  };
});

const mockAntdMessage = jest.requireMock('antd').message as Record<string, jest.Mock>;
const { showValidationIssueModal: mockShowValidationIssueModal } = jest.requireMock(
  '@/components/ValidationIssueModal',
);

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const mergeDeep = (target: any, source: any) => {
    const next = { ...(target ?? {}) };
    Object.entries(source ?? {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        next[key] = mergeDeep(next[key], value);
      } else {
        next[key] = value;
      }
    });
    return next;
  };

  const ProForm = ({
    formRef,
    initialValues = {},
    onFinish,
    onValuesChange,
    submitter,
    children,
  }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});
    const initialValuesSerialized = JSON.stringify(initialValues ?? {});

    React.useEffect(() => {
      setValues((previous: any) => {
        return JSON.stringify(previous ?? {}) === initialValuesSerialized
          ? previous
          : (initialValues ?? {});
      });
    }, [initialValues, initialValuesSerialized]);

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        submit: async () => {
          await onFinish?.();
        },
        validateFields: async () => values,
        getFieldsValue: () => values,
        setFieldsValue: (next: any) => {
          setValues((previous: any) => {
            const merged = mergeDeep(previous, next);
            onValuesChange?.({}, merged);
            return merged;
          });
        },
        setFieldValue: (name: any, value: any) => {
          setValues((previous: any) => {
            const key = Array.isArray(name) ? name[name.length - 1] : name;
            const merged = { ...previous, [key]: value };
            onValuesChange?.({}, merged);
            return merged;
          });
        },
        resetFields: () => {
          setValues(initialValues ?? {});
        },
      };
    }, [formRef, initialValues, onValuesChange, values]);

    return (
      <form
        data-testid='flow-edit-form'
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {submitter?.render?.()}
        {typeof children === 'function' ? children(values) : children}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
  };
});

jest.mock('@/components/AISuggestion', () => ({
  __esModule: true,
  default: ({ onClose, onLatestJsonChange }: any) => (
    <div>
      <button
        type='button'
        onClick={() =>
          onLatestJsonChange?.({
            flowDataSet: {
              ai: true,
            },
          })
        }
      >
        set-ai-json
      </button>
      <button type='button' onClick={() => onClose?.()}>
        ai-suggestion
      </button>
    </div>
  ),
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

jest.mock('@/contexts/refCheckContext', () => ({
  __esModule: true,
  RefCheckContext: {
    Provider: ({ children }: any) => <div>{children}</div>,
  },
  useRefCheckContext: () => mockParentRefCheckContext,
}));

const mockGetFlowDetail = jest.fn(async () => ({
  data: {
    json: {
      flowDataSet: {
        flowInformation: {
          dataSetInformation: {
            name: { baseName: [{ '@xml:lang': 'en', '#text': 'Existing flow' }] },
          },
        },
      },
    },
    version: '1.0.0',
  },
}));

const mockUpdateFlows = jest.fn(async () => ({
  data: [{ rule_verification: true }],
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowDetail: (...args: any[]) => mockGetFlowDetail(...args),
  updateFlows: (...args: any[]) => mockUpdateFlows(...args),
}));

const loadedFlowData = {
  id: 'flow-1',
  flowInformation: {
    dataSetInformation: {
      name: { baseName: [{ '@xml:lang': 'en', '#text': 'Existing flow' }] },
    },
  },
  modellingAndValidation: {
    LCIMethod: {
      typeOfDataSet: 'product flow',
    },
  },
  flowProperties: {
    flowProperty: [
      {
        quantitativeReference: true,
        referenceToFlowPropertyDataSet: {
          '@refObjectId': 'fp-1',
          '@version': '1.0.0',
          'common:shortDescription': [],
        },
      },
    ],
  },
};

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: jest.fn(() => loadedFlowData),
  genFlowJsonOrdered: jest.fn(() => ({ mocked: true })),
}));

const mockGetFlowpropertyDetail = jest.fn(async () => ({
  success: true,
  data: {
    json: {
      flowPropertyDataSet: {
        flowPropertiesInformation: {
          dataSetInformation: {
            'common:name': [{ '@xml:lang': 'en', '#text': 'Mass' }],
          },
        },
      },
    },
    version: '2.0.0',
  },
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyDetail: (...args: any[]) => mockGetFlowpropertyDetail(...args),
}));

const mockGetRefsOfCurrentVersion = jest.fn(async () => ({ oldRefs: [] }));
const mockGetRefsOfNewVersion = jest.fn(async () => ({ newRefs: [], oldRefs: [] }));
const mockUpdateRefsData = jest.fn((data: any) => data);

jest.mock('@/pages/Utils/updateReference', () => ({
  __esModule: true,
  getRefsOfCurrentVersion: (...args: any[]) => mockGetRefsOfCurrentVersion(...args),
  getRefsOfNewVersion: (...args: any[]) => mockGetRefsOfNewVersion(...args),
  updateRefsData: (...args: any[]) => mockUpdateRefsData(...args),
}));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  enrichValidationIssuesWithOwner: (...args: any[]) => mockEnrichValidationIssuesWithOwner(...args),
  ReffPath: jest.fn(() => ({
    findProblemNodes: () => mockFindProblemNodes(),
  })),
  checkData: (...args: any[]) => mockCheckData(...args),
  getErrRefTab: (...args: any[]) => mockGetErrRefTab(...args),
  validateDatasetWithSdk: (...args: any[]) => mockValidateDatasetWithSdk(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  jsonToList: (...args: any[]) => mockJsonToList(...args),
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: {
    footer_right: 'footer_right',
  },
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createFlow: jest.fn(() => ({
    validateEnhanced: (...args: any[]) => mockValidateEnhanced(...args),
  })),
}));

jest.mock('@/pages/Flows/Components/form', () => ({
  __esModule: true,
  FlowForm: (props: any) => {
    latestFlowFormProps = props;
    return (
      <div data-testid='flow-form'>
        <div data-testid='flow-type'>{String(props.flowType ?? '')}</div>
        <div data-testid='property-count'>{String(props.propertyDataSource?.length ?? 0)}</div>
        <button type='button' onClick={() => props.onTabChange?.('modellingAndValidation')}>
          switch-flow-tab
        </button>
        <button type='button' onClick={() => props.onData?.()}>
          sync-flow-data
        </button>
        <button type='button' onClick={() => props.onPropertyData?.([])}>
          clear-flow-properties
        </button>
        <button
          type='button'
          onClick={() =>
            props.onPropertyData?.([
              {
                quantitativeReference: false,
                referenceToFlowPropertyDataSet: {
                  '@refObjectId': 'fp-1',
                  '@version': '1.0.0',
                  'common:shortDescription': [],
                },
              },
              {
                quantitativeReference: false,
                referenceToFlowPropertyDataSet: {
                  '@refObjectId': 'fp-2',
                  '@version': '1.0.0',
                  'common:shortDescription': [],
                },
              },
            ])
          }
        >
          set-non-quant-properties
        </button>
        <button
          type='button'
          onClick={() =>
            props.onPropertyDataCreate?.({
              quantitativeReference: false,
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'fp-new',
                '@version': '3.0.0',
                'common:shortDescription': [],
              },
            })
          }
        >
          append-property
        </button>
        {props.showRules ? <span>flow-rules-visible</span> : null}
      </div>
    );
  },
}));

describe('FlowsEdit', () => {
  beforeEach(() => {
    latestRefsDrawerProps = null;
    latestFlowFormProps = null;
    jest.clearAllMocks();
    mockBuildValidationIssues.mockReturnValue([]);
    mockEnrichValidationIssuesWithOwner.mockImplementation(async (issues: any[]) => issues);
    mockCheckData.mockResolvedValue(undefined);
    mockFindProblemNodes.mockReturnValue([]);
    mockGetErrRefTab.mockReturnValue('');
    mockValidateEnhanced.mockReturnValue({ success: true });
    mockValidateDatasetWithSdk.mockReturnValue({ success: true, issues: [] });
    mockJsonToList.mockImplementation((value: any) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    });
  });

  it('loads flow detail and saves successfully', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const updateErrRef = jest.fn();

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        actionRef={actionRef as any}
        updateErrRef={updateErrRef}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    await waitFor(() => expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0.0'));
    expect(await screen.findByTestId('flow-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockUpdateFlows).toHaveBeenCalled());
    expect(mockGetRefsOfCurrentVersion).toHaveBeenCalled();
    expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), [], false);
    expect(updateErrRef).toHaveBeenCalledWith(null);
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Saved successfully!');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('marks invalid flow saves and supports datasets without flow properties', async () => {
    const flowUtils = jest.requireMock('@/services/flows/util');
    const updateErrRef = jest.fn();

    flowUtils.genFlowFromData.mockImplementationOnce(() => ({
      ...loadedFlowData,
      flowProperties: undefined,
    }));
    mockUpdateFlows.mockResolvedValueOnce({
      data: [{ rule_verification: false }],
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={updateErrRef}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('property-count')).toHaveTextContent('0');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateErrRef).toHaveBeenCalledWith({
        id: 'flow-1',
        version: '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      }),
    );
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Saved successfully!');
  });

  it('opens the refs drawer and applies latest reference versions', async () => {
    const newRefs = [
      {
        key: 'ref-1',
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '2.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({
      newRefs,
      oldRefs: [
        {
          key: 'ref-1-current',
          id: 'source-1',
          type: 'source data set',
          currentVersion: '1.0.0',
          newVersion: '1.0.0',
        },
      ],
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('flow-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();
    expect(latestRefsDrawerProps.dataSource).toEqual(newRefs);

    await userEvent.click(screen.getByRole('button', { name: /update-latest/i }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), newRefs, true),
    );
  });

  it('keeps current reference versions when requested from the refs drawer', async () => {
    const oldRefs = [
      {
        key: 'ref-1-current',
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '1.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({
      newRefs: [
        {
          key: 'ref-1',
          id: 'source-1',
          type: 'source data set',
          currentVersion: '1.0.0',
          newVersion: '2.0.0',
        },
      ],
      oldRefs,
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('flow-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /keep-current/i }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
  });

  it('shows an open-data error when the save request is rejected by state code', async () => {
    mockUpdateFlows.mockResolvedValueOnce({
      data: undefined,
      error: {
        state_code: 100,
        message: 'open data',
      },
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('flow-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('This data is open data, save failed'),
    );
  });

  it('shows an under-review error when the save request is rejected by state code 20', async () => {
    mockUpdateFlows.mockResolvedValueOnce({
      data: undefined,
      error: {
        state_code: 20,
        message: 'under review',
      },
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('flow-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('Data is under review, save failed'),
    );
  });

  it('shows the backend message for other save failures', async () => {
    mockUpdateFlows.mockResolvedValueOnce({
      data: undefined,
      error: {
        message: 'save failed',
      },
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('flow-form')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('save failed'));
  });

  it('updates references inline when there are no newer versions and refreshes property metadata', async () => {
    const oldRefs = [
      {
        key: 'ref-1-current',
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '1.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs: [], oldRefs });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-1', '2.0.0'));
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('runs flow data check successfully without closing the drawer', async () => {
    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /switch-flow-tab/i }));
    await userEvent.click(screen.getByRole('button', { name: /sync-flow-data/i }));
    await userEvent.click(screen.getByRole('button', { name: /append-property/i }));
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() => expect(mockUpdateFlows).toHaveBeenCalled());
    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(mockValidateDatasetWithSdk).toHaveBeenCalled();
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Data check successfully!');
    expect(screen.getByText('flow-rules-visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /edit/i })).toBeInTheDocument();
  });

  it('stops flow data checks when the background save fails', async () => {
    mockUpdateFlows.mockResolvedValueOnce({
      data: undefined,
      error: {
        message: 'check blocked',
      },
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('check blocked'));
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('reports flow data-check errors from refs and validation issues', async () => {
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({ '@refObjectId': 'source-1', '@version': '1.0.0' });
      nonExistent.push({ '@refObjectId': 'process-2', '@version': '2.0.0' });
    });
    mockFindProblemNodes.mockReturnValue([
      {
        '@refObjectId': 'contact-3',
        '@version': '3.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockGetErrRefTab.mockReturnValue('flowInformation');
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [
        { path: ['flowDataSet', 'typeOfDataSet'] },
        { path: ['flowDataSet', 'modellingAndValidation'] },
      ],
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Data check failed!'),
      ),
    );
    expect(mockGetErrRefTab).toHaveBeenCalled();
  });

  it('shows the generic flow data-check error when issues do not map to tabs', async () => {
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['flowDataSet'] }],
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Data check failed!'));
  });

  it('blocks data check when no flow properties are selected', async () => {
    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /clear-flow-properties/i }));
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('Please select flow properties'),
    );
  });

  it('blocks data check when quantitative references are invalid', async () => {
    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /set-non-quant-properties/i }));
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'Flow property needs to have exactly one quantitative reference open',
      ),
    );
  });

  it('stops before saving when form validation fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');

    latestFlowFormProps.formRef.current.validateFields = jest
      .fn()
      .mockRejectedValueOnce(new Error('invalid'));

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(consoleLogSpy).toHaveBeenCalledWith('err', expect.any(Error)));
    expect(mockUpdateFlows).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });

  it('hydrates form state from AI suggestions when the assistant panel closes', async () => {
    const aiFlowData = {
      flowInformation: {
        dataSetInformation: {
          name: { baseName: [{ '@xml:lang': 'en', '#text': 'AI Flow' }] },
        },
      },
      flowProperties: {
        flowProperty: [
          {
            quantitativeReference: true,
            referenceToFlowPropertyDataSet: {
              '@refObjectId': 'fp-ai',
              '@version': '4.0.0',
              'common:shortDescription': [],
            },
          },
          {
            quantitativeReference: false,
            referenceToFlowPropertyDataSet: {
              '@refObjectId': 'fp-ai-2',
              '@version': '4.1.0',
              'common:shortDescription': [],
            },
          },
        ],
      },
    };
    const flowUtils = jest.requireMock('@/services/flows/util');
    flowUtils.genFlowFromData
      .mockImplementationOnce(() => loadedFlowData)
      .mockImplementationOnce(() => aiFlowData);

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /set-ai-json/i }));
    await userEvent.click(screen.getByRole('button', { name: /ai-suggestion/i }));

    await waitFor(() => expect(screen.getByTestId('property-count')).toHaveTextContent('2'));
    expect(flowUtils.genFlowFromData).toHaveBeenCalledWith({ ai: true });
  });

  it('submits through the embedded form and closes refs and drawer from cancel actions', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const newRefs = [
      {
        key: 'ref-1',
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '2.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs, oldRefs: [] });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        actionRef={actionRef as any}
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await act(async () => {
      fireEvent.submit(screen.getByTestId('flow-edit-form'));
    });

    await waitFor(() => expect(mockUpdateFlows).toHaveBeenCalled());
    expect(actionRef.current.reload).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const reopenedDrawer = await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(
      within(reopenedDrawer).getByRole('button', { name: /update reference/i }),
    );
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await act(async () => {
      latestRefsDrawerProps.onCancel();
    });
    await waitFor(() => expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument());

    const headerCloseButton = within(reopenedDrawer)
      .getAllByRole('button')
      .find((button) => button.textContent === 'close');
    expect(headerCloseButton).toBeTruthy();
    await userEvent.click(headerCloseButton!);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const reopenedAfterHeaderClose = await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(
      within(reopenedAfterHeaderClose).getByRole('button', { name: /cancel/i }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawerAgain = await screen.findByRole('dialog', { name: /edit/i });
    const drawerCloseButton = within(drawerAgain)
      .getAllByRole('button')
      .find((button) => button.textContent === 'Close');
    expect(drawerCloseButton).toBeTruthy();
    await userEvent.click(drawerCloseButton!);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument(),
    );
  });

  it('handles sparse detail payloads, single flow-property objects, and missing active-tab values', async () => {
    const flowUtils = jest.requireMock('@/services/flows/util');

    mockGetFlowDetail.mockResolvedValueOnce({
      data: {},
      version: '1.0.0',
    });
    flowUtils.genFlowFromData.mockImplementationOnce(() => ({
      id: 'flow-1',
      flowInformation: {
        dataSetInformation: {
          name: { baseName: [{ '@xml:lang': 'en', '#text': 'Sparse flow' }] },
        },
      },
      flowProperties: {
        flowProperty: {
          quantitativeReference: true,
          referenceToFlowPropertyDataSet: {
            'common:shortDescription': [],
          },
        },
      },
    }));
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs: [], oldRefs: [] });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByTestId('property-count')).toHaveTextContent('1');
    expect(flowUtils.genFlowFromData).toHaveBeenCalledWith({});

    await userEvent.click(screen.getByRole('button', { name: /switch-flow-tab/i }));
    await act(async () => {
      latestFlowFormProps.formRef.current.setFieldsValue({ unrelated: true });
    });
    await userEvent.click(screen.getByRole('button', { name: /sync-flow-data/i }));
    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('', ''));
  });

  it('dedupes repeated error tabs during data checks', async () => {
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({ '@refObjectId': 'source-1', '@version': '1.0.0' });
      nonExistent.push({ '@refObjectId': 'process-1', '@version': '1.0.0' });
    });
    mockFindProblemNodes.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockGetErrRefTab.mockReturnValue('flowInformation');
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['flowDataSet', 'typeOfDataSet'] }],
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Data check failed!'),
      ),
    );
    expect(mockGetErrRefTab).toHaveBeenCalledTimes(3);
  });

  it('adds new error tabs from refs, problem nodes, and type-of-dataset issues', async () => {
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({ '@refObjectId': 'source-2', '@version': '1.0.0' });
      expect(nonExistent).toEqual([]);
    });
    mockFindProblemNodes.mockReturnValue([
      {
        '@refObjectId': 'contact-2',
        '@version': '2.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockGetErrRefTab
      .mockImplementationOnce(() => 'modellingAndValidation')
      .mockImplementationOnce(() => 'administrativeInformation');
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['flowDataSet', 'typeOfDataSet'] }],
    });

    renderWithProviders(<FlowsEdit id='flow-1' version='1.0.0' buttonType='text' lang='en' />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('flowInformation'),
      ),
    );
    expect(mockGetErrRefTab).toHaveBeenCalledTimes(2);
  });

  it('supports icon triggers and closes AI suggestions without dataset payloads', async () => {
    const flowUtils = jest.requireMock('@/services/flows/util');

    flowUtils.genFlowFromData
      .mockImplementationOnce(() => loadedFlowData)
      .mockImplementationOnce(() => ({
        flowInformation: {
          dataSetInformation: {
            name: { baseName: [{ '@xml:lang': 'en', '#text': 'Empty AI flow' }] },
          },
        },
      }));

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='icon'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /ai-suggestion/i }));

    expect(flowUtils.genFlowFromData).toHaveBeenLastCalledWith({});
  });

  it('falls back to the default edit label when buttonType is empty', async () => {
    renderWithProviders(
      <FlowsEdit id='flow-1' version='1.0.0' buttonType='' lang='en' updateErrRef={jest.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(await screen.findByRole('dialog', { name: /edit/i })).toBeInTheDocument();
  });

  it('opens automatically and triggers silent auto-check when requested', async () => {
    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        autoOpen
        autoCheckRequired
        updateErrRef={jest.fn()}
      />,
    );

    await screen.findByRole('dialog', { name: /edit/i });
    await waitFor(() => expect(mockUpdateFlows).toHaveBeenCalled());
    expect(mockCheckData).toHaveBeenCalled();
  });

  it('blocks flow data checks when the current dataset is under review', async () => {
    mockGetFlowDetail.mockResolvedValueOnce({
      data: {
        stateCode: 20,
        json: {
          flowDataSet: loadedFlowData,
        },
      },
    });

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'This data set is under review and cannot be validated',
      ),
    );
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('shows the validation-issue modal when structured flow validation issues exist', async () => {
    mockCheckData.mockImplementationOnce(async (_ref: any, unRule: any[]) => {
      unRule.push({ '@refObjectId': 'source-1', '@version': '1.0.0' });
    });
    mockBuildValidationIssues.mockReturnValueOnce([
      {
        code: 'ruleVerificationFailed',
        link: '/mydata/flows?id=flow-1&version=1.0.0',
        ref: {
          '@type': 'flow data set',
          '@refObjectId': 'flow-1',
          '@version': '1.0.0',
        },
      },
    ]);

    renderWithProviders(
      <FlowsEdit
        id='flow-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        updateErrRef={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByTestId('flow-form');
    await userEvent.click(screen.getByRole('button', { name: /^data check$/i }));

    await waitFor(() => expect(mockShowValidationIssueModal).toHaveBeenCalledTimes(1));
  });
});
