import LangTextItemDescription from '@/components/LangTextItem/description';
import { Card, Descriptions, Divider } from 'antd';
import { FC } from 'react';

type Props = {
  title: string;
  data: any;
};

const SourceDescription: FC<Props> = ({ title, data }) => {
  return (
    <Card size='small' title={title}>
      <Descriptions
        bordered
        size='small'
        column={1}
        items={[
          {
            key: 'type',
            label: 'Type',
            styles: { label: { width: '120px' } },
            children: data?.['@type'] ?? '-',
          },
        ]}
      />
      <br />
      <Descriptions
        bordered
        size='small'
        column={1}
        items={[
          {
            key: 'reference-object-id',
            label: 'Reference object ID',
            styles: { label: { width: '120px' } },
            children: data?.['@refObjectId'] ?? '-',
          },
        ]}
      />
      <br />
      <Descriptions
        bordered
        size='small'
        column={1}
        items={[
          {
            key: 'uri',
            label: 'URI',
            styles: { label: { width: '120px' } },
            children: data?.['@uri'] ?? '-',
          },
        ]}
      />
      <br />
      <Descriptions
        bordered
        size='small'
        column={1}
        items={[
          {
            key: 'version',
            label: 'Version',
            styles: { label: { width: '120px' } },
            children: data?.['@version'] ?? '-',
          },
        ]}
      />
      <Divider plain titlePlacement='start'>
        Short Description
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
    </Card>
  );
};

export default SourceDescription;
