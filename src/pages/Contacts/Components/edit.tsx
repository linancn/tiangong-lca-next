import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import type { refDataType } from '@/pages/Utils/review';
import { ReffPath, checkData, getErrRefTab } from '@/pages/Utils/review';
import { getRefsOfNewVersion, updateRefsData } from '@/pages/Utils/updateReference';
import { getContactDetail, updateContact } from '@/services/contacts/api';
import { ContactDataSetObjectKeys, FormContact } from '@/services/contacts/data';
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
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<FormContact>();
  const [fromData, setFromData] = useState<FormContact>();
  const [activeTabKey, setActiveTabKey] = useState<ContactDataSetObjectKeys>('contactInformation');
  const [showRules, setShowRules] = useState<boolean>(false);
  const intl = useIntl();
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const parentRefCheckContext = useRefCheckContext();
  const [refCheckContextValue, setRefCheckContextValue] = useState<any>({
    refCheckData: [],
  });
  useEffect(() => {
    setRefCheckContextValue({
      refCheckData: [...parentRefCheckContext.refCheckData, ...refCheckData],
    });
  }, [refCheckData, parentRefCheckContext]);

  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

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

  const onTabChange = (key: ContactDataSetObjectKeys) => {
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

  const handleUpdateRefsVersion = async (newRefs: RefVersionItem[]) => {
    const res = updateRefsData(fromData, newRefs, true);
    setFromData(res);
    formRefEdit.current?.setFieldsValue({ ...res, id });
    setRefsDrawerVisible(false);
  };

  const handleKeepVersion = async () => {
    const res = updateRefsData(fromData, refsOldList, false);
    setFromData(res);
    formRefEdit.current?.setFieldsValue({ ...res, id });
    setRefsDrawerVisible(false);
  };

  const handleUpdateReference = async () => {
    setRefsLoading(true);
    const { newRefs, oldRefs } = await getRefsOfNewVersion(fromData);
    setRefsNewList(newRefs);
    setRefsOldList(oldRefs);
    setRefsLoading(false);
    if (newRefs && newRefs.length) {
      setRefsDrawerVisible(true);
    } else {
      const res = updateRefsData(fromData, oldRefs, false);
      setFromData(res);
      formRefEdit.current?.setFieldsValue({ ...res, id });
    }
  };

  useEffect(() => {
    if (!drawerVisible) {
      setShowRules(false);
      setRefCheckContextValue({ refCheckData: [] });
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleSubmit = async (autoClose: boolean) => {
    if (autoClose) setSpinning(true);
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
      if (autoClose) {
        setDrawerVisible(false);
        setViewDrawerVisible(false);
        actionRef?.current?.reload();
      }
    } else {
      if (updateResult?.error?.state_code === 100) {
        message.error(
          intl.formatMessage({
            id: 'pages.review.openData',
            defaultMessage: 'This data is open data, save failed',
          }),
        );
      } else if (updateResult?.error?.state_code === 20) {
        message.error(
          intl.formatMessage({
            id: 'pages.review.underReview',
            defaultMessage: 'Data is under review, save failed',
          }),
        );
      } else {
        message.error(updateResult?.error?.message);
      }
    }
    if (autoClose) setSpinning(false);
    if (!autoClose) {
      return updateResult;
    }
    return true;
  };

  const handleCheckData = async () => {
    setSpinning(true);
    const updateResult = await handleSubmit(false);
    if (updateResult.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      {
        '@type': 'contact data set',
        '@refObjectId': id,
        '@version': version,
      },
      updateResult?.data[0]?.rule_verification,
      false,
    );
    await checkData(
      {
        '@type': 'contact data set',
        '@refObjectId': id,
        '@version': version,
      },
      unRuleVerification,
      nonExistentRef,
      pathRef,
    );
    const problemNodes = pathRef?.findProblemNodes() ?? [];
    if (problemNodes && problemNodes.length > 0) {
      let result = problemNodes.map((item: any) => {
        return {
          id: item['@refObjectId'],
          version: item['@version'],
          ruleVerification: item.ruleVerification,
          nonExistent: item.nonExistent,
        };
      });
      setRefCheckData(result);
    } else {
      setRefCheckData([]);
    }
    const unRuleVerificationData = unRuleVerification.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        ruleVerification: false,
        nonExistent: false,
      };
    });
    const nonExistentRefData = nonExistentRef.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        ruleVerification: true,
        nonExistent: true,
      };
    });
    const errTabNames: string[] = [];
    nonExistentRef.forEach((item: any) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    unRuleVerification.forEach((item: any) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    problemNodes.forEach((item: any) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    formRefEdit.current
      ?.validateFields()
      .then(() => {})
      .catch((err: any) => {
        const errorFields = err?.errorFields ?? [];
        errorFields.forEach((item: any) => {
          const tabName = item?.name[0];
          if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
        });
      })
      .finally(() => {
        if (
          unRuleVerificationData.length === 0 &&
          nonExistentRefData.length === 0 &&
          errTabNames.length === 0 &&
          problemNodes.length === 0
        ) {
          message.success(
            intl.formatMessage({
              id: 'pages.button.check.success',
              defaultMessage: 'Data check successfully!',
            }),
          );
        } else {
          if (errTabNames && errTabNames.length > 0) {
            message.error(
              errTabNames
                .map((tab: any) =>
                  intl.formatMessage({
                    id: `pages.contact.${tab}`,
                    defaultMessage: tab,
                  }),
                )
                .join('，') +
                '：' +
                intl.formatMessage({
                  id: 'pages.button.check.error',
                  defaultMessage: 'Data check failed!',
                }),
            );
          } else {
            message.error(
              intl.formatMessage({
                id: 'pages.button.check.error',
                defaultMessage: 'Data check failed!',
              }),
            );
          }
        }
      });

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
              <FormattedMessage id='pages.button.check' defaultMessage='Data Check' />
            </Button>
            <Button
              onClick={() => {
                handleUpdateReference();
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update Reference'
              />
            </Button>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button> */}
            <Button
              onClick={async () => {
                setShowRules(false);
                await handleSubmit(true);
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <RefCheckContext.Provider value={refCheckContextValue}>
            <ProForm
              formRef={formRefEdit}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as FormContact);
              }}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              initialValues={initData}
              onFinish={() => handleSubmit(true)}
            >
              <ContactForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onTabChange={(key) => onTabChange(key as ContactDataSetObjectKeys)}
                showRules={showRules}
              />
            </ProForm>
          </RefCheckContext.Provider>
        </Spin>
      </Drawer>
      <RefsOfNewVersionDrawer
        open={refsDrawerVisible}
        loading={refsLoading}
        dataSource={refsNewList}
        onCancel={() => setRefsDrawerVisible(false)}
        onKeep={handleKeepVersion}
        onUpdate={handleUpdateRefsVersion}
      />
    </>
  );
};

export default ContactEdit;
