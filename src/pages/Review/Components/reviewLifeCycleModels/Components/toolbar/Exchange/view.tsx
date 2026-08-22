import LangTextItemDescription from '@/components/LangTextItem/description';
import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import FlowsSelectDescription from '@/pages/Flows/Components/select/description';
import { getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { RESPONSIVE_DESCRIPTION_ITEM_STYLES } from '@/style/responsiveDescriptions';
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
            id='pages.flow.model.drawer.title.edge.exchange.view'
            defaultMessage='View exchange relation'
          />
        }
        size='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        footer={false}
        mask={{ closable: true }}
        open={drawerVisible}
        onClose={onDrawerClose}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card
              title={
                <FormattedMessage
                  id='pages.flow.model.sourceOutputFlowName'
                  defaultMessage='Source process output flow'
                />
              }
              variant='borderless'
            >
              <Spin spinning={spinningSource}>
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
                          id='pages.process.view.exchange.exchangeDirection'
                          defaultMessage='Exchange direction'
                        />
                      ),
                      children: exchangeDataSource?.exchangeDirection ?? '-',
                    },
                  ]}
                />
                <br />
                <FlowsSelectDescription
                  title={
                    <FormattedMessage
                      id='pages.process.view.exchange.referenceToFlowDataSet'
                      defaultMessage='Flow'
                    />
                  }
                  data={exchangeDataSource?.referenceToFlowDataSet ?? {}}
                  lang={lang}
                />
                <br />
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
                          id='pages.process.view.exchange.meanAmount'
                          defaultMessage='Mean amount'
                        />
                      ),
                      children: exchangeDataSource?.meanAmount ?? '-',
                    },
                  ]}
                />
                <br />
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
                          id='pages.process.view.exchange.resultingAmount'
                          defaultMessage='Resulting amount'
                        />
                      ),
                      children: exchangeDataSource?.resultingAmount ?? '-',
                    },
                  ]}
                />
                <br />
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
                          id='pages.process.view.exchange.dataDerivationTypeStatus'
                          defaultMessage='Data derivation type / status'
                        />
                      ),
                      children: exchangeDataSource?.dataDerivationTypeStatus ?? '-',
                    },
                  ]}
                />

                <Divider styles={{ content: { margin: 0 } }} titlePlacement='start' plain>
                  <FormattedMessage
                    id='pages.process.view.exchange.generalComment'
                    defaultMessage='Comment'
                  />
                </Divider>
                <LangTextItemDescription data={exchangeDataSource?.generalComment} />
                <br />
                <Card
                  size='small'
                  title={
                    <FormattedMessage
                      id='pages.process.view.exchange.quantitativeReference'
                      defaultMessage='Quantitative reference'
                    />
                  }
                >
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
                            id='pages.process.view.exchange.referenceToReferenceFlow'
                            defaultMessage='Reference flow(s)'
                          />
                        ),
                        children: (
                          <QuantitativeReferenceIcon
                            value={exchangeDataSource?.quantitativeReference}
                          />
                        ),
                      },
                    ]}
                  />
                  <Divider styles={{ content: { margin: 0 } }} titlePlacement='start' plain>
                    <FormattedMessage
                      id='pages.process.view.exchange.functionalUnitOrOther'
                      defaultMessage='Functional unit, Production period, or Other parameter'
                    />
                  </Divider>
                  <LangTextItemDescription data={exchangeDataSource?.functionalUnitOrOther} />
                </Card>
              </Spin>
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              title={
                <FormattedMessage
                  id='pages.flow.model.targetInputFlowName'
                  defaultMessage='Target input flow name'
                />
              }
              variant='borderless'
            >
              <Spin spinning={spinningTarget}>
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
                          id='pages.process.view.exchange.exchangeDirection'
                          defaultMessage='Exchange direction'
                        />
                      ),
                      children: exchangeDataTarget?.exchangeDirection ?? '-',
                    },
                  ]}
                />
                <br />
                <FlowsSelectDescription
                  title={
                    <FormattedMessage
                      id='pages.process.view.exchange.referenceToFlowDataSet'
                      defaultMessage='Flow'
                    />
                  }
                  data={exchangeDataTarget?.referenceToFlowDataSet ?? {}}
                  lang={lang}
                />
                <br />
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
                          id='pages.process.view.exchange.meanAmount'
                          defaultMessage='Mean amount'
                        />
                      ),
                      children: exchangeDataTarget?.meanAmount ?? '-',
                    },
                  ]}
                />
                <br />
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
                          id='pages.process.view.exchange.resultingAmount'
                          defaultMessage='Resulting amount'
                        />
                      ),
                      children: exchangeDataTarget?.resultingAmount ?? '-',
                    },
                  ]}
                />
                <br />
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
                          id='pages.process.view.exchange.dataDerivationTypeStatus'
                          defaultMessage='Data derivation type / status'
                        />
                      ),
                      children: exchangeDataTarget?.dataDerivationTypeStatus ?? '-',
                    },
                  ]}
                />

                <Divider styles={{ content: { margin: 0 } }} titlePlacement='start' plain>
                  <FormattedMessage
                    id='pages.process.view.exchange.generalComment'
                    defaultMessage='Comment'
                  />
                </Divider>
                <LangTextItemDescription data={exchangeDataTarget?.generalComment} />
                <br />
                <Card
                  size='small'
                  title={
                    <FormattedMessage
                      id='pages.process.view.exchange.quantitativeReference'
                      defaultMessage='Quantitative reference'
                    />
                  }
                >
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
                            id='pages.process.view.exchange.referenceToReferenceFlow'
                            defaultMessage='Reference flow(s)'
                          />
                        ),
                        children: (
                          <QuantitativeReferenceIcon
                            value={exchangeDataTarget?.quantitativeReference}
                          />
                        ),
                      },
                    ]}
                  />
                  <Divider styles={{ content: { margin: 0 } }} titlePlacement='start' plain>
                    <FormattedMessage
                      id='pages.process.view.exchange.functionalUnitOrOther'
                      defaultMessage='Functional unit, Production period, or Other parameter'
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
