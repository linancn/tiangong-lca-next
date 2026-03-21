// @ts-nocheck
import FlowpropertiesEdit from '@/pages/Flowproperties/Components/edit';
import userEvent from '@testing-library/user-event';
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from '../../../helpers/testUtils';

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
let latestRefsDrawerProps: any = null;
const mockGetRefsOfCurrentVersion = jest.fn(async () => ({ oldRefs: [] }));
const mockGetRefsOfNewVersion = jest.fn(async () => ({ newRefs: [], oldRefs: [] }));
const mockUpdateRefsData = jest.fn((data: any) => data);
const mockCheckData = jest.fn(async () => {});
const mockFindProblemNodes = jest.fn(() => []);
const mockGetErrRefTab = jest.fn(() => '');
const mockBuildValidationIssues = jest.fn(() => []);
const mockGenFlowpropertyJsonOrdered = jest.fn(() => ({ mocked: true }));
const mockValidateEnhanced = jest.fn(() => ({ success: true }));
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));

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

jest.mock('@/components/ValidationIssueModal', () => ({
  __esModule: true,
  showValidationIssueModal: jest.fn(),
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

  const Drawer = ({ open, title, extra, footer, onClose, children, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
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

const { message: mockAntdMessage } = jest.requireMock('antd');

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

  const ProForm = ({
    formRef,
    initialValues = {},
    onFinish,
    onValuesChange,
    submitter,
    children,
  }: any) => {
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
          setValues((prev: any) => {
            const merged = { ...prev, ...next };
            onValuesChange?.({}, merged);
            return merged;
          });
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
        data-testid='flowproperty-edit-form'
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
    FlowpropertyForm: ({
      formRef,
      onData,
      onTabChange,
      showRules,
      activeTabKey: mockActiveTabKey,
    }: any) => {
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
          <button type='button' onClick={() => onTabChange?.('administrativeInformation')}>
            switch-flowproperty-tab
          </button>
          <button type='button' onClick={() => onData?.()}>
            sync-flowproperty-data
          </button>
          <button
            type='button'
            onClick={() => formRef.current?.setFieldValue([mockActiveTabKey], undefined)}
          >
            clear-active-flowproperty-tab
          </button>
          {showRules ? <span>rules-visible</span> : null}
        </div>
      );
    },
  };
});

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
  genFlowpropertyJsonOrdered: (...args: any[]) => mockGenFlowpropertyJsonOrdered(...args),
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

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  checkData: (...args: any[]) => mockCheckData(...args),
  ReffPath: jest.fn(() => ({
    findProblemNodes: () => mockFindProblemNodes(),
  })),
  getErrRefTab: (...args: any[]) => mockGetErrRefTab(...args),
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
  validateDatasetWithSdk: (...args: any[]) => mockValidateDatasetWithSdk(...args),
}));

jest.mock('@/pages/Utils/updateReference', () => ({
  __esModule: true,
  getRefsOfCurrentVersion: (...args: any[]) => mockGetRefsOfCurrentVersion(...args),
  getRefsOfNewVersion: (...args: any[]) => mockGetRefsOfNewVersion(...args),
  updateRefsData: (...args: any[]) => mockUpdateRefsData(...args),
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createFlowProperty: jest.fn(() => ({
    validateEnhanced: (...args: any[]) => mockValidateEnhanced(...args),
  })),
}));

describe('FlowpropertiesEdit', () => {
  beforeEach(() => {
    latestRefsDrawerProps = null;
    jest.clearAllMocks();
    mockBuildValidationIssues.mockReturnValue([]);
    mockGetRefsOfCurrentVersion.mockResolvedValue({ oldRefs: [] });
    mockGetRefsOfNewVersion.mockResolvedValue({ newRefs: [], oldRefs: [] });
    mockUpdateRefsData.mockImplementation((data: any) => data);
    mockCheckData.mockResolvedValue(undefined);
    mockFindProblemNodes.mockReturnValue([]);
    mockGetErrRefTab.mockReturnValue('');
    mockValidateEnhanced.mockReturnValue({ success: true });
    mockValidateDatasetWithSdk.mockReturnValue({ success: true, issues: [] });
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

  it('marks the edited flow property as invalid when rule verification fails', async () => {
    mockUpdateFlowproperties.mockResolvedValueOnce({
      data: [{ rule_verification: false }],
    });
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
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateErrRef).toHaveBeenCalledWith({
        id: 'fp-1',
        version: '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      }),
    );
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Saved successfully!');
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('shows the open-data error when saving is blocked by state code 100', async () => {
    mockUpdateFlowproperties.mockResolvedValueOnce({
      data: null,
      error: { state_code: 100, message: 'open data' },
    });
    const actionRef = { current: { reload: jest.fn() } };

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesEdit
          id='fp-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          lang='en'
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-1', '1.0.0'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('This data is open data, save failed'),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /edit flow property/i })).toBeInTheDocument();
  });

  it('shows the under-review error when saving is blocked by state code 20', async () => {
    mockUpdateFlowproperties.mockResolvedValueOnce({
      data: null,
      error: { state_code: 20, message: 'under review' },
    });
    const actionRef = { current: { reload: jest.fn() } };

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesEdit
          id='fp-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          lang='en'
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-1', '1.0.0'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('Data is under review, save failed'),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /edit flow property/i })).toBeInTheDocument();
  });

  it('shows the backend error message for non-state-code save failures', async () => {
    mockUpdateFlowproperties.mockResolvedValueOnce({
      data: null,
      error: { message: 'save failed' },
    });
    const actionRef = { current: { reload: jest.fn() } };

    await act(async () => {
      renderWithProviders(
        <FlowpropertiesEdit
          id='fp-1'
          version='1.0.0'
          buttonType='text'
          actionRef={actionRef as any}
          lang='en'
        />,
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledWith('fp-1', '1.0.0'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('save failed'));
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /edit flow property/i })).toBeInTheDocument();
  });

  it('stops data checks when the background save fails', async () => {
    mockUpdateFlowproperties.mockResolvedValueOnce({
      data: null,
      error: { message: 'check blocked' },
    });

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('check blocked'));
    expect(mockCheckData).not.toHaveBeenCalled();
    expect(screen.queryByText('rules-visible')).not.toBeInTheDocument();
  });

  it('opens the refs drawer and lets the user update or keep versions', async () => {
    const newRefs = [
      {
        key: 'ref-1',
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '2.0.0',
      },
    ];
    const oldRefs = [
      {
        key: 'ref-1-current',
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '1.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs, oldRefs });

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();
    expect(latestRefsDrawerProps.dataSource).toEqual(newRefs);

    await userEvent.click(screen.getByRole('button', { name: /update-latest/i }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), newRefs, true),
    );

    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs, oldRefs });
    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /keep-current/i }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
  });

  it('updates references inline when no newer version exists', async () => {
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
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('runs data check successfully and keeps the drawer open', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <FlowpropertiesEdit
        id='fp-1'
        version='1.0.0'
        buttonType='text'
        actionRef={actionRef as any}
        lang='en'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /switch-flowproperty-tab/i }));
    await userEvent.click(screen.getByRole('button', { name: /sync-flowproperty-data/i }));
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockUpdateFlowproperties).toHaveBeenCalled());
    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(mockGenFlowpropertyJsonOrdered).toHaveBeenCalled();
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Data check successfully!');
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByText('rules-visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /edit flow property/i })).toBeInTheDocument();
  });

  it('reports data-check errors from references and schema issues', async () => {
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({
        '@refObjectId': 'flow-1',
        '@version': '1.0.0',
      });
      nonExistent.push({
        '@refObjectId': 'source-2',
        '@version': '2.0.0',
      });
    });
    mockFindProblemNodes.mockReturnValue([
      {
        '@refObjectId': 'process-1',
        '@version': '3.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockGetErrRefTab.mockReturnValue('administrativeInformation');
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['flowPropertyDataSet', 'modellingAndValidation'] }],
    });

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Data check failed!'),
      ),
    );
    expect(mockGetErrRefTab).toHaveBeenCalled();
  });

  it('handles missing detail payloads and undefined problem nodes during data checks', async () => {
    mockGetFlowpropertyDetail.mockResolvedValueOnce({
      data: {
        json: {},
        version: '1.0.0',
      },
    });
    mockFindProblemNodes.mockReturnValueOnce(undefined);

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Data check successfully!');
  });

  it('adds unique error tab names for unverified references', async () => {
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[]) => {
      unRule.push({
        '@refObjectId': 'flow-1',
        '@version': '1.0.0',
      });
    });
    mockGetErrRefTab.mockReturnValue('administrativeInformation');

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'administrativeInformation：Data check failed!',
      ),
    );
  });

  it('adds unique error tab names for problem nodes', async () => {
    mockFindProblemNodes.mockReturnValueOnce([
      {
        '@refObjectId': 'process-1',
        '@version': '3.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockGetErrRefTab.mockReturnValue('modellingAndValidation');

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'modellingAndValidation：Data check failed!',
      ),
    );
  });

  it('shows the generic data-check error when issues have no tab mapping', async () => {
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['flowPropertyDataSet'] }],
    });

    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Data check failed!'));
  });

  it('closes the refs drawer and main drawer from cancel and onClose actions', async () => {
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
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawer = await screen.findByRole('dialog', { name: /edit flow property/i });
    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await act(async () => {
      latestRefsDrawerProps.onCancel();
    });

    await waitFor(() => expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument());

    const drawerCloseButton = within(drawer)
      .getAllByRole('button')
      .find((button) => button.textContent === 'Close');
    expect(drawerCloseButton).toBeTruthy();

    await userEvent.click(drawerCloseButton!);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('submits through the embedded form and closes from icon and cancel actions', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <FlowpropertiesEdit
        id='fp-1'
        version='1.0.0'
        buttonType='text'
        lang='en'
        actionRef={actionRef as any}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);

    await act(async () => {
      fireEvent.submit(screen.getByTestId('flowproperty-edit-form'));
    });

    await waitFor(() => expect(mockUpdateFlowproperties).toHaveBeenCalled());
    expect(actionRef.current.reload).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const iconClosedDrawer = await screen.findByRole('dialog', { name: /edit flow property/i });
    const iconCloseButton = within(iconClosedDrawer)
      .getAllByRole('button', { name: /close/i })
      .find((button) => button.textContent === 'close');
    expect(iconCloseButton).toBeTruthy();
    await userEvent.click(iconCloseButton!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const cancelDrawer = await screen.findByRole('dialog', { name: /edit flow property/i });
    await userEvent.click(within(cancelDrawer).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('resets loaded data and closes from both cancel and close icon actions', async () => {
    renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);

    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    await waitFor(() => expect(mockGetFlowpropertyDetail).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByLabelText(/flow property name/i);
    await userEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders the icon trigger and falls back to the default edit message when buttonType is empty', async () => {
    const { rerender } = renderWithProviders(
      <FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='icon' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await screen.findByRole('dialog', { name: /edit flow property/i });
    await userEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    rerender(<FlowpropertiesEdit id='fp-1' version='1.0.0' buttonType='' lang='en' />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });
});
