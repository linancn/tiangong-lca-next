export type DataListSizingColumn = {
  dataIndex?: unknown;
  key?: unknown;
  valueType?: unknown;
  width?: number | string;
  hideInTable?: boolean;
};

export const dataListBaseAliases = {
  index: ['index'],
  name: ['name', 'shortName', 'baseName'],
  location: ['location', 'locationOfSupply'],
  referenceYear: ['referenceYear'],
  dataType: ['dataType', 'datasetType', 'typeOfDataSet', 'flowType', 'datasetKind'],
  version: ['version'],
};

export const dataListColumnWidths = {
  index: 72,
  location: 128,
  referenceYear: 100,
  dataType: 160,
  version: 128,
  dateTime: 156,
  business: 144,
  nameMinimum: 320,
};

export const dataListDateAliases = [
  'modifiedAt',
  'modified_at',
  'updatedAt',
  'updated_at',
  'createdAt',
  'created_at',
];

export function getDataListColumnField(column: DataListSizingColumn) {
  return String(column.dataIndex ?? column.key ?? '');
}

export function getDataListColumnWidth(column: DataListSizingColumn) {
  const field = getDataListColumnField(column);
  for (const [base, aliases] of Object.entries(dataListBaseAliases)) {
    if (aliases.includes(field) || (base === 'index' && column.valueType === 'index')) {
      return base === 'name'
        ? undefined
        : dataListColumnWidths[base as keyof typeof dataListColumnWidths];
    }
  }
  return dataListDateAliases.includes(field)
    ? dataListColumnWidths.dateTime
    : (column.width ?? dataListColumnWidths.business);
}

/** Match the displayed six base columns and keep one minimum-width fluid name column. */
export function getDataListScrollX(columns: readonly DataListSizingColumn[]) {
  const remaining = columns.filter((column) => getDataListColumnField(column) !== 'classification');
  let fixedWidth = 0;
  for (const [base, aliases] of Object.entries(dataListBaseAliases)) {
    const index = remaining.findIndex(
      (column) =>
        aliases.includes(getDataListColumnField(column)) ||
        (base === 'index' && column.valueType === 'index'),
    );
    if (index >= 0) remaining.splice(index, 1);
    if (base !== 'name')
      fixedWidth += dataListColumnWidths[base as keyof typeof dataListColumnWidths];
  }
  for (const column of remaining) {
    if (column.hideInTable) continue;
    const width = getDataListColumnWidth(column);
    fixedWidth +=
      typeof width === 'number' && Number.isFinite(width) && width > 0
        ? width
        : dataListColumnWidths.business;
  }
  return fixedWidth + dataListColumnWidths.nameMinimum;
}
