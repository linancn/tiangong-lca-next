import LangTextItemDescription from '@/components/LangTextItem/description';
import UnitGroupDescriptionMini from '@/pages/Unitgroups/Components/select/descriptionMini';
import type { ReferenceItem } from '@/services/general/data';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage, getLocale } from 'umi';
import FlowpropertiesView from '../view';

type Props = {
  title: ReactNode | string;
  data: ReferenceItem | null;
  lang: string;
};

const FlowpropertiesSelectDescription: FC<Props> = ({ title, data, lang }) => {
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
                id='pages.flow.view.flowProperties.refObjectId'
                defaultMessage='Ref object id'
              />
            }
            labelStyle={{ width: locale === 'zh-CN' ? '190px' : '310px' }}
          >
            {refObjectId || '-'}
          </Descriptions.Item>
        </Descriptions>
        {refObjectId && (
          <FlowpropertiesView id={refObjectId} version={refVersion} lang={lang} buttonType='text' />
        )}
      </Space>
      <br />
      {/* <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={
            <FormattedMessage id="pages.flow.view.flowProperties.type" defaultMessage="Type" />
          }
          labelStyle={{ width: '140px' }}
        >
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={<FormattedMessage id="pages.flow.view.flowProperties.uri" defaultMessage="URI" />}
          labelStyle={{ width: '140px' }}
        >
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions> */}
      {/* <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label="Version" labelStyle={{ width: '120px' }}>
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions> */}
      <Divider orientationMargin='0' orientation='left' plain>
        <FormattedMessage
          id='pages.flow.view.flowProperties.shortDescription'
          defaultMessage='Short description'
        />
      </Divider>
      <LangTextItemDescription data={refData?.['common:shortDescription']} />
      <br />

      <UnitGroupDescriptionMini id={refObjectId} version={refVersion} idType={'flowproperty'} />
    </Card>
  );
};

export default FlowpropertiesSelectDescription;
