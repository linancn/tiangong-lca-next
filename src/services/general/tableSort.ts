import type { SortOrder } from 'antd/es/table/interface';

export type ActiveTableSortOrder = 'ascend' | 'descend';

export type ActiveTableSort = {
  field: string;
  order: ActiveTableSortOrder;
};

type TableSortState = Readonly<Record<string, SortOrder | undefined>>;

const isActiveTableSortOrder = (order: SortOrder | undefined): order is ActiveTableSortOrder =>
  order === 'ascend' || order === 'descend';

export function getActiveTableSort(sort?: TableSortState | null): ActiveTableSort | undefined {
  for (const [field, order] of Object.entries(sort ?? {})) {
    if (isActiveTableSortOrder(order)) {
      return { field, order };
    }
  }

  return undefined;
}

export function resolveTableSort(
  sort: TableSortState | null | undefined,
  fallbackField: string,
  fallbackOrder: ActiveTableSortOrder = 'descend',
): ActiveTableSort {
  return getActiveTableSort(sort) ?? { field: fallbackField, order: fallbackOrder };
}

export function mapActiveTableSort(
  sort: TableSortState | null | undefined,
  fieldMap: Readonly<Record<string, string>>,
): Record<string, ActiveTableSortOrder> {
  const activeSort = getActiveTableSort(sort);
  if (!activeSort) {
    return {};
  }

  return {
    [fieldMap[activeSort.field] ?? activeSort.field]: activeSort.order,
  };
}

// Version drawers query core entity tables; localized names and classifications are display fields.
export function getAllVersionsSortField(field: unknown): string | undefined {
  switch (field) {
    case 'version':
      return 'version';
    case 'createdAt':
    case 'created_at':
      return 'created_at';
    case 'modifiedAt':
    case 'modified_at':
      return 'modified_at';
    default:
      return undefined;
  }
}

export function resolveAllVersionsSort(sort: TableSortState | null | undefined): ActiveTableSort {
  const activeSort = getActiveTableSort(sort);
  const field = getAllVersionsSortField(activeSort?.field);
  return activeSort && field
    ? { field, order: activeSort.order }
    : { field: 'version', order: 'descend' };
}
