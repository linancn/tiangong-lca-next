import LangTextItemDescription from '@/components/LangTextItem/description';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import ContactView from '../view';
import { FormattedMessage } from 'umi';

type Props = {
  title: ReactNode | string;
  data: any;
  lang: string;
};

const ContactSelectDescription: FC<Props> = ({ title, data, lang }) => {
  // const actionRef = React.useRef<ActionType | undefined>(undefined);

  return (
    <Card size="small" title={title}>
      <Space direction="horizontal">
        <Descriptions bordered size={'small'} column={1} style={{ width: '470px' }}>
          <Descriptions.Item key={0} label={<FormattedMessage id="pages.contact.refObjectId" defaultMessage="Ref Object Id" />} labelStyle={{ width: '120px' }}>
            {data?.['@refObjectId'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {data?.['@refObjectId'] && (
          <ContactView id={data?.['@refObjectId']} lang={lang} buttonType="text" />
        )}
      </Space>
      <br />
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label={<FormattedMessage id="pages.contact.type" defaultMessage="Type" />}labelStyle={{ width: '120px' }}>
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label={<FormattedMessage id="pages.contact.uri" defaultMessage="URI" />} labelStyle={{ width: '120px' }}>
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label={<FormattedMessage id="pages.contact.version" defaultMessage="Version" />} labelStyle={{ width: '120px' }}>
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <Divider orientationMargin="0" orientation="left" plain>
        Short Description
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
    </Card>
  );
};

export default ContactSelectDescription;
