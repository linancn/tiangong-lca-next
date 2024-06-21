import LangTextItemFrom from '@/components/LangTextItem/from';
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
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  onData: (data: any) => void;
};
const ProcessExchangeCreate: FC<Props> = ({ onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();

  return (
    <>
      <Tooltip title={<FormattedMessage id="options.create" defaultMessage="Create" />}>
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
        title={<FormattedMessage id="exchanges.create" defaultMessage="Process Exchange Create" />}
        width="600px"
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
              {' '}
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async (values) => {
            onData({ ...values });
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
            <Card size="small" title={'Reference To Flow Data Set'}></Card>
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
          </Space>
        </ProForm>
        <Typography>
          <pre>{JSON.stringify(formRefCreate.current?.getFieldsValue(), null, 2)}</pre>
        </Typography>
      </Drawer>
    </>
  );
};

export default ProcessExchangeCreate;
