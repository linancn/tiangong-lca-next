import { toSuperscript } from '@/components/AlignedNumber';
import LangTextItemDescription from '@/components/LangTextItem/description';
import { listToJson } from '@/services/general/util';
import { getReferenceUnit } from '@/services/unitgroups/api';
import { UnitGroupRefObject, UnitReferenceData } from '@/services/unitgroups/data';
import { RESPONSIVE_DESCRIPTION_ITEM_STYLES } from '@/style/responsiveDescriptions';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';
import UnitGroupView from '../view';

type Props = {
  title: ReactNode | string;
  data: UnitGroupRefObject | Record<string, unknown> | Array<Record<string, unknown>>;
  lang: string;
};

const UnitGroupSelectDescription: FC<Props> = ({ title, data, lang }) => {
  const [refUnit, setRefUnit] = useState<UnitReferenceData | null>(null);
  const normalizedData = listToJson(data);
  const refData = normalizedData as UnitGroupRefObject;
  useEffect(() => {
    if (refData?.['@refObjectId']) {
      getReferenceUnit(refData['@refObjectId'], refData?.['@version'] ?? '').then((res) => {
        setRefUnit(res?.data ?? null);
      });
    }
  }, [refData]);

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
                  id='pages.unitgroup.refObjectId'
                  defaultMessage='Reference unit group data set identifier'
                />
              ),
              children: refData?.['@refObjectId'] ?? '-',
            },
          ]}
        />
        {refData?.['@refObjectId'] && (
          <UnitGroupView
            id={refData['@refObjectId']}
            version={refData?.['@version'] ?? ''}
            lang={lang}
            buttonType='text'
          />
        )}
      </Space>
      <br />
      <Divider titlePlacement='start' styles={{ content: { margin: 0 } }} plain>
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
        <Descriptions
          bordered
          size={'small'}
          column={1}
          items={[
            {
              key: 0,
              label: (
                <FormattedMessage id='pages.unitgroup.name' defaultMessage='Name of unit group' />
              ),
              styles: {
                label: {
                  width: '160px',
                },
              },
              children: toSuperscript(refUnit?.refUnitName ?? '-'),
            },
          ]}
        />
        <br />
        <Divider titlePlacement='start' styles={{ content: { margin: 0 } }} plain>
          <FormattedMessage id='pages.unitgroup.generalComment' defaultMessage='General comment' />
        </Divider>
        <LangTextItemDescription data={refUnit?.refUnitGeneralComment} />
      </Card>
    </Card>
  );
};

export default UnitGroupSelectDescription;
