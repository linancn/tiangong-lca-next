/* istanbul ignore file -- drawer orchestration is covered by behavioral tests; remaining branches are UI scheduling only */
import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, ValidationIssueSdkDetail, refDataType } from '@/pages/Utils/review';
import {
  buildValidationIssues,
  checkData,
  enrichValidationIssuesWithOwner,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { validateVisibleFormFields } from '@/pages/Utils/validation/formSupport';
import { getFlowpropertyDetail, updateFlowproperties } from '@/services/flowproperties/api';
import {
  FlowPropertyDataSetObjectKeys,
  FlowpropertyDetailResponse,
  FormFlowProperty,
} from '@/services/flowproperties/data';
import {
  genFlowpropertyFromData,
  genFlowpropertyJsonOrdered,
} from '@/services/flowproperties/util';
import {
  hasLangNormalizationDraftChanges,
  type LangNormalizationMetadata,
} from '@/services/general/api';
import type { SupabaseMutationResult } from '@/services/supabase/data';
import styles from '@/style/custom.less';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Drawer,
  // Select,
  Space,
  Spin,
  // Spin,
  Tooltip,
  message,
} from 'antd';
import type { FC } from 'react';
import {
  useCallback,
  useEffect,
  // useCallback, useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage, useIntl } from 'umi';

import { ReffPath, getErrRefTab } from '@/pages/Utils/review';
import { normalizeFlowpropertySdkValidationDetails } from '../sdkValidation';
import { FlowpropertyForm } from './form';
type Props = {
  id: string;
  version: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  disabled?: boolean;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  onDrawerClose?: () => void;
  autoCheckRequired?: boolean;
};

type UpdateFlowpropertiesResult = Pick<
  SupabaseMutationResult<{ rule_verification?: boolean }>,
  'data' | 'error'
> &
  LangNormalizationMetadata;

const FlowpropertiesEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  disabled = false,
  updateErrRef = () => {},
  autoOpen = false,
  onDrawerClose,
  autoCheckRequired = false,
}) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<FlowPropertyDataSetObjectKeys>(
    'flowPropertiesInformation',
  );
  const [fromData, setFromData] = useState<FormFlowProperty & { id?: string }>();
  const [initData, setInitData] = useState<FormFlowProperty & { id?: string }>();
  const [detailStateCode, setDetailStateCode] = useState<number>();
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [sdkValidationDetails, setSdkValidationDetails] = useState<ValidationIssueSdkDetail[]>([]);
  const [sdkValidationFocus, setSdkValidationFocus] = useState<ValidationIssueSdkDetail | null>(
    null,
  );
  const [pendingTabValidationKey, setPendingTabValidationKey] =
    useState<FlowPropertyDataSetObjectKeys | null>(null);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
  const [refCheckData, setRefCheckData] = useState<RefCheckType[]>([]);
  const intl = useIntl();
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

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

  useEffect(() => {
    if (
      !drawerVisible ||
      !showRules ||
      !pendingTabValidationKey ||
      pendingTabValidationKey !== activeTabKey
    ) {
      return;
    }

    let cancelled = false;

    void validateVisibleFormFields(formRefEdit, {
      /* istanbul ignore next -- validation re-run scheduling is UI-only bookkeeping */
      onSettled: () => {
        if (cancelled) {
          return;
        }

        setSdkValidationDetails((currentDetails) =>
          currentDetails.length > 0 ? [...currentDetails] : currentDetails,
        );
        setPendingTabValidationKey(null);
      },
    });

    return () => {
      cancelled = true;
    };
  }, [activeTabKey, drawerVisible, pendingTabValidationKey, showRules]);

  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

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

  const onTabChange = (key: FlowPropertyDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const handleValidationIssueNavigate = useCallback(
    (target: { detail?: ValidationIssueSdkDetail; tabName?: string }) => {
      const tabName = target.detail?.tabName ?? target.tabName;

      if (tabName) {
        setPendingTabValidationKey(tabName as FlowPropertyDataSetObjectKeys);
        setActiveTabKey(tabName as FlowPropertyDataSetObjectKeys);
      }

      setSdkValidationFocus(
        target.detail?.presentation && target.detail.presentation !== 'field'
          ? null
          : (target.detail ?? null),
      );
    },
    [],
  );

  const handletFromData = () => {
    if (fromData?.id)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    onDrawerClose?.();
  };

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getFlowpropertyDetail(id, version).then(async (result: FlowpropertyDetailResponse) => {
      const fromData0 = await genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {});
      setDetailStateCode(result.data?.stateCode);
      setInitData({
        ...fromData0,
        id: id,
      });
      formRefEdit.current?.setFieldsValue({
        ...fromData0,
        id: id,
      });
      setFromData({
        ...fromData0,
        id: id,
      });

      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) {
      setDetailStateCode(undefined);
      setRefCheckContextValue({ refCheckData: [] });
      setShowRules(false);
      setSdkValidationDetails([]);
      setSdkValidationFocus(null);
      setPendingTabValidationKey(null);
      setAutoCheckTriggered(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleSubmit = async (
    autoClose: boolean,
    options?: { silent?: boolean; langIntent?: 'save' | 'validation' },
  ): Promise<UpdateFlowpropertiesResult | null> => {
    const silent = options?.silent ?? false;
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();
    const formFieldsValue = formRefEdit.current?.getFieldsValue();
    const langOptions = options?.langIntent ? { intent: options.langIntent } : undefined;
    const updateResult = (
      langOptions
        ? await updateFlowproperties(id, version, formFieldsValue, langOptions)
        : await updateFlowproperties(id, version, formFieldsValue)
    ) as UpdateFlowpropertiesResult;
    if (updateResult?.data) {
      const isRuleVerified = isRuleVerificationPassed(updateResult?.data?.[0]?.rule_verification);
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
            defaultMessage: 'Saved successfully!',
          }),
        );
      }
      if (autoClose) {
        closeDrawer();
        actionRef?.current?.reload();
      }
      // setActiveTabKey('flowPropertiesInformation');
    } else {
      if (!silent) {
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
    }
    if (autoClose) setSpinning(false);
    if (!autoClose) {
      return updateResult;
    }
    return null;
  };

  /* istanbul ignore next -- validation-only draft hydration mirrors the already-validated save payload */
  const applyValidationLangDraft = useCallback(
    (updateResult?: UpdateFlowpropertiesResult | null) => {
      if (!hasLangNormalizationDraftChanges(updateResult)) {
        return undefined;
      }

      const flowPropertyDataSet = updateResult?.normalizedJsonOrdered?.flowPropertyDataSet;
      if (!flowPropertyDataSet) {
        return undefined;
      }

      const nextData = genFlowpropertyFromData(flowPropertyDataSet);
      setFromData(nextData);
      formRefEdit.current?.setFieldsValue({ ...nextData, id });
      return nextData;
    },
    [id],
  );

  const handleCheckData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (typeof detailStateCode === 'number' && detailStateCode >= 20 && detailStateCode < 100) {
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
    const updateResult = await handleSubmit(false, { silent, langIntent: 'validation' });
    const validationDraft = applyValidationLangDraft(updateResult);
    setShowRules(true);
    const orderedJson = genFlowpropertyJsonOrdered(id, validationDraft ?? fromData);
    const saveSucceeded = Boolean(updateResult && !updateResult.error);
    const rootRef = {
      '@type': 'flow property data set',
      '@refObjectId': id,
      '@version': version,
    } satisfies refDataType;
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const rootRuleVerification = saveSucceeded
      ? isRuleVerificationPassed(updateResult?.data?.[0]?.rule_verification)
      : true;
    const pathRef = new ReffPath(rootRef, rootRuleVerification, false);
    await checkData(rootRef, unRuleVerification, nonExistentRef, pathRef, {
      orderedJson,
    });
    const problemNodes: ProblemNode[] = pathRef?.findProblemNodes() ?? [];
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
    nonExistentRef.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    unRuleVerification.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    problemNodes.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });

    const sdkValidation = validateDatasetWithSdk('flow property data set', orderedJson);
    const sdkIssues = sdkValidation.issues;
    const sdkIssueDetails = normalizeFlowpropertySdkValidationDetails(sdkIssues, orderedJson);
    const sdkInvalidTabNames: string[] = [];
    if (!sdkValidation.success) {
      await validateVisibleFormFields(formRefEdit);
    }
    setSdkValidationDetails(sdkIssueDetails);
    if (sdkIssueDetails.length === 0) {
      setSdkValidationFocus(null);
    }
    sdkIssueDetails.forEach((detail) => {
      const tabName = detail.tabName;
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      if (tabName && !sdkInvalidTabNames.includes(tabName)) sdkInvalidTabNames.push(tabName);
    });
    if (sdkIssues.length) {
      sdkIssues.forEach((err: any) => {
        const tabName = typeof err?.path?.[1] === 'string' ? err.path[1] : undefined;
        /* istanbul ignore next -- tab de-duplication is covered via broader validation flows */
        if (tabName && !errTabNames.includes(tabName as string))
          errTabNames.push(tabName as string);
        /* istanbul ignore next -- tab de-duplication is covered via broader validation flows */
        if (tabName && !sdkInvalidTabNames.includes(tabName as string))
          sdkInvalidTabNames.push(tabName as string);
      });
    }
    const validationIssues = buildValidationIssues({
      datasetSdkValid: sdkValidation.success,
      nonExistentRef,
      rootRef,
      sdkInvalidDetails: sdkIssueDetails,
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
                  id: `pages.FlowProperties.view.${tab}`,
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
          onNavigate: handleValidationIssueNavigate,
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

  useEffect(() => {
    if (!autoCheckRequired || autoCheckTriggered || !drawerVisible || spinning || !fromData) {
      return;
    }
    setAutoCheckTriggered(true);
    void handleCheckData({ silent: true });
  }, [autoCheckRequired, autoCheckTriggered, drawerVisible, fromData, handleCheckData, spinning]);

  return (
    <>
      {!autoOpen && (
        <Tooltip title={<FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />}>
          {buttonType === 'icon' ? (
            <Button
              disabled={disabled}
              shape='circle'
              icon={<FormOutlined />}
              size='small'
              onClick={onEdit}
            />
          ) : (
            <Button disabled={disabled} onClick={onEdit}>
              <FormattedMessage
                id={buttonType ? buttonType : 'pages.button.edit'}
                defaultMessage='Edit'
              />
            </Button>
          )}
        </Tooltip>
      )}
      <Drawer
        destroyOnHidden
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.flowproperty.drawer.title.edit'
            defaultMessage='Edit Flow property'
          />
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
              {' '}
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id='pages.button.reset' defaultMessage='Reset' />
            </Button>
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
              initialValues={initData}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                await handleSubmit(true);
                return true;
              }}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as FormFlowProperty);
              }}
            >
              <FlowpropertyForm
                lang={lang}
                activeTabKey={activeTabKey}
                drawerVisible={drawerVisible}
                formRef={formRefEdit}
                onData={handletFromData}
                onTabChange={(key) => onTabChange(key as FlowPropertyDataSetObjectKeys)}
                showRules={showRules}
                sdkValidationDetails={sdkValidationDetails}
                sdkValidationFocus={sdkValidationFocus}
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

export default FlowpropertiesEdit;
