import LangTextItemDescription from '@/components/LangTextItem/description';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import FlowsSelectDescription from '@/pages/Flows/Components/select/description';
import { getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Divider, Drawer, Row, Spin } from 'antd';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  lang: string;
  sourceProcessId: string;
  sourceProcessVersion: string;
  targetProcessId: string;
  targetProcessVersion: string;
  sourceOutputFlowID: string;
  targetInputFlowID: string;
  drawerVisible: boolean;
  onDrawerClose: () => void;
};
const EdgeExchangeView: FC<Props> = ({
  lang,
  sourceProcessId,
  sourceProcessVersion,
  targetProcessId,
  targetProcessVersion,
  sourceOutputFlowID,
  targetInputFlowID,
  drawerVisible,
  onDrawerClose,
}) => {
  const [exchangeDataSource, setExchangeDataSource] = useState<any>({});
  const [exchangeDataTarget, setExchangeDataTarget] = useState<any>({});
  const [spinningSource, setSpinningSource] = useState(false);
  const [spinningTarget, setSpinningTarget] = useState(false);

  useEffect(() => {
    if (!drawerVisible) return;
    setSpinningSource(true);
    setSpinningTarget(true);
    getProcessDetail(sourceProcessId, sourceProcessVersion).then(async (result) => {
      const sourceData = (
        genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []
      ).find(
        (item: any) =>
          (item?.exchangeDirection).toUpperCase() === 'OUTPUT' &&
          item?.referenceToFlowDataSet?.['@refObjectId'] === sourceOutputFlowID,
      );
      setExchangeDataSource(sourceData);
      setSpinningSource(false);
    });

    getProcessDetail(targetProcessId, targetProcessVersion).then(async (result) => {
      const targetData = (
        genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []
      ).find(
        (item: any) =>
          (item?.exchangeDirection).toUpperCase() === 'INPUT' &&
          item?.referenceToFlowDataSet?.['@refObjectId'] === targetInputFlowID,
      );
      setExchangeDataTarget(targetData);
      setSpinningTarget(false);
    });
  }, [drawerVisible]);

  return (
    <>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.edge.exchange.view"
            defaultMessage="View exchange relation"
          />
        }
        width="90%"
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        footer={false}
        maskClosable={true}
        open={drawerVisible}
        onClose={onDrawerClose}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Card
              title={
                <FormattedMessage
                  id="pages.flow.model.sourceOutputFlowName"
                  defaultMessage="Source process output flow"
                />
              }
              bordered={false}
            >
              <Spin spinning={spinningSource}>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.exchangeDirection"
                        defaultMessage="Exchange direction"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource?.exchangeDirection ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <FlowsSelectDescription
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.referenceToFlowDataSet"
                      defaultMessage="Flow"
                    />
                  }
                  data={exchangeDataSource?.referenceToFlowDataSet ?? {}}
                  lang={lang}
                />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.meanAmount"
                        defaultMessage="Mean amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource?.meanAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.resultingAmount"
                        defaultMessage="Resulting amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource?.resultingAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.dataDerivationTypeStatus"
                        defaultMessage="Data derivation type / status"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource?.dataDerivationTypeStatus ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                  <FormattedMessage
                    id="pages.process.view.exchange.generalComment"
                    defaultMessage="Comment"
                  />
                </Divider>
                <LangTextItemDescription data={exchangeDataSource?.generalComment} />
                <br />
                <Card
                  size="small"
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.quantitativeReference"
                      defaultMessage="Quantitative reference"
                    />
                  }
                >
                  <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item
                      key={0}
                      label={
                        <FormattedMessage
                          id="pages.process.view.exchange.referenceToReferenceFlow"
                          defaultMessage="Reference flow(s)"
                        />
                      }
                      labelStyle={{ width: '220px' }}
                    >
                      {
                        <QuantitativeReferenceIcon
                          value={exchangeDataSource?.quantitativeReference}
                        />
                      }
                    </Descriptions.Item>
                  </Descriptions>
                  <Divider orientationMargin="0" orientation="left" plain>
                    <FormattedMessage
                      id="pages.process.view.exchange.functionalUnitOrOther"
                      defaultMessage="Functional unit, Production period, or Other parameter"
                    />
                  </Divider>
                  <LangTextItemDescription data={exchangeDataSource?.functionalUnitOrOther} />
                </Card>
              </Spin>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={
                <FormattedMessage
                  id="pages.flow.model.targetInputFlowName"
                  defaultMessage="Target process input flow"
                />
              }
              bordered={false}
            >
              <Spin spinning={spinningTarget}>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.exchangeDirection"
                        defaultMessage="Exchange direction"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget?.exchangeDirection ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <FlowsSelectDescription
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.referenceToFlowDataSet"
                      defaultMessage="Flow"
                    />
                  }
                  data={exchangeDataTarget?.referenceToFlowDataSet ?? {}}
                  lang={lang}
                />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.meanAmount"
                        defaultMessage="Mean amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget?.meanAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.resultingAmount"
                        defaultMessage="Resulting amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget?.resultingAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.dataDerivationTypeStatus"
                        defaultMessage="Data derivation type / status"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget?.dataDerivationTypeStatus ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                  <FormattedMessage
                    id="pages.process.view.exchange.generalComment"
                    defaultMessage="Comment"
                  />
                </Divider>
                <LangTextItemDescription data={exchangeDataTarget?.generalComment} />
                <br />
                <Card
                  size="small"
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.quantitativeReference"
                      defaultMessage="Quantitative reference"
                    />
                  }
                >
                  <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item
                      key={0}
                      label={
                        <FormattedMessage
                          id="pages.process.view.exchange.referenceToReferenceFlow"
                          defaultMessage="Reference flow(s)"
                        />
                      }
                      labelStyle={{ width: '220px' }}
                    >
                      {
                        <QuantitativeReferenceIcon
                          value={exchangeDataTarget?.quantitativeReference}
                        />
                      }
                    </Descriptions.Item>
                  </Descriptions>
                  <Divider orientationMargin="0" orientation="left" plain>
                    <FormattedMessage
                      id="pages.process.view.exchange.functionalUnitOrOther"
                      defaultMessage="Functional unit, Production period, or Other parameter"
                    />
                  </Divider>
                  <LangTextItemDescription data={exchangeDataTarget?.functionalUnitOrOther} />
                </Card>
              </Spin>
            </Card>
          </Col>
        </Row>
      </Drawer>
    </>
  );
};

export default EdgeExchangeView;
