import {
  DATA_LIST_ACTION_SPACE_CLASS_NAME,
  DATA_LIST_COLUMN_RESPONSIVE,
  ResponsiveDataListActions,
  ResponsiveDataListToolbarMore,
  dataListActionColumn,
  dataListIndexColumn,
  dataListText,
  dataListTextColumn,
  dataListPagination,
  dataListTabProps,
  getDataListToolbar,
  orderDataListColumns,
  responsiveDataListTableProps,
  responsiveSearchCardClassName,
  responsiveSearchExtraColProps,
  responsiveSearchPrimaryColProps,
  responsiveSearchRowProps,
  useResponsiveDataListMobile,
} from '@/components/ResponsiveDataList';
import { render, screen } from '@testing-library/react';
import { Grid } from 'antd';

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: any) => (
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
  Tooltip: ({ children, placement, title }: any) => (
    <span data-placement={placement} data-testid='tooltip' data-title={String(title)}>
      {children}
    </span>
  ),
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
    expect(ordered[1].title).toBe('Dataset name');
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
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', 'Full flow name');
    expect(screen.getByText('Flow')).toBeInTheDocument();
  });
});
