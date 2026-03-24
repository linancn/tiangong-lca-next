// @ts-nocheck
import ContactEdit from '@/pages/Contacts/Components/edit';
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

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

let mockLatestRefsDrawerProps: any = null;
const mockGetRefsOfCurrentVersion = jest.fn(async () => ({ oldRefs: [] }));
const mockGetRefsOfNewVersion = jest.fn(async () => ({ newRefs: [], oldRefs: [] }));
const mockUpdateRefsData = jest.fn((data: any) => data);
const mockCheckData = jest.fn(async () => {});
const mockGetErrRefTab = jest.fn(() => 'contactInformation');
const mockFindProblemNodes = jest.fn(() => []);
const mockBuildValidationIssues = jest.fn(() => []);
const mockEnrichValidationIssuesWithOwner = jest.fn(async (issues: any[]) => issues);
const mockGenContactJsonOrdered = jest.fn(() => ({ mocked: true }));
const mockValidateEnhanced = jest.fn(() => ({ success: true }));
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
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

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProFormContext = React.createContext<any>(null);

  const ProForm = ({
    formRef,
    initialValues = {},
    onValuesChange,
    onFinish,
    submitter,
    children,
  }: any) => {
    const valuesRef = React.useRef({ ...initialValues });
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(() => {
      if (formRef) {
        formRef.current = {
          submit: async () => onFinish?.(),
          resetFields: () => {
            valuesRef.current = { ...initialValues };
            forceUpdate();
          },
          getFieldsValue: () => ({ ...valuesRef.current }),
          setFieldsValue: (next: any) => {
            valuesRef.current = { ...valuesRef.current, ...next };
            forceUpdate();
            onValuesChange?.({}, valuesRef.current);
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
            forceUpdate();
            onValuesChange?.({}, valuesRef.current);
          },
          getFieldValue: (name: any) => {
            if (Array.isArray(name)) {
              return name.reduce(
                (acc: any, key: string) => (acc ? acc[key] : undefined),
                valuesRef.current,
              );
            }
            return valuesRef.current[name];
          },
          validateFields: async () => valuesRef.current,
        };
      }
    });

    const contextValue = React.useMemo(
      () => ({
        values: valuesRef.current,
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
          forceUpdate();
          onValuesChange?.({}, valuesRef.current);
        },
        setFieldsValue: (next: any) => {
          valuesRef.current = { ...valuesRef.current, ...next };
          forceUpdate();
          onValuesChange?.({}, valuesRef.current);
        },
      }),
      [onValuesChange],
    );

    return (
      <ProFormContext.Provider value={contextValue}>
        <form
          data-testid='contact-edit-form'
          onSubmit={(event) => {
            event.preventDefault();
            void onFinish?.();
          }}
        >
          {submitter?.render?.()}
          {typeof children === 'function' ? children(valuesRef.current) : children}
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

jest.mock('@/pages/Contacts/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');
  return {
    __esModule: true,
    ContactForm: ({ onData, onTabChange, showRules }: any) => {
      const context =
        React.useContext(__ProFormContext) ?? ({ values: {}, setFieldValue: () => {} } as any);

      const shortName =
        context.values?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '';
      const email = context.values?.contactInformation?.dataSetInformation?.email ?? '';

      return (
        <div>
          <label htmlFor='edit-short-name'>Short Name</label>
          <input
            id='edit-short-name'
            value={shortName}
            onChange={(event) =>
              context.setFieldValue?.(
                ['contactInformation', 'dataSetInformation', 'common:shortName'],
                event.target.value,
              )
            }
          />
          <label htmlFor='edit-email'>Email</label>
          <input
            id='edit-email'
            value={email}
            onChange={(event) =>
              context.setFieldValue?.(
                ['contactInformation', 'dataSetInformation', 'email'],
                event.target.value,
              )
            }
          />
          <button type='button' onClick={() => onTabChange?.('administrativeInformation')}>
            switch-contact-tab
          </button>
          <button type='button' onClick={() => onData?.()}>
            sync-contact-data
          </button>
          {showRules ? <span>contact-rules-visible</span> : null}
        </div>
      );
    },
  };
});

jest.mock('@/components/RefsOfNewVersionDrawer', () => ({
  __esModule: true,
  default: (props: any) => {
    mockLatestRefsDrawerProps = props;
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
  ReffPath: jest
    .fn()
    .mockImplementation(() => ({ findProblemNodes: () => mockFindProblemNodes() })),
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

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactDetail: jest.fn(),
  updateContact: jest.fn(),
}));

jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: jest.fn((dataset: any) => ({
    contactInformation: {
      dataSetInformation: {
        'common:shortName':
          dataset?.contactInformation?.dataSetInformation?.['common:shortName'] ?? '',
        email: dataset?.contactInformation?.dataSetInformation?.email ?? '',
      },
    },
  })),
  genContactJsonOrdered: (...args: any[]) => mockGenContactJsonOrdered(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getDataDetail: jest.fn(() => Promise.resolve({ data: {} })),
  getDataDetailById: jest.fn(() => Promise.resolve({ data: [] })),
  getRefData: jest.fn(() => Promise.resolve({ success: true, data: {} })),
  updateStateCodeApi: jest.fn(() => Promise.resolve({ updated: true })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangList: jest.fn((data: any) => data ?? []),
  getLang: jest.fn((data: any, lang: string) => {
    if (Array.isArray(data)) {
      const found = data.find((item: any) => item?.['@lang'] === lang);
      return found?.['#text'] ?? '';
    }
    return data?.['#text'] ?? '';
  }),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getReviewUserRoleApi: jest.fn(() => Promise.resolve(null)),
  getUserTeamId: jest.fn(() => Promise.resolve('team-1')),
}));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createContact: jest.fn(() => ({
    validateEnhanced: (...args: any[]) => mockValidateEnhanced(...args),
  })),
}));

const { getContactDetail: mockGetContactDetail, updateContact: mockUpdateContact } =
  jest.requireMock('@/services/contacts/api');
const { getRefData: mockGetRefData, updateStateCodeApi: mockUpdateStateCodeApi } =
  jest.requireMock('@/services/general/api');
const { showValidationIssueModal: mockShowValidationIssueModal } = jest.requireMock(
  '@/components/ValidationIssueModal',
);
const { getReviewUserRoleApi: mockGetReviewUserRoleApi, getUserTeamId: mockGetUserTeamId } =
  jest.requireMock('@/services/roles/api');
const { getAllRefObj: mockGetAllRefObj, getRefTableName: mockGetRefTableName } =
  jest.requireMock('@/pages/Utils/review');
const { ReffPath: mockReffPath } = jest.requireMock('@/pages/Utils/review');

describe('ContactEdit component', () => {
  beforeEach(() => {
    mockLatestRefsDrawerProps = null;
    jest.clearAllMocks();
    mockBuildValidationIssues.mockReturnValue([]);
    mockEnrichValidationIssuesWithOwner.mockImplementation(async (issues: any[]) => issues);
    mockGetContactDetail.mockResolvedValue({
      data: {
        stateCode: 0,
        json: {
          contactDataSet: {
            contactInformation: {
              dataSetInformation: {
                'common:shortName': 'Original contact',
                email: 'original@example.com',
              },
            },
          },
        },
      },
    });
    mockUpdateContact.mockResolvedValue({
      data: [
        {
          id: 'contact-123',
          version: '01.00.000',
          state_code: 0,
          rule_verification: true,
          json: {
            contactDataSet: {
              contactInformation: {
                dataSetInformation: {
                  'common:shortName': 'Updated contact',
                  email: 'updated@example.com',
                },
              },
            },
          },
        },
      ],
    });
    mockGetReviewUserRoleApi.mockResolvedValue(null);
    mockGetUserTeamId.mockResolvedValue('team-1');
    mockGetAllRefObj.mockReturnValue([]);
    mockGetRefsOfCurrentVersion.mockResolvedValue({ oldRefs: [] });
    mockGetRefsOfNewVersion.mockResolvedValue({ newRefs: [], oldRefs: [] });
    mockUpdateRefsData.mockImplementation((data: any) => data);
    mockCheckData.mockResolvedValue(undefined);
    mockGetErrRefTab.mockReturnValue('contactInformation');
    mockFindProblemNodes.mockReturnValue([]);
    mockReffPath.mockImplementation(() => ({ findProblemNodes: () => mockFindProblemNodes() }));
    mockGenContactJsonOrdered.mockReturnValue({ mocked: true });
    mockValidateEnhanced.mockReturnValue({ success: true });
    mockValidateDatasetWithSdk.mockReturnValue({ success: true, issues: [] });
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        stateCode: 100,
        ruleVerification: true,
      },
    });
    mockUpdateStateCodeApi.mockResolvedValue({ updated: true });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('loads detail and saves updates', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    const setViewDrawerVisible = jest.fn();

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={setViewDrawerVisible}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });

    await waitFor(() =>
      expect(mockGetContactDetail).toHaveBeenCalledWith('contact-123', '01.00.000'),
    );

    const shortNameInput = within(drawer).getByDisplayValue('Original contact');
    await user.clear(shortNameInput);
    await user.type(shortNameInput, 'Updated contact');

    const emailInput = within(drawer).getByDisplayValue('original@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');

    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateContact).toHaveBeenCalledTimes(1));
    expect(mockUpdateContact).toHaveBeenCalledWith(
      'contact-123',
      '01.00.000',
      expect.objectContaining({
        contactInformation: expect.objectContaining({
          dataSetInformation: expect.objectContaining({
            'common:shortName': 'Updated contact',
            email: 'updated@example.com',
          }),
        }),
      }),
    );

    await waitFor(() =>
      expect(getMockAntdMessage().success).toHaveBeenCalledWith('Save successfully!'),
    );
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('shows sync button for review admin and disables it when state_code is 100', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetContactDetail.mockResolvedValue({
      data: {
        stateCode: 100,
        json: {
          contactDataSet: {
            contactInformation: {
              dataSetInformation: {
                'common:shortName': 'Original contact',
                email: 'original@example.com',
              },
            },
          },
        },
      },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    expect(syncButton).toBeDisabled();
  });

  it('ignores late review-role responses after the component unmounts', async () => {
    const user = userEvent.setup();
    const deferredRole = createDeferred<any>();
    mockGetReviewUserRoleApi.mockReturnValueOnce(deferredRole.promise);

    const { unmount } = renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByRole('dialog', { name: 'Edit Contact' });

    unmount();

    await act(async () => {
      deferredRole.resolve({ user_id: 'review-admin-1', role: 'review-admin' });
      await deferredRole.promise;
    });

    expect(mockGetReviewUserRoleApi).toHaveBeenCalledTimes(1);
  });

  it('opens from the text trigger, falls back to the default label, and handles sparse detail payloads', async () => {
    const user = userEvent.setup();
    mockGetContactDetail.mockResolvedValueOnce({ data: {} });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType=' '
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await waitFor(() =>
      expect(mockGetContactDetail).toHaveBeenCalledWith('contact-123', '01.00.000'),
    );
    expect(within(drawer).getByLabelText('Short Name')).toHaveValue('');
    expect(within(drawer).getByLabelText('Email')).toHaveValue('');
  });

  it('opens from a non-empty text trigger id path', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='pages.custom.edit'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() =>
      expect(mockGetContactDetail).toHaveBeenCalledWith('contact-123', '01.00.000'),
    );
    expect(screen.getByRole('dialog', { name: 'Edit Contact' })).toBeInTheDocument();
  });

  it('syncs to open data after validations pass', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetAllRefObj.mockReturnValue([
      {
        '@type': 'source data set',
        '@refObjectId': 'source-123',
        '@version': '01.00.000',
      },
      {
        '@type': 'contact data set',
        '@refObjectId': 'contact-123',
        '@version': '01.00.000',
      },
    ]);
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        stateCode: 100,
        ruleVerification: false,
      },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    expect(syncButton).toBeEnabled();

    await user.click(syncButton);

    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith(
        'contact-123',
        '01.00.000',
        'contacts',
        100,
      ),
    );
    expect(mockGetRefData).toHaveBeenCalledWith('source-123', '01.00.000', 'sources', 'team-1');
    expect(actionRef.current.reload).toHaveBeenCalled();
    expect(getMockAntdMessage().success).toHaveBeenCalledWith(
      'Synchronized to open data successfully!',
    );
  });

  it('falls back to the original id, version, dataset, and empty team id while syncing', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetUserTeamId.mockResolvedValue(undefined);
    mockGetAllRefObj.mockReturnValue([
      { '@type': 'source data set', '@refObjectId': 'source-1', '@version': '1.0.0' },
    ]);
    mockUpdateContact.mockResolvedValueOnce({
      data: [
        {
          rule_verification: true,
        },
      ],
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });

    await user.click(syncButton);

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('source-1', '1.0.0', 'sources', ''),
    );
    expect(mockUpdateStateCodeApi).toHaveBeenCalledWith(
      'contact-123',
      '01.00.000',
      'contacts',
      100,
    );
    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
  });

  it('blocks sync when referenced non-contact data is not open', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetAllRefObj.mockReturnValue([
      {
        '@type': 'source data set',
        '@refObjectId': 'source-123',
        '@version': '01.00.000',
      },
    ]);
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        stateCode: 20,
        ruleVerification: true,
      },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    await user.click(syncButton);

    await waitFor(() => {
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'Referenced data {id}({version}) must be open data.',
      );
    });
    expect(mockUpdateStateCodeApi).not.toHaveBeenCalled();
  });

  it('shows an under-review error when saving is rejected with state_code 20', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    mockUpdateContact.mockResolvedValue({
      data: null,
      error: { state_code: 20, message: 'under review' },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith('Data is under review, save failed'),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit Contact' })).toBeInTheDocument();
  });

  it('shows the open-data error when saving is rejected with state_code 100', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    mockUpdateContact.mockResolvedValue({
      data: null,
      error: { state_code: 100, message: 'open data' },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'This data is open data, save failed',
      ),
    );
    expect(actionRef.current.reload).not.toHaveBeenCalled();
  });

  it('marks the contact as invalid when rule verification is false', async () => {
    const user = userEvent.setup();
    const updateErrRef = jest.fn();

    mockUpdateContact.mockResolvedValueOnce({
      data: [
        {
          id: 'contact-123',
          version: '01.00.000',
          state_code: 0,
          rule_verification: false,
          json: {
            contactDataSet: {
              contactInformation: {
                dataSetInformation: {
                  'common:shortName': 'Updated contact',
                  email: 'updated@example.com',
                },
              },
            },
          },
        },
      ],
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        updateErrRef={updateErrRef}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateErrRef).toHaveBeenCalledWith({
        id: 'contact-123',
        version: '01.00.000',
        ruleVerification: false,
        nonExistent: false,
      }),
    );
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Save successfully!');
  });

  it('shows the backend error message when saving fails for another reason', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    mockUpdateContact.mockResolvedValue({
      data: null,
      error: { message: 'save failed' },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('save failed'));
    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit Contact' })).toBeInTheDocument();
  });

  it('opens the refs drawer and supports both update and keep flows', async () => {
    const user = userEvent.setup();
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
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });

    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));
    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();
    expect(mockLatestRefsDrawerProps.dataSource).toEqual(newRefs);

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
        id: 'source-1',
        type: 'source data set',
        currentVersion: '1.0.0',
        newVersion: '1.0.0',
      },
    ];
    mockGetRefsOfNewVersion.mockResolvedValueOnce({ newRefs: [], oldRefs });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));

    await waitFor(() =>
      expect(mockUpdateRefsData).toHaveBeenCalledWith(expect.any(Object), oldRefs, false),
    );
    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
  });

  it('runs contact data check successfully without closing the drawer', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });

    await user.click(within(drawer).getByRole('button', { name: 'switch-contact-tab' }));
    await user.click(within(drawer).getByRole('button', { name: 'sync-contact-data' }));
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockUpdateContact).toHaveBeenCalled());
    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(mockGenContactJsonOrdered).toHaveBeenCalled();
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Data check successfully!');
    expect(screen.getByText('contact-rules-visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edit Contact' })).toBeInTheDocument();
  });

  it('keeps an empty object for the active tab when values change after switching tabs', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });

    await user.click(within(drawer).getByRole('button', { name: 'switch-contact-tab' }));
    await user.clear(within(drawer).getByLabelText('Short Name'));
    await user.type(within(drawer).getByLabelText('Short Name'), 'Updated after tab switch');
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockGenContactJsonOrdered).toHaveBeenCalled());
    expect(mockGenContactJsonOrdered).toHaveBeenLastCalledWith(
      'contact-123',
      expect.objectContaining({
        administrativeInformation: {},
      }),
    );
  });

  it('treats a null rule verification as passed during data check', async () => {
    const user = userEvent.setup();
    mockUpdateContact.mockResolvedValueOnce({
      data: [{ rule_verification: null }],
    });
    mockReffPath.mockImplementationOnce(() => ({ findProblemNodes: () => undefined }));

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockCheckData).toHaveBeenCalled());
    expect(mockReffPath).toHaveBeenLastCalledWith(
      expect.objectContaining({
        '@type': 'contact data set',
        '@refObjectId': 'contact-123',
        '@version': '01.00.000',
      }),
      true,
      false,
    );
    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Data check successfully!');
  });

  it('shows contact data-check errors when references or schema issues remain', async () => {
    const user = userEvent.setup();
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({ '@refObjectId': 'source-1', '@version': '1.0.0' });
      nonExistent.push({ '@refObjectId': 'contact-9', '@version': '9.0.0' });
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
      issues: [{ path: ['contactDataSet', 'administrativeInformation'] }],
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        expect.stringContaining('Data check failed!'),
      ),
    );
    expect(mockGetErrRefTab).toHaveBeenCalled();
  });

  it('adds unique tab names from unresolved refs and problem nodes during data check', async () => {
    const user = userEvent.setup();
    mockCheckData.mockImplementation(async (_ref: any, unRule: any[], nonExistent: any[]) => {
      unRule.push({ '@refObjectId': 'source-1', '@version': '1.0.0' });
      nonExistent.push({ '@refObjectId': 'contact-9', '@version': '9.0.0' });
    });
    mockFindProblemNodes.mockReturnValue([
      {
        '@refObjectId': 'process-1',
        '@version': '3.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ]);
    mockGetErrRefTab.mockImplementation((item: any) => {
      if (item?.['@refObjectId'] === 'contact-9') return 'contactInformation';
      if (item?.['@refObjectId'] === 'source-1') return 'administrativeInformation';
      if (item?.['@refObjectId'] === 'process-1') return 'modellingAndValidation';
      return undefined;
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'contactInformation，administrativeInformation，modellingAndValidation：Data check failed!',
      ),
    );
  });

  it('shows the generic contact data-check error when issues do not map to tabs', async () => {
    const user = userEvent.setup();
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['contactDataSet'] }],
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith('Data check failed!'),
    );
  });

  it('stops sync and data check when the background save fails', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });

    mockUpdateContact.mockResolvedValueOnce({
      data: null,
      error: { message: 'sync blocked' },
    });
    await user.click(syncButton);

    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('sync blocked'));
    expect(mockUpdateStateCodeApi).not.toHaveBeenCalled();

    mockUpdateContact.mockResolvedValueOnce({
      data: null,
      error: { message: 'check blocked' },
    });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('check blocked'));
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('requires rule verification before syncing to open data', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockUpdateContact.mockResolvedValueOnce({
      data: [
        {
          id: 'contact-123',
          version: '01.00.000',
          state_code: 0,
          rule_verification: false,
          json: {
            contactDataSet: {
              contactInformation: {
                dataSetInformation: {
                  'common:shortName': 'Updated contact',
                  email: 'updated@example.com',
                },
              },
            },
          },
        },
      ],
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    await user.click(syncButton);

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'Current contact data is incomplete. Please fill all required fields before syncing.',
      ),
    );
    expect(mockUpdateStateCodeApi).not.toHaveBeenCalled();
  });

  it('treats a null rule verification as passed when syncing to open data', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetAllRefObj.mockReturnValue([
      {
        '@type': 'source data set',
        '@refObjectId': 'source-123',
        '@version': '01.00.000',
      },
    ]);
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        stateCode: 100,
        ruleVerification: true,
      },
    });
    mockUpdateContact.mockResolvedValueOnce({
      data: [
        {
          id: 'contact-123',
          version: '01.00.000',
          state_code: 0,
          rule_verification: null,
          json: {
            contactDataSet: {
              contactInformation: {
                dataSetInformation: {
                  'common:shortName': 'Updated contact',
                  email: 'updated@example.com',
                },
              },
            },
          },
        },
      ],
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    await user.click(syncButton);

    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith(
        'contact-123',
        '01.00.000',
        'contacts',
        100,
      ),
    );
    expect(getMockAntdMessage().error).not.toHaveBeenCalledWith(
      'Current contact data is incomplete. Please fill all required fields before syncing.',
    );
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('skips unknown reference types during sync validation', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetAllRefObj.mockReturnValue([
      {
        '@type': 'unknown data set',
        '@refObjectId': 'unknown-1',
        '@version': '01.00.000',
      },
    ]);

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    await user.click(syncButton);

    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith(
        'contact-123',
        '01.00.000',
        'contacts',
        100,
      ),
    );
    expect(mockGetRefData).not.toHaveBeenCalled();
    expect(mockGetRefTableName).toHaveBeenCalledWith('unknown data set');
  });

  it('closes the refs drawer and main drawer from cancel and onClose actions', async () => {
    const user = userEvent.setup();
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
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Update Reference' }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();

    await act(async () => {
      mockLatestRefsDrawerProps.onCancel();
    });

    await waitFor(() => expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument());

    const drawerCloseButton = within(drawer)
      .getAllByRole('button')
      .find((button) => button.textContent === 'Close');
    expect(drawerCloseButton).toBeTruthy();

    await user.click(drawerCloseButton!);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Contact' })).not.toBeInTheDocument(),
    );
  });

  it('submits through the embedded form and closes from icon and cancel actions', async () => {
    const user = userEvent.setup();
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        actionRef={actionRef as any}
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByRole('dialog', { name: 'Edit Contact' });

    await act(async () => {
      fireEvent.submit(screen.getByTestId('contact-edit-form'));
    });

    await waitFor(() => expect(mockUpdateContact).toHaveBeenCalled());
    expect(actionRef.current.reload).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Contact' })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const iconClosedDrawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    const iconCloseButton = within(iconClosedDrawer)
      .getAllByRole('button', { name: /close/i })
      .find((button) => button.textContent === 'close');
    expect(iconCloseButton).toBeTruthy();
    await user.click(iconCloseButton!);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Contact' })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const cancelDrawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(cancelDrawer).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit Contact' })).not.toBeInTheDocument(),
    );
  });

  it('blocks sync when contact references point to a different contact record', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetAllRefObj.mockReturnValue([
      {
        '@type': 'contact data set',
        '@refObjectId': 'contact-999',
        '@version': '99.00.000',
      },
    ]);

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    await user.click(syncButton);

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'Contact reference {id}({version}) must match the current contact ID and version.',
      ),
    );
    expect(mockUpdateStateCodeApi).not.toHaveBeenCalled();
  });

  it('shows an action error when state-code update fails during sync', async () => {
    const user = userEvent.setup();
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'review-admin-1', role: 'review-admin' });
    mockGetAllRefObj.mockReturnValue([]);
    mockUpdateStateCodeApi.mockResolvedValueOnce(null);

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
        showSyncOpenDataButton={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const syncButton = await screen.findByRole('button', { name: 'Sync to Open Data' });
    await user.click(syncButton);

    await waitFor(() => expect(getMockAntdMessage().error).toHaveBeenCalledWith('Action failed'));
  });

  it('opens automatically and triggers silent auto-check when requested', async () => {
    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        autoOpen
        autoCheckRequired
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await screen.findByRole('dialog', { name: 'Edit Contact' });
    await waitFor(() => expect(mockUpdateContact).toHaveBeenCalled());
    expect(mockCheckData).toHaveBeenCalled();
  });

  it('blocks contact data checks when the current dataset is under review', async () => {
    const user = userEvent.setup();
    mockGetContactDetail.mockResolvedValueOnce({
      data: {
        stateCode: 20,
        json: { contactDataSet: {} },
      },
    });

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() =>
      expect(getMockAntdMessage().error).toHaveBeenCalledWith(
        'This data set is under review and cannot be validated',
      ),
    );
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('shows the validation-issue modal when structured contact validation issues exist', async () => {
    const user = userEvent.setup();
    mockCheckData.mockImplementationOnce(async (_ref: any, unRule: any[]) => {
      unRule.push({ '@refObjectId': 'source-1', '@version': '1.0.0' });
    });
    mockBuildValidationIssues.mockReturnValueOnce([
      {
        code: 'ruleVerificationFailed',
        link: '/mydata/contacts?id=contact-123&version=01.00.000',
        ref: {
          '@type': 'contact data set',
          '@refObjectId': 'contact-123',
          '@version': '01.00.000',
        },
      },
    ]);

    renderWithProviders(
      <ContactEdit
        id='contact-123'
        version='01.00.000'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit Contact' });
    await user.click(within(drawer).getByRole('button', { name: 'Data Check' }));

    await waitFor(() => expect(mockShowValidationIssueModal).toHaveBeenCalledTimes(1));
  });
});
