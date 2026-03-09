import LangTextItemDescription from '@/components/LangTextItem/description';
import FlowsView from '@/pages/Flows/Components/view';
import UnitGroupDescriptionMini from '@/pages/Unitgroups/Components/select/descriptionMini';
import { toBigNumberOrZero } from '@/services/general/bignumber';
import type {
  LifeCycleModelGraphNode,
  LifeCycleModelTargetAmount,
} from '@/services/lifeCycleModels/data';
import { getProcessDetail } from '@/services/processes/api';
import type { ProcessExchangeData, ProcessFormState } from '@/services/processes/data';
import { genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined, StarOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Card, Descriptions, Divider, Drawer, Form, Input, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  refNode: LifeCycleModelGraphNode;
  drawerVisible: boolean;
  lang: string;
  setDrawerVisible: (value: boolean) => void;
  onData: (data: LifeCycleModelTargetAmount) => void;
};
const TargetAmount: FC<Props> = ({ refNode, drawerVisible, lang, setDrawerVisible, onData }) => {
  // const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [initData, setInitData] = useState<Partial<ProcessFormState>>({});
  const [refExchange, setRefExchange] = useState<ProcessExchangeData | undefined>();
  const refFlow = Array.isArray(refExchange?.referenceToFlowDataSet)
    ? refExchange?.referenceToFlowDataSet[0]
    : refExchange?.referenceToFlowDataSet;

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
      getProcessDetail(id ?? '', version ?? '').then(async (result) => {
        const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
        setInitData({ ...dataSet, id: id });
        const quantitativeReference = dataSet?.processInformation?.quantitativeReference;
        const refExc =
          (dataSet?.exchanges?.exchange ?? []).find(
            (item) =>
              item?.['@dataSetInternalID'] === quantitativeReference?.referenceToReferenceFlow,
          ) ?? undefined;
        const refNodeData = refNode?.data;
        const targetAmount = refNodeData?.targetAmount ?? refExc?.meanAmount;
        const originalAmount = refNodeData?.originalAmount ?? refExc?.meanAmount;
        const scalingFactor =
          refNodeData?.scalingFactor ??
          (originalAmount ? Number(targetAmount ?? 0) / Number(originalAmount) : 0);
        formRefEdit.current?.setFieldsValue({
          targetAmount: targetAmount,
          originalAmount: originalAmount,
          scalingFactor: scalingFactor,
        });
        setRefExchange(refExc);
      });
    }
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage id='pages.lifeCycleModel.targetAmount' defaultMessage='Target amount' />
        }
        placement='left'
      >
        <Button
          type='primary'
          size='small'
          icon={<StarOutlined />}
          style={{ boxShadow: 'none' }}
          disabled={!refNode}
          onClick={onDrawerOpen}
        />
      </Tooltip>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.lifeCycleModel.targetAmount' defaultMessage='Target amount' />
        }
        width='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={onDrawerClose} />}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={onDrawerClose}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button
              onClick={() => {
                formRefEdit.current?.submit();
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save'></FormattedMessage>
            </Button>
          </Space>
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={onDrawerClose}
      >
        <ProForm
          formRef={formRefEdit}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onValuesChange={(value, values) => {
            if (!value?.scalingFactor) {
              const targetAmount = toBigNumberOrZero(values?.targetAmount ?? 0);
              const originalAmount = toBigNumberOrZero(values?.originalAmount ?? 1);

              const scalingFactor = originalAmount.isZero()
                ? '0'
                : targetAmount.dividedBy(originalAmount).toString();

              formRefEdit.current?.setFieldsValue({ scalingFactor: scalingFactor });
            }
          }}
          onFinish={async (values) => {
            onData(values);
            formRefEdit.current?.resetFields();
            setDrawerVisible(false);
            return true;
          }}
        >
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.targetAmount'
                defaultMessage='Target amount'
              />
            }
            name={'targetAmount'}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.originalAmount'
                defaultMessage='Original amount'
              />
            }
            name={'originalAmount'}
          >
            <Input disabled={true} />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id='pages.lifeCycleModel.scalingFactor'
                defaultMessage='Scaling factor'
              />
            }
            name={'scalingFactor'}
          >
            <Input disabled={true} />
          </Form.Item>
          <Card
            size='small'
            title={
              <FormattedMessage
                id='pages.flow.model.drawer.title.refFlow'
                defaultMessage='Ref flow'
              />
            }
          >
            <Space direction='horizontal'>
              <Descriptions bordered size={'small'} column={1} style={{ width: '450px' }}>
                <Descriptions.Item
                  key={0}
                  label={
                    <FormattedMessage
                      id='pages.process.view.exchange.refObjectId'
                      defaultMessage='Ref object id'
                    />
                  }
                  labelStyle={{ width: '140px' }}
                >
                  {refFlow?.['@refObjectId'] ?? '-'}
                </Descriptions.Item>
              </Descriptions>
              {refFlow?.['@refObjectId'] && (
                <FlowsView
                  id={refFlow?.['@refObjectId'] ?? ''}
                  version={refFlow?.['@version'] ?? ''}
                  lang={lang}
                  buttonType='text'
                />
              )}
            </Space>
            <br />
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage id='pages.process.view.exchange.type' defaultMessage='Type' />
                }
                labelStyle={{ width: '140px' }}
              >
                {refFlow?.['@type'] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={
                  <FormattedMessage id='pages.process.view.exchange.uri' defaultMessage='URI' />
                }
                labelStyle={{ width: '140px' }}
              >
                {refFlow?.['@uri'] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <br />
            <Descriptions bordered size={'small'} column={1}>
              <Descriptions.Item
                key={0}
                label={<FormattedMessage id='pages.version' defaultMessage='Version' />}
                labelStyle={{ width: '120px' }}
              >
                {refFlow?.['@version'] ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            <Divider orientationMargin='0' orientation='left' plain>
              <FormattedMessage
                id='pages.process.view.exchange.shortDescription'
                defaultMessage='Short description'
              />
            </Divider>
            <LangTextItemDescription data={refFlow?.['common:shortDescription']} />
            <br />
            <UnitGroupDescriptionMini
              id={refFlow?.['@refObjectId']}
              version={refFlow?.['@version']}
              idType={'flow'}
            />
          </Card>
          <br />
          <Card
            size='small'
            title={<FormattedMessage id='pages.lifeCycleModel.refNode' defaultMessage='Ref node' />}
          >
            <Divider orientationMargin='0' orientation='left' plain>
              <FormattedMessage id='pages.lifeCycleModel.information.name' defaultMessage='Name' />
            </Divider>
            <LangTextItemDescription
              data={initData.processInformation?.dataSetInformation?.name?.baseName}
            />
            <br />
            <Divider orientationMargin='0' orientation='left' plain>
              <FormattedMessage
                id='pages.lifeCycleModel.information.generalComment'
                defaultMessage='General Comment'
              />
            </Divider>
            <LangTextItemDescription
              data={initData.processInformation?.dataSetInformation?.['common:generalComment']}
            />
          </Card>
        </ProForm>
        {/* </Spin> */}
      </Drawer>
    </>
  );
};

export default TargetAmount;
