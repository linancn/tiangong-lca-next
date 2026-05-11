import {
  DATA_LIST_ACTION_SPACE_CLASS_NAME,
  DATA_LIST_COLUMN_RESPONSIVE,
  ResponsiveDataListActions,
  ResponsiveDataListToolbarMore,
  dataListActionColumn,
  dataListIndexColumn,
  dataListText,
  dataListTextColumn,
  responsiveDataListTableProps,
  responsiveSearchCardClassName,
  responsiveSearchExtraColProps,
  responsiveSearchPrimaryColProps,
  responsiveSearchRowProps,
  useResponsiveDataListMobile,
} from '@/components/ResponsiveDataList';
import { render, screen } from '@testing-library/react';
import { Grid } from 'antd';

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

  it('provides shared responsive table and search props', () => {
    expect(DATA_LIST_COLUMN_RESPONSIVE).toEqual({
      desktop: ['lg'],
      tablet: ['md'],
      wide: ['xl'],
    });
    expect(responsiveDataListTableProps).toEqual({
      className: 'responsive-data-list-table',
      scroll: { x: 'max-content' },
      tableLayout: 'fixed',
    });
    expect(responsiveSearchCardClassName).toBe('responsive-data-list-search-card');
    expect(responsiveSearchRowProps).toEqual({ align: 'middle' });
    expect(responsiveSearchPrimaryColProps).toEqual({
      className: 'responsive-data-list-search-primary',
      flex: 'auto',
      style: { marginRight: '10px' },
    });
    expect(responsiveSearchExtraColProps).toEqual({
      className: 'responsive-data-list-search-extra',
      flex: '100px',
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
    expect(screen.getByTestId('table-dropdown')).toHaveClass('responsive-data-list-more-action');
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

    expect(container.querySelector('.ant-pro-table-list-toolbar-setting-item')).toHaveClass(
      'responsive-data-list-toolbar-more-action',
    );
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
