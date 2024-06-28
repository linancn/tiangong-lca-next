import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { getContactDetail, updateContact } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import { Button, Card, Drawer, Form, Input, Space, Spin, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ContactEdit: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});
  const [fromData, setFromData] = useState<any>({});
  const [activeTabKey, setActiveTabKey] = useState<string>('contactInformation');


  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const handletFromData = (data: any) => {
    setFromData({ ...data });
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const tabList = [
    { key: 'contactInformation', tab: 'Contact Information' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];


  const contactList: Record<string, React.ReactNode> = {
    contactInformation: (
      <>
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
              formRef={formRefEdit}
              onData={handletFromData}
            />
          </Card>
          <Form.Item label="Email" name={['contactInformation', 'dataSetInformation', 'email']}>
            <Input />
          </Form.Item>
        </Space>
      </>
    ),
    administrativeInformation: (
      <>
        <Space direction="vertical" style={{ width: '100%' }}>
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
        </Space>
      </>
    ),
  }

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getContactDetail(id).then(async (result) => {
      setInitData({ ...genContactFromData(result.data?.json?.contactDataSet ?? {}), id: id });
      formRefEdit.current?.setFieldsValue({
        ...genContactFromData(result.data?.json?.contactDataSet ?? {}),
        id: id,
      });
      setFromData({ ...genContactFromData(result.data?.json?.contactDataSet ?? {}), id: id });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id="pages.table.option.edit" defaultMessage="Edit" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage id="pages.contact.drawer.title.edit" defaultMessage="Edit Contact" />
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
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="options.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefEdit}
            onValuesChange={(_, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            initialValues={initData}
            onFinish={async () => {
              setSpinning(true);
              const updateResult = await updateContact({ ...fromData });
              if (updateResult?.data) {
                message.success(
                  <FormattedMessage
                    id="options.createsuccess"
                    defaultMessage="Created Successfully!"
                  />,
                );
                setDrawerVisible(false);
                setViewDrawerVisible(false);
                actionRef.current?.reload();
              } else {
                message.error(updateResult?.error?.message);
              }
              setSpinning(true);
              return true;
            }}
          >
            <Card
              style={{ width: '100%' }}
              // title="Card title"
              // extra={<a href="#">More</a>}
              tabList={tabList}
              activeTabKey={activeTabKey}
              onTabChange={onTabChange}
            >
              {contactList[activeTabKey]}
            </Card>
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          </ProForm>
          <Typography>
            <pre>{JSON.stringify(fromData, null, 2)}</pre>
          </Typography>
        </Spin>
      </Drawer>
    </>
  );
};

export default ContactEdit;
