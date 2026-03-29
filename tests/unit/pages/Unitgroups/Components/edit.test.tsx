// @ts-nocheck
import UnitGroupEdit from '@/pages/Unitgroups/Components/edit';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../../../helpers/testUtils';

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
let mockProblemNodes: any = [];
const mockIntl = {
  formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => mockIntl,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  FormOutlined: () => <span data-testid='icon-edit' />,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('antd', () => {
  const React = require('react');
  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, icon, type, ...rest }: any) => (
    <button
      type='button'
      data-button-type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...rest}
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
  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    ConfigProvider,
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
    onValuesChange,
    onFinish,
    submitter,
    children,
  }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});
    const initialValuesSerialized = JSON.stringify(initialValues ?? {});
    const renderedSubmitter = submitter?.render?.();

    React.useEffect(() => {
      setValues((previous: any) =>
        JSON.stringify(previous ?? {}) === initialValuesSerialized
          ? previous
          : (initialValues ?? {}),
      );
    }, [initialValues, initialValuesSerialized]);

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        validateFields: async () => values,
        getFieldsValue: () => values,
        setFieldsValue: (next: any) => {
          setValues((previous: any) => {
            const merged = mergeDeep(previous, next);
            onValuesChange?.({}, merged);
            return merged;
          });
        },
        resetFields: () => setValues(initialValues ?? {}),
      };
    }, [formRef, initialValues, onValuesChange, values]);

    return (
      <form
        data-testid='pro-form'
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {children}
        {renderedSubmitter}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
  };
});

jest.mock('@/components/RefsOfNewVersionDrawer', () => ({
  __esModule: true,
  default: (props: any) => {
    latestRefsDrawerProps = props;
    if (!props.open) return null;
    return (
      <div data-testid='refs-drawer'>
        <button type='button' onClick={props.onCancel}>
          cancel-refs
        </button>
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

const mockGetRefsOfCurrentVersion = jest.fn(async () => ({ oldRefs: [] }));
const mockGetRefsOfNewVersion = jest.fn(async () => ({ newRefs: [], oldRefs: [] }));
const mockUpdateRefsData = jest.fn((data: any) => data);

jest.mock('@/pages/Utils/updateReference', () => ({
  __esModule: true,
  getRefsOfCurrentVersion: (...args: any[]) => mockGetRefsOfCurrentVersion(...args),
  getRefsOfNewVersion: (...args: any[]) => mockGetRefsOfNewVersion(...args),
  updateRefsData: (...args: any[]) => mockUpdateRefsData(...args),
}));

const mockCheckData = jest.fn(async () => undefined);
const mockGetErrRefTab = jest.fn(() => null);
const mockBuildValidationIssues = jest.fn(() => []);
const mockEnrichValidationIssuesWithOwner = jest.fn(async (issues: any[]) => issues);
const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: class {
    findProblemNodes() {
      return mockProblemNodes;
    }
  },
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  checkData: (...args: any[]) => mockCheckData(...args),
  enrichValidationIssuesWithOwner: (...args: any[]) => mockEnrichValidationIssuesWithOwner(...args),
  getErrRefTab: (...args: any[]) => mockGetErrRefTab(...args),
  validateDatasetWithSdk: (...args: any[]) => mockValidateDatasetWithSdk(...args),
}));

jest.mock('@/components/ValidationIssueModal', () => ({
  __esModule: true,
  showValidationIssueModal: jest.fn(),
}));

const mockGetUnitGroupDetail = jest.fn();
const mockUpdateUnitGroup = jest.fn();

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupDetail: (...args: any[]) => mockGetUnitGroupDetail(...args),
  updateUnitGroup: (...args: any[]) => mockUpdateUnitGroup(...args),
}));

const generatedUnitGroup = {
  unitGroupInformation: {
    dataSetInformation: {
      'common:name': [{ '@xml:lang': 'en', '#text': 'Existing unit group' }],
    },
  },
  units: {
    unit: [
      {
        '@dataSetInternalID': '0',
        name: 'kg',
        quantitativeReference: true,
      },
    ],
  },
};

const mockGenUnitGroupFromData = jest.fn(() => generatedUnitGroup);
const mockGenUnitGroupJsonOrdered = jest.fn((_id: string, data: any) => ({ ordered: data }));

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitGroupFromData: (...args: any[]) => mockGenUnitGroupFromData(...args),
  genUnitGroupJsonOrdered: (...args: any[]) => mockGenUnitGroupJsonOrdered(...args),
}));

const mockValidateEnhanced = jest.fn(() => ({ success: true }));

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createUnitGroup: jest.fn(() => ({
    validateEnhanced: (...args: any[]) => mockValidateEnhanced(...args),
  })),
}));

jest.mock('@/pages/Unitgroups/Components/form', () => ({
  __esModule: true,
  UnitGroupForm: ({
    unitDataSource,
    onTabChange,
    onData,
    onUnitData,
    onUnitDataCreate,
    formRef,
  }: any) => (
    <div>
      <div>{`unit-group-form-${unitDataSource?.length ?? 0}`}</div>
      <button type='button' onClick={() => onTabChange?.('customTab')}>
        switch-custom-tab
      </button>
      <button type='button' onClick={() => onData?.()}>
        sync-tab-data
      </button>
      <button
        type='button'
        onClick={() =>
          onUnitData?.([
            {
              '@dataSetInternalID': '9',
              name: 'g',
              quantitativeReference: true,
            },
          ])
        }
      >
        replace-units
      </button>
      <button
        type='button'
        onClick={() =>
          onUnitDataCreate?.({
            name: 'lb',
            quantitativeReference: false,
          })
        }
      >
        create-unit
      </button>
      <button
        type='button'
        onClick={() => formRef?.current?.setFieldsValue({ anotherTab: { note: 'x' } })}
      >
        push-form-values
      </button>
    </div>
  ),
}));

describe('UnitGroupEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestRefsDrawerProps = null;
    mockProblemNodes = [];
    mockEnrichValidationIssuesWithOwner.mockImplementation(async (issues: any[]) => issues);
    mockGenUnitGroupFromData.mockImplementation(() => generatedUnitGroup);
    mockGetUnitGroupDetail.mockResolvedValue({
      data: {
        json: { unitGroupDataSet: {} },
      },
    });
    mockGetRefsOfCurrentVersion.mockResolvedValue({ oldRefs: [{ id: 'old-ref' }] });
    mockGetRefsOfNewVersion.mockResolvedValue({ newRefs: [], oldRefs: [{ id: 'old-ref' }] });
    mockUpdateUnitGroup.mockResolvedValue({
      data: [{ rule_verification: true }],
    });
    mockValidateEnhanced.mockReturnValue({ success: true });
    mockCheckData.mockImplementation(async () => undefined);
    mockGetErrRefTab.mockImplementation(() => null);
  });

  it('opens the drawer and loads existing unit group data', async () => {
    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(await screen.findByRole('dialog', { name: /edit/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(mockGetUnitGroupDetail).toHaveBeenCalledWith('unitgroup-1', '1.0.0'),
    );
    expect(screen.getByText('unit-group-form-1')).toBeInTheDocument();
  });

  it('opens the refs drawer when newer reference versions exist and can keep the current version', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [{ id: 'new-ref', version: '2.0.0' }],
      oldRefs: [{ id: 'old-ref', version: '1.0.0' }],
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    expect(await screen.findByTestId('refs-drawer')).toBeInTheDocument();
    expect(latestRefsDrawerProps.dataSource).toEqual([{ id: 'new-ref', version: '2.0.0' }]);

    await userEvent.click(screen.getByRole('button', { name: /keep-current/i }));

    expect(mockUpdateRefsData).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'unitgroup-1' }),
      [{ id: 'old-ref', version: '1.0.0' }],
      false,
    );
  });

  it('updates to the latest reference versions when requested', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [{ id: 'new-ref', version: '2.0.0' }],
      oldRefs: [{ id: 'old-ref', version: '1.0.0' }],
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await screen.findByTestId('refs-drawer');

    await userEvent.click(screen.getByRole('button', { name: /update-latest/i }));

    expect(mockUpdateRefsData).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'unitgroup-1' }),
      [{ id: 'new-ref', version: '2.0.0' }],
      true,
    );
  });

  it('closes the refs drawer without changing refs when cancel is clicked', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [{ id: 'new-ref', version: '2.0.0' }],
      oldRefs: [{ id: 'old-ref', version: '1.0.0' }],
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));
    await screen.findByTestId('refs-drawer');

    await userEvent.click(screen.getByRole('button', { name: /cancel-refs/i }));

    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
    expect(mockUpdateRefsData).not.toHaveBeenCalledWith(
      expect.anything(),
      [{ id: 'new-ref', version: '2.0.0' }],
      expect.anything(),
    );
  });

  it('updates reference descriptions in place when no newer version exists', async () => {
    mockGetRefsOfNewVersion.mockResolvedValue({
      newRefs: [],
      oldRefs: [{ id: 'old-ref', version: '1.0.0' }],
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });
    await screen.findByText('unit-group-form-1');

    await userEvent.click(screen.getByRole('button', { name: /update reference/i }));

    expect(screen.queryByTestId('refs-drawer')).not.toBeInTheDocument();
    expect(mockUpdateRefsData).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'unitgroup-1' }),
      [{ id: 'old-ref', version: '1.0.0' }],
      false,
    );
  });

  it('falls back to empty dataset payloads when detail response omits unitGroupDataSet', async () => {
    mockGetUnitGroupDetail.mockResolvedValue({
      data: {
        json: {},
      },
    });
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {},
      units: { unit: [] },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(await screen.findByText('unit-group-form-0')).toBeInTheDocument();
    expect(mockGenUnitGroupFromData).toHaveBeenCalledWith({});
  });

  it('falls back to an empty unit list when the loaded dataset has no units section', async () => {
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {},
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(await screen.findByText('unit-group-form-0')).toBeInTheDocument();
  });

  it('saves successfully, closes the drawer, reloads the table, and clears ref errors', async () => {
    const reload = jest.fn();
    const actionRef = { current: { reload } };
    const setViewDrawerVisible = jest.fn();
    const updateErrRef = jest.fn();

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        actionRef={actionRef as any}
        setViewDrawerVisible={setViewDrawerVisible}
        updateErrRef={updateErrRef}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockUpdateUnitGroup).toHaveBeenCalledWith(
        'unitgroup-1',
        '1.0.0',
        expect.objectContaining({
          id: 'unitgroup-1',
          units: generatedUnitGroup.units,
        }),
      ),
    );
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Saved successfully!');
    expect(updateErrRef).toHaveBeenCalledWith(null);
    expect(setViewDrawerVisible).toHaveBeenCalledWith(false);
    expect(reload).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('marks the unit group as ref-invalid when save succeeds with rule_verification=false', async () => {
    const updateErrRef = jest.fn();

    mockUpdateUnitGroup.mockResolvedValue({
      data: [{ rule_verification: false }],
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
        updateErrRef={updateErrRef}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(updateErrRef).toHaveBeenCalledWith({
        id: 'unitgroup-1',
        version: '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      }),
    );
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Saved successfully!');
  });

  it('syncs tab data and unit callbacks from the mocked UnitGroupForm', async () => {
    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });
    await screen.findByText('unit-group-form-1');

    await userEvent.click(screen.getByRole('button', { name: /switch-custom-tab/i }));
    await userEvent.click(screen.getByRole('button', { name: /sync-tab-data/i }));
    await userEvent.click(screen.getByRole('button', { name: /push-form-values/i }));
    await userEvent.click(screen.getByRole('button', { name: /replace-units/i }));
    await userEvent.click(screen.getByRole('button', { name: /create-unit/i }));

    expect(await screen.findByText('unit-group-form-2')).toBeInTheDocument();
  });

  it('supports icon trigger and all drawer close paths', async () => {
    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType='icon'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByTestId('icon-edit').closest('button')!);
    expect(await screen.findByRole('dialog', { name: /edit/i })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('icon-close').closest('button')!);
    expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('icon-edit').closest('button')!);
    await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('icon-edit').closest('button')!);
    await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('shows a validation error during data check when no units are selected', async () => {
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {},
      units: { unit: [] },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Please select unit'));
  });

  it('submits through the ProForm onFinish path', async () => {
    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType='custom.edit.label'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    fireEvent.submit(screen.getByTestId('pro-form'));

    await waitFor(() => expect(mockUpdateUnitGroup).toHaveBeenCalled());
    expect(mockAntdMessage.success).toHaveBeenCalledWith('Saved successfully!');
  });

  it('stops data check early when the temporary save fails', async () => {
    mockUpdateUnitGroup.mockResolvedValue({
      data: null,
      error: { state_code: 500, message: 'cannot save draft' },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('cannot save draft'));
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('shows a validation error when quantitative reference count is invalid', async () => {
    mockGenUnitGroupFromData.mockReturnValue({
      unitGroupInformation: {},
      units: {
        unit: [
          { '@dataSetInternalID': '0', name: 'kg', quantitativeReference: false },
          { '@dataSetInternalID': '1', name: 'g', quantitativeReference: false },
        ],
      },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'Unit needs to have exactly one quantitative reference open',
      ),
    );
  });

  it('shows a success message when data check is clean and problem nodes fall back to []', async () => {
    mockProblemNodes = undefined;

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.success).toHaveBeenCalledWith('Data check successfully!'),
    );
  });

  it('shows tab-specific data-check errors when refs and schema issues resolve to tabs', async () => {
    mockCheckData.mockImplementation(async (_ref, unRuleVerification, nonExistentRef) => {
      nonExistentRef.push({ id: 'missing-ref' });
      unRuleVerification.push({ id: 'rule-ref' });
    });
    mockProblemNodes = [
      {
        '@refObjectId': 'problem-ref',
        '@version': '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ];
    mockGetErrRefTab
      .mockImplementationOnce(() => 'unitGroupInformation')
      .mockImplementationOnce(() => 'units')
      .mockImplementationOnce(() => 'validation');
    mockValidateEnhanced.mockReturnValue({
      success: false,
      error: {
        issues: [
          { path: ['root', 'unitGroupInformation'] },
          { path: ['root', undefined] },
          { path: ['root', 'unitGroupInformation'] },
        ],
      },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'unitGroupInformation，units，validation：Data check failed!',
      ),
    );
  });

  it('shows a generic data-check error when problems exist but no tab can be resolved', async () => {
    mockProblemNodes = [
      {
        '@refObjectId': 'problem-ref',
        '@version': '1.0.0',
        ruleVerification: false,
        nonExistent: false,
      },
    ];
    mockGetErrRefTab.mockReturnValue(null);

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType='custom.unitgroup.edit'
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('Data check failed!'));
  });

  it('adds schema issue tabs that are not already present in the error tab list', async () => {
    mockValidateDatasetWithSdk.mockReturnValue({
      success: false,
      issues: [{ path: ['root', 'administrativeInformation'] }],
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(screen.getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'administrativeInformation：Data check failed!',
      ),
    );
  });

  it('shows an open-data error when save is rejected with state_code 100', async () => {
    const reload = jest.fn();

    mockUpdateUnitGroup.mockResolvedValue({
      data: null,
      error: { state_code: 100, message: 'open data' },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        actionRef={{ current: { reload } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawer = await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(within(drawer).getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('This data is open data, save failed'),
    );
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows an under-review error when save is rejected with state_code 20', async () => {
    const reload = jest.fn();

    mockUpdateUnitGroup.mockResolvedValue({
      data: null,
      error: { state_code: 20, message: 'under review' },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        actionRef={{ current: { reload } } as any}
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawer = await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(within(drawer).getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith('Data is under review, save failed'),
    );
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /edit/i })).toBeInTheDocument();
  });

  it('shows the backend error message when save fails for another reason', async () => {
    mockUpdateUnitGroup.mockResolvedValue({
      data: null,
      error: { state_code: 500, message: 'save exploded' },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawer = await screen.findByRole('dialog', { name: /edit/i });

    await userEvent.click(within(drawer).getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockAntdMessage.error).toHaveBeenCalledWith('save exploded'));
    expect(screen.getByRole('dialog', { name: /edit/i })).toBeInTheDocument();
  });

  it('opens automatically and triggers silent auto-check when requested', async () => {
    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        autoOpen
        autoCheckRequired
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await screen.findByRole('dialog', { name: /edit/i });
    await waitFor(() => expect(mockUpdateUnitGroup).toHaveBeenCalled());
    expect(mockCheckData).toHaveBeenCalled();
  });

  it('blocks unit-group data checks when the current dataset is under review', async () => {
    mockGetUnitGroupDetail.mockResolvedValueOnce({
      data: {
        stateCode: 20,
        json: { unitGroupDataSet: {} },
      },
    });

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawer = await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(within(drawer).getByRole('button', { name: /data check/i }));

    await waitFor(() =>
      expect(mockAntdMessage.error).toHaveBeenCalledWith(
        'This data set is under review and cannot be validated',
      ),
    );
    expect(mockCheckData).not.toHaveBeenCalled();
  });

  it('shows the validation-issue modal when structured unit-group validation issues exist', async () => {
    mockCheckData.mockImplementationOnce(async (_ref: any, unRule: any[]) => {
      unRule.push({ '@refObjectId': 'flow-1', '@version': '1.0.0' });
    });
    mockBuildValidationIssues.mockReturnValueOnce([
      {
        code: 'ruleVerificationFailed',
        link: '/mydata/unitgroups?id=unitgroup-1&version=1.0.0',
        ref: {
          '@type': 'unit group data set',
          '@refObjectId': 'unitgroup-1',
          '@version': '1.0.0',
        },
      },
    ]);

    renderWithProviders(
      <UnitGroupEdit
        id='unitgroup-1'
        version='1.0.0'
        buttonType=''
        lang='en'
        setViewDrawerVisible={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const drawer = await screen.findByRole('dialog', { name: /edit/i });
    await userEvent.click(within(drawer).getByRole('button', { name: /data check/i }));

    await waitFor(() => expect(mockShowValidationIssueModal).toHaveBeenCalledTimes(1));
  });
});
