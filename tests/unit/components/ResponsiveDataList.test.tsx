import {
  DATA_LIST_ACTION_SPACE_CLASS_NAME,
  DATA_LIST_COLUMN_RESPONSIVE,
  ResponsiveDataListActions,
  ResponsiveDataListToolbarMore,
  dataListActionColumn,
  dataListIndexColumn,
  dataListText,
  dataListTooltipContent,
  dataListTextColumn,
  dataListPagination,
  dataListTabProps,
  getDataListToolbar,
  getDataListScrollX,
  orderDataListColumns,
  responsiveDataListTableProps,
  responsiveSearchCardClassName,
  responsiveSearchExtraColProps,
  responsiveSearchPrimaryColProps,
  responsiveSearchRowProps,
  useResponsiveDataListMobile,
} from '@/components/ResponsiveDataList';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { processtypeOfDataSetOptions } from '@/pages/Processes/Components/optiondata';
import deProcess from '@/locales/de-DE/pages_process';
import frProcess from '@/locales/fr-FR/pages_process';
import { Grid } from 'antd';

const mockRealIntl = jest.requireActual(
  require.resolve('react-intl', {
    paths: [
      require.resolve('@umijs/plugins/package.json', {
        paths: [require.resolve('@umijs/max/package.json')],
      }),
    ],
  }),
);
let mockNativeHover = false;
jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: any) =>
    mockNativeHover ? (
      <mockRealIntl.FormattedMessage id={id} defaultMessage={defaultMessage} />
    ) : (
      <span data-message={id}>{defaultMessage}</span>
    ),
}));

let mockBreakpointScreens: Record<string, boolean | undefined> = {};
const mockUseBreakpoint = jest.fn(() => mockBreakpointScreens);

jest.mock('antd', () => ({
  Grid: {
    useBreakpoint: () => mockUseBreakpoint(),
  },
  Space: ({ children, className, size }: any) => (
    <div className={className} data-size={size} data-testid='action-space'>
      {children}
    </div>
  ),
  Tooltip: ({ children, placement, title }: any) => {
    if (mockNativeHover) {
      const NativeTooltip = jest.requireActual('antd').Tooltip;
      return (
        <NativeTooltip placement={placement} title={title}>
          {children}
        </NativeTooltip>
      );
    }
    return (
      <span data-placement={placement} data-testid='tooltip' data-title={String(title)}>
        {children}
      </span>
    );
  },
  theme: {
    useToken: () => ({ token: { colorPrimary: 'rgb(22, 119, 255)' } }),
  },
}));

jest.mock('@ant-design/pro-components', () => ({
  TableDropdown: ({ className, menus = [], style }: any) => (
    <div className={className} data-testid='table-dropdown' style={style}>
      {menus.map((menu: any) => (
        <div data-menu-key={menu.key} key={menu.key}>
          {menu.name}
        </div>
      ))}
    </div>
  ),
}));

describe('ResponsiveDataList helpers', () => {
  beforeEach(() => {
    mockBreakpointScreens = {};
    mockUseBreakpoint.mockClear();
    mockNativeHover = false;
  });

  it('keeps collapsed native tabs in the closest dialog stacking context', () => {
    const outer = document.createElement('div');
    outer.setAttribute('role', 'dialog');
    const inner = document.createElement('div');
    inner.setAttribute('role', 'dialog');
    const trigger = document.createElement('button');
    inner.append(trigger);
    outer.append(inner);
    document.body.append(outer);
    expect(dataListTabProps?.getPopupContainer?.(trigger)).toBe(inner);
    outer.remove();
    expect(dataListTabProps?.getPopupContainer?.(document.createElement('button'))).toBe(
      document.body,
    );
  });

  it('provides shared responsive table and search props', () => {
    expect(DATA_LIST_COLUMN_RESPONSIVE).toEqual({
      desktop: ['lg'],
      tablet: ['md'],
      wide: ['xl'],
    });
    expect(responsiveDataListTableProps).toEqual({
      cardProps: {
        classNames: {
          body: 'responsive-data-list-card-body',
          root: 'responsive-data-list-card',
        },
      },
      className: 'responsive-data-list-table',
      classNames: {
        body: { cell: 'responsive-data-list-body-cell' },
        content: 'responsive-data-list-table-scroll',
        header: { cell: 'responsive-data-list-header-cell' },
        root: 'responsive-data-list-table-root',
      },
      scroll: { x: 'max-content' },
      tableLayout: 'fixed',
      toolbar: {
        className: 'responsive-data-list-toolbar',
      },
    });
    expect(responsiveDataListTableProps.toolbar).not.toHaveProperty('prefixCls');
    expect(responsiveSearchCardClassName).toBe('responsive-data-list-search-card');
    expect(responsiveSearchRowProps).toEqual({ align: 'middle' });
    expect(responsiveSearchPrimaryColProps).toEqual({
      className: 'responsive-data-list-search-primary',
      flex: 'auto',
      style: { marginRight: '10px' },
    });
    expect(responsiveSearchExtraColProps).toEqual({
      className: 'responsive-data-list-search-extra',
      flex: 'none',
    });
  });

  it('builds standard table column props', () => {
    expect(dataListIndexColumn()).toEqual({
      align: 'center',
      search: false,
      width: 72,
    });
    expect(dataListTextColumn(240, DATA_LIST_COLUMN_RESPONSIVE.desktop)).toEqual({
      ellipsis: true,
      responsive: ['lg'],
      width: 240,
    });
    expect(dataListActionColumn()).toEqual({
      align: 'center',
      className: 'responsive-data-list-action-column',
      fixed: 'right',
      search: false,
      width: 184,
    });
    expect(dataListActionColumn(224)).toEqual({
      align: 'center',
      className: 'responsive-data-list-action-column',
      fixed: 'right',
      search: false,
      width: 224,
    });
  });

  it('uses server pagination with larger selectable pages and native toolbar filters', () => {
    expect(dataListPagination).toEqual({
      defaultPageSize: 50,
      showSizeChanger: true,
      pageSizeOptions: [20, 50, 100],
    });
    const onSearch = jest.fn();
    const filter = <button type='button'>Classification</button>;
    expect(getDataListToolbar({ search: { onSearch }, filter })).toEqual({
      className: 'responsive-data-list-toolbar',
      search: { onSearch },
      filter,
    });
    expect(getDataListToolbar()).toEqual(responsiveDataListTableProps.toolbar);
  });

  it('orders dataset aliases, removes classification and preserves exact version renderers', () => {
    const versionRenderer = jest.fn();
    const columns: any[] = [
      { dataIndex: 'option', valueType: 'option' },
      { dataIndex: 'CASNumber' },
      { dataIndex: 'version', render: versionRenderer },
      { dataIndex: 'classification' },
      { dataIndex: 'flowType', responsive: ['lg'] },
      { dataIndex: 'locationOfSupply', responsive: ['xl'] },
      { dataIndex: 'shortName' },
      { valueType: 'index' },
    ];
    const ordered = orderDataListColumns<any>(columns, {
      pagination: { current: 3, pageSize: 20 },
      titles: { name: 'Dataset name' },
    });
    expect(ordered.map((column) => column.dataIndex)).toEqual([
      'index',
      'shortName',
      'locationOfSupply',
      'referenceYear',
      'flowType',
      'version',
      'CASNumber',
      'option',
    ]);
    render(<>{ordered[1].title as React.ReactNode}</>);
    expect(screen.getByText('Dataset name')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', 'Dataset name');
    expect(ordered[2].responsive).toBeUndefined();
    expect(ordered[5].render).toBe(versionRenderer);
    expect(ordered[0].render?.(null, {}, 4, {} as any, {} as any)).toBe(45);
    expect(columns).toHaveLength(8);
  });

  it('preserves the shared toolbar layout class and native control callbacks with a caller class', () => {
    const onSearch = jest.fn();
    const onFilter = jest.fn();
    const onReload = jest.fn();
    const search = { onSearch };
    const filter = (
      <button type='button' onClick={onFilter}>
        Classification
      </button>
    );
    const actions = [
      <button key='create' type='button'>
        Create
      </button>,
    ];
    const settings = [{ key: 'reload', icon: <span>Reload</span>, onClick: onReload }];
    const style = { width: '100%' };
    const toolbar = getDataListToolbar({
      className: 'model-results-toolbar',
      title: 'Sub products',
      search,
      filter,
      actions,
      settings,
      style,
      multipleLine: false,
    });
    expect(toolbar.className).toBe('responsive-data-list-toolbar model-results-toolbar');
    expect(toolbar.title).toBe('Sub products');
    expect(toolbar.search).toBe(search);
    expect(toolbar.filter).toBe(filter);
    expect(toolbar.actions).toBe(actions);
    expect(toolbar.settings).toBe(settings);
    expect(toolbar.style).toBe(style);
    expect(toolbar.multipleLine).toBe(false);
    expect(responsiveDataListTableProps.toolbar.className).toBe('responsive-data-list-toolbar');
    expect(onSearch).not.toHaveBeenCalled();
    expect(onFilter).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('adds explicit unavailable fields and an entity type without guessing missing metadata', () => {
    const ordered = orderDataListColumns<any>([{ dataIndex: 'name' }], { dataType: 'Model' });
    render(
      <>
        {ordered[2].render?.(null, {}, 0, {} as any, {} as any)}
        {ordered[3].render?.(null, {}, 0, {} as any, {} as any)}
        {ordered[4].render?.(null, {}, 0, {} as any, {} as any)}
        {ordered[1].render?.('-', {}, 0, {} as any, {} as any)}
      </>,
    );
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByText('Model')).toBeInTheDocument();
    const defaults = orderDataListColumns<any>([]);
    const { container } = render(<>{defaults[4].render?.(null, {}, 0, {} as any, {} as any)}</>);
    expect(container).toHaveTextContent('—');
    expect(defaults[0].render).toBeUndefined();
    const paged = orderDataListColumns<any>([], { pagination: {} });
    expect(paged[0].render?.(null, {}, 2, {} as any, {} as any)).toBe(3);
  });

  it('renders actual Flow selector metadata when the caller has omitted its base columns', () => {
    const ordered = orderDataListColumns<any>([], { dataType: 'Flow' });
    const row = {
      shortName: 'Short flow name',
      baseName: 'Base flow name',
      locationOfSupply: 'China',
      referenceYear: 2025,
      typeOfDataSet: 'Product flow',
      datasetKind: 'flow',
      version: '01.00.002',
    };
    render(
      <>
        {ordered.slice(1).map((column, index) => (
          <div key={String(column.dataIndex)}>
            {column.render?.('-', row, index, {} as any, {} as any) as React.ReactNode}
          </div>
        ))}
      </>,
    );
    expect(screen.getByText('Short flow name')).toBeInTheDocument();
    expect(screen.queryByText('Base flow name')).not.toBeInTheDocument();
    expect(screen.getByText('China')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('Product flow')).toBeInTheDocument();
    expect(screen.queryByText('Flow')).not.toBeInTheDocument();
    expect(screen.getByText('01.00.002')).toBeInTheDocument();
  });

  it('reads synthesized aliases in priority order while preserving the caller primary name column', () => {
    const synthesized = orderDataListColumns<any>([]);
    const row = {
      name: 'Full contact name',
      shortName: 'Contact abbreviation',
      location: 'Germany',
      locationOfSupply: 'China',
      dataType: 'Primary type',
      datasetType: 'Other type',
      typeOfDataSet: 'Business type',
      flowType: 'Flow subtype',
    };
    const nameRenderer = jest.fn(() => <span>Caller short name</span>);
    const versionRenderer = jest.fn(() => <button type='button'>Exact version action</button>);
    const preserved = orderDataListColumns<any>([
      { dataIndex: 'shortName', render: nameRenderer },
      { dataIndex: 'name' },
      { dataIndex: 'version', render: versionRenderer },
    ]);
    render(
      <>
        {synthesized[1].render?.('-', row, 0, {} as any, {} as any)}
        {synthesized[2].render?.('-', row, 0, {} as any, {} as any)}
        {synthesized[4].render?.('-', row, 0, {} as any, {} as any)}
      </>,
    );
    expect(screen.getByText('Full contact name')).toBeInTheDocument();
    expect(screen.queryByText('Contact abbreviation')).not.toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.queryByText('China')).not.toBeInTheDocument();
    expect(screen.getByText('Primary type')).toBeInTheDocument();
    expect(preserved[1].dataIndex).toBe('shortName');
    expect(preserved[1].render).toBe(nameRenderer);
    expect(preserved[5].render).toBe(versionRenderer);
  });

  it.each(['', ' ', '-', '—', 'undefined', null, undefined])(
    'treats %s as absent metadata and uses later aliases or explicit fallbacks',
    (missing) => {
      const ordered = orderDataListColumns<any>([], { dataType: 'Model' });
      const row = {
        name: missing,
        shortName: missing,
        baseName: 'Usable name',
        location: missing,
        locationOfSupply: 'Usable location',
        referenceYear: missing,
        dataType: missing,
        typeOfDataSet: missing,
        version: missing,
      };
      render(
        <>
          {ordered.slice(1).map((column, index) => (
            <div key={String(column.dataIndex)}>
              {column.render?.('-', row, index, {} as any, {} as any) as React.ReactNode}
            </div>
          ))}
        </>,
      );
      expect(screen.getByText('Usable name')).toBeInTheDocument();
      expect(screen.getByText('Usable location')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getAllByText('—')).toHaveLength(2);
    },
  );

  it('keeps numeric zero and alternate synthesized type values available', () => {
    const ordered = orderDataListColumns<any>([]);
    const { rerender } = render(
      <>
        {ordered[3].render?.('-', { referenceYear: 0 }, 0, {} as any, {} as any)}
        {ordered[4].render?.('-', { flowType: 'Elementary flow' }, 0, {} as any, {} as any)}
      </>,
    );
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Elementary flow')).toBeInTheDocument();
    rerender(<>{ordered[4].render?.('-', { datasetKind: 'contact' }, 0, {} as any, {} as any)}</>);
    expect(screen.getByText('contact')).toBeInTheDocument();
    rerender(<>{ordered[4].render?.('-', null, 0, {} as any, {} as any)}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('detects mobile data-list breakpoints defensively', () => {
    mockBreakpointScreens = { md: false };
    expect(useResponsiveDataListMobile()).toBe(true);
    expect(mockUseBreakpoint).toHaveBeenCalledTimes(1);

    mockBreakpointScreens = { md: true };
    expect(useResponsiveDataListMobile()).toBe(false);

    mockBreakpointScreens = {};
    expect(useResponsiveDataListMobile()).toBe(false);

    const originalUseBreakpoint = Grid.useBreakpoint;
    delete (Grid as any).useBreakpoint;
    expect(useResponsiveDataListMobile()).toBe(false);
    Grid.useBreakpoint = originalUseBreakpoint;
  });

  it('renders row actions inline on desktop', () => {
    render(
      <ResponsiveDataListActions
        isMobile={false}
        moreMenus={[{ key: 'archive', name: <span>Archive</span> }]}
      >
        <button type='button'>Edit</button>
        {false}
        <button type='button'>View</button>
      </ResponsiveDataListActions>,
    );

    expect(screen.getByTestId('action-space')).toHaveClass(DATA_LIST_ACTION_SPACE_CLASS_NAME);
    expect(screen.getByTestId('action-space')).toHaveAttribute('data-size', 'small');
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByTestId('table-dropdown')).toHaveStyle({ color: 'rgb(22, 119, 255)' });
  });

  it('omits the desktop more menu when there are no additional actions', () => {
    render(
      <ResponsiveDataListActions isMobile={false}>
        <button type='button'>Only action</button>
      </ResponsiveDataListActions>,
    );

    expect(screen.getByText('Only action')).toBeInTheDocument();
    expect(screen.queryByTestId('table-dropdown')).not.toBeInTheDocument();
  });

  it('collapses row actions into one dropdown on mobile', () => {
    render(
      <ResponsiveDataListActions
        isMobile
        moreMenus={[{ key: 'delete', name: <span>Delete</span> }]}
      >
        <button type='button'>Edit</button>
        <button type='button'>View</button>
      </ResponsiveDataListActions>,
    );

    expect(screen.queryByTestId('action-space')).not.toBeInTheDocument();
    expect(screen.getByTestId('table-dropdown').parentElement).toHaveClass(
      'responsive-data-list-more-action',
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('returns no toolbar dropdown when there are no toolbar actions', () => {
    const { container } = render(
      <ResponsiveDataListToolbarMore>{null}</ResponsiveDataListToolbarMore>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders toolbar actions in a dropdown', () => {
    const { container } = render(
      <ResponsiveDataListToolbarMore>
        <button type='button'>Import</button>
        {undefined}
        <button type='button'>Calculate</button>
      </ResponsiveDataListToolbarMore>,
    );

    expect(
      container.querySelector('.responsive-data-list-toolbar-more-action'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('table-dropdown')).toHaveClass('responsive-data-list-more-action');
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Calculate')).toBeInTheDocument();
  });

  it('normalizes empty display text and keeps primitive titles', () => {
    const { rerender } = render(<>{dataListText(undefined)}</>);
    expect(screen.getByText('-')).toHaveAttribute('title', '-');

    rerender(<>{dataListText(null)}</>);
    expect(screen.getByText('-')).toHaveAttribute('title', '-');

    rerender(<>{dataListText('')}</>);
    expect(screen.getByText('-')).toHaveAttribute('title', '-');

    rerender(<>{dataListText('undefined')}</>);
    expect(screen.getByText('-')).toHaveAttribute('title', '-');

    rerender(<>{dataListText('Process name')}</>);
    expect(screen.getByText('Process name')).toHaveAttribute('title', 'Process name');

    rerender(<>{dataListText(42)}</>);
    expect(screen.getByText('42')).toHaveAttribute('title', '42');

    rerender(<>{dataListText(<strong>Rich node</strong>)}</>);
    expect(screen.getByText('Rich node').closest('span')).not.toHaveAttribute('title');
  });

  it('wraps display text with a tooltip only when tooltip content is present', () => {
    const { rerender } = render(<>{dataListText('Flow', null)}</>);
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();

    rerender(<>{dataListText('Flow', '')}</>);
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();

    rerender(<>{dataListText('Flow', 'Full flow name')}</>);
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-placement', 'topLeft');
    const hover = (dataListText('Flow', 'Full flow name') as React.ReactElement<any>).props.title;
    expect(
      hover.props.children.map((node: React.ReactElement<any>) => node.props.children),
    ).toEqual(['Flow', 'Full flow name']);
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });
  it('gives names the remaining width and budgets compact metadata, dates and visible business columns', () => {
    const raw = [
      { dataIndex: 'shortName', width: 360 },
      { dataIndex: 'locationOfSupply', width: 160 },
      { dataIndex: 'referenceYear', width: 120 },
      { dataIndex: 'datasetType', width: 180 },
      { dataIndex: 'version', width: 132 },
      { dataIndex: 'updatedAt', width: 240, valueType: 'dateTime' as const },
      { dataIndex: 'CASNumber' },
      { dataIndex: 'classification', width: 200 },
      { dataIndex: 'hiddenDetail', hideInTable: true, width: 400 },
      { dataIndex: 'option', valueType: 'option' as const, width: 184 },
    ];
    const ordered = orderDataListColumns<any>(raw);
    expect(ordered.slice(0, 6).map((column) => column.width)).toEqual([
      72,
      undefined,
      128,
      100,
      160,
      128,
    ]);
    expect(ordered.find((column) => column.dataIndex === 'updatedAt')?.width).toBe(156);
    expect(ordered.find((column) => column.dataIndex === 'CASNumber')?.width).toBe(144);
    expect(ordered[ordered.length - 1]?.width).toBe(184);
    expect(getDataListScrollX(raw)).toBe(908 + 156 + 144 + 184);
    expect(getDataListScrollX(ordered)).toBe(getDataListScrollX(raw));
    expect(raw[0].width).toBe(360);
  });

  it('keeps exact version buttons and existing cell props while exposing full hover values', () => {
    const onClick = jest.fn();
    const renderVersion = () => (
      <button type='button' onClick={onClick}>
        Open exact version
      </button>
    );
    const ordered = orderDataListColumns<any>([
      { dataIndex: 'name', onCell: () => ({ className: 'business-name' }) },
      {
        dataIndex: 'version',
        render: renderVersion,
        onCell: () => ({ title: 'Caller version hint' }),
      },
    ]);
    const row = { name: 'Full untruncated dataset name', version: '01.00.001' };
    expect(ordered[1].onCell?.(row, 0)).toEqual({ className: 'business-name', title: row.name });
    expect(ordered[5].onCell?.(row, 0)).toEqual({ title: 'Caller version hint' });
    expect(ordered[5].render).toBe(renderVersion);
    render(<>{ordered[5].render?.(null, row, 0, {} as any, {} as any) as React.ReactNode}</>);
    screen.getByRole('button', { name: 'Open exact version' }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('leaves formatted date tooltips to ProTable and preserves custom renderer output', () => {
    const defaultDate = orderDataListColumns<any>([
      { dataIndex: 'modifiedAt', valueType: 'dateTime' },
    ])[6];
    expect(defaultDate.valueType).toBe('dateTime');
    expect(defaultDate.ellipsis).toBe(true);
    expect(defaultDate.render).toBeUndefined();
    const formatted = <span>14.10.2026, 12:30</span>;
    const cell = { props: { colSpan: 2 }, children: formatted };
    const renderer = jest.fn(() => cell);
    const customDate = orderDataListColumns<any>([
      { dataIndex: 'createdAt', valueType: 'dateTime', render: renderer },
    ])[6];
    expect(customDate.render).toBe(renderer);
    const row = { createdAt: '2026-10-14T12:30:00Z' };
    const output = customDate.render?.(formatted, row, 0, {} as any, {} as any) as typeof cell;
    expect(output).toBe(cell);
    expect(output.props).toBe(cell.props);
    expect(output.children).toBe(formatted);
    expect(renderer).toHaveBeenCalledTimes(1);
    render(<>{output.children}</>);
    expect(screen.getByText('14.10.2026, 12:30')).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });
  it.each([undefined, null, ''])(
    'keeps a name-only hover value intact when description is %s',
    (description) => {
      const name = <strong>Full dataset name</strong>;
      const hover = dataListTooltipContent(name, description);
      expect(hover).toBe(name);
      render(<>{hover}</>);
      expect(screen.getAllByText('Full dataset name')).toHaveLength(1);
    },
  );

  it('exposes numeric metadata and alias names through native cell titles without inventing missing values', () => {
    const ordered = orderDataListColumns<any>([]);
    const nameProps = ordered[1].onCell?.({ shortName: 'Full alias name' }, 0);
    const yearProps = ordered[3].onCell?.({ referenceYear: 2026 }, 0);
    expect(nameProps).toEqual({ title: 'Full alias name' });
    expect(yearProps).toEqual({ title: '2026' });
    expect(ordered[1].onCell?.({}, 0)).toEqual({});
    render(
      <>
        <span {...nameProps}>Full alias name</span>
        <span {...yearProps}>2026</span>
      </>,
    );
    expect(screen.getByText('Full alias name')).toHaveAttribute('title', 'Full alias name');
    expect(screen.getByText('2026')).toHaveAttribute('title', '2026');
  });

  it('preserves a native dynamic date header and leaves its formatted content to ProTable', () => {
    const title = () => <span>Updated at</span>;
    const date = orderDataListColumns<any>([
      { dataIndex: 'updated_at', title, valueType: 'dateTime' },
    ])[6];
    expect(date.title).toBe(title);
    expect(date.width).toBe(156);
    expect(date.valueType).toBe('dateTime');
    expect(date.render).toBeUndefined();
    render(title());
    expect(screen.getByText('Updated at')).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });
  it.each([
    ['de-DE', deProcess, 'Prozessmodul, Einzeloperation'],
    ['fr-FR', frProcess, 'Processus élémentaire, opération unique'],
  ])(
    'shows the complete %s FormattedMessage in one native hover tooltip without the raw English enum',
    async (locale, messages, localizedLabel) => {
      mockNativeHover = true;
      const user = userEvent.setup();
      const raw = 'Unit process, single operation';
      const label = processtypeOfDataSetOptions.find((option) => option.value === raw)!.label;
      const typeColumn = orderDataListColumns<any>([
        { dataIndex: 'typeOfDataSet', render: () => dataListText(label) },
      ])[4];
      const row = { typeOfDataSet: raw };
      const props = typeColumn.onCell?.(row, 0);
      expect(props).not.toHaveProperty('title');
      const { container, unmount } = render(
        <mockRealIntl.IntlProvider locale={locale} messages={messages}>
          <table>
            <tbody>
              <tr>
                <td {...props}>
                  {typeColumn.render?.(null, row, 0, {} as any, {} as any) as React.ReactNode}
                </td>
              </tr>
            </tbody>
          </table>
        </mockRealIntl.IntlProvider>,
      );
      try {
        const cell = screen.getByRole('cell');
        expect(cell).toHaveTextContent(localizedLabel as string);
        expect(cell).not.toHaveAttribute('title', raw);
        const text = container.querySelector('.responsive-data-list-cell-text')!;
        expect(text).not.toHaveAttribute('title');
        await user.hover(text);
        const tooltip = await screen.findByRole('tooltip');
        expect(tooltip).toHaveTextContent(localizedLabel as string);
        expect(tooltip).not.toHaveTextContent(raw);
        expect(screen.getAllByRole('tooltip')).toHaveLength(1);
        await user.unhover(text);
        await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
      } finally {
        unmount();
        mockNativeHover = false;
      }
    },
  );

  it('preserves a caller supplied data type cell title while skipping automatic raw enum titles', () => {
    const onClick = jest.fn();
    const type = orderDataListColumns<any>([
      { dataIndex: 'flowType', onCell: () => ({ title: 'Caller localized type', onClick }) },
    ])[4];
    expect(type.onCell?.({ flowType: 'Product flow' }, 0)).toEqual({
      title: 'Caller localized type',
      onClick,
    });
    const automatic = orderDataListColumns<any>([{ dataIndex: 'flowType' }])[4];
    expect(automatic.onCell?.({ flowType: 'Product flow' }, 0)).toEqual({});
  });
});
