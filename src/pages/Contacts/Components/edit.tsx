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
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import ContactSelectFrom from '@/pages/Contacts/Components/select/from';
type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ContactEdit: FC<Props> = ({ id, buttonType, actionRef, lang, setViewDrawerVisible }) => {
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
    setFromData({ ...fromData, data });
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
          <ContactSelectFrom
            label='Reference To Contact'
            name={['contactInformation', 'dataSetInformation', 'referenceToContact']}
            lang={lang}
            formRef={formRefEdit} />
          {/* <Card size="small" title={'Reference To Contact'}>
            <Form.Item label="Ref Object Id" name={['contactInformation', 'dataSetInformation', 'referenceToContact', '@refObjectId']}>
              <Input placeholder="@refObjectId" />
            </Form.Item>
            <Form.Item label='Type' name={['contactInformation', 'dataSetInformation', 'referenceToContact', '@type']}>
              <Input placeholder="@type" />
            </Form.Item>
            <Form.Item label='URI' name={['contactInformation', 'dataSetInformation', 'referenceToContact', '@uri']}>
              <Input placeholder="@uri" />
            </Form.Item>
            <Divider orientationMargin="0" orientation="left" plain>
              Short Description
            </Divider>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'referenceToContact', 'common:shortDescription']}
              label="Short Description"
            />
          </Card> */}
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
              formRef={formRefEdit} />
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
              formRef={formRefEdit} />
            {/* <Card size="small" title={'Reference To Preceding Data Set Version'}>
              <Form.Item label="Type" name={['administrativeInformation', 'publicationAndOwnership', 'common:referenceToPrecedingDataSetVersion', '@type']}>
                <Input />
              </Form.Item>
              <Form.Item label="Ref Object Id" name={['administrativeInformation', 'publicationAndOwnership', 'common:referenceToPrecedingDataSetVersion', '@refObjectId']}>
                <Input />
              </Form.Item>
              <Form.Item label="URI" name={['administrativeInformation', 'publicationAndOwnership', 'common:referenceToPrecedingDataSetVersion', '@uri']}>
                <Input />
              </Form.Item>
              <Divider orientationMargin="0" orientation="left" plain>
                Short Description
              </Divider>
              <LangTextItemFrom
                name={['administrativeInformation', 'publicationAndOwnership', 'common:referenceToPrecedingDataSetVersion', 'common:shortDescription']}
                label="Short Description"
              />
            </Card> */}
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

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getContactDetail(id).then(async (result) => {
      console.log(result);
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
