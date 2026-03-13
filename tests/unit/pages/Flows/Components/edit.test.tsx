// @ts-nocheck
import FlowsEdit from '@/pages/Flows/Components/edit';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

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

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  FormOutlined: () => <span>edit</span>,
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

  const ProForm = ({ formRef, initialValues = {}, onFinish, onValuesChange, children }: any) => {
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
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
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
  default: ({ onClose }: any) => (
    <button type='button' onClick={() => onClose?.()}>
      ai-suggestion
    </button>
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
  ReffPath: jest.fn(() => ({
    findProblemNodes: () => [],
  })),
  checkData: jest.fn(async () => {}),
  getErrRefTab: jest.fn(() => ''),
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
    validateEnhanced: () => ({ success: true }),
  })),
}));

jest.mock('@/pages/Flows/Components/form', () => ({
  __esModule: true,
  FlowForm: () => <div data-testid='flow-form'>flow-form</div>,
}));

describe('FlowsEdit', () => {
  beforeEach(() => {
    latestRefsDrawerProps = null;
    jest.clearAllMocks();
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
});
