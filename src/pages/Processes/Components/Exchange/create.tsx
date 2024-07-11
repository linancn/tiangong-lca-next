import LangTextItemFrom from '@/components/LangTextItem/from';
import FlowsSelectFrom from '@/pages/Flows/Components/select/from';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import {
  Button,
  Card,
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
    setFromData(formRefCreate.current?.getFieldsValue() ?? {},);
  };

  useEffect(() => {
    if (drawerVisible) return;
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
        title={<FormattedMessage id="pages.process.exchange.drawer.title.create" defaultMessage="Create Exchange" />}
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
            <Form.Item label="Exchange Direction" name={'exchangeDirection'}>
              <Select
                placeholder="Select a direction"
                optionFilterProp="direction"
                options={[
                  { value: 'input', label: 'Input' },
                  { value: 'output', label: 'Output' },
                ]}
              />
            </Form.Item>
            <FlowsSelectFrom
              name={['referenceToFlowDataSet']}
              label="Reference To Flow Data Set"
              lang={lang}
              formRef={formRefCreate}
              onData={handletFromData}
            />
            <Form.Item label="Mean Amount" name={'meanAmount'}>
              <Input />
            </Form.Item>
            <Form.Item label="Resulting Amount" name={'resultingAmount'}>
              <Input />
            </Form.Item>
            <Form.Item label="Data Derivation Type Status" name={'dataDerivationTypeStatus'}>
              <Input />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              General Comment
            </Divider>
            <LangTextItemFrom name="generalComment" label="General Comment" />

            <Card size="small" title={'Quantitative Reference'}>
              <Form.Item label="Reference To Reference Flow" name={'quantitativeReference'}>
                <Switch />
              </Form.Item>
              {functionalUnitOrOther ? (<>
                <Divider orientationMargin="0" orientation="left" plain>
                  Functional Unit Or Other
                </Divider>
                <LangTextItemFrom name="functionalUnitOrOther" label="Functional Unit Or Other" /></>)
                : <></>}
            </Card>
          </Space>
        </ProForm>
        <Typography>
          <pre>{JSON.stringify(fromData, null, 2)}</pre>
        </Typography>
      </Drawer>
    </>
  );
};

export default ProcessExchangeCreate;
