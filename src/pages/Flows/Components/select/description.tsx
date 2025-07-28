import LangTextItemDescription from '@/components/LangTextItem/description';
import UnitGroupDescriptionMini from '@/pages/Unitgroups/Components/select/descriptionMini';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage, getLocale } from 'umi';
import FlowsView from '../view';
type Props = {
  title: ReactNode | string;
  data: any;
  lang: string;
};

const FlowsSelectDescription: FC<Props> = ({ title, data, lang }) => {
  const locale = getLocale();
  return (
    <Card size='small' title={title}>
      <Space direction='horizontal'>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.process.view.exchange.refObjectId'
                defaultMessage='Ref object id'
              />
            }
            labelStyle={{ width: locale === 'zh-CN' ? '160px' : '240px' }}
          >
            {data?.['@refObjectId'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {data?.['@refObjectId'] && (
          <FlowsView
            id={data?.['@refObjectId']}
            version={data?.['@version']}
            lang={lang}
            buttonType='text'
          />
        )}
      </Space>
      <br />
      {/* <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.process.view.exchange.type" defaultMessage="Type" />}
          labelStyle={{ width: '140px' }}
        >
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.process.view.exchange.uri" defaultMessage="URI" />}
          labelStyle={{ width: '140px' }}
        >
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br /> */}
      {/* <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label="Version" labelStyle={{ width: '120px' }}>
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions> */}
      <Divider orientationMargin='0' orientation='left' plain>
        <FormattedMessage
          id='pages.process.view.exchange.shortDescription'
          defaultMessage='Short description'
        />
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
      <br />
      <UnitGroupDescriptionMini
        id={data?.['@refObjectId']}
        version={data?.['@version']}
        idType={'flow'}
      />
    </Card>
  );
};

export default FlowsSelectDescription;
