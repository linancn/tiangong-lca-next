import LangTextItemForm from '@/components/LangTextItem/form';
import FlowpropertiesSelectForm from '@/pages/Flowproperties/Components/select/form';
import { getRules } from '@/pages/Utils';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tooltip,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import schema from '../../flows_schema.json';
import { dataDerivationTypeStatusOptions, uncertaintyDistributionTypeOptions } from '../optiondata';

type Props = {
  id: string;
  data: any;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: any) => void;
  showRules?: boolean;
};
const PropertyEdit: FC<Props> = ({
  id,
  data,
  lang,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  onData,
  showRules = false,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});

  const handletFromData = () => {
    setFromData(formRefEdit.current?.getFieldsValue() ?? {});
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    formRefEdit.current?.resetFields();
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    setInitData(filteredData);
    formRefEdit.current?.setFieldsValue(filteredData);
    setFromData(filteredData);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
        {buttonType === 'icon' ? (
          <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id='pages.button.edit' defaultMessage='Edit' />
          </Button>
        )}
      </Tooltip>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.flowproperty.drawer.title.edit'
            defaultMessage='Edit Flow Property'
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
            <Button onClick={() => formRefEdit.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefEdit}
          initialValues={initData}
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData(
              data.map((item: any) => {
                if (item['@dataSetInternalID'] === id) {
                  return fromData;
                }
                return item;
              }),
            );
            formRefEdit.current?.resetFields();
            setDrawerVisible(false);
            actionRef.current?.reload();
            return true;
          }}
        >
          <Space direction='vertical' style={{ width: '100%' }}>
            <Form.Item name={'@dataSetInternalID'} hidden>
              <Input />
            </Form.Item>
            <FlowpropertiesSelectForm
              label={
                <FormattedMessage
                  id='pages.flow.view.flowProperties.referenceToFlowPropertyDataSet'
                  defaultMessage='Flow property'
                />
              }
              name={['referenceToFlowPropertyDataSet']}
              lang={lang}
              drawerVisible={drawerVisible}
              formRef={formRefEdit}
              onData={handletFromData}
              rules={
                showRules
                  ? getRules(
                      schema['flowDataSet']['flowProperties']['flowProperty'][
                        'referenceToFlowPropertyDataSet'
                      ]['@refObjectId']['rules'],
                    )
                  : []
              }
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
              rules={
                showRules
                  ? getRules(
                      schema['flowDataSet']['flowProperties']['flowProperty']['meanValue']['rules'],
                    )
                  : []
              }
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
                name={['generalComment']}
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
      </Drawer>
    </>
  );
};

export default PropertyEdit;
