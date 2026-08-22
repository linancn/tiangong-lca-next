import LangTextItemDescription from '@/components/LangTextItem/description';
import { ContactReference } from '@/services/contacts/data';
import { RESPONSIVE_DESCRIPTION_ITEM_STYLES } from '@/style/responsiveDescriptions';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage } from 'umi';
import ContactView from '../view';

type Props = {
  title: ReactNode | string;
  data?: ContactReference;
  lang: string;
};

const ContactSelectDescription: FC<Props> = ({ title, data, lang }) => {
  const refItem = Array.isArray(data) ? data[0] : data;
  const refId = refItem?.['@refObjectId'];
  const refVersion = refItem?.['@version'];
  // const actionRef = React.useRef<ActionType | undefined>(undefined);

  return (
    <Card size='small' title={title}>
      <Space orientation='horizontal'>
        <Descriptions
          bordered
          size={'small'}
          column={1}
          styles={RESPONSIVE_DESCRIPTION_ITEM_STYLES}
          items={[
            {
              key: 0,
              label: (
                <FormattedMessage
                  id='pages.contact.refObjectId'
                  defaultMessage='Reference contact data set identifier'
                />
              ),
              children: refItem?.['@refObjectId'] ?? '-',
            },
          ]}
        />
        {refId && (
          <ContactView id={refId} version={refVersion ?? ''} lang={lang} buttonType='text' />
        )}
      </Space>
      <br />
      <br />
      <Descriptions
        bordered
        size={'small'}
        column={1}
        items={[
          {
            key: 0,
            label: <FormattedMessage id='pages.contact.version' defaultMessage='Version' />,
            styles: {
              label: {
                width: '140px',
              },
            },
            children: refItem?.['@version'] ?? '-',
          },
        ]}
      />
      <Divider titlePlacement='start' styles={{ content: { margin: 0 } }} plain>
        <FormattedMessage id='pages.contact.shortDescription' defaultMessage='Short description' />
      </Divider>
      <LangTextItemDescription data={refItem?.['common:shortDescription']} />
    </Card>
  );
};

export default ContactSelectDescription;
