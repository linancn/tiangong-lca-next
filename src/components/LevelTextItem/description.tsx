import { Descriptions } from 'antd';
import { FC } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  data: any;
};

const LevelTextItemDescription: FC<Props> = ({ data }) => {
  // const items: { [key: string]: string } = classificationToJson(data);
  return (
    <Descriptions bordered size={'small'} column={1}>
      <Descriptions.Item
        key={0}
        label={<FormattedMessage id="pages.contact.level1" defaultMessage="Level 1" />}
        labelStyle={{ width: '100px' }}
      >
        {data?.['@level_0'] ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item
        key={0}
        label={<FormattedMessage id="pages.contact.level2" defaultMessage="Level 2" />}
        labelStyle={{ width: '100px' }}
      >
        {data?.['@level_1'] ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item
        key={0}
        label={<FormattedMessage id="pages.contact.level3" defaultMessage="Level 3" />}
        labelStyle={{ width: '100px' }}
      >
        {data?.['@level_2'] ?? '-'}
      </Descriptions.Item>
    </Descriptions>
  );
};

export default LevelTextItemDescription;
