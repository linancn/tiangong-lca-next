import { Select } from 'antd';
import { useIntl } from 'umi';

type TableFilterValue = string | number;

const TABLE_FILTER_OPTIONS: { value: TableFilterValue; messageId: string }[] = [
  { value: 'all', messageId: 'pages.table.filter.all.reviewType' },
  { value: 0, messageId: 'pages.table.filter.unreviewed' },
  { value: 20, messageId: 'pages.table.filter.reviewing' },
  { value: 100, messageId: 'pages.table.filter.reviewed' },
];

const TableFilter = ({
  onChange,
  disabled = false,
}: {
  onChange: (value: TableFilterValue) => void;
  disabled?: boolean;
}) => {
  const intl = useIntl();

  return (
    <div>
      <Select disabled={disabled} defaultValue={'all'} style={{ width: 140 }} onChange={onChange}>
        {TABLE_FILTER_OPTIONS.map((option) => {
          const label = intl.formatMessage({ id: option.messageId });

          return (
            <Select.Option key={option.messageId} value={option.value} title={label}>
              {label}
            </Select.Option>
          );
        })}
      </Select>
    </div>
  );
};

export default TableFilter;
