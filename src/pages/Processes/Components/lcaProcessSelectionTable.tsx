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
  titleMessage: IntlMessageDescriptor;
  hintMessage: IntlMessageDescriptor;
  emptyMessage: IntlMessageDescriptor;
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
  titleMessage,
  hintMessage,
  emptyMessage,
  selectionType = 'checkbox',
  onSelectionChange,
}: LcaProcessSelectionTableProps) => {
  const intl = useIntl();
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
        <FormattedMessage id={titleMessage.id} defaultMessage={titleMessage.defaultMessage} />
      </Typography.Text>
      <Typography.Text type='secondary'>
        <FormattedMessage
          id={hintMessage.id}
          defaultMessage={hintMessage.defaultMessage}
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
            defaultMessage: 'Filter processes in the current view',
          })}
          style={{ width: 'min(440px, 100%)' }}
          placeholder={intl.formatMessage({
            id: 'pages.process.lca.selection.search.placeholder',
            defaultMessage: 'Filter processes in the current view',
          })}
          value={filterKeyword}
          onChange={(event) => setFilterKeyword(String(event.target.value))}
        />
      </Space>
      <Typography.Text type='secondary'>
        <FormattedMessage
          id='pages.process.lca.selection.visibleCount'
          defaultMessage='Showing {visibleCount} processes in the current view.'
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
            id: emptyMessage.id,
            defaultMessage: emptyMessage.defaultMessage,
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
