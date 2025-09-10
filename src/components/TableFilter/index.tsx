import { Select } from 'antd';
import { FormattedMessage } from 'umi';

const TableFilter = ({
  onChange,
  disabled = false,
}: {
  onChange: (value: string | number) => void;
  disabled?: boolean;
}) => {
  return (
    <div>
      <Select disabled={disabled} defaultValue={'all'} style={{ width: 100 }} onChange={onChange}>
        <Select.Option value={'all'}>
          <FormattedMessage id='pages.table.filter.all' />
        </Select.Option>
        <Select.Option value={0}>
          <FormattedMessage id='pages.table.filter.unreviewed' />
        </Select.Option>
        <Select.Option value={20}>
          <FormattedMessage id='pages.table.filter.reviewing' />
        </Select.Option>
        <Select.Option value={100}>
          <FormattedMessage id='pages.table.filter.reviewed' />
        </Select.Option>
        {/* <Select.Option value={0}><FormattedMessage id="pages.table.filter.rejected" /></Select.Option> */}
      </Select>
    </div>
  );
};

export default TableFilter;
