import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import ContactSelectFrom from '@/pages/Contacts/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
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
  lang: string,
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ContactCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fromData, setFromData] = useState<any>({});
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('contactInformation');

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const tabList = [
    { key: 'contactInformation', tab: 'Contact Information' },
    { key: 'administrativeInformation', tab: 'Administrative Information' },
  ];

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

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
              formRef={formRefCreate}
              onData={handletFromData}
            />
          </Card>
          <Card size="small" title={'Contact Address'}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'contactAddress']}
              label="Contact Address"
            />
          </Card>
          <Form.Item label="Telephone" name={['contactInformation', 'dataSetInformation', 'telephone']}>
            <Input />
          </Form.Item>
          <Form.Item label="Telefax" name={['contactInformation', 'dataSetInformation', 'telefax']}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name={['contactInformation', 'dataSetInformation', 'email']}>
            <Input />
          </Form.Item>
          <Form.Item label="WWWAddress" name={['contactInformation', 'dataSetInformation', 'WWWAddress']}>
            <Input />
          </Form.Item>
          <Card size="small" title={'Central Contact Point'}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'centralContactPoint']}
              label="Central Contact Point"
            />
          </Card>
          <Card size="small" title={'Contact Description Or Comment'}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'contactDescriptionOrComment']}
              label="Contact Description Or Comment"
            />
          </Card>
          <ContactSelectFrom label='Reference To Contact'
            name={['contactInformation', 'dataSetInformation', 'referenceToContact']}
            lang={lang}
            formRef={formRefCreate}
            onData={handletFromData}
            />
        </Space>
      </>
    ),
    administrativeInformation: (
      <>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card size="small" title={'Data Entry By'}>
            <Form.Item
              label="Time Stamp"
              name={[
                'administrativeInformation',
                'dataEntryBy',
                'common:timeStamp',
              ]}
            >
              <Input />
            </Form.Item>
            <br />
            <SourceSelectFrom label='Reference To Data Set Format'
              name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
              lang={lang}
              formRef={formRefCreate}
              onData={handletFromData}
              />
          </Card>
          <Card size="small" title={'Publication And Ownership'}>
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
            <ContactSelectFrom
              label='Reference To Preceding Data Set Version'
              name={['administrativeInformation', 'publicationAndOwnership', 'common:referenceToPrecedingDataSetVersion']}
              lang={lang}
              formRef={formRefCreate}
              onData={handletFromData}
              />
            <Form.Item
              label="Permanent Data Set URI"
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:permanentDataSetURI',
              ]}
            >
              <Input />
            </Form.Item>
          </Card>
        </Space>
      </>
    ),
  }

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  useEffect(() => {
    if (drawerVisible) return;
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue({});
    setFromData({});
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  }, [formRefCreate.current?.getFieldsValue()]);

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
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
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
        </ProForm>
        <Typography>
          <pre>{JSON.stringify(fromData, null, 2)}</pre>
        </Typography>
      </Drawer >
    </>
  );
};

export default ContactCreate;
