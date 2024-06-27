import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { createContact } from '@/services/contacts/api';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import { Button, Card, Drawer, Form, Input, Space, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ContactCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fromData, setFromData] = useState<any>({});
  const formRefCreate = useRef<ProFormInstance>();

  const handletFromData = (data: any) => {
    setFromData({ ...data });
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  useEffect(() => {
    if (drawerVisible) return;
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue({});
    setFromData({});
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.create" defaultMessage="Create" />}>
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
            id="pages.contact.drawer.title.create"
            defaultMessage="Create Contact"
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
          onValuesChange={(_, allValues) => {
            setFromData(allValues ?? {});
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            const result = await createContact({ ...fromData });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              reload();
            } else {
              message.error(result.error.message);
            }
            return true;
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title={'Short Name'}>
              <LangTextItemFrom
                name={['contactInformation', 'dataSetInformation', 'common:shortName']}
                label="Short Name"
              />
            </Card>
            <Card size="small" title={'Name'}>
              <LangTextItemFrom
                name={['contactInformation', 'dataSetInformation', 'common:name']}
                label="Name"
              />
            </Card>
            <Card size="small" title={'Classification'}>
              <LevelTextItemFrom
                name={[
                  'contactInformation',
                  'dataSetInformation',
                  'classificationInformation',
                  'common:classification',
                  'common:class',
                ]}
                dataType={'Contact'}
                formRef={formRefCreate}
                onData={handletFromData}
              />
            </Card>
            <Form.Item label="Email" name={['contactInformation', 'dataSetInformation', 'email']}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Data Set Version"
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:dataSetVersion',
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          </Space>
        </ProForm>
        <Typography>
          <pre>{JSON.stringify(fromData, null, 2)}</pre>
        </Typography>
      </Drawer>
    </>
  );
};

export default ContactCreate;
