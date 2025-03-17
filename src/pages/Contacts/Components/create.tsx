import { createContact ,getContactDetail} from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined,CopyOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Tooltip, Typography, message, Spin } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { ContactForm } from './form';
type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
};

// When type is 'copy' or 'createVersion', id and version are required parameters
type CreateProps = 
  | (Omit<Props, 'type'> & { actionType?: 'create' })
  | (Omit<Props, 'type' | 'id' | 'version'> & { 
      actionType: 'copy'; 
      id: string; 
      version: string;
    })
  | (Omit<Props, 'type' | 'id' | 'version'> & { 
      actionType: 'createVersion'; 
      id: string; 
      version: string;
    });

const ContactCreate: FC<CreateProps> = ({ lang, actionRef, actionType="create",id,version }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('contactInformation');
  const [spinning, setSpinning] = useState<boolean>(false);
  const intl = useIntl();

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const getFormDetail = () => {
    if(!id||!version)return;
    setSpinning(true);
    getContactDetail(id, version).then(async (result) => {
      const contactFromData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      setInitData(contactFromData);
      const currentData = formRefCreate.current?.getFieldsValue();
      formRefCreate.current?.setFieldsValue({...currentData, ...contactFromData});
      setFromData(contactFromData);
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;
    if(actionType === 'copy'||actionType === 'createVersion'){
      getFormDetail()
      return;
    }
    // create
    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': initVersion,
        },
      },
    };
    // const newId = v4();
    setInitData(newData);
    // formRefCreate.current?.resetFields();
    const currentData = formRefCreate.current?.getFieldsValue();
    formRefCreate.current?.setFieldsValue({...currentData, ...newData});
    setFromData(newData);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id={actionType === 'copy' ? "pages.button.copy" : actionType === 'createVersion' ? "pages.button.createVersion" : "pages.button.create"} defaultMessage="Create" />}>
        {actionType === 'copy' ? (
            <Button size="small" shape="circle" icon={<CopyOutlined />} onClick={() => {
              setDrawerVisible(true);
            }} />
        ) : actionType === 'createVersion' ? (
            <Button type="text" icon={<PlusOutlined />} size="small" onClick={() => {
            setDrawerVisible(true);
          }} />
        ) : (<Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />)}
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={
          actionType === 'copy' ? (
            <FormattedMessage id="pages.contact.drawer.title.copy" defaultMessage="Copy Contact" />
          ) : actionType === 'createVersion' ? (
            <FormattedMessage
              id="pages.contact.drawer.title.createVersion"
              defaultMessage="Create Version"
            />
          ): (<FormattedMessage
            id="pages.contact.drawer.title.create"
            defaultMessage="Create Contact"
          />)
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
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
        <ProForm
          formRef={formRefCreate}
          initialValues={initData}
          onValuesChange={(_, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            const paramsId = (actionType === 'createVersion' ? id : v4())??'';
            const result = await createContact(paramsId, fromData);
            if (result.data) {
              message.success(
                intl.formatMessage({
                  id: 'pages.button.create.success',
                  defaultMessage: 'Created successfully!',
                }),
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
          <ContactForm
            formType='create'
            lang={lang}
            activeTabKey={activeTabKey}
            formRef={formRefCreate}
            onData={handletFromData}
            onTabChange={onTabChange}
          />
        </ProForm>
        </Spin>
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

export default ContactCreate;
