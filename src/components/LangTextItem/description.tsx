import { getLanguageDisplayName } from '@/services/general/contentLanguageRegistry';
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
        <Descriptions.Item key={0} styles={{ label: { display: 'none' } }}>
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
          label={getLanguageDisplayName(name?.['@xml:lang'])}
          styles={{ label: { width: '100px' } }}
        >
          {name?.['#text'] ?? '-'}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

export default LangTextItemDescription;
