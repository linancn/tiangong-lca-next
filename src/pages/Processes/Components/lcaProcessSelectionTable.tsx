import { Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FormattedMessage, useIntl } from 'umi';
import type { LcaProcessOption } from './lcaAnalysisShared';

export const DEFAULT_LCA_PROCESS_SELECTION_TABLE_PAGE_SIZE = 8;

type IntlMessageDescriptor = {
  id: string;
  defaultMessage: string;
};

type LcaProcessSelectionTableProps = {
  processOptions: LcaProcessOption[];
  selectedProcessIds: string[];
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

const LcaProcessSelectionTable = ({
  processOptions,
  selectedProcessIds,
  titleMessage,
  hintMessage,
  emptyMessage,
  selectionType = 'checkbox',
  onSelectionChange,
}: LcaProcessSelectionTableProps) => {
  const intl = useIntl();

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
            totalCount: processOptions.length,
          }}
        />
      </Typography.Text>
      <Table<LcaProcessOption>
        rowKey='value'
        size='small'
        columns={processSelectionColumns}
        dataSource={processOptions}
        pagination={{
          pageSize: DEFAULT_LCA_PROCESS_SELECTION_TABLE_PAGE_SIZE,
          size: 'small',
          showSizeChanger: false,
          showTotal: (total, range) =>
            intl.formatMessage(
              {
                id: 'pages.pagination.showTotal',
                defaultMessage: 'Items {start}-{end} of {total}',
              },
              {
                start: range[0],
                end: range[1],
                total,
              },
            ),
        }}
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
