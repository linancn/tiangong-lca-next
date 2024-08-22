import { getLangList } from '@/services/general/util';
import { Descriptions } from 'antd';
import { FC } from 'react';

type Props = {
  data: any;
};

const LangTextItemDescription: FC<Props> = ({ data }) => {
  if (!data || getLangList(data).length === 0) {
    return (
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} labelStyle={{ display: 'none' }}>
          -
        </Descriptions.Item>
      </Descriptions>
    );
  }
  const items = getLangList(data);
  return (
    <Descriptions bordered size={'small'} column={1}>
      {items?.map((name: any, index: number) => (
        <Descriptions.Item
          key={index}
          label={name['@xml:lang'] ?? '-'}
          labelStyle={{ width: '100px' }}
        >
          {name['#text'] ?? '-'}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

export default LangTextItemDescription;
