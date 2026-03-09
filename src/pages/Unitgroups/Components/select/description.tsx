import { toSuperscript } from '@/components/AlignedNumber';
import LangTextItemDescription from '@/components/LangTextItem/description';
import { listToJson } from '@/services/general/util';
import { getReferenceUnit } from '@/services/unitgroups/api';
import { UnitGroupRefObject, UnitReferenceData } from '@/services/unitgroups/data';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage, getLocale } from 'umi';
import UnitGroupView from '../view';

type Props = {
  title: ReactNode | string;
  data: UnitGroupRefObject | Record<string, unknown> | Array<Record<string, unknown>>;
  lang: string;
};

const UnitGroupSelectDescription: FC<Props> = ({ title, data, lang }) => {
  const [refUnit, setRefUnit] = useState<UnitReferenceData | null>(null);
  const locale = getLocale();
  const normalizedData = listToJson(data);
  const refData = normalizedData as UnitGroupRefObject;
  useEffect(() => {
    if (refData?.['@refObjectId']) {
      getReferenceUnit(refData?.['@refObjectId'] ?? '', refData?.['@version'] ?? '').then((res) => {
        setRefUnit(res?.data ?? null);
      });
    }
  }, [refData]);

  return (
    <Card size='small' title={title}>
      <Space direction='horizontal'>
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id='pages.unitgroup.refObjectId' defaultMessage='Ref object id' />
            }
            labelStyle={{ width: locale === 'zh-CN' ? '210px' : '230px' }}
          >
            {refData?.['@refObjectId'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        {refData?.['@refObjectId'] && (
          <UnitGroupView
            id={refData?.['@refObjectId'] ?? ''}
            version={refData?.['@version'] ?? ''}
            lang={lang}
            buttonType='text'
          />
        )}
      </Space>
      <br />
      {/* <br /> */}
      {/* <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          key={0}
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.flowPropertiesInformation.type"
              defaultMessage="Type"
            />
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
          label={
            <FormattedMessage
              id="pages.FlowProperties.view.flowPropertiesInformation.uri"
              defaultMessage="URI"
            />
          }
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
          id='pages.FlowProperties.view.flowPropertiesInformation.shortDescription'
          defaultMessage='Short description'
        />
      </Divider>
      <LangTextItemDescription data={refData?.['common:shortDescription']} />
      <br />
      <Card
        size='small'
        title={
          <FormattedMessage
            id='pages.unitgroup.unit.quantitativeReference'
            defaultMessage='Quantitative reference'
          />
        }
      >
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id='pages.unitgroup.name' defaultMessage='Name of unit group' />
            }
            styles={{ label: { width: '160px' } }}
          >
            {toSuperscript(refUnit?.refUnitName ?? '-')}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Divider orientationMargin='0' orientation='left' plain>
          <FormattedMessage id='pages.unitgroup.generalComment' defaultMessage='General comment' />
        </Divider>
        <LangTextItemDescription data={refUnit?.refUnitGeneralComment} />
      </Card>
    </Card>
  );
};

export default UnitGroupSelectDescription;
