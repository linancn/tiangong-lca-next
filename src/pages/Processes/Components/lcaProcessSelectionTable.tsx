import { Button, Input, Select, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
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
  pagination?: {
    current: number;
    totalPages: number;
    rangeStart: number;
    rangeEnd: number;
    loading?: boolean;
    onPrevious: () => void;
    onNext: () => void;
  };
  mode: LcaProcessSelectionMode;
  selectionType?: 'checkbox' | 'radio';
  onSelectionChange: (selectedProcessIds: string[]) => void;
};

const processSelectionColumns: ColumnsType<LcaProcessOption> = [
  {
    title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
    key: 'name',
    render: (_, item) => (
      <Space size='small'>
        <Typography.Text strong>{item.name}</Typography.Text>
        <Typography.Text type='secondary'>{item.version}</Typography.Text>
      </Space>
    ),
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
  mode,
  selectionType = 'checkbox',
  onSelectionChange,
}: LcaProcessSelectionTableProps) => {
  const intl = useIntl();
  const messages = LCA_SELECTION_MESSAGES[mode];
  const [selectionViewMode, setSelectionViewMode] = useState<ProcessSelectionViewMode>('all');
  const [filterKeyword, setFilterKeyword] = useState('');
  const selectedProcessKeySet = useMemo(
    () => new Set(selectedProcessIds.map((item) => String(item))),
    [selectedProcessIds],
  );
  const selectedProcessOptionMap = useMemo(
    () =>
      new Map(selectedProcessOptions.map((item) => [getProcessSelectionKey(item), item] as const)),
    [selectedProcessOptions],
  );
  const normalizedFilterKeyword = filterKeyword.trim().toLowerCase();
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
  const showPaginationFooter = !!pagination && selectionViewMode !== 'selected';

  return (
    <Space direction='vertical' size='small' style={{ width: '100%' }}>
      <Typography.Text strong>
        <FormattedMessage id={messages.title.id} defaultMessage={messages.title.defaultMessage} />
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
        <Input
          aria-label={intl.formatMessage({
            id: 'pages.process.lca.selection.search.label',
            defaultMessage: 'Filter processes in this list',
          })}
          style={{ width: 'min(440px, 100%)' }}
          placeholder={intl.formatMessage({
            id: 'pages.process.lca.selection.search.placeholder',
            defaultMessage: 'Filter processes in this list by name, version, or tag',
          })}
          value={filterKeyword}
          onChange={(event) => setFilterKeyword(String(event.target.value))}
        />
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
      <Table<LcaProcessOption>
        rowKey={getProcessSelectionKey}
        size='small'
        columns={processSelectionColumns}
        dataSource={visibleProcessOptions}
        pagination={false}
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
    </Space>
  );
};

export default LcaProcessSelectionTable;
