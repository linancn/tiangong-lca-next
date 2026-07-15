import { Select } from 'antd';
import type { CSSProperties } from 'react';
import { useIntl } from 'umi';

type TableFilterValue = string | number;

const TABLE_FILTER_OPTIONS = [
  { value: 'all', messageId: 'pages.table.filter.all.workflowStatus' },
  { value: 0, messageId: 'pages.table.filter.workflowStatus.workingDraft' },
  {
    value: 20,
    messageId: 'pages.table.filter.workflowStatus.finalDraftForExternalReview',
  },
  { value: 100, messageId: 'pages.table.filter.workflowStatus.dataSetFinalised' },
] as const satisfies ReadonlyArray<{ value: TableFilterValue; messageId: string }>;

const TableFilter = ({
  onChange,
  disabled = false,
  width = 140,
}: {
  onChange: (value: TableFilterValue) => void;
  disabled?: boolean;
  width?: CSSProperties['width'];
}) => {
  const intl = useIntl();

  return (
    <div>
      <Select disabled={disabled} defaultValue={'all'} style={{ width }} onChange={onChange}>
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
