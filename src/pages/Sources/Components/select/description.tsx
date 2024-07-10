import LangTextItemDescription from '@/components/LangTextItem/description';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC } from 'react';
import SourceView from '../view';

type Props = {
  title: string;
  lang: string;
  data: any;
};

const SourceSelectDescription: FC<Props> = ({ title, lang, data }) => {
  return (
    <Card size="small" title={title}>
      <Space direction="horizontal">
        <Descriptions bordered size={'small'} column={1} style={{ width: '420px' }}>
          <Descriptions.Item key={0} label="Ref Object Id" labelStyle={{ width: '120px' }}>
            {data?.['@refObjectId'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {data?.['@refObjectId'] && (
          <SourceView
            id={data?.['@refObjectId']}
            buttonType="text"
            lang={lang} />
        )}
      </Space>
      <br />
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label="Type" labelStyle={{ width: '120px' }}>
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label="URI" labelStyle={{ width: '120px' }}>
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      {/* <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label="Version" labelStyle={{ width: '120px' }}>
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions> */}
      <Divider orientationMargin="0" orientation="left" plain>
        Short Description
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
    </Card>
  );
};

export default SourceSelectDescription;
