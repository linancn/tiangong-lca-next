import LangTextItemDescription from '@/components/LangTextItem/description';
import FlowsSelectDescription from '@/pages/Flows/Components/select/description';
import { getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import {
  CheckCircleTwoTone,
  CloseCircleOutlined,
  CloseOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Divider, Drawer, Row, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  lang: string;
  buttonType: string;
  sourceProcessId: string;
  targetProcessId: string;
  sourceOutputFlowInternalID: string;
  targetInputFlowInternalID: string;
};
const EdgeExchangeView: FC<Props> = ({
  lang,
  buttonType,
  sourceProcessId,
  targetProcessId,
  sourceOutputFlowInternalID,
  targetInputFlowInternalID,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [exchangeDataSource, setExchangeDataSource] = useState<any>({});
  const [exchangeDataTarget, setExchangeDataTarget] = useState<any>({});
  const [spinningSource, setSpinningSource] = useState(false);
  const [spinningTarget, setSpinningTarget] = useState(false);

  const onView = () => {
    setDrawerVisible(true);
    setSpinningSource(true);
    setSpinningTarget(true);
    getProcessDetail(sourceProcessId).then(async (result) => {
      const sourceDatas = (
        genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []
      ).filter(
        (item: any) =>
          (item?.exchangeDirection).toLowerCase() === 'output' &&
          item?.['@dataSetInternalID'] === sourceOutputFlowInternalID,
      );
      if (sourceDatas.length > 0) {
        setExchangeDataSource(sourceDatas[0]);
      }
      setSpinningSource(false);
    });

    getProcessDetail(targetProcessId).then(async (result) => {
      const targetDatas = (
        genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? []
      ).filter(
        (item: any) =>
          (item?.exchangeDirection).toLowerCase() === 'input' &&
          item?.['@dataSetInternalID'] === targetInputFlowInternalID,
      );
      if (targetDatas.length > 0) {
        setExchangeDataTarget(targetDatas[0]);
      }
      setSpinningTarget(false);
    });
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.view" defaultMessage="View Exchange" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<ProfileOutlined />} size="small" onClick={onView} />
        ) : (
          <Button onClick={onView}>
            <FormattedMessage id="pages.button.view" defaultMessage="View" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.contact.drawer.title.view" defaultMessage="View Exchange" />
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        footer={false}
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Source Process Output Flow" bordered={false}>
              <Spin spinning={spinningSource}>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.exchangeDirection"
                        defaultMessage="Exchange Direction"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource.exchangeDirection ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <FlowsSelectDescription
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.referenceToFlowDataSet"
                      defaultMessage="Reference To Flow Data Set"
                    />
                  }
                  data={exchangeDataSource.referenceToFlowDataSet ?? {}}
                  lang={lang}
                />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.meanAmount"
                        defaultMessage="Mean Amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource.meanAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.resultingAmount"
                        defaultMessage="Resulting Amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource.resultingAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.dataDerivationTypeStatus"
                        defaultMessage="Data Derivation Type Status"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataSource.dataDerivationTypeStatus ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                  <FormattedMessage
                    id="pages.process.view.exchange.generalComment"
                    defaultMessage="General Comment"
                  />
                </Divider>
                <LangTextItemDescription data={exchangeDataSource.generalComment} />
                <br />
                <Card
                  size="small"
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.quantitativeReference"
                      defaultMessage="Quantitative Reference"
                    />
                  }
                >
                  <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item
                      key={0}
                      label={
                        <FormattedMessage
                          id="pages.process.view.exchange.referenceToReferenceFlow"
                          defaultMessage="Reference To Reference Flow"
                        />
                      }
                      labelStyle={{ width: '220px' }}
                    >
                      {exchangeDataSource.quantitativeReference ? (
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                      ) : (
                        <CloseCircleOutlined />
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  <Divider orientationMargin="0" orientation="left" plain>
                    <FormattedMessage
                      id="pages.process.view.exchange.functionalUnitOrOther"
                      defaultMessage="Functional Unit Or Other"
                    />
                  </Divider>
                  <LangTextItemDescription data={exchangeDataSource.functionalUnitOrOther} />
                </Card>
              </Spin>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Target Process Input Flow" bordered={false}>
              <Spin spinning={spinningTarget}>
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.exchangeDirection"
                        defaultMessage="Exchange Direction"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget.exchangeDirection ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <FlowsSelectDescription
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.referenceToFlowDataSet"
                      defaultMessage="Reference To Flow Data Set"
                    />
                  }
                  data={exchangeDataTarget.referenceToFlowDataSet ?? {}}
                  lang={lang}
                />
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.meanAmount"
                        defaultMessage="Mean Amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget.meanAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.resultingAmount"
                        defaultMessage="Resulting Amount"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget.resultingAmount ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
                <br />
                <Descriptions bordered size={'small'} column={1}>
                  <Descriptions.Item
                    key={0}
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.dataDerivationTypeStatus"
                        defaultMessage="Data Derivation Type Status"
                      />
                    }
                    labelStyle={{ width: '220px' }}
                  >
                    {exchangeDataTarget.dataDerivationTypeStatus ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider orientationMargin="0" orientation="left" plain>
                  <FormattedMessage
                    id="pages.process.view.exchange.generalComment"
                    defaultMessage="General Comment"
                  />
                </Divider>
                <LangTextItemDescription data={exchangeDataTarget.generalComment} />
                <br />
                <Card
                  size="small"
                  title={
                    <FormattedMessage
                      id="pages.process.view.exchange.quantitativeReference"
                      defaultMessage="Quantitative Reference"
                    />
                  }
                >
                  <Descriptions bordered size={'small'} column={1}>
                    <Descriptions.Item
                      key={0}
                      label={
                        <FormattedMessage
                          id="pages.process.view.exchange.referenceToReferenceFlow"
                          defaultMessage="Reference To Reference Flow"
                        />
                      }
                      labelStyle={{ width: '220px' }}
                    >
                      {exchangeDataTarget.quantitativeReference ? (
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                      ) : (
                        <CloseCircleOutlined />
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  <Divider orientationMargin="0" orientation="left" plain>
                    <FormattedMessage
                      id="pages.process.view.exchange.functionalUnitOrOther"
                      defaultMessage="Functional Unit Or Other"
                    />
                  </Divider>
                  <LangTextItemDescription data={exchangeDataTarget.functionalUnitOrOther} />
                </Card>
              </Spin>
            </Card>
          </Col>
        </Row>

        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default EdgeExchangeView;
