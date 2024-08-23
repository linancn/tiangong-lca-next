import LangTextItemDescription from '@/components/LangTextItem/description';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';
type Props = {
  data: any;
};
const ModelToolbarViewInfo: FC<Props> = ({ data }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.button.model.info" defaultMessage="Base Infomation" />}
        placement="left"
      >
        <Button
          shape="circle"
          size="small"
          icon={<InfoOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        ></Button>
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.info"
            defaultMessage="Model Base Infomation"
          ></FormattedMessage>
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => {
              setDrawerVisible(false);
            }}
          ></Button>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
        }}
        footer={false}
      >
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage id="pages.product.productInformation.id" defaultMessage="ID" />
            }
            labelStyle={{ width: '100px' }}
          >
            {data?.productInformation?.dataSetInformation?.['common:UUID'] ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage id="pages.product.productInformation.name" defaultMessage="Name" />
        </Divider>
        <LangTextItemDescription data={data?.productInformation?.dataSetInformation?.['name']} />
        <Divider orientationMargin="0" orientation="left" plain>
          <FormattedMessage
            id="pages.product.productInformation.generalComment"
            defaultMessage="General Comment"
          />
        </Divider>
        <LangTextItemDescription
          data={data?.productInformation?.dataSetInformation?.['common:generalComment']}
        />
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage id="pages.product.belongToFlow" defaultMessage="Belong to The Flow" />
          }
        >
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={<FormattedMessage id="pages.product.belongToFlow.id" defaultMessage="ID" />}
              labelStyle={{ width: '100px' }}
            >
              {data?.productInformation?.referenceToFlowDataSet?.['@refObjectId'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage id="pages.product.belongToFlow.name" defaultMessage="Name" />
          </Divider>
          <LangTextItemDescription
            data={data?.productInformation?.referenceToFlowDataSet?.['common:name']}
          />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.product.belongToFlow.generalComment"
              defaultMessage="General Comment"
            />
          </Divider>
          <LangTextItemDescription
            data={data?.productInformation?.referenceToFlowDataSet?.['common:generalComment']}
          />
        </Card>
      </Drawer>
    </>
  );
};

export default ModelToolbarViewInfo;
