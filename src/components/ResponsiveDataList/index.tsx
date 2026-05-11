import type { ProColumns } from '@ant-design/pro-components';
import { TableDropdown } from '@ant-design/pro-components';
import { Grid, Space, Tooltip, theme } from 'antd';
import type { ReactNode } from 'react';
import { Children } from 'react';

import './index.less';

export const DATA_LIST_ACTION_SPACE_CLASS_NAME = 'responsive-data-list-actions';

export const DATA_LIST_COLUMN_RESPONSIVE = {
  tablet: ['md'] as ProColumns<any>['responsive'],
  desktop: ['lg'] as ProColumns<any>['responsive'],
  wide: ['xl'] as ProColumns<any>['responsive'],
};

export const responsiveDataListTableProps = {
  className: 'responsive-data-list-table',
  scroll: { x: 'max-content' },
  tableLayout: 'fixed' as const,
};

export const responsiveSearchCardClassName = 'responsive-data-list-search-card';

export const responsiveSearchRowProps = {
  align: 'middle' as const,
};

export const responsiveSearchPrimaryColProps = {
  className: 'responsive-data-list-search-primary',
  flex: 'auto',
  style: { marginRight: '10px' },
};

export const responsiveSearchExtraColProps = {
  className: 'responsive-data-list-search-extra',
  flex: '100px',
};

export function dataListIndexColumn<T>(): Partial<ProColumns<T>> {
  return {
    align: 'center',
    search: false,
    width: 72,
  };
}

export function dataListTextColumn<T>(
  width: number,
  responsive?: ProColumns<T>['responsive'],
): Partial<ProColumns<T>> {
  return {
    ellipsis: true,
    responsive,
    width,
  };
}

export function dataListActionColumn<T>(width = 184): Partial<ProColumns<T>> {
  return {
    align: 'center',
    className: 'responsive-data-list-action-column',
    fixed: 'right',
    search: false,
    width,
  };
}

export type DataListActionMenu = {
  key: string;
  name: ReactNode;
};

export function useResponsiveDataListMobile() {
  const useBreakpoint = Grid?.useBreakpoint ?? (() => ({}));
  const screens = useBreakpoint();
  return screens.md === false;
}

export function ResponsiveDataListActions({
  isMobile,
  children,
  moreMenus = [],
}: {
  isMobile: boolean;
  children: ReactNode;
  moreMenus?: DataListActionMenu[];
}) {
  const { token } = theme.useToken();
  const actions = Children.toArray(children).filter(Boolean);
  const dropdownStyle = { color: token.colorPrimary };

  if (isMobile) {
    return (
      <TableDropdown
        className='responsive-data-list-more-action'
        style={dropdownStyle}
        menus={[
          ...actions.map((name, index) => ({
            key: `action-${index}`,
            name,
          })),
          ...moreMenus,
        ]}
      />
    );
  }

  return (
    <Space className={DATA_LIST_ACTION_SPACE_CLASS_NAME} size='small'>
      {actions}
      {moreMenus.length > 0 && <TableDropdown style={dropdownStyle} menus={moreMenus} />}
    </Space>
  );
}

export function ResponsiveDataListToolbarMore({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  const actions = Children.toArray(children).filter(Boolean);
  const dropdownStyle = { color: token.colorPrimary };

  if (actions.length === 0) {
    return null;
  }

  return (
    <span className='ant-pro-table-list-toolbar-setting-item responsive-data-list-toolbar-more-action'>
      <TableDropdown
        className='responsive-data-list-more-action'
        style={dropdownStyle}
        menus={actions.map((name, index) => ({
          key: `toolbar-action-${index}`,
          name,
        }))}
      />
    </span>
  );
}

const normalizeTextValue = (value: ReactNode) => {
  if (value === undefined || value === null || value === '' || value === 'undefined') {
    return '-';
  }
  return value;
};

export function dataListText(value: ReactNode, tooltip?: ReactNode) {
  const content = normalizeTextValue(value);
  const textTitle =
    typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
  const textNode = (
    <span className='responsive-data-list-cell-text' title={textTitle}>
      {content}
    </span>
  );

  if (tooltip === undefined || tooltip === null || tooltip === '') {
    return textNode;
  }

  return (
    <Tooltip placement='topLeft' title={tooltip}>
      {textNode}
    </Tooltip>
  );
}
