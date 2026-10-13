import { processtypeOfDataSetOptions } from './optiondata';
import type { TablePaginationConfig } from 'antd/es/table';
import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import { ResponsiveDataListViewport } from '@/components/ResponsiveDataList';
import type { DatasetClassificationFilterValue } from '@/services/general/datasetClassification';
import { Button, Input, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import type { LcaProcessOption } from './lcaAnalysisShared';

type ProcessSelectionViewMode = 'all' | 'selected' | 'unselected';

type IntlMessageDescriptor = {
  id: string;
  defaultMessage: string;
};

export type LcaProcessSelectionMode = 'compare' | 'grouped' | 'path';

const LCA_SELECTION_MESSAGES = {
  compare: {
    empty: {
      id: 'pages.process.lca.page.compare.selectionEmpty',
      defaultMessage: 'No processes match the current data scope and search keyword.',
    },
    hint: {
      id: 'pages.process.lca.page.compare.selectionHint',
      defaultMessage:
        '{selectedCount, plural, one {# process selected from {totalCount, plural, one {# available option} other {# available options}}.} other {# processes selected from {totalCount, plural, one {# available option} other {# available options}}.}}',
    },
    title: {
      id: 'pages.process.lca.page.compare.selectionTitle',
      defaultMessage: 'Process selection',
    },
  },
  grouped: {
    empty: {
      id: 'pages.process.lca.page.grouped.selectionEmpty',
      defaultMessage: 'No processes match the current data scope and search keyword.',
    },
    hint: {
      id: 'pages.process.lca.page.grouped.selectionHint',
      defaultMessage:
        '{selectedCount, plural, one {# process selected from {totalCount, plural, one {# available option} other {# available options}}.} other {# processes selected from {totalCount, plural, one {# available option} other {# available options}}.}}',
    },
    title: {
      id: 'pages.process.lca.page.grouped.selectionTitle',
      defaultMessage: 'Process selection',
    },
  },
  path: {
    empty: {
      id: 'pages.process.lca.page.path.selectionEmpty',
      defaultMessage: 'No processes match the current data scope and search keyword.',
    },
    hint: {
      id: 'pages.process.lca.page.path.selectionHint',
      defaultMessage:
        '{selectedCount, plural, one {# root process selected from {totalCount, plural, one {# available option} other {# available options}}.} other {# root processes selected from {totalCount, plural, one {# available option} other {# available options}}.}}',
    },
    title: {
      id: 'pages.process.lca.page.path.selectionTitle',
      defaultMessage: 'Root process selection',
    },
  },
} as const satisfies Record<
  LcaProcessSelectionMode,
  Record<'empty' | 'hint' | 'title', IntlMessageDescriptor>
>;

type LcaProcessSelectionTableProps = {
  processOptions: LcaProcessOption[];
  selectedProcessIds: string[];
  selectedProcessOptions?: LcaProcessOption[];
  totalProcessCount?: number;
  tablePagination?: TablePaginationConfig;
  loading?: boolean;
  pagination?: {
    current: number;
    totalPages: number;
    rangeStart: number;
    rangeEnd: number;
    loading?: boolean;
    onPrevious: () => void;
    onNext: () => void;
  };
  lang?: string;
  searchKeyword?: string;
  onSearch?: (value: string) => void;
  classification?: DatasetClassificationFilterValue[];
  onClassificationChange?: (value: DatasetClassificationFilterValue[]) => void;
  mode: LcaProcessSelectionMode;
  selectionType?: 'checkbox' | 'radio';
  onSelectionChange: (selectedProcessIds: string[]) => void;
};

const processSelectionColumns: ColumnsType<LcaProcessOption> = [
  {
    title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
    key: 'index',
    width: 72,
    align: 'center',
    render: (_, __, index) => index + 1,
  },
  {
    title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
    key: 'name',
    dataIndex: 'name',
    width: 360,
    ellipsis: true,
    render: (_, item) => <Typography.Text strong>{item.name}</Typography.Text>,
  },
  {
    title: <FormattedMessage id='pages.process.location' defaultMessage='Location' />,
    key: 'location',
    width: 160,
    ellipsis: true,
    render: (_, item) => item.location || '—',
  },
  {
    title: <FormattedMessage id='pages.process.referenceYear' defaultMessage='Reference year' />,
    key: 'referenceYear',
    width: 120,
    render: (_, item) => item.referenceYear || '—',
  },
  {
    title: (
      <FormattedMessage id='pages.table.filter.all.datasetType' defaultMessage='Type of data set' />
    ),
    key: 'dataType',
    width: 180,
    render: (_, item) =>
      processtypeOfDataSetOptions.find((option) => option.value === item.typeOfDataSet)?.label ??
      item.typeOfDataSet ??
      '—',
  },
  {
    title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
    key: 'version',
    dataIndex: 'version',
    width: 132,
  },
];

function getProcessSelectionKey(item: LcaProcessOption): string {
  return item.selectionKey;
}

const LcaProcessSelectionTable = ({
  processOptions,
  selectedProcessIds,
  selectedProcessOptions = [],
  totalProcessCount,
  pagination,
  tablePagination,
  loading = false,
  lang,
  searchKeyword,
  onSearch,
  classification = [],
  onClassificationChange,
  mode,
  selectionType = 'checkbox',
  onSelectionChange,
}: LcaProcessSelectionTableProps) => {
  const intl = useIntl();
  const messages = LCA_SELECTION_MESSAGES[mode];
  const [selectionViewMode, setSelectionViewMode] = useState<ProcessSelectionViewMode>('all');
  const [filterKeyword, setFilterKeyword] = useState(searchKeyword ?? '');
  const usesRemoteSearch = Boolean(onSearch);
  useEffect(() => {
    if (usesRemoteSearch) setFilterKeyword(searchKeyword ?? '');
  }, [searchKeyword, usesRemoteSearch]);
  const selectedProcessKeySet = useMemo(
    () => new Set(selectedProcessIds.map((item) => String(item))),
    [selectedProcessIds],
  );
  const selectedProcessOptionMap = useMemo(
    () =>
      new Map(selectedProcessOptions.map((item) => [getProcessSelectionKey(item), item] as const)),
    [selectedProcessOptions],
  );
  const normalizedFilterKeyword = onSearch ? '' : filterKeyword.trim().toLowerCase();
  const baseProcessOptions = useMemo(() => {
    if (selectionViewMode !== 'selected') {
      return processOptions;
    }

    return selectedProcessIds
      .map((processId) => selectedProcessOptionMap.get(String(processId)))
      .filter((item): item is LcaProcessOption => !!item);
  }, [processOptions, selectedProcessIds, selectedProcessOptionMap, selectionViewMode]);
  const visibleProcessOptions = useMemo(
    () =>
      baseProcessOptions.filter((item) => {
        const isSelected = selectedProcessKeySet.has(getProcessSelectionKey(item));
        const matchesSelectionView =
          selectionViewMode === 'all' ||
          (selectionViewMode === 'selected' ? isSelected : !isSelected);
        if (!matchesSelectionView) {
          return false;
        }

        if (!normalizedFilterKeyword) {
          return true;
        }

        const haystack = `${item.name} ${item.version} ${item.label}`.toLowerCase();
        return haystack.includes(normalizedFilterKeyword);
      }),
    [baseProcessOptions, normalizedFilterKeyword, selectedProcessKeySet, selectionViewMode],
  );
  const showPaginationFooter = !!pagination && !tablePagination && selectionViewMode !== 'selected';

  return (
    <ResponsiveDataListViewport enabled={false}>
      {({ scroll }) => (
        <Table<LcaProcessOption>
          scroll={scroll}
          tableLayout='fixed'
          title={() => (
            <Space orientation='vertical' size='small' style={{ width: '100%' }}>
              <Typography.Text strong>
                <FormattedMessage
                  id={messages.title.id}
                  defaultMessage={messages.title.defaultMessage}
                />
              </Typography.Text>
              <Typography.Text type='secondary'>
                <FormattedMessage
                  id={messages.hint.id}
                  defaultMessage={messages.hint.defaultMessage}
                  values={{
                    selectedCount: selectedProcessIds.length,
                    totalCount: totalProcessCount ?? processOptions.length,
                  }}
                />
              </Typography.Text>
              <Space wrap={true} size='small' style={{ width: '100%' }}>
                <Select
                  aria-label={intl.formatMessage({
                    id: 'pages.process.lca.selection.filter.label',
                    defaultMessage: 'Selection visibility',
                  })}
                  style={{ width: 180 }}
                  value={selectionViewMode}
                  options={[
                    {
                      value: 'all',
                      label: intl.formatMessage({
                        id: 'pages.process.lca.selection.filter.option.all',
                        defaultMessage: 'All',
                      }),
                    },
                    {
                      value: 'selected',
                      label: intl.formatMessage({
                        id: 'pages.process.lca.selection.filter.option.selected',
                        defaultMessage: 'Selected',
                      }),
                    },
                    {
                      value: 'unselected',
                      label: intl.formatMessage({
                        id: 'pages.process.lca.selection.filter.option.unselected',
                        defaultMessage: 'Unselected',
                      }),
                    },
                  ]}
                  onChange={(value) => setSelectionViewMode(value as ProcessSelectionViewMode)}
                />
                <Input.Search
                  aria-label={
                    onSearch
                      ? intl.formatMessage({ id: 'pages.search.keyWord' })
                      : intl.formatMessage({
                          id: 'pages.process.lca.selection.search.label',
                          defaultMessage: 'Filter processes in this list',
                        })
                  }
                  style={{ width: 'min(440px, 100%)' }}
                  placeholder={
                    onSearch
                      ? intl.formatMessage({ id: 'pages.search.keyWord' })
                      : intl.formatMessage({
                          id: 'pages.process.lca.selection.search.placeholder',
                          defaultMessage: 'Filter processes in this list by name, version, or tag',
                        })
                  }
                  value={filterKeyword}
                  onChange={(event) => setFilterKeyword(String(event.target.value))}
                  onSearch={onSearch}
                  allowClear
                />
                {onClassificationChange && lang ? (
                  <DatasetClassificationFilter
                    datasetKind='process'
                    lang={lang}
                    value={classification}
                    onChange={onClassificationChange}
                  />
                ) : null}
              </Space>
              <Typography.Text type='secondary'>
                <FormattedMessage
                  id='pages.process.lca.selection.visibleCount'
                  defaultMessage='{visibleCount, plural, one {Showing # process in this list.} other {Showing # processes in this list.}}'
                  values={{
                    visibleCount: visibleProcessOptions.length,
                  }}
                />
              </Typography.Text>
            </Space>
          )}
          loading={loading}
          rowKey={getProcessSelectionKey}
          size='small'
          columns={processSelectionColumns.map((column) =>
            column.key === 'index'
              ? {
                  ...column,
                  render: (_, __, index) =>
                    (selectionViewMode === 'selected'
                      ? 0
                      : ((tablePagination?.current ?? 1) - 1) * (tablePagination?.pageSize ?? 50)) +
                    index +
                    1,
                }
              : column,
          )}
          dataSource={visibleProcessOptions}
          pagination={selectionViewMode === 'selected' ? false : (tablePagination ?? false)}
          footer={
            showPaginationFooter
              ? () => (
                  <Space
                    align='center'
                    style={{ width: '100%', justifyContent: 'space-between' }}
                    wrap={true}
                  >
                    <Typography.Text type='secondary'>
                      <FormattedMessage
                        id='pages.process.lca.page.processes.range'
                        defaultMessage='Showing {start}-{end} on page {current} of {totalPages}.'
                        values={{
                          start: pagination.rangeStart,
                          end: pagination.rangeEnd,
                          current: pagination.current,
                          totalPages: pagination.totalPages,
                        }}
                      />
                    </Typography.Text>
                    <Space size='small'>
                      <Button
                        size='small'
                        disabled={pagination.loading || pagination.current <= 1}
                        onClick={pagination.onPrevious}
                      >
                        <FormattedMessage
                          id='pages.process.lca.page.processes.action.previousPage'
                          defaultMessage='Previous page'
                        />
                      </Button>
                      <Button
                        size='small'
                        disabled={pagination.loading || pagination.current >= pagination.totalPages}
                        onClick={pagination.onNext}
                      >
                        <FormattedMessage
                          id='pages.process.lca.page.processes.action.nextPage'
                          defaultMessage='Next page'
                        />
                      </Button>
                    </Space>
                  </Space>
                )
              : undefined
          }
          locale={{
            emptyText: intl.formatMessage({
              id: messages.empty.id,
              defaultMessage: messages.empty.defaultMessage,
            }),
          }}
          rowSelection={{
            type: selectionType,
            preserveSelectedRowKeys: true,
            selectedRowKeys: selectedProcessIds,
            onChange: (selectedRowKeys) => {
              onSelectionChange(selectedRowKeys.map((item) => String(item)));
            },
          }}
        />
      )}
    </ResponsiveDataListViewport>
  );
};

export default LcaProcessSelectionTable;
