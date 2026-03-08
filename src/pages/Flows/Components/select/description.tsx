import LangTextItemDescription from '@/components/LangTextItem/description';
import UnitGroupDescriptionMini from '@/pages/Unitgroups/Components/select/descriptionMini';
import { ReferenceItem } from '@/services/general/data';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage, getLocale } from 'umi';
import FlowsView from '../view';
type Props = {
  title: ReactNode | string;
  data: ReferenceItem | null;
  lang: string;
};

const FlowsSelectDescription: FC<Props> = ({ title, data, lang }) => {
  const locale = getLocale();
  const refData = data ?? undefined;
  const refObjectId = refData?.['@refObjectId'] ?? '';
  const refVersion = refData?.['@version'] ?? '';
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
            {refObjectId || '-'}
          </Descriptions.Item>
        </Descriptions>
        {refObjectId && (
          <FlowsView id={refObjectId} version={refVersion} lang={lang} buttonType='text' />
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
      <LangTextItemDescription data={refData?.['common:shortDescription']} />
      <br />
      <UnitGroupDescriptionMini id={refObjectId} version={refVersion} idType={'flow'} />
    </Card>
  );
};

export default FlowsSelectDescription;
