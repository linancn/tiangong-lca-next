import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import type { refDataType } from '@/pages/Utils/review';
import { checkData } from '@/pages/Utils/review';
import { getContactDetail, updateContact } from '@/services/contacts/api';
import { genContactFromData } from '@/services/contacts/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { ContactForm } from './form';

type Props = {
  id: string;
  version: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: any) => void;
};

const ContactEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  setViewDrawerVisible,
  updateErrRef = () => {},
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>({});
  const [fromData, setFromData] = useState<any>(undefined);
  const [activeTabKey, setActiveTabKey] = useState<string>('contactInformation');
  const [referenceValue, setReferenceValue] = useState<number>(0);
  const [showRules, setShowRules] = useState<boolean>(false);
  const intl = useIntl();
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const parentRefCheckContext = useRefCheckContext();
  useEffect(() => {
    if (showRules) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      });
    }
  }, [showRules]);

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getContactDetail(id, version).then(async (result) => {
      const contactFromData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      setInitData(contactFromData);
      formRefEdit.current?.setFieldsValue(contactFromData);
      setFromData(contactFromData);
      setSpinning(false);
    });
  };

  const updateReference = async () => {
    setReferenceValue(referenceValue + 1);
  };

  useEffect(() => {
    if (!drawerVisible) {
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleCheckData = async () => {
    setSpinning(true);
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    await checkData(
      {
        '@type': 'flow property data set',
        '@refObjectId': id,
        '@version': version,
      },
      unRuleVerification,
      nonExistentRef,
    );
    const unRuleVerificationData = unRuleVerification.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        type: 1,
      };
    });
    const nonExistentRefData = nonExistentRef.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        type: 2,
      };
    });

    setRefCheckData([...unRuleVerificationData, ...nonExistentRefData]);
    setSpinning(false);
  };
  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
          <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit} />
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage
            id={buttonType.trim().length > 0 ? buttonType : 'pages.button.edit'}
            defaultMessage='Edit'
          />
        </Button>
      )}

      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.contact.drawer.title.edit' defaultMessage='Edit Contact' />
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
            <Button onClick={handleCheckData}>
              <FormattedMessage id='pages.button.check' defaultMessage='Data check' />
            </Button>
            <Button
              onClick={() => {
                updateReference();
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update reference'
              />
            </Button>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button> */}
            <Button
              onClick={() => {
                setShowRules(false);
                formRefEdit.current?.submit();
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
            <RefCheckContext.Provider
              value={{
                refCheckData: [...parentRefCheckContext.refCheckData, ...refCheckData],
              }}
            >
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
                  const formFieldsValue = formRefEdit.current?.getFieldsValue();
                  const updateResult = await updateContact(id, version, formFieldsValue);
                  if (updateResult?.data) {
                    if (updateResult?.data[0]?.rule_verification === true) {
                      updateErrRef(null);
                    } else {
                      updateErrRef({
                        id: id,
                        version: version,
                        ruleVerification: updateResult?.data[0]?.rule_verification,
                        nonExistent: false,
                      });
                    }
                    message.success(
                      intl.formatMessage({
                        id: 'pages.button.save.success',
                        defaultMessage: 'Save successfully!',
                      }),
                    );
                    setDrawerVisible(false);
                    setViewDrawerVisible(false);
                    actionRef?.current?.reload();
                  } else {
                    message.error(updateResult?.error?.message);
                  }
                  setSpinning(false);
                  return true;
                }}
              >
                <ContactForm
                  lang={lang}
                  activeTabKey={activeTabKey}
                  formRef={formRefEdit}
                  onData={handletFromData}
                  onTabChange={onTabChange}
                  showRules={showRules}
                />
              </ProForm>
            </RefCheckContext.Provider>
          </UpdateReferenceContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
};

export default ContactEdit;
