import LangTextItemForm from '@/components/LangTextItem/form';
import FlowsSelectForm from '@/pages/Flows/Components/select/form';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { DataDerivationTypeStatusOptions } from '../optiondata';

type Props = {
  id: string;
  data: any;
  lang: string;
  buttonType: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: any) => void;
};
const ProcessExchangeEdit: FC<Props> = ({
  id,
  data,
  lang,
  buttonType,
  // actionRef,
  setViewDrawerVisible,
  onData,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [functionalUnitOrOther, setFunctionalUnitOrOther] = useState(false);

  const handletFromData = () => {
    setFromData(formRefEdit.current?.getFieldsValue() ?? {});
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    // setSpinning(true);
    formRefEdit.current?.resetFields();
    const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
    setInitData(filteredData);
    formRefEdit.current?.setFieldsValue(filteredData);
    setFromData(filteredData);
    setFunctionalUnitOrOther(filteredData?.quantitativeReference ?? false);
    // setSpinning(false);
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.process.exchange.drawer.title.edit"
            defaultMessage="Edit exchange"
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
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefEdit}
          initialValues={initData}
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
            // actionRef.current?.reload();
            return true;
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name={'@dataSetInternalID'} hidden>
              <Input />
            </Form.Item>
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
                placeholder={
                  <FormattedMessage
                    id="pages.process.view.exchange.selectadirection"
                    defaultMessage="Select a direction"
                  />
                }
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
              formRef={formRefEdit}
              drawerVisible={drawerVisible}
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
              label={
                <FormattedMessage
                  id="pages.process.view.exchange.generalComment"
                  defaultMessage="Comment"
                />
              }
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
                    label={
                      <FormattedMessage
                        id="pages.process.view.exchange.functionalUnitOrOther"
                        defaultMessage="Functional unit, Production period, or Other parameter"
                      />
                    }
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

export default ProcessExchangeEdit;
