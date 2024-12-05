import LangTextItemDescription from '@/components/LangTextItem/description';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage } from 'umi';
import ContactView from '../view';

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
        <Descriptions bordered size={'small'} column={1} style={{ width: '450px' }}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id="pages.contact.refObjectId" defaultMessage="Ref object id" />
            }
            labelStyle={{ width: '140px' }}
          >
            {data?.['@refObjectId'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {data?.['@refObjectId'] && (
          <ContactView
            id={data?.['@refObjectId']}
            version={data?.['@version']}
            lang={lang}
            buttonType="text"
          />
        )}
      </Space>
      <br />
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.contact.type" defaultMessage="Type" />}
          labelStyle={{ width: '140px' }}
        >
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.contact.uri" defaultMessage="URI" />}
          labelStyle={{ width: '140px' }}
        >
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.contact.version" defaultMessage="Version" />}
          labelStyle={{ width: '140px' }}
        >
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <Divider orientationMargin="0" orientation="left" plain>
        <FormattedMessage id="pages.contact.shortDescription" defaultMessage="Short description" />
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
    </Card>
  );
};

export default ContactSelectDescription;
