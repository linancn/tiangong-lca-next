import LangTextItemDescription from '@/components/LangTextItem/description';
import UnitGroupDescriptionMini from '@/pages/Unitgroups/Components/select/descriptionMini';
import { ReferenceItem } from '@/services/general/data';
import { RESPONSIVE_DESCRIPTION_ITEM_STYLES } from '@/style/responsiveDescriptions';
import { Card, Descriptions, Divider, Space } from 'antd';
import { FC, ReactNode } from 'react';
import { FormattedMessage } from 'umi';
import FlowsView from '../view';
type Props = {
  title: ReactNode | string;
  data: ReferenceItem | null;
  lang: string;
};

const FlowsSelectDescription: FC<Props> = ({ title, data, lang }) => {
  const refData = data ?? undefined;
  const refObjectId = refData?.['@refObjectId'] ?? '';
  const refVersion = refData?.['@version'] ?? '';
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
                  id='pages.process.view.exchange.refObjectId'
                  defaultMessage='Reference flow dataset identifier'
                />
              ),
              children: refObjectId || '-',
            },
          ]}
        />
        {refObjectId && (
          <FlowsView id={refObjectId} version={refVersion} lang={lang} buttonType='text' />
        )}
      </Space>
      <br />
      <Divider titlePlacement='start' styles={{ content: { margin: 0 } }} plain>
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
