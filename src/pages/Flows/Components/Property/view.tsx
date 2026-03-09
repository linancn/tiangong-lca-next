import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import FlowpropertiesSelectDescription from '@/pages/Flowproperties/Components/select/description';
import { FlowPropertyData } from '@/services/flows/data';
import { ReferenceItem } from '@/services/general/data';
import { CloseOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Descriptions, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  data: FlowPropertyData[];
  lang: string;
  buttonType: string;
};
const PropertyView: FC<Props> = ({ id, data, lang, buttonType }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [viewData, setViewData] = useState<FlowPropertyData>({});

  const onView = () => {
    setDrawerVisible(true);
    const filteredData = data?.find((item) => item['@dataSetInternalID'] === id) ?? {};
    setViewData(filteredData);
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id='pages.button.view' defaultMessage='View Exchange' />}>
        {buttonType === 'icon' ? (
          <Button shape='circle' icon={<ProfileOutlined />} size='small' onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id='pages.button.view' defaultMessage='View' />
          </Button>
        )}
      </Tooltip>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.process.exchange.drawer.title.view'
            defaultMessage='View Exchange'
          />
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        footer={null}
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <FlowpropertiesSelectDescription
          data={(viewData?.['referenceToFlowPropertyDataSet'] as ReferenceItem | undefined) ?? null}
          lang={lang}
          title={
            <FormattedMessage
              id='pages.flow.view.flowProperties.referenceToFlowPropertyDataSet'
              defaultMessage='Flow property'
            />
          }
        />
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.flow.view.flowProperties.meanValue'
                defaultMessage='Mean value (of flow property)'
              />
            }
            styles={{ label: { width: '230px' } }}
          >
            {viewData?.['meanValue'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id='pages.process.view.exchange.quantitativeReference'
                defaultMessage='Quantitative reference'
              />
            }
            labelStyle={{ width: '220px' }}
          >
            {<QuantitativeReferenceIcon value={Boolean(viewData.quantitativeReference)} />}
          </Descriptions.Item>
        </Descriptions>
      </Drawer>
    </>
  );
};

export default PropertyView;
