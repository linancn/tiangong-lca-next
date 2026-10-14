import type { ProColumns, ProTableProps } from '@ant-design/pro-components';
import { TableDropdown } from '@ant-design/pro-components';
import { Grid, Space, Tooltip, theme, type CardProps } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { Children } from 'react';
import { FormattedMessage } from 'umi';

export { ResponsiveDataListViewport } from './viewport';

import './index.less';
import {
  dataListColumnWidths,
  dataListDateAliases,
  getDataListColumnField,
  getDataListColumnWidth,
} from './columnSizing';
export { dataListColumnWidths, getDataListScrollX } from './columnSizing';

export const DATA_LIST_ACTION_SPACE_CLASS_NAME = 'responsive-data-list-actions';

export const DATA_LIST_COLUMN_RESPONSIVE = {
  tablet: ['md'] as ProColumns<any>['responsive'],
  desktop: ['lg'] as ProColumns<any>['responsive'],
  wide: ['xl'] as ProColumns<any>['responsive'],
};

export const responsiveDataListTableProps = {
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
  tableLayout: 'fixed' as const,
  toolbar: {
    className: 'responsive-data-list-toolbar',
  },
};

export const dataListPagination = {
  defaultPageSize: 50,
  showSizeChanger: true,
  pageSizeOptions: [20, 50, 100],
};

/** The same shrinkable search budget for native Table toolbars outside ProTable. */
export const dataListSearchStyle: CSSProperties = {
  width: 'auto',
  flex: '1 1 240px',
  minWidth: 0,
  maxWidth: '100%',
};

/** Keep the native tab overflow menu above the drawer that owns its trigger. */
export const dataListTabProps: CardProps['tabProps'] = {
  getPopupContainer: (trigger) => trigger.closest<HTMLElement>('[role="dialog"]') ?? document.body,
};

export function getDataListToolbar(toolbar: ProTableProps<any, any>['toolbar'] = {}) {
  return {
    ...responsiveDataListTableProps.toolbar,
    ...toolbar,
    className: [responsiveDataListTableProps.toolbar.className, toolbar.className]
      .filter(Boolean)
      .join(' '),
  };
}

type DataListBaseField = 'index' | 'name' | 'location' | 'referenceYear' | 'dataType' | 'version';

export type DataListColumnOptions = {
  titles?: Partial<Record<DataListBaseField, ReactNode>>;
  dataType?: ReactNode;
  /** Supply the server page to display an index across pages rather than within one page. */
  pagination?: { current?: number; pageSize?: number };
};

const baseColumnDefinitions: {
  field: DataListBaseField;
  aliases: string[];
  width?: number;
  title: ReactNode;
}[] = [
  {
    field: 'index',
    aliases: ['index'],
    width: dataListColumnWidths.index,
    title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
  },
  {
    field: 'name',
    aliases: ['name', 'shortName', 'baseName'],
    title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
  },
  {
    field: 'location',
    aliases: ['location', 'locationOfSupply'],
    width: dataListColumnWidths.location,
    title: <FormattedMessage id='pages.process.location' defaultMessage='Location' />,
  },
  {
    field: 'referenceYear',
    aliases: ['referenceYear'],
    width: dataListColumnWidths.referenceYear,
    title: <FormattedMessage id='pages.process.referenceYear' defaultMessage='Reference year' />,
  },
  {
    field: 'dataType',
    aliases: ['dataType', 'datasetType', 'typeOfDataSet', 'flowType', 'datasetKind'],
    width: dataListColumnWidths.dataType,
    title: (
      <FormattedMessage id='pages.table.filter.all.datasetType' defaultMessage='Type of data set' />
    ),
  },
  {
    field: 'version',
    aliases: ['version'],
    width: dataListColumnWidths.version,
    title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
  },
];

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
  flex: 'none',
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
      <span className='responsive-data-list-more-action'>
        <TableDropdown
          style={dropdownStyle}
          menus={[
            ...actions.map((name, index) => ({
              key: `action-${index}`,
              name,
            })),
            ...moreMenus,
          ]}
        />
      </span>
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
    <span className='responsive-data-list-toolbar-more-action'>
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

export function dataListTooltipContent(value: ReactNode, description?: ReactNode) {
  if (description === undefined || description === null || description === '') return value;
  return (
    <>
      <div>{value}</div>
      <div>{description}</div>
    </>
  );
}

export function dataListText(value: ReactNode, tooltip?: ReactNode) {
  const content = normalizeTextValue(value);
  const textTitle =
    typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
  const textNode = (
    <span className='responsive-data-list-cell-text' title={textTitle}>
      {content}
    </span>
  );

  if ((tooltip === undefined || tooltip === null || tooltip === '') && textTitle !== undefined) {
    return textNode;
  }

  return (
    <Tooltip placement='topLeft' title={dataListTooltipContent(content, tooltip)}>
      {textNode}
    </Tooltip>
  );
}

const isEmptyDataListMetadata = (value: ReactNode) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && ['', '-', '—', 'undefined'].includes(value.trim()));

export const dataListMetadataText = (value: ReactNode) =>
  dataListText(isEmptyDataListMetadata(value) ? '—' : value);

const dataListHeader = (title: ReactNode) => (
  <Tooltip title={title} placement='topLeft'>
    <span>{title}</span>
  </Tooltip>
);

function dataListCellTitle<T>(column: ProColumns<T>, aliases: string[], autoTitle: boolean) {
  const previousOnCell = column.onCell;
  return {
    ...column,
    onCell: (record: T, rowIndex?: number) => {
      const previous = previousOnCell?.(record, rowIndex) ?? {};
      const row = record as Record<string, unknown>;
      const value = [getDataListColumnField(column), ...aliases]
        .map((field) => row[field])
        .find((item) => typeof item === 'string' || typeof item === 'number');
      return {
        ...previous,
        ...(autoTitle && previous.title === undefined && value !== undefined
          ? { title: String(value) }
          : {}),
      };
    },
  };
}

/** Keep business renderers and exact-version actions while standardizing every dataset list. */
export function orderDataListColumns<T>(
  columns: ProColumns<T>[],
  options: DataListColumnOptions = {},
): ProColumns<T>[] {
  const remaining = columns.filter((column) => getDataListColumnField(column) !== 'classification');
  const ordered = baseColumnDefinitions.map(({ field, aliases, width, title }) => {
    const index = remaining.findIndex(
      (column) =>
        aliases.includes(getDataListColumnField(column)) ||
        (field === 'index' && column.valueType === 'index'),
    );
    const existing = index >= 0 ? remaining.splice(index, 1)[0] : undefined;
    const column: ProColumns<T> = {
      ellipsis: field !== 'index',
      ...existing,
      title: dataListHeader(options.titles?.[field] ?? title),
      dataIndex: existing?.dataIndex ?? field,
      width,
      responsive: undefined,
      hideInTable: false,
      search: false,
    };
    if (!existing) {
      column.sorter = false;
      column.render = (_, row) => {
        const record = row as Record<string, ReactNode> | null;
        const value = aliases
          .map((alias) => record?.[alias])
          .find((candidate) => !isEmptyDataListMetadata(candidate));
        return dataListMetadataText(value ?? (field === 'dataType' ? options.dataType : undefined));
      };
    } else if (field !== 'index' && !existing.render) {
      column.render = (value) => dataListMetadataText(value);
    }
    if (field === 'index') {
      column.align = 'center';
      column.valueType = 'index';
      column.render = existing?.render;
      if (options.pagination) {
        const { current = 1, pageSize = 50 } = options.pagination;
        column.render = (_, __, rowIndex) => (current - 1) * pageSize + rowIndex + 1;
      }
    }
    return field === 'index' ? column : dataListCellTitle(column, aliases, field !== 'dataType');
  });
  const isAction = (column: ProColumns<T>) =>
    column.dataIndex === 'option' || column.dataIndex === 'action' || column.valueType === 'option';
  return [
    ...ordered,
    ...remaining
      .filter((column) => !isAction(column))
      .map((column) => {
        const result = {
          ...column,
          width: getDataListColumnWidth(column) ?? dataListColumnWidths.business,
        };
        if (dataListDateAliases.includes(getDataListColumnField(column))) {
          result.title =
            typeof column.title === 'function' ? column.title : dataListHeader(column.title);
          result.ellipsis = true;
        }
        return result;
      }),
    ...remaining
      .filter(isAction)
      .map((column) => ({ ...column, width: column.width ?? dataListColumnWidths.business })),
  ];
}
