import LangTextItemForm from '@/components/LangTextItem/form';
import FlowsSelectForm from '@/pages/Flows/Components/select/form';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import {
  DataDerivationTypeStatusOptions,
} from '../optiondata';

type Props = {
  lang: string;
  onData: (data: any) => void;
};
const ProcessExchangeCreate: FC<Props> = ({ lang, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [functionalUnitOrOther, setFunctionalUnitOrOther] = useState(false);

  const handletFromData = () => {
    setFromData(formRefCreate.current?.getFieldsValue() ?? {});
  };

  useEffect(() => {
    if (!drawerVisible) return;
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue({});
    setFromData({});
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.create" defaultMessage="Create" />}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.process.exchange.drawer.title.create"
            defaultMessage="Create exchange"
          />
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
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
            setFunctionalUnitOrOther(allValues?.quantitativeReference ?? false);
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData({ ...fromData });
            formRefCreate.current?.resetFields();
            setDrawerVisible(false);
            return true;
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.exchangeDirection"
                  defaultMessage="Exchange direction"
                />
              }
              name={'exchangeDirection'}
            >
              <Select
                // placeholder="Select a direction"
                optionFilterProp="direction"
                options={[
                  { value: 'input', label: 'Input' },
                  { value: 'output', label: 'Output' },
                ]}
              />
            </Form.Item>
            <FlowsSelectForm
              name={['referenceToFlowDataSet']}
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.referenceToFlowDataSet"
                  defaultMessage="Flow"
                />
              }
              lang={lang}
              drawerVisible={drawerVisible}
              formRef={formRefCreate}
              onData={handletFromData}
            />
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.meanAmount"
                  defaultMessage="Mean amount"
                />
              }
              name={'meanAmount'}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.resultingAmount"
                  defaultMessage="Resulting amount"
                />
              }
              name={'resultingAmount'}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.dataDerivationTypeStatus"
                  defaultMessage="Data derivation type / status"
                />
              }
              name={'dataDerivationTypeStatus'}
            >
              <Select options={DataDerivationTypeStatusOptions} />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              <FormattedMessage
                id="pages.process.view.exchange.generalComment"
                defaultMessage="Comment"
              />
            </Divider>
            <LangTextItemForm
              name="generalComment"
              label={<FormattedMessage id="pages.process.view.exchange.generalComment" defaultMessage="Comment" />}
            />

            <Card
              size="small"
              title={
                <FormattedMessage
                  id="pages.process.view.exchange.quantitativeReference"
                  defaultMessage="Quantitative reference"
                />
              }
            >
              <Form.Item
                label={
                  <FormattedMessage
                    id="pages.process.view.exchange.referenceToReferenceFlow"
                    defaultMessage="Reference flow(s)"
                  />
                }
                name={'quantitativeReference'}
              >
                <Switch />
              </Form.Item>
              {functionalUnitOrOther ? (
                <>
                  <Divider orientationMargin="0" orientation="left" plain>
                    <FormattedMessage
                      id="pages.process.view.exchange.functionalUnitOrOther"
                      defaultMessage="Functional unit, Production period, or Other parameter"
                    />
                  </Divider>
                  <LangTextItemForm
                    name="functionalUnitOrOther" 
                    label={<FormattedMessage id="pages.process.view.exchange.functionalUnitOrOther" defaultMessage="Functional unit, Production period, or Other parameter" />}
                    />
                </>
              ) : (
                <></>
              )}
            </Card>
          </Space>
        </ProForm>
        <Collapse
          items={[
            {
              key: '1',
              label: 'JSON Data',
              children: (
                <Typography>
                  <pre>{JSON.stringify(fromData, null, 2)}</pre>
                </Typography>
              ),
            },
          ]}
        />
      </Drawer>
    </>
  );
};

export default ProcessExchangeCreate;
