// @ts-nocheck
import SourceEdit from '@/pages/Sources/Components/edit';
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

let latestRefsDrawerProps: any = null;
const mockGetRefsOfCurrentVersion = jest.fn(async () => ({ oldRefs: [] }));
const mockGetRefsOfNewVersion = jest.fn(async () => ({ newRefs: [], oldRefs: [] }));
const mockUpdateRefsData = jest.fn((data: any) => data);
const mockCheckData = jest.fn(async () => {});
const mockGetErrRefTab = jest.fn(() => 'sourceInformation');
const mockFindProblemNodes = jest.fn(() => []);
const mockBuildValidationIssues = jest.fn(() => []);
const mockEnrichValidationIssuesWithOwner = jest.fn(async (issues: any[]) => issues);
const mockGenSourceJsonOrdered = jest.fn(() => ({ mocked: true }));
const mockValidateEnhanced = jest.fn(() => ({ success: true }));
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));

jest.mock('@supabase/supabase-js', () => {
  const supabaseQueryBuilder: any = {};
  supabaseQueryBuilder.select = jest.fn().mockResolvedValue({ data: [], error: null });
  supabaseQueryBuilder.insert = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.delete = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.update = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.eq = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.in = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.order = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.range = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.limit = jest.fn(() => supabaseQueryBuilder);
  supabaseQueryBuilder.single = jest.fn().mockResolvedValue({ data: null, error: null });

  const supabaseMock = {
    from: jest.fn(() => supabaseQueryBuilder),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
  };

  return {
    __esModule: true,
    createClient: jest.fn(() => supabaseMock),
    FunctionRegion: {
      UsEast1: 'us-east-1',
    },
  };
});

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'uuid-source-edit'),
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

  const Drawer = ({ open, onClose, title, extra, footer, children, getContainer }: any) => {
    if (!open) return null;
    getContainer?.();
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
const { showValidationIssueModal: mockShowValidationIssueModal } = jest.requireMock(
  '@/components/ValidationIssueModal',
);

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

  const ProForm = ({
    formRef,
    initialValues = {},
    onValuesChange,
    onFinish,
    submitter,
    children,
  }: any) => {
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
          data-testid='source-edit-form'
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {submitter?.render?.()}
          {typeof children === 'function' ? children(values) : children}
        </form>
      </ProFormContext.Provider>
    );
  };

  const ProTable = ({ dataSource = [], children }: any) => (
    <div data-testid='pro-table'>
      {typeof children === 'function'
        ? children(dataSource)
        : dataSource.map((row: any) => (
            <div key={row?.key ?? row?.id ?? String(Math.random())}>{row?.id ?? 'row'}</div>
          ))}
    </div>
  );

  return {
    __esModule: true,
    ProForm,
    ProTable,
    __ProFormContext: ProFormContext,
  };
});

jest.mock('@/pages/Sources/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');
  return {
    __esModule: true,
    SourceForm: ({ onData, onTabChange, setFileList, setLoadFiles, showRules }: any) => {
      const context =
        React.useContext(__ProFormContext) ?? ({ values: {}, setFieldValue: () => {} } as any);

      const shortName =
        context.values?.sourceInformation?.dataSetInformation?.['common:shortName'] ?? '';

      return (
        <div>
          <label htmlFor='edit-source-short-name'>Short Name</label>
          <input
            id='edit-source-short-name'
            value={shortName}
            onChange={(event) => {
              context.setFieldValue?.(
                ['sourceInformation', 'dataSetInformation', 'common:shortName'],
                event.target.value,
              );
              onData?.();
            }}
          />
          <button
            type='button'
            onClick={() => {
              setFileList?.([{ uid: 'new-file', name: 'new-file.pdf' }]);
              setLoadFiles?.([{ uid: 'new-file', name: 'new-file.pdf' }]);
            }}
          >
            add-file
          </button>
          <button
            type='button'
            onClick={() => {
              setFileList?.([]);
            }}
          >
            clear-files
          </button>
          <button type='button' onClick={() => onTabChange?.('administrativeInformation')}>
            switch-source-tab
          </button>
          <button
            type='button'
            onClick={() => {
              context.setFieldValue?.(['administrativeInformation'], undefined);
              onData?.();
            }}
          >
            clear-source-active-tab
          </button>
          {showRules ? <span>source-rules-visible</span> : null}
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

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  enrichValidationIssuesWithOwner: (...args: any[]) => mockEnrichValidationIssuesWithOwner(...args),
  ReffPath: jest.fn().mockImplementation(() => ({
    findProblemNodes: () => mockFindProblemNodes(),
  })),
  checkData: (...args: any[]) => mockCheckData(...args),
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

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourceDetail: jest.fn(),
  updateSource: jest.fn(),
}));

jest.mock('@/services/sources/util', () => ({
  __esModule: true,
  genSourceFromData: jest.fn(() => ({
    sourceInformation: {
      dataSetInformation: {
        'common:shortName': 'Original Source',
        referenceToDigitalFile: [{ '@uri': '../sources/file-existing.pdf' }],
      },
    },
  })),
  genSourceJsonOrdered: (...args: any[]) => mockGenSourceJsonOrdered(...args),
}));

jest.mock('@/services/supabase/storage', () => ({
  __esModule: true,
  getThumbFileUrls: jest.fn(() =>
    Promise.resolve([
      { uid: '../sources/file-existing.pdf', name: 'file-existing.pdf', url: 'https://cdn/file' },
    ]),
  ),
  removeFile: jest.fn(() => Promise.resolve({ error: null })),
  uploadFile: jest.fn(() => Promise.resolve({ error: null })),
}));

jest.mock('@/services/supabase/key', () => ({
  __esModule: true,
  supabaseStorageBucket: 'sources',
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createSource: jest.fn(() => ({
    validateEnhanced: (...args: any[]) => mockValidateEnhanced(...args),
  })),
}));

const { getSourceDetail: mockGetSourceDetail, updateSource: mockUpdateSource } =
  jest.requireMock('@/services/sources/api');
const {
  getThumbFileUrls: mockGetThumbFileUrls,
  removeFile: mockRemoveFile,
  uploadFile: mockUploadFile,
} = jest.requireMock('@/services/supabase/storage');

describe('SourceEdit component', () => {
  beforeEach(() => {
    latestRefsDrawerProps = null;
    jest.clearAllMocks();
    mockBuildValidationIssues.mockReturnValue([]);
    mockEnrichValidationIssuesWithOwner.mockImplementation(async (issues: any[]) => issues);
    mockGetSourceDetail.mockResolvedValue({
      data: {
        json: {
          sourceDataSet: {},
        },
      },
    });
    mockUpdateSource.mockResolvedValue({
      data: [{ rule_verification: true }],
    });
    mockGetThumbFileUrls.mockResolvedValue([
      { uid: '../sources/file-existing.pdf', name: 'file-existing.pdf', url: 'https://cdn/file' },
    ]);
    mockRemoveFile.mockResolvedValue({ error: null });
    mockUploadFile.mockResolvedValue({ error: null });
    mockGetRefsOfCurrentVersion.mockResolvedValue({ oldRefs: [] });
    mockGetRefsOfNewVersion.mockResolvedValue({ newRefs: [], oldRefs: [] });
    mockUpdateRefsData.mockImplementation((data: any) => data);
    mockCheckData.mockResolvedValue(undefined);
    mockGetErrRefTab.mockReturnValue('sourceInformation');
    mockFindProblemNodes.mockReturnValue([]);
    mockGenSourceJsonOrdered.mockReturnValue({ mocked: true });
    mockValidateEnhanced.mockReturnValue({ success: true });
    mockValidateDatasetWithSdk.mockReturnValue({ success: true, issues: [] });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('updates source data and shows success feedback', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });

    const shortNameInput = within(drawer).getByLabelText('Short Name');
    await user.clear(shortNameInput);
    await user.type(shortNameInput, 'Updated Source');

    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateSource).toHaveBeenCalledTimes(1));
    expect(mockUpdateSource).toHaveBeenCalledWith(
      'source-123',
      '01.00.000',
      expect.objectContaining({
        sourceInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'Updated Source',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Saved Successfully!'),
    );

    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Source' })).not.toBeInTheDocument(),
    );
  });

  it('uploads newly attached files after a successful save', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'add-file' }));
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockUploadFile).toHaveBeenCalledWith(
        'uuid-source-edit.pdf',
        expect.objectContaining({ uid: 'new-file', name: 'new-file.pdf' }),
      ),
    );
  });

  it('removes deleted existing files before saving', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'clear-files' }));
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockRemoveFile).toHaveBeenCalledWith(['file-existing.pdf']));
  });

  it('shows an open-data error when the update is rejected with state_code 100', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    mockUpdateSource.mockResolvedValue({
      data: null,
      error: { state_code: 100, message: 'open data' },
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'This data is open data, save failed',
      ),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit Source' })).toBeInTheDocument();
  });

  it('shows an under-review error when the update is rejected with state_code 20', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    mockUpdateSource.mockResolvedValue({
      data: null,
      error: { state_code: 20, message: 'under review' },
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith('Data is under review, save failed'),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit Source' })).toBeInTheDocument();
  });

  it('shows the backend error message for other save failures', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    mockUpdateSource.mockResolvedValue({
      data: null,
      error: { message: 'save failed' },
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('save failed'));
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit Source' })).toBeInTheDocument();
  });

  it('marks the source as invalid when rule verification is false and supports text buttons', async () => {
    const user = userEvent.setup();
    const updateErrRef = jest.fn();

    mockUpdateSource.mockResolvedValueOnce({
      data: [{ rule_verification: false }],
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='text'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
        updateErrRef={updateErrRef}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateErrRef).toHaveBeenCalledWith({
        id: 'source-123',
        version: '01.00.000',
        ruleVerification: false,
        nonExistent: false,
      }),
    );
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Saved Successfully!');
  });

  it('shows file-removal errors but still attempts to save the source', async () => {
    const user = userEvent.setup();

    mockRemoveFile.mockResolvedValueOnce({ error: { message: 'remove failed' } });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'clear-files' }));
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockRemoveFile).toHaveBeenCalledWith(['file-existing.pdf']));
    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('remove failed'));
    expect(mockUpdateSource).toHaveBeenCalledTimes(1);
  });

  it('opens the refs drawer and supports both update and keep flows', async () => {
    const user = userEvent.setup();
    const newRefs = [
      {
        key: 'ref-1',
        id: 'contact-1',
        type: 'contact data set',
        currentVersion: '1.0.0',
        newVersion: '2.0.0',
      },
    ];
    const oldRefs = [
      {
        key: 'ref-1-current',
        id: 'contact-1',
        type: 'contact data set',
        currentVersion: '1.0.0',
        newVersion: '1.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs, oldRefs });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });

    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();
    expect(latestRefsDrawerProps.dataSource).toEqual(newRefs);

    await user.click(screen.getByRole('button', { name: 'update-latest' }));
    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), newRefs, true),
    );

    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs, oldRefs });
    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'keep-current' }));
    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
  });

  it('updates references inline when there is no newer version', async () => {
    const user = userEvent.setup();
    const oldRefs = [
      {
        key: 'ref-1-current',
        id: 'contact-1',
        type: 'contact data set',
        currentVersion: '1.0.0',
        newVersion: '1.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs: [], oldRefs });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('runs source data check successfully without closing the drawer', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });

    await user.click(within(drawer).getByRole('button', { name: 'switch-source-tab' }));
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockUpdateSource).toHaveBeenCalled());
    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(mockGenSourceJsonOrdered).toHaveBeenCalled();
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Data check successfully!');
    expect(screen.getByText('source-rules-visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit Source' })).toBeInTheDocument();
  });

  it('shows source data-check errors when references or schema issues remain', async () => {
    const user = userEvent.setup();
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({ '@refObjectId': 'contact-1', '@version': '1.0.0' });
      nonExistent.push({ '@refObjectId': 'source-2', '@version': '2.0.0' });
    });
    mockFindProblemNodes.mockReturnValue([
      {
        '@refObjectId': 'process-1',
        '@version': '3.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['sourceDataSet', 'administrativeInformation'] }],
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        expect.stringContaining('Data check failed!'),
      ),
    );
    expect(mockGetErrRefTab).toHaveBeenCalled();
  });

  it('handles missing detail payloads and undefined problem nodes during source data checks', async () => {
    const user = userEvent.setup();
    mockGetSourceDetail.mockResolvedValueOnce({
      data: {
        json: {},
      },
    });
    mockUpdateSource.mockResolvedValueOnce({
      data: [{}],
    });
    mockFindProblemNodes.mockReturnValueOnce(undefined);

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Data check successfully!');
  });

  it('uses the false default when rule verification is missing during data checks', async () => {
    const user = userEvent.setup();
    mockUpdateSource.mockResolvedValueOnce({
      data: [{}],
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(mockCheckData).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          findProblemNodes: expect.any(Function),
        }),
      ),
    );
  });

  it('adds unique error tab names for unverified source references', async () => {
    const user = userEvent.setup();
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[]) => {
      unRule.push({ '@refObjectId': 'contact-1', '@version': '1.0.0' });
    });
    mockFindProblemNodes.mockReturnValue([]);
    mockGetErrRefTab.mockReturnValue('administrativeInformation');

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'administrativeInformation：Data check failed!',
      ),
    );
  });

  it('adds unique error tab names for source problem nodes', async () => {
    const user = userEvent.setup();
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
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'modellingAndValidation：Data check failed!',
      ),
    );
  });

  it('stops source data checks when the background save fails', async () => {
    const user = userEvent.setup();
    mockUpdateSource.mockResolvedValueOnce({
      data: null,
      error: { message: 'check blocked' },
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('check blocked'));
    expect(mockCheckData).not.toHaveBeenCalled();
    expect(screen.queryByText('source-rules-visible')).not.toBeInTheDocument();
  });

  it('shows the generic source data-check error when issues do not map to tabs', async () => {
    const user = userEvent.setup();
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['sourceDataSet'] }],
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith('Data check failed!'),
    );
  });

  it('closes the refs drawer and main drawer from cancel and onClose actions', async () => {
    const user = userEvent.setup();
    const newRefs = [
      {
        key: 'ref-1',
        id: 'contact-1',
        type: 'contact data set',
        currentVersion: '1.0.0',
        newVersion: '2.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs, oldRefs: [] });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await act(async () => {
      latestRefsDrawerProps.onCancel();
    });

    await waitFor(() => expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument());

    const drawerCloseButton = within(drawer)
      .getAllByRole('button')
      .find((button) => button.textContent === 'Close');
    expect(drawerCloseButton).toBeTruthy();

    await user.click(drawerCloseButton!);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Source' })).not.toBeInTheDocument(),
    );
  });

  it('submits through the embedded form and closes from icon and cancel actions', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={actionRef as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByRole('dialog', { name: 'Edit Source' });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('source-edit-form'));
    });

    await waitFor(() => expect(mockUpdateSource).toHaveBeenCalled());
    expect(actionRef.current.reload).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Source' })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const iconClosedDrawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    const iconCloseButton = within(iconClosedDrawer)
      .getAllByRole('button', { name: /close/i })
      .find((button) => button.textContent === 'close');
    expect(iconCloseButton).toBeTruthy();
    await user.click(iconCloseButton!);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Source' })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const cancelDrawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(cancelDrawer).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Source' })).not.toBeInTheDocument(),
    );
  });

  it('falls back to the default edit message when buttonType is empty', async () => {
    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType=''
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('keeps saving stable when the active source tab value is cleared', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        actionRef={{ current: { reload: jest.fn() } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'switch-source-tab' }));
    await user.click(within(drawer).getByRole('button', { name: 'clear-source-active-tab' }));
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateSource).toHaveBeenCalled());
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Saved Successfully!');
  });

  it('opens automatically and triggers silent auto-check when requested', async () => {
    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        autoOpen
        autoCheckRequired
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await screen.findByRole('dialog', { name: 'Edit Source' });
    await waitFor(() => expect(mockUpdateSource).toHaveBeenCalled());
    expect(mockCheckData).toHaveBeenCalled();
  });

  it('blocks source data checks when the current dataset is under review', async () => {
    const user = userEvent.setup();
    mockGetSourceDetail.mockResolvedValueOnce({
      data: {
        stateCode: 20,
        json: { sourceDataSet: {} },
      },
    });

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'This data set is under review and cannot be validated',
      ),
    );
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('shows the validation-issue modal when structured source validation issues exist', async () => {
    const user = userEvent.setup();
    mockCheckData.mockImplementationOnce(async (_ref: any, unRule: any[]) => {
      unRule.push({ '@refObjectId': 'contact-1', '@version': '1.0.0' });
    });
    mockBuildValidationIssues.mockReturnValueOnce([
      {
        code: 'ruleVerificationFailed',
        link: '/mydata/sources?id=source-123&version=01.00.000',
        ref: {
          '@type': 'source data set',
          '@refObjectId': 'source-123',
          '@version': '01.00.000',
        },
      },
    ]);

    renderWithProviders(
      <SourceEdit
        id='source-123'
        version='01.00.000'
        lang='en'
        buttonType='icon'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Source' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockShowValidationIssueModal).toHaveBeenCalledTimes(1));
  });
});
