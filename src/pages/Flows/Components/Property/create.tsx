import LangTextItemForm from '@/components/LangTextItem/form';
import FlowpropertiesSelectForm from '@/pages/Flowproperties/Components/select/form';
import { getRules } from '@/pages/Utils';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import schema from '../../flows_schema.json';
import { dataDerivationTypeStatusOptions, uncertaintyDistributionTypeOptions } from '../optiondata';

type Props = {
  lang: string;
  onData: (data: any) => void;
};
const PropertyCreate: FC<Props> = ({ lang, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  // const [functionalUnitOrOther, setFunctionalUnitOrOther] = useState(false);

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
      <Tooltip title={<FormattedMessage id='pages.button.create' defaultMessage='Create' />}>
        <Button
          size={'middle'}
          type='text'
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.flowproperty.drawer.title.create'
            defaultMessage='Create Flow property'
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
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData(fromData);
            formRefCreate.current?.resetFields();
            setDrawerVisible(false);
            return true;
          }}
        >
          <Space direction='vertical' style={{ width: '100%' }}>
            <FlowpropertiesSelectForm
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.referenceToDataSetFormat'
                  defaultMessage='Data set format(s)'
                />
              }
              name={['referenceToFlowPropertyDataSet']}
              lang={lang}
              drawerVisible={drawerVisible}
              formRef={formRefCreate}
              onData={handletFromData}
              rules={getRules(
                schema['flowDataSet']['flowProperties']['flowProperty'][
                  'referenceToFlowPropertyDataSet'
                ]['rules'],
              )}
            />
            <br />
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.meanValue'
                  defaultMessage='Mean value (of flow property)'
                />
              }
              name={['meanValue']}
              rules={getRules(
                schema['flowDataSet']['flowProperties']['flowProperty']['meanValue']['rules'],
              )}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.minimumValue'
                  defaultMessage='Minimum value'
                />
              }
              name={['minimumValue']}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.maximumValue'
                  defaultMessage='Maximum value'
                />
              }
              name={['maximumValue']}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.uncertaintyDistributionType'
                  defaultMessage='Uncertainty distribution type'
                />
              }
              name={'uncertaintyDistributionType'}
            >
              <Select options={uncertaintyDistributionTypeOptions} />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.relativeStandardDeviation95In'
                  defaultMessage='Relative StdDev in %'
                />
              }
              name={['relativeStandardDeviation95In']}
            >
              <InputNumber suffix='%' min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.dataDerivationType'
                  defaultMessage='Data derivation type/status'
                />
              }
              name={['dataDerivationTypeStatus']}
            >
              <Select options={dataDerivationTypeStatusOptions} />
            </Form.Item>
            <Card
              size='small'
              title={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.generalComment'
                  defaultMessage='General comment on data set'
                />
              }
            >
              <LangTextItemForm
                name={['common:generalComment']}
                label={
                  <FormattedMessage
                    id='pages.flow.view.flowProperties.generalComment'
                    defaultMessage='General comment on data set'
                  />
                }
              />
            </Card>
            <br />
            <Form.Item
              label={
                <FormattedMessage
                  id='pages.process.view.exchange.quantitativeReference'
                  defaultMessage='Quantitative reference'
                />
              }
              name={['quantitativeReference']}
            >
              <Switch />
            </Form.Item>
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

export default PropertyCreate;
