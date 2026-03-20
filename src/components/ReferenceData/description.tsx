import LangTextItemDescription from '@/components/LangTextItem/description';
import { Card, Descriptions, Divider } from 'antd';
import { FC } from 'react';

type Props = {
  title: string;
  data: any;
};

const SourceDescription: FC<Props> = ({ title, data }) => {
  // if (!data) {
  //   return (
  //     <Card size="small" title={title}>
  //       <Descriptions bordered size={'small'} column={1}>
  //         <Descriptions.Item key={0} styles={{ label: { display: 'none' } }}>
  //           -
  //         </Descriptions.Item>
  //       </Descriptions>
  //     </Card>
  //   );
  // }
  return (
    <Card size='small' title={title}>
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label='Type' styles={{ label: { width: '120px' } }}>
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label='Ref Object Id' styles={{ label: { width: '120px' } }}>
          {data?.['@refObjectId'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label='URI' styles={{ label: { width: '120px' } }}>
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label='Version' styles={{ label: { width: '120px' } }}>
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <Divider orientationMargin='0' orientation='left' plain>
        Short Description
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
    </Card>
  );
};

export default SourceDescription;
