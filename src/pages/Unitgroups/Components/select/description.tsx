import LangTextItemDescription from '@/components/LangTextItem/description';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC } from 'react';
import UnitGroupView from '../view';
import React, { ReactNode } from'react';
import { FormattedMessage } from 'umi';
type Props = {
  title: ReactNode | string;
  data: any;
  lang: string;
};

const UnitGroupSelectDescription: FC<Props> = ({ title, data, lang }) => {
  // const actionRef = React.useRef<ActionType | undefined>(undefined);

  return (
    <Card size="small" title={title}>
      <Space direction="horizontal">
        <Descriptions bordered size={'small'} column={1} style={{ width: '470px' }}>
          <Descriptions.Item key={0} label={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.refObjectId" defaultMessage="Ref Object Id" />} labelStyle={{ width: '120px' }}>
            {data?.['@refObjectId'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {data?.['@refObjectId'] && (
          <UnitGroupView id={data?.['@refObjectId']} lang={lang} buttonType="text" />
        )}
      </Space>
      <br />
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.type" defaultMessage="Type" />} labelStyle={{ width: '120px' }}>
          {data?.['@type'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label={<FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.uri" defaultMessage="URI" />} labelStyle={{ width: '120px' }}>
          {data?.['@uri'] ?? '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      {/* <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item key={0} label="Version" labelStyle={{ width: '120px' }}>
          {data?.['@version'] ?? '-'}
        </Descriptions.Item>
      </Descriptions> */}
      <Divider orientationMargin="0" orientation="left" plain>
      <FormattedMessage id="pages.FlowProperties.view.flowPropertiesInformation.shortDescription" defaultMessage="Short Description" /> 
      </Divider>
      <LangTextItemDescription data={data?.['common:shortDescription']} />
    </Card>
  );
};

export default UnitGroupSelectDescription;
