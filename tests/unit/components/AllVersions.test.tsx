/**
 * Tests for AllVersions component
 * Path: src/components/AllVersions/index.tsx
 *
 * Coverage focuses on:
 * - Renders correctly with given props
 * - Handles user interactions (button click, drawer open/close)
 * - Disabled state behavior
 * - Drawer functionality
 * - ProTable integration
 */

import AllVersionsList, {
  getAllVersionsOperationColumnWidth,
  getCreateVersionPopupContainer,
} from '@/components/AllVersions';
import { getAllVersions } from '@/services/general/api';
import { SUPPORTED_CONTENT_LANGUAGES } from '@/services/general/contentLanguageRegistry';
import { getDataSource } from '@/services/general/util';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';

let mockLatestProTableRequestParams: Record<string, unknown> | null = null;
let mockOmitProTableRequestParams = false;
let mockLatestVersionColumns: any[] = [];
let mockVersionRequestOverrides: Record<string, unknown> = {};
let mockVersionSort: Record<string, 'ascend' | 'descend'> = {};
let mockVersionTableApi: { reload: () => Promise<unknown> } | null = null;

// Mock dependencies
jest.mock('@/services/general/api', () => ({
  getAllVersions: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  getDataSource: jest.fn(),
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const ReactRuntime = require('react');
  const Button = ({
    children,
    disabled,
    icon,
    onClick,
    shape,
    size,
    style,
    type,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    icon?: React.ReactNode;
    onClick?: () => void;
    shape?: string;
    size?: string;
    style?: React.CSSProperties;
    type?: string;
  }) => {
    const buttonRef = ReactRuntime.useRef(null);
    const classes = [
      'ant-btn',
      shape === 'circle' ? 'ant-btn-circle' : '',
      size === 'small' ? 'ant-btn-sm' : '',
      type === 'primary' ? 'ant-btn-primary' : '',
      !children ? 'ant-btn-icon-only' : '',
    ]
      .filter(Boolean)
      .join(' ');

    ReactRuntime.useEffect(() => {
      if (buttonRef.current) {
        buttonRef.current.disabled = Boolean(disabled);
      }
    }, [disabled]);

    return (
      <button ref={buttonRef} className={classes} style={style} type='button' onClick={onClick}>
        {icon ? <span className='ant-btn-icon'>{icon}</span> : null}
        {children}
      </button>
    );
  };

  return {
    ...actual,
    Button,
    Drawer: ({
      open,
      onClose,
      title,
      extra,
      children,
      footer,
      getContainer,
    }: {
      open?: boolean;
      onClose?: () => void;
      title?: React.ReactNode;
      extra?: React.ReactNode;
      children?: React.ReactNode;
      footer?: React.ReactNode;
      getContainer?: () => HTMLElement;
    }) =>
      open ? (
        <div role='dialog' data-has-container={String(Boolean(getContainer?.()))}>
          <button type='button' aria-label='drawer-close-handler' onClick={() => onClose?.()} />
          <div>{title}</div>
          <div>{extra}</div>
          <div>{children}</div>
          <div>{footer}</div>
        </div>
      ) : null,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({
    actionRef,
    columns = [],
    params,
    request,
    rowKey = 'id',
    rowSelection,
    toolBarRender,
    toolbar,
  }: any) => {
    mockLatestVersionColumns = columns;
    const [rows, setRows] = React.useState([] as any[]);
    const latestRequestRef = React.useRef(request);
    const latestParamsRef = React.useRef(params);
    const hasObservedInitialParamsRef = React.useRef(false);
    latestRequestRef.current = request;
    latestParamsRef.current = params;
    const serializedParams = JSON.stringify(params ?? {});

    const loadRows = React.useCallback(async () => {
      const requestParams = mockOmitProTableRequestParams
        ? {}
        : { pageSize: 10, current: 1, ...mockVersionRequestOverrides, ...latestParamsRef.current };
      mockLatestProTableRequestParams = requestParams;
      const result = await latestRequestRef.current?.(requestParams, mockVersionSort);
      if (result?.success !== false) {
        setRows(result?.data ?? []);
      }
      return result;
    }, []);

    React.useLayoutEffect(() => {
      const api = {
        reload: loadRows,
        setPageInfo: jest.fn((value) => {
          mockVersionRequestOverrides = { ...mockVersionRequestOverrides, ...value };
        }),
      };
      mockVersionTableApi = api;
      if (actionRef) {
        actionRef.current = api;
      }
    }, [actionRef, loadRows]);

    React.useEffect(() => {
      if (!hasObservedInitialParamsRef.current) {
        hasObservedInitialParamsRef.current = true;
        return;
      }
      void loadRows();
    }, [loadRows, serializedParams]);

    return (
      <div data-testid='pro-table'>
        {toolbar?.search}
        {toolbar?.filter}
        <div>{toolBarRender?.()}</div>
        {rowSelection ? (
          <button
            type='button'
            aria-label='clear-version-selection'
            onClick={() => rowSelection.onChange?.([], undefined)}
          />
        ) : null}
        {rows.map((row: any, rowIndex: number) => {
          const key =
            typeof rowKey === 'function'
              ? rowKey(row, rowIndex)
              : rowKey && row[rowKey]
                ? row[rowKey]
                : rowIndex;

          return (
            <div key={key}>
              {rowSelection ? (
                <input
                  aria-label={`select-version-${row.version}`}
                  checked={rowSelection.selectedRowKeys?.includes(key)}
                  type='radio'
                  onChange={() => rowSelection.onChange?.([key], [row])}
                />
              ) : null}
              {columns.map((column: any, columnIndex: number) => {
                const value = column.dataIndex ? row[column.dataIndex] : undefined;
                return (
                  <div key={`${key}:${column.dataIndex ?? columnIndex}`}>
                    {column.render ? column.render(value, row, rowIndex) : value}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return {
    __esModule: true,
    ActionType: class {},
    ProColumns: class {},
    ProTable,
  };
});

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span>{defaultMessage || id}</span>
  ),
  useLocation: () => ({ pathname: '/test-path' }),
}));

// Mock the view components
jest.mock('@/pages/Contacts/Components/view', () => {
  return function ContactView() {
    return <div data-testid='contact-view'>Contact View</div>;
  };
});

jest.mock('@/pages/Flowproperties/Components/view', () => {
  return function FlowpropertyView() {
    return <div data-testid='flowproperty-view'>Flowproperty View</div>;
  };
});

jest.mock('@/pages/Flows/Components/view', () => {
  return function FlowView() {
    return <div data-testid='flow-view'>Flow View</div>;
  };
});

jest.mock('@/pages/LifeCycleModels/Components/view', () => {
  return function LifeCycleModelView() {
    return <div data-testid='lifecyclemodel-view'>LifeCycle Model View</div>;
  };
});

jest.mock('@/pages/Processes/Components/view', () => {
  return function ProcessView() {
    return <div data-testid='process-view'>Process View</div>;
  };
});

jest.mock('@/pages/Sources/Components/view', () => {
  return function SourceView() {
    return <div data-testid='source-view'>Source View</div>;
  };
});

jest.mock('@/pages/Unitgroups/Components/view', () => {
  return function UnitGroupView() {
    return <div data-testid='unitgroup-view'>Unit Group View</div>;
  };
});

const mockGetAllVersions = getAllVersions as jest.MockedFunction<any>;
const mockGetDataSource = getDataSource as jest.MockedFunction<any>;
const mockAddVersionComponent = jest.fn(({ newVersion }: { newVersion: string }) => (
  <div data-testid='children'>Children Content {newVersion}</div>
));

describe('AllVersionsList Component', () => {
  const defaultProps = {
    searchTableName: 'processes',
    searchColume: 'id',
    id: 'test-id',
    columns: [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Version', dataIndex: 'version', key: 'version' },
    ],
    lang: 'en',
    disabled: false,
    addVersionComponent: mockAddVersionComponent,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLatestProTableRequestParams = null;
    mockOmitProTableRequestParams = false;
    mockLatestVersionColumns = [];
    mockVersionRequestOverrides = {};
    mockVersionSort = {};
    mockVersionTableApi = null;
    mockAddVersionComponent.mockClear();
    mockGetDataSource.mockReturnValue('test-datasource');
    mockGetAllVersions.mockResolvedValue({
      data: [
        { id: '1', version: '1.0.0', name: 'Test Process' },
        { id: '2', version: '2.0.0', name: 'Test Process 2' },
      ],
      success: true,
      total: 2,
    });
  });

  it('uses a fresh independent highest-version baseline when quick classification overtakes the initial unfiltered request', async () => {
    let resolveOldTable: (value: any) => void = () => {};
    let resolveOldBaseline: (value: any) => void = () => {};
    const oldTable = new Promise((resolve) => {
      resolveOldTable = resolve;
    });
    const oldBaseline = new Promise((resolve) => {
      resolveOldBaseline = resolve;
    });
    let baselineCalls = 0;
    mockGetAllVersions.mockImplementation(
      (_column: string, _table: string, _id: string, params: any) => {
        if (params.pageSize === 1) {
          baselineCalls += 1;
          return baselineCalls === 1
            ? oldBaseline
            : Promise.resolve({ data: [{ id: 'test-id', version: '03.00.000' }], success: true });
        }
        return params.classification?.length
          ? Promise.resolve({
              data: [{ id: 'test-id', version: '01.00.005', name: 'Filtered older row' }],
              success: true,
            })
          : oldTable;
      },
    );
    render(<AllVersionsList {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(baselineCalls).toBe(1));
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Classification'), { target: { value: 'C' } });
    await waitFor(() => expect(screen.getByTestId('children')).toHaveTextContent('03.00.001'));
    expect(screen.getByText('Filtered older row')).toBeInTheDocument();
    const baselineRequests = mockGetAllVersions.mock.calls.filter(
      (args: any[]) => args[3].pageSize === 1,
    );
    expect(baselineRequests.map((args: any[]) => args[3])).toEqual([
      { current: 1, pageSize: 1 },
      { current: 1, pageSize: 1 },
    ]);
    expect(baselineRequests.map((args: any[]) => args[4])).toEqual([
      { version: 'descend' },
      { version: 'descend' },
    ]);
    await act(async () => {
      resolveOldBaseline({ data: [{ id: 'test-id', version: '04.00.000' }], success: true });
      resolveOldTable({
        data: [{ id: 'test-id', version: '04.00.000', name: 'Stale unfiltered row' }],
        success: true,
      });
      await Promise.all([oldTable, oldBaseline]);
    });
    expect(screen.getByTestId('children')).toHaveTextContent('03.00.001');
    expect(screen.queryByText('Stale unfiltered row')).not.toBeInTheDocument();
    expect(
      mockAddVersionComponent.mock.calls.every(([props]) => props.newVersion !== '00.00.000'),
    ).toBe(true);
  });

  it('keeps the complete scope maximum when table paging or ascending sort returns older versions', async () => {
    mockGetAllVersions.mockImplementation(
      async (_column: string, _table: string, _id: string, params: any) => ({
        data: [{ id: 'test-id', version: params.pageSize === 1 ? '03.00.000' : '01.00.005' }],
        success: true,
      }),
    );
    render(<AllVersionsList {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByTestId('children')).toHaveTextContent('03.00.001'));
    mockVersionRequestOverrides = { current: 2, pageSize: 20 };
    mockVersionSort = { version: 'ascend' };
    await act(async () => {
      await mockVersionTableApi?.reload();
    });
    expect(mockGetAllVersions).toHaveBeenCalledWith(
      'id',
      'processes',
      'test-id',
      { current: 1, pageSize: 1 },
      { version: 'descend' },
      'en',
      'test-datasource',
      undefined,
    );
    expect(mockGetAllVersions).toHaveBeenLastCalledWith(
      'id',
      'processes',
      'test-id',
      expect.objectContaining({ current: 2, pageSize: 20 }),
      { version: 'ascend' },
      'en',
      'test-datasource',
      undefined,
    );
    expect(screen.getByTestId('children')).toHaveTextContent('03.00.001');
  });

  it.each(['failure', 'empty', 'missing', 'invalid', 'rejection'])(
    'does not guess a create-version value when the independent baseline is %s',
    async (mode) => {
      mockGetAllVersions.mockImplementation(
        async (_column: string, _table: string, _id: string, params: any) => {
          if (params.pageSize !== 1)
            return {
              data: [{ id: 'test-id', version: '01.00.005', name: 'Table remains usable' }],
              success: true,
            };
          if (mode === 'rejection') throw new Error('baseline failed');
          return mode === 'failure'
            ? { data: [], success: false }
            : mode === 'missing'
              ? { success: true }
              : mode === 'invalid'
                ? { data: [{ version: 'not-a-version' }], success: true }
                : { data: [], success: true };
        },
      );
      render(<AllVersionsList {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Table remains usable');
      expect(screen.queryByTestId('children')).not.toBeInTheDocument();
      expect(mockAddVersionComponent).not.toHaveBeenCalled();
    },
  );

  it('clears and invalidates a pending creation baseline on close and obtains a fresh value after reopening', async () => {
    let resolveOld: (value: any) => void = () => {};
    const old = new Promise((resolve) => {
      resolveOld = resolve;
    });
    let calls = 0;
    mockGetAllVersions.mockImplementation(
      (_column: string, _table: string, _id: string, params: any) => {
        if (params.pageSize === 1) {
          calls += 1;
          return calls === 1
            ? old
            : Promise.resolve({ data: [{ version: '05.00.000' }], success: true });
        }
        return Promise.resolve({ data: [{ id: 'test-id', version: '01.00.005' }], success: true });
      },
    );
    render(<AllVersionsList {...defaultProps} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    await waitFor(() => expect(calls).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));
    await act(async () => {
      resolveOld({ data: [{ version: '03.00.000' }], success: true });
      await old;
    });
    expect(mockAddVersionComponent).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByTestId('children')).toHaveTextContent('05.00.001'));
  });

  it('rejects a pending baseline after changing the dataset identity and source scope', async () => {
    let resolveOld: (value: any) => void = () => {};
    const old = new Promise((resolve) => {
      resolveOld = resolve;
    });
    mockGetAllVersions.mockImplementation(
      (_column: string, _table: string, datasetId: string, params: any) => {
        if (params.pageSize === 1 && datasetId === 'test-id') return old;
        return Promise.resolve({
          data: [{ id: datasetId, version: datasetId === 'new-id' ? '02.00.000' : '01.00.005' }],
          success: true,
        });
      },
    );
    const view = render(<AllVersionsList {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockGetAllVersions).toHaveBeenCalledTimes(2));
    view.rerender(
      <AllVersionsList
        {...defaultProps}
        id='new-id'
        searchTableName='flows'
        dataSource='te'
        stateCode={20}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('children')).toHaveTextContent('02.00.001'));
    expect(mockGetAllVersions).toHaveBeenCalledWith(
      'id',
      'flows',
      'new-id',
      { current: 1, pageSize: 1 },
      { version: 'descend' },
      'en',
      'te',
      20,
    );
    await act(async () => {
      resolveOld({ data: [{ version: '09.00.000' }], success: true });
      await old;
    });
    expect(screen.getByTestId('children')).toHaveTextContent('02.00.001');
  });

  it('recovers the creation baseline after a failed load and refreshes it after reload', async () => {
    let version: string | null = null;
    mockGetAllVersions.mockImplementation(
      async (_column: string, _table: string, _id: string, params: any) => {
        if (params.pageSize === 1)
          return version ? { data: [{ version }], success: true } : { success: false };
        return {
          data: [{ id: 'test-id', version: '01.00.005', name: 'Reloadable table' }],
          success: true,
        };
      },
    );
    render(<AllVersionsList {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('Reloadable table');
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
    version = '03.00.000';
    await act(async () => {
      await mockVersionTableApi?.reload();
    });
    expect(screen.getByTestId('children')).toHaveTextContent('03.00.001');
    version = '04.00.000';
    await act(async () => {
      await mockVersionTableApi?.reload();
    });
    expect(screen.getByTestId('children')).toHaveTextContent('04.00.001');
  });

  it('forwards classification to the complete version query, clears selection, and retains the unfiltered new-version baseline', async () => {
    const baseline = { id: 'test-id', version: '03.00.000', name: 'Newest' };
    const older = { id: 'test-id', version: '01.00.000', name: 'Older match' };
    mockGetAllVersions.mockImplementation(
      async (
        _column: string,
        _table: string,
        _id: string,
        params: { classification?: unknown[] },
      ) => ({
        data: params.classification?.length ? [older] : [baseline],
        total: 1,
        success: true,
      }),
    );
    render(<AllVersionsList {...defaultProps} onSelectVersion={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByLabelText('select-version-03.00.000')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByLabelText('select-version-03.00.000'));
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText('Classification'), { target: { value: 'C' } });
    await waitFor(() =>
      expect(screen.getByLabelText('select-version-01.00.000')).toBeInTheDocument(),
    );
    expect(mockGetAllVersions).toHaveBeenLastCalledWith(
      'id',
      'processes',
      'test-id',
      expect.objectContaining({
        classification: [{ scope: 'classification', code: 'C', path: ['C'] }],
      }),
      expect.any(Object),
      'en',
      'test-datasource',
      undefined,
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(mockAddVersionComponent).toHaveBeenLastCalledWith({ newVersion: '03.00.001' });
  });

  it.each([
    'processes',
    'flows',
    'lifecyclemodels',
    'contacts',
    'sources',
    'flowproperties',
    'unitgroups',
  ])('limits %s version drawer sort controls to database version/date fields', async (table) => {
    const columns = [
      { title: 'Name', dataIndex: 'name', sorter: true },
      {
        title: 'Classification',
        dataIndex: 'classification',
        sorter: true,
        defaultSortOrder: 'ascend' as const,
        sortOrder: 'descend' as const,
      },
      { title: 'Version', dataIndex: 'version', sorter: true },
      { title: 'Modified', dataIndex: 'modifiedAt', sorter: false },
      { title: 'Created', dataIndex: 'createdAt', sorter: true },
    ];
    render(<AllVersionsList {...defaultProps} searchTableName={table} columns={columns} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockLatestVersionColumns).toHaveLength(9));
    expect(mockLatestVersionColumns.slice(0, 6).map((column) => column.dataIndex)).toEqual([
      'index',
      'name',
      'location',
      'referenceYear',
      'dataType',
      'version',
    ]);
    expect(mockLatestVersionColumns.some((column) => column.dataIndex === 'classification')).toBe(
      false,
    );
    expect(mockLatestVersionColumns.find((column) => column.dataIndex === 'name')?.sorter).toBe(
      false,
    );
    expect(mockLatestVersionColumns.find((column) => column.dataIndex === 'version')?.sorter).toBe(
      true,
    );
    expect(
      mockLatestVersionColumns.find((column) => column.dataIndex === 'modifiedAt')?.sorter,
    ).toBe(false);
    expect(
      mockLatestVersionColumns.find((column) => column.dataIndex === 'createdAt')?.sorter,
    ).toBe(true);
    expect(columns[0].sorter).toBe(true);
    expect(columns[2].sorter).toBe(true);
  });

  it('should render correctly with given props', () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(mockGetDataSource).toHaveBeenCalledWith('/test-path');
  });

  it('should default disabled to false when the prop is omitted', () => {
    const propsWithoutDisabled = Object.fromEntries(
      Object.entries(defaultProps).filter(([key]) => key !== 'disabled'),
    ) as typeof defaultProps;

    render(
      <ConfigProvider>
        <AllVersionsList {...propsWithoutDisabled} />
      </ConfigProvider>,
    );

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should render disabled button when disabled prop is true', () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} disabled={true} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show tooltip with correct text', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.mouseOver(button);

    await waitFor(() => {
      expect(screen.getByText('All Versions')).toBeInTheDocument();
    });
  });

  it('should open drawer when button is clicked', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('All Versions')).toBeInTheDocument();
    expect(await screen.findByTestId('children')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
    });
  });

  it('should close drawer when close button is clicked', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Drawer should be open
    expect(screen.getByRole('dialog')).toBeVisible();

    const closeButton = screen.getByRole('button', { name: /^close$/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close the drawer through the Drawer onClose handler as well', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should not open drawer when button is disabled', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} disabled={true} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    await waitFor(() => expect(button).toBeDisabled());
    button.click();

    expect(screen.queryByText('All version')).not.toBeInTheDocument();
  });

  it('should render correct icon', () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // The BarsOutlined icon should be present
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should have correct button attributes', () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // Check if button has the expected classes instead of HTML attributes
    expect(button).toHaveClass('ant-btn-circle');
    expect(button).toHaveClass('ant-btn-sm');
  });

  it('should render ProcessView for processes table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='processes' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('process-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should render FlowView for flows table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='flows' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('flow-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should render LifeCycleModelView for lifecyclemodels table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='lifecyclemodels' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('lifecyclemodel-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should render FlowpropertyView for flowproperties table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='flowproperties' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('flowproperty-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should render UnitGroupView for unitgroups table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='unitgroups' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('unitgroup-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should render SourceView for sources table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='sources' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('source-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should use a custom operation renderer when provided', async () => {
    const operationRender = jest.fn((row) => (
      <div data-testid='custom-operation'>{`custom:${row.id}:${row.version}`}</div>
    ));

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} operationRender={operationRender} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const operations = await screen.findAllByTestId('custom-operation');
    expect(operations[0]).toHaveTextContent('custom:1:1.0.0');
    expect(operationRender).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', version: '1.0.0' }),
      expect.objectContaining({ actionRef: expect.any(Object) }),
    );
    expect(screen.queryByTestId('process-view')).not.toBeInTheDocument();
  });

  it('should render ContactView for contacts table', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='contacts' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const views = await screen.findAllByTestId('contact-view');
    expect(views.length).toBeGreaterThan(0);
  });

  it('should render null for unknown table type', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} searchTableName='unknown' />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test Process')).toBeInTheDocument();
      expect(screen.queryByTestId('process-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('flow-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('lifecyclemodel-view')).not.toBeInTheDocument();
    });
  });

  it('should call getAllVersions with correct parameters', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalledWith(
        'id',
        'processes',
        'test-id',
        expect.objectContaining({
          pageSize: 10,
          current: 1,
        }),
        expect.any(Object),
        'en',
        'test-datasource',
        undefined,
      );
    });
  });

  it('uses content-language and pagination defaults when ProTable omits its request params', async () => {
    mockOmitProTableRequestParams = true;

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalledWith(
        'id',
        'processes',
        'test-id',
        { pageSize: 50, current: 1 },
        {},
        'en',
        'test-datasource',
        undefined,
      );
    });
    expect(mockLatestProTableRequestParams).toEqual({});
  });

  it('refetches open rows from params for every supported content language without clearing selection', async () => {
    const onSelectVersion = jest.fn();
    const { rerender } = render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} onSelectVersion={onSelectVersion} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByLabelText('select-version-1.0.0')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('select-version-1.0.0'));
    expect(screen.getByLabelText('select-version-1.0.0')).toBeChecked();

    for (const contentLanguage of SUPPORTED_CONTENT_LANGUAGES.filter(
      (candidate) => candidate !== defaultProps.lang,
    )) {
      const previousCallCount = mockGetAllVersions.mock.calls.length;
      rerender(
        <ConfigProvider>
          <AllVersionsList
            {...defaultProps}
            lang={contentLanguage}
            onSelectVersion={onSelectVersion}
          />
        </ConfigProvider>,
      );

      await waitFor(() => {
        expect(mockGetAllVersions.mock.calls.length).toBeGreaterThan(previousCallCount);
        expect(mockGetAllVersions).toHaveBeenLastCalledWith(
          'id',
          'processes',
          'test-id',
          expect.objectContaining({
            current: 1,
            pageSize: 10,
          }),
          expect.any(Object),
          contentLanguage,
          'test-datasource',
          undefined,
        );
      });
      expect(mockLatestProTableRequestParams).toEqual(
        expect.objectContaining({ contentLanguage, current: 1, pageSize: 10 }),
      );
      expect(screen.getByLabelText('select-version-1.0.0')).toBeChecked();
    }
  });

  it('keeps the newest locale rows when an older locale request resolves last', async () => {
    let resolveEnglish!: (value: {
      data: Array<{ id: string; version: string; name: string }>;
      success: boolean;
      total: number;
    }) => void;
    let resolveFrench!: typeof resolveEnglish;

    mockGetAllVersions.mockImplementation((...args: unknown[]) => {
      const contentLanguage = args[5];
      return new Promise((resolve) => {
        if (contentLanguage === 'fr') {
          resolveFrench = resolve;
          return;
        }
        resolveEnglish = resolve;
      });
    });

    const { rerender } = render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} addVersionComponent={undefined} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(resolveEnglish).toBeDefined());

    rerender(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} addVersionComponent={undefined} lang='fr' />
      </ConfigProvider>,
    );
    await waitFor(() => expect(resolveFrench).toBeDefined());

    await act(async () => {
      resolveFrench({
        data: [{ id: 'fr-current', version: '2.0.0', name: 'French current row' }],
        success: true,
        total: 1,
      });
    });
    expect(await screen.findByText('French current row')).toBeInTheDocument();

    await act(async () => {
      resolveEnglish({
        data: [{ id: 'en-stale', version: '1.0.0', name: 'English stale row' }],
        success: true,
        total: 1,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('French current row')).toBeInTheDocument();
      expect(screen.queryByText('English stale row')).not.toBeInTheDocument();
    });
  });

  it('should allow callers to override the data source for embedded selectors', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} dataSource='te' />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalledWith(
        'id',
        'processes',
        'test-id',
        expect.objectContaining({
          pageSize: 10,
          current: 1,
        }),
        expect.any(Object),
        'en',
        'te',
        undefined,
      );
    });
  });

  it('should pass an exact state-code filter for owner-draft selectors', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} dataSource='my' stateCode={0} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalledWith(
        'id',
        'processes',
        'test-id',
        expect.objectContaining({
          pageSize: 10,
          current: 1,
        }),
        expect.any(Object),
        'en',
        'my',
        0,
      );
    });
  });

  it('should submit a selected version through radio selection mode', async () => {
    const onSelectVersion = jest.fn();

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} onSelectVersion={onSelectVersion} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();

    const radios = await screen.findAllByRole('radio');
    fireEvent.click(radios[0]);
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    expect(onSelectVersion).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', version: '1.0.0' }),
    );
  });

  it('should ignore submit when radio selection has been cleared', async () => {
    const onSelectVersion = jest.fn();

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} onSelectVersion={onSelectVersion} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    fireEvent.click(screen.getByRole('button', { name: 'clear-version-selection' }));

    expect(submitButton).toBeDisabled();

    const forcedSubmitButton = submitButton as HTMLButtonElement;
    forcedSubmitButton.disabled = false;
    fireEvent.click(forcedSubmitButton);

    expect(onSelectVersion).not.toHaveBeenCalled();
  });

  it('should render children content in toolbar', async () => {
    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('children')).toBeInTheDocument();
    });
    expect(mockAddVersionComponent).toHaveBeenCalled();
  });

  it('should render an empty toolbar when no add version component is provided', async () => {
    const propsWithoutAddVersion = Object.fromEntries(
      Object.entries(defaultProps).filter(([key]) => key !== 'addVersionComponent'),
    ) as Omit<typeof defaultProps, 'addVersionComponent'>;

    render(
      <ConfigProvider>
        <AllVersionsList {...propsWithoutAddVersion} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
    expect(mockAddVersionComponent).not.toHaveBeenCalled();
  });

  it('should place create-version popups in the document body', () => {
    expect(getCreateVersionPopupContainer()).toBe(document.body);
  });

  it('should size the operation column for default and custom actions', () => {
    expect(getAllVersionsOperationColumnWidth()).toBe(88);
    expect(getAllVersionsOperationColumnWidth(undefined, true)).toBe(216);
    expect(getAllVersionsOperationColumnWidth(184, true)).toBe(184);
  });

  it('should compute the next version from the highest loaded version after reopening', async () => {
    mockGetAllVersions.mockResolvedValue({
      data: [
        { id: '1', version: '01.00.001', name: 'Older Version' },
        { id: '2', version: '01.00.010', name: 'Latest Version' },
      ],
      success: true,
      total: 2,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));

    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockAddVersionComponent).toHaveBeenLastCalledWith({ newVersion: '01.00.011' });
    });
  });

  it('should roll over patch and minor versions when the current max version reaches limits', async () => {
    mockGetAllVersions.mockResolvedValue({
      data: [{ id: '1', version: '01.99.999', name: 'Boundary Version' }],
      success: true,
      total: 1,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockAddVersionComponent).toHaveBeenLastCalledWith({ newVersion: '02.00.000' });
    });
  });

  it('should keep the current max version when later rows compare lower than the first version', async () => {
    mockGetAllVersions.mockResolvedValue({
      data: [
        { id: '1', version: '03.00.000', name: 'Highest Version' },
        { id: '2', version: '02.99.999', name: 'Lower Version' },
      ],
      success: true,
      total: 2,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockAddVersionComponent).toHaveBeenLastCalledWith({ newVersion: '03.00.001' });
    });
  });

  it('should keep the same max version when later rows compare equal before incrementing the patch', async () => {
    mockGetAllVersions.mockResolvedValue({
      data: [
        { id: '1', version: '03.00.000', name: 'Duplicate Highest Version A' },
        { id: '2', version: '3.0.0', name: 'Duplicate Highest Version B' },
      ],
      success: true,
      total: 2,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockAddVersionComponent).toHaveBeenLastCalledWith({ newVersion: '03.00.001' });
    });
  });

  it('should roll over only the patch version into the next minor version when needed', async () => {
    mockGetAllVersions.mockResolvedValue({
      data: [{ id: '1', version: '01.02.999', name: 'Patch Boundary Version' }],
      success: true,
      total: 1,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close-handler' }));
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockAddVersionComponent).toHaveBeenLastCalledWith({ newVersion: '01.03.000' });
    });
  });

  it('hides creation when the global source has no version rows', async () => {
    mockGetAllVersions.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
      expect(screen.queryByTestId('children')).not.toBeInTheDocument();
      expect(mockAddVersionComponent).not.toHaveBeenCalled();
    });
  });

  it('hides creation when the global version response omits its data array', async () => {
    mockGetAllVersions.mockResolvedValue({
      success: true,
      total: 0,
    });

    render(
      <ConfigProvider>
        <AllVersionsList {...defaultProps} />
      </ConfigProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockGetAllVersions).toHaveBeenCalled();
      expect(screen.queryByTestId('children')).not.toBeInTheDocument();
      expect(mockAddVersionComponent).not.toHaveBeenCalled();
    });
  });
});

jest.mock('@/components/DatasetClassificationFilter', () => ({
  __esModule: true,
  default: ({ value = [], onChange }: any) => (
    <select
      aria-label='Classification'
      value={value[0]?.code ?? ''}
      onChange={(event) =>
        onChange(
          event.target.value
            ? [{ scope: 'classification', code: event.target.value, path: [event.target.value] }]
            : [],
        )
      }
    >
      <option value=''>All classifications</option>
      <option value='C'>Classification C</option>
    </select>
  ),
}));
