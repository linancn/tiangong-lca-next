import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import ContactSelectFrom from '@/pages/Contacts/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import { getContactDetail, updateContact } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Form,
  Input,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
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

  const handletFromData = () => {
    setFromData({
      ...fromData,
      [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
    });
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const tabList = [
    { key: 'contactInformation', tab: <FormattedMessage
      id="pages.contact.contactInformation"
      defaultMessage="Contact Information"
    />},
    { key: 'administrativeInformation', tab: <FormattedMessage
      id="pages.contact.administrativeInformation"
      defaultMessage="Administrative Information"
    /> },
  ];

  const contactList: Record<string, React.ReactNode> = {
    contactInformation: (
      <>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card size="small" title={<FormattedMessage id="pages.contact.shortName" defaultMessage="Short Name" />}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'common:shortName']}
              label={<FormattedMessage id="pages.contact.shortName" defaultMessage="Short Name" />}
            />
          </Card>
          <Card size="small" title={<FormattedMessage id="pages.contact.name" defaultMessage="Name" />}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'common:name']}
              label={<FormattedMessage id="pages.contact.name" defaultMessage="Name" />}
            />
          </Card>
          <Card size="small" title={<FormattedMessage id="pages.contact.classification" defaultMessage="Classification" />}>
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
          <Card size="small" title={<FormattedMessage id="pages.contact.contactAddress" defaultMessage="Contact Address" />}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'contactAddress']}
              label={<FormattedMessage id="pages.contact.contactAddress" defaultMessage="Contact Address" />}
            />
          </Card>
          <Form.Item
            label={<FormattedMessage id="pages.contact.telephone" defaultMessage="Telephone" />}
            name={['contactInformation', 'dataSetInformation', 'telephone']}
          >
            <Input />
          </Form.Item>
          <Form.Item label={<FormattedMessage id="pages.contact.telefax" defaultMessage="Telefax" />} name={['contactInformation', 'dataSetInformation', 'telefax']}>
            <Input />
          </Form.Item>
          <Form.Item label={<FormattedMessage id="pages.contact.email" defaultMessage="Email" />} name={['contactInformation', 'dataSetInformation', 'email']}>
            <Input />
          </Form.Item>
          <Form.Item
            label={<FormattedMessage id="pages.contact.WWWAddress" defaultMessage="WWWAddress" />}
            name={['contactInformation', 'dataSetInformation', 'WWWAddress']}
          >
            <Input />
          </Form.Item>
          <Card size="small" title={<FormattedMessage id="pages.contact.centralContactPoints" defaultMessage="Central Contact Point" />}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'centralContactPoint']}
              label={<FormattedMessage id="pages.contact.centralContactPoints" defaultMessage="Central Contact Point" />}
            />
          </Card>
          <Card size="small" title={<FormattedMessage id="pages.contact.contactDescriptionOrComment" defaultMessage="Contact Description Or Comment" />}>
            <LangTextItemFrom
              name={['contactInformation', 'dataSetInformation', 'contactDescriptionOrComment']}
              label={<FormattedMessage id="pages.contact.contactDescriptionOrComment" defaultMessage="Contact Description Or Comment" />}
            />
          </Card>
          <ContactSelectFrom
            label={<FormattedMessage id="pages.contact.referenceToContact" defaultMessage="Reference To Contact" />}
            name={['contactInformation', 'dataSetInformation', 'referenceToContact']}
            lang={lang}
            formRef={formRefEdit}
            onData={handletFromData}
          />
        </Space>
      </>
    ),
    administrativeInformation: (
      <>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card size="small" title={<FormattedMessage id="pages.contact.dataEntryBy" defaultMessage="Data Entry By" />}>
            <Form.Item
              label={<FormattedMessage id="pages.contact.timeStamp" defaultMessage="Time Stamp" />}
              name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}
            >
              <Input />
            </Form.Item>
            <br />
            <SourceSelectFrom
              label={<FormattedMessage id="pages.contact.referenceToDataSetFormat" defaultMessage="Reference To Data Set Format" />}
              name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
              lang={lang}
              formRef={formRefEdit}
              onData={handletFromData}
            />
          </Card>
          <Card size="small" title={<FormattedMessage id="pages.contact.publicationAndOwnership" defaultMessage="Publication And Ownership" />}>
            <Form.Item
              label={<FormattedMessage id="pages.contact.dataSetVersion" defaultMessage="Data Set Version" />}
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:dataSetVersion',
              ]}
            >
              <Input />
            </Form.Item>
            <ContactSelectFrom
              label={<FormattedMessage id="pages.contact.referenceToPrecedingDataSetVersion" defaultMessage="Reference To Preceding Data Set Version" />}
              name={[
                'administrativeInformation',
                'publicationAndOwnership',
                'common:referenceToPrecedingDataSetVersion',
              ]}
              lang={lang}
              formRef={formRefEdit}
              onData={handletFromData}
            />
            <Form.Item
              label={<FormattedMessage id="pages.contact.permanentDataSetURI" defaultMessage="Permanent Data Set URI" />}
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
  };

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
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
        </Button>
      )}

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
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
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
        </Spin>
      </Drawer>
    </>
  );
};

export default ContactEdit;
