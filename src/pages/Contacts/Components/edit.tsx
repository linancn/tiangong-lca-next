import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  buildValidationIssues,
  checkData,
  enrichValidationIssuesWithOwner,
  getAllRefObj,
  getErrRefTab,
  getRefTableName,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { getContactDetail, updateContact } from '@/services/contacts/api';
import {
  ContactDataSetObjectKeys,
  ContactDetailResponse,
  FormContact,
} from '@/services/contacts/data';
import { genContactFromData, genContactJsonOrdered } from '@/services/contacts/util';
import { getRefData, updateStateCodeApi } from '@/services/general/api';
import { getReviewUserRoleApi, getUserTeamId } from '@/services/roles/api';
import type { SupabaseMutationResult } from '@/services/supabase/data';
import styles from '@/style/custom.less';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
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
  disabled?: boolean;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
  showSyncOpenDataButton?: boolean;
};

type UpdateContactResult = SupabaseMutationResult<{
  id?: string;
  version?: string;
  json?: { contactDataSet?: any };
  state_code?: number;
  rule_verification?: boolean;
}>;

const ContactEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  disabled = false,
  setViewDrawerVisible,
  updateErrRef = () => {},
  autoOpen = false,
  autoCheckRequired = false,
  showSyncOpenDataButton = false,
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
  const [currentStateCode, setCurrentStateCode] = useState<number>();
  const [isReviewAdmin, setIsReviewAdmin] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<ContactDataSetObjectKeys>('contactInformation');
  const [showRules, setShowRules] = useState<boolean>(false);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
  const intl = useIntl();
  const [refCheckData, setRefCheckData] = useState<RefCheckType[]>([]);
  const parentRefCheckContext = useRefCheckContext();
  const [refCheckContextValue, setRefCheckContextValue] = useState<{
    refCheckData: RefCheckType[];
  }>({
    refCheckData: [],
  });
  useEffect(() => {
    setRefCheckContextValue({
      refCheckData: [...parentRefCheckContext.refCheckData, ...refCheckData],
    });
  }, [refCheckData, parentRefCheckContext]);

  useEffect(() => {
    if (autoOpen && id && version) {
      setDrawerVisible(true);
    }
  }, [autoOpen, id, version]);

  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    setViewDrawerVisible(false);
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
    getContactDetail(id, version).then(async (result: ContactDetailResponse) => {
      const contactFromData = genContactFromData(result.data?.json?.contactDataSet ?? {});
      setInitData(contactFromData);
      formRefEdit.current?.setFieldsValue(contactFromData);
      setFromData(contactFromData);
      setCurrentStateCode(result.data?.stateCode);
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

  const updateReferenceDescription = async () => {
    const { oldRefs } = await getRefsOfCurrentVersion(fromData);
    const res = updateRefsData(fromData, oldRefs, false);
    setFromData(res);
    formRefEdit.current?.setFieldsValue({ ...res, id });
  };

  useEffect(() => {
    if (!drawerVisible) {
      setCurrentStateCode(undefined);
      setShowRules(false);
      setAutoCheckTriggered(false);
      setRefCheckContextValue({ refCheckData: [] });
      return;
    }
    onReset();
  }, [drawerVisible]);

  useEffect(() => {
    if (!drawerVisible || !showSyncOpenDataButton) {
      setIsReviewAdmin(false);
      return;
    }

    let mounted = true;
    getReviewUserRoleApi().then((userRole) => {
      if (!mounted) {
        return;
      }
      setIsReviewAdmin(userRole?.role === 'review-admin');
    });

    return () => {
      mounted = false;
    };
  }, [drawerVisible, showSyncOpenDataButton]);

  const handleSubmit = async (
    autoClose: boolean,
    options?: { silent?: boolean },
  ): Promise<UpdateContactResult | undefined> => {
    const silent = options?.silent ?? false;
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();
    const formFieldsValue = formRefEdit.current?.getFieldsValue();
    const updateResult: UpdateContactResult = await updateContact(id, version, formFieldsValue);
    if (updateResult?.data) {
      const isRuleVerified = isRuleVerificationPassed(updateResult?.data?.[0]?.rule_verification);
      if (typeof updateResult?.data?.[0]?.state_code === 'number') {
        setCurrentStateCode(updateResult?.data?.[0]?.state_code);
      }
      if (isRuleVerified) {
        updateErrRef(null);
      } else {
        updateErrRef({
          id: id,
          version: version,
          ruleVerification: isRuleVerified,
          nonExistent: false,
        });
      }
      if (!silent) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.save.success',
            defaultMessage: 'Save successfully!',
          }),
        );
      }
      if (autoClose) {
        closeDrawer();
        actionRef?.current?.reload();
        return undefined;
      }
    } else if (!silent) {
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
    return undefined;
  };

  const validateReferencesForSyncOpenData = async (
    contactId: string,
    contactVersion: string,
    contactDataSet: any,
  ) => {
    const refs = getAllRefObj(contactDataSet);
    if (!refs.length) {
      return true;
    }

    const uniqueRefs = refs.filter((item, index) => {
      const key = `${item['@refObjectId']}:${item['@version']}:${item['@type']}`;
      return (
        refs.findIndex((ref) => {
          const currentKey = `${ref['@refObjectId']}:${ref['@version']}:${ref['@type']}`;
          return currentKey === key;
        }) === index
      );
    });

    const userTeamId = (await getUserTeamId()) ?? '';
    for (const ref of uniqueRefs) {
      if (ref['@type'] === 'contact data set') {
        if (ref['@refObjectId'] !== contactId || ref['@version'] !== contactVersion) {
          message.error(
            intl.formatMessage(
              {
                id: 'pages.contact.syncToOpenData.invalidContactReference',
                defaultMessage:
                  'Contact reference {id}({version}) must match the current contact ID and version.',
              },
              {
                id: ref['@refObjectId'],
                version: ref['@version'],
              },
            ),
          );
          return false;
        }
        continue;
      }

      const tableName = getRefTableName(ref['@type']);
      if (!tableName) {
        continue;
      }

      const refResult = await getRefData(
        ref['@refObjectId'],
        ref['@version'],
        tableName,
        userTeamId,
      );
      const refData = refResult?.data;
      if (!refResult?.success || !refData || refData?.stateCode !== 100) {
        message.error(
          intl.formatMessage(
            {
              id: 'pages.contact.syncToOpenData.invalidReferenceState',
              defaultMessage: 'Referenced data {id}({version}) must be open data.',
            },
            {
              id: ref['@refObjectId'],
              version: ref['@version'],
            },
          ),
        );
        return false;
      }
    }

    return true;
  };

  const handleCheckData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (typeof currentStateCode === 'number' && currentStateCode >= 20 && currentStateCode < 100) {
      if (!silent) {
        message.error(
          intl.formatMessage({
            id: 'pages.checkData.inReview',
            defaultMessage: 'This data set is under review and cannot be validated',
          }),
        );
      }
      return;
    }

    setSpinning(true);
    const updateResult = await handleSubmit(false, { silent });
    if (!updateResult || updateResult.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const rootRuleVerification = isRuleVerificationPassed(
      updateResult?.data?.[0]?.rule_verification,
    );
    const pathRef = new ReffPath(
      {
        '@type': 'contact data set',
        '@refObjectId': id,
        '@version': version,
      },
      rootRuleVerification,
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
    const problemNodes: ProblemNode[] = pathRef?.findProblemNodes() ?? [];
    const rootRef = {
      '@type': 'contact data set',
      '@refObjectId': id,
      '@version': version,
    } satisfies refDataType;
    if (problemNodes && problemNodes.length > 0) {
      const result = problemNodes.map((item) => {
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
    const errTabNames: string[] = [];
    nonExistentRef.forEach((item: refDataType) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    unRuleVerification.forEach((item: refDataType) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    problemNodes.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });

    const sdkValidation = validateDatasetWithSdk(
      'contact data set',
      genContactJsonOrdered(id, fromData),
    );
    const sdkIssues = sdkValidation.issues;
    const sdkInvalidTabNames: string[] = [];
    if (sdkIssues.length) {
      sdkIssues.forEach((err) => {
        const tabName = err.path[1];
        if (tabName && !errTabNames.includes(tabName as string))
          errTabNames.push(tabName as string);
        if (tabName && !sdkInvalidTabNames.includes(tabName as string))
          sdkInvalidTabNames.push(tabName as string);
      });
      formRefEdit.current?.validateFields();
    }
    const validationIssues = buildValidationIssues({
      datasetSdkValid: sdkValidation.success,
      nonExistentRef,
      rootRef,
      sdkInvalidTabNames,
      unRuleVerification,
    });
    if (
      unRuleVerification.length === 0 &&
      nonExistentRef.length === 0 &&
      errTabNames.length === 0 &&
      problemNodes.length === 0 &&
      sdkIssues.length === 0
    ) {
      if (!silent) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.check.success',
            defaultMessage: 'Data check successfully!',
          }),
        );
      }
    } else {
      const validationHint =
        errTabNames && errTabNames.length > 0
          ? errTabNames
              .map((tab) =>
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
            })
          : intl.formatMessage({
              id: 'pages.button.check.error',
              defaultMessage: 'Data check failed!',
            });
      if (!silent && validationIssues.length > 0) {
        const validationIssuesWithOwner = await enrichValidationIssuesWithOwner(validationIssues);
        showValidationIssueModal({
          intl,
          issues: validationIssuesWithOwner,
          title: intl.formatMessage({
            id: 'pages.validationIssues.modal.checkDataTitle',
            defaultMessage: 'Data validation issues',
          }),
        });
      } else if (!silent) {
        message.error(validationHint);
      }
    }
    setSpinning(false);
  };

  const handleSyncToOpenData = async () => {
    setSpinning(true);
    const updateResult = await handleSubmit(false);
    if (!updateResult || updateResult.error || !updateResult?.data?.[0]) {
      setSpinning(false);
      return;
    }

    const latestData = updateResult.data[0];
    const currentId = latestData?.id ?? id;
    const currentVersion = latestData?.version ?? version;

    if (!isRuleVerificationPassed(latestData?.rule_verification)) {
      message.error(
        intl.formatMessage({
          id: 'pages.contact.syncToOpenData.ruleVerificationRequired',
          defaultMessage:
            'Current contact data is incomplete. Please fill all required fields before syncing.',
        }),
      );
      setSpinning(false);
      return;
    }

    const referencesValid = await validateReferencesForSyncOpenData(
      currentId,
      currentVersion,
      latestData?.json?.contactDataSet ?? fromData,
    );

    if (!referencesValid) {
      setSpinning(false);
      return;
    }

    const result = await updateStateCodeApi(currentId, currentVersion, 'contacts', 100);
    if (!result) {
      message.error(
        intl.formatMessage({
          id: 'pages.action.error',
          defaultMessage: 'Action failed',
        }),
      );
      setSpinning(false);
      return;
    }

    setCurrentStateCode(100);
    actionRef?.current?.reload();
    message.success(
      intl.formatMessage({
        id: 'pages.contact.syncToOpenData.success',
        defaultMessage: 'Synchronized to open data successfully!',
      }),
    );
    setSpinning(false);
  };

  useEffect(() => {
    if (!autoCheckRequired || autoCheckTriggered || !drawerVisible || spinning || !fromData) {
      return;
    }
    setAutoCheckTriggered(true);
    void handleCheckData({ silent: true });
  }, [autoCheckRequired, autoCheckTriggered, drawerVisible, fromData, handleCheckData, spinning]);

  return (
    <>
      {!autoOpen &&
        (buttonType === 'icon' ? (
          <Tooltip title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit' />}>
            <Button
              disabled={disabled}
              shape='circle'
              icon={<FormOutlined />}
              size='small'
              onClick={onEdit}
            />
          </Tooltip>
        ) : (
          <Button disabled={disabled} onClick={onEdit}>
            <FormattedMessage
              id={buttonType.trim().length > 0 ? buttonType : 'pages.button.edit'}
              defaultMessage='Edit'
            />
          </Button>
        ))}

      <Drawer
        destroyOnHidden
        getContainer={() => document.body}
        title={
          <FormattedMessage id='pages.contact.drawer.title.edit' defaultMessage='Edit Contact' />
        }
        width='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={closeDrawer}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => void handleCheckData()}>
              <FormattedMessage id='pages.button.check' defaultMessage='Data Check' />
            </Button>
            {showSyncOpenDataButton && isReviewAdmin && (
              <Button
                disabled={spinning || currentStateCode === 100}
                onClick={handleSyncToOpenData}
              >
                <FormattedMessage
                  id='pages.button.syncToOpenData'
                  defaultMessage='Sync to Open Data'
                />
              </Button>
            )}
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
            <Button onClick={closeDrawer}>
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
              onFinish={async () => {
                await handleSubmit(true);
                return true;
              }}
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
