import { classificationToJson } from '@/services/general/util';
import { Descriptions } from 'antd';
import { FC } from 'react';

type Props = {
  data: any;
};

const LevelTextItemDescription: FC<Props> = ({ data }) => {
  const items: { [key: string]: string } = classificationToJson(data);
  return (
    <Descriptions bordered size={'small'} column={1}>
      <Descriptions.Item key={0} label="Level 1" labelStyle={{ width: '100px' }}>
        {items['@level_0'] ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item key={0} label="Level 2" labelStyle={{ width: '100px' }}>
        {items['@level_1'] ?? '-'}
      </Descriptions.Item>
      <Descriptions.Item key={0} label="Level 3" labelStyle={{ width: '100px' }}>
        {items['@level_2'] ?? '-'}
      </Descriptions.Item>
    </Descriptions>
  );
};

export default LevelTextItemDescription;
