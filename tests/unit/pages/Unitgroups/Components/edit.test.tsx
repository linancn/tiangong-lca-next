// @ts-nocheck
import UnitGroupEdit from '@/pages/Unitgroups/Components/edit';
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
  const Drawer = ({ open, title, extra, footer, children, onClose }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </section>
    ) : null;
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

  const ProForm = ({ formRef, initialValues = {}, onValuesChange, onFinish, children }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});
    const initialValuesSerialized = JSON.stringify(initialValues ?? {});

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
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {children}
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

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ReffPath: class {
    findProblemNodes() {
      return [];
    }
  },
  checkData: (...args: any[]) => mockCheckData(...args),
  getErrRefTab: (...args: any[]) => mockGetErrRefTab(...args),
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
  UnitGroupForm: ({ unitDataSource, onTabChange }: any) => {
    onTabChange?.('unitGroupInformation');
    return <div>{`unit-group-form-${unitDataSource?.length ?? 0}`}</div>;
  },
}));

describe('UnitGroupEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestRefsDrawerProps = null;
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
});
