import LangTextItemDescription from '@/components/LangTextItem/description';
import FlowsView from '@/pages/Flows/Components/view';
import UnitGroupDescriptionMini from '@/pages/Unitgroups/Components/select/descriptionMini';
import { getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { CloseOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Divider, Drawer, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  refNode: any;
  drawerVisible: boolean;
  lang: string;
  setDrawerVisible: (value: boolean) => void;
  onData: (data: any) => void;
};
const TargetAmount: FC<Props> = ({ refNode, drawerVisible, lang, setDrawerVisible }) => {
  const [initData, setInitData] = useState<any>({});
  const [refExchange, setRefExchange] = useState<any>({});

  const onDrawerOpen = () => {
    setDrawerVisible(true);
  };

  const onDrawerClose = () => {
    setDrawerVisible(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    if (refNode) {
      const id = refNode?.data?.id;
      const version = refNode?.data?.version;
      getProcessDetail(id, version).then(async (result: any) => {
        const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
        setInitData({ ...dataSet, id: id });
        const quantitativeReference = dataSet?.processInformation?.quantitativeReference;
        const refExc =
          (dataSet?.exchanges?.exchange ?? []).find(
            (item: any) =>
              item?.['@dataSetInternalID'] === quantitativeReference?.referenceToReferenceFlow,
          ) ?? {};
        setRefExchange(refExc);
      });
    }
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage id="pages.lifeCycleModel.targetAmount" defaultMessage="Target amount" />
        }
        placement="left"
      >
        <Button
          type="primary"
          size="small"
          icon={<StarOutlined />}
          style={{ boxShadow: 'none' }}
          disabled={!refNode}
          onClick={onDrawerOpen}
        />
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.lifeCycleModel.targetAmount" defaultMessage="Target amount" />
        }
        width="90%"
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        footer={false}
        maskClosable={true}
        open={drawerVisible}
        onClose={onDrawerClose}
      >
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.targetAmount"
                defaultMessage="Target amount"
              />
            }
            labelStyle={{ width: '140px' }}
          >
            {refNode?.data?.targetAmount ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.originalAmount"
                defaultMessage="Original amount"
              />
            }
            labelStyle={{ width: '140px' }}
          >
            {refNode?.data?.originalAmount ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            key={0}
            label={
              <FormattedMessage
                id="pages.lifeCycleModel.scalingFactor"
                defaultMessage="Scaling factor"
              />
            }
            labelStyle={{ width: '140px' }}
          >
            {refNode?.data?.scalingFactor ?? '-'}
          </Descriptions.Item>
        </Descriptions>
        <br />
        <Card
          size="small"
          title={
            <FormattedMessage
              id="pages.flow.model.drawer.title.refFlow"
              defaultMessage="Ref flow"
            />
          }
        >
          <Space direction="horizontal">
            <Descriptions bordered size={'small'} column={1} style={{ width: '450px' }}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage
                    id="pages.process.view.exchange.refObjectId"
                    defaultMessage="Ref object id"
                  />
                }
                labelStyle={{ width: '140px' }}
              >
                {refExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            {refExchange?.referenceToFlowDataSet?.['@refObjectId'] && (
              <FlowsView
                id={refExchange?.referenceToFlowDataSet?.['@refObjectId']}
                version={refExchange?.referenceToFlowDataSet?.['@version']}
                lang={lang}
                buttonType="text"
              />
            )}
          </Space>
          <br />
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={
                <FormattedMessage id="pages.process.view.exchange.type" defaultMessage="Type" />
              }
              labelStyle={{ width: '140px' }}
            >
              {refExchange?.referenceToFlowDataSet?.['@type'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={<FormattedMessage id="pages.process.view.exchange.uri" defaultMessage="URI" />}
              labelStyle={{ width: '140px' }}
            >
              {refExchange?.referenceToFlowDataSet?.['@uri'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <br />
          <Descriptions bordered size={'small'} column={1}>
            <Descriptions.Item
              key={0}
              label={<FormattedMessage id="pages.version" defaultMessage="Version" />}
              labelStyle={{ width: '120px' }}
            >
              {refExchange?.referenceToFlowDataSet?.['@version'] ?? '-'}
            </Descriptions.Item>
          </Descriptions>
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.process.view.exchange.shortDescription"
              defaultMessage="Short description"
            />
          </Divider>
          <LangTextItemDescription
            data={refExchange?.referenceToFlowDataSet?.['common:shortDescription']}
          />
          <br />
          <UnitGroupDescriptionMini
            id={refExchange?.referenceToFlowDataSet?.['@refObjectId']}
            version={refExchange?.referenceToFlowDataSet?.['@version']}
            idType={'flow'}
          />
        </Card>
        <br />
        <Card
          size="small"
          title={<FormattedMessage id="pages.lifeCycleModel.refNode" defaultMessage="Ref node" />}
        >
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage id="pages.lifeCycleModel.information.name" defaultMessage="Name" />
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.dataSetInformation?.name?.baseName}
          />
          <br />
          <Divider orientationMargin="0" orientation="left" plain>
            <FormattedMessage
              id="pages.lifeCycleModel.information.generalComment"
              defaultMessage="General Comment"
            />
          </Divider>
          <LangTextItemDescription
            data={initData.processInformation?.dataSetInformation?.['common:generalComment']}
          />
        </Card>
      </Drawer>
    </>
  );
};

export default TargetAmount;
