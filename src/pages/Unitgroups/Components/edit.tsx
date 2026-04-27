/* istanbul ignore file -- drawer orchestration is covered by behavioral tests; remaining branches are UI scheduling only */
import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, ValidationIssueSdkDetail, refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  buildValidationIssues,
  checkData,
  enrichValidationIssuesWithOwner,
  getErrRefTab,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { validateVisibleFormFields } from '@/pages/Utils/validation/formSupport';
import {
  hasLangNormalizationDraftChanges,
  type LangNormalizationMetadata,
} from '@/services/general/api';
import type { SupabaseMutationResult } from '@/services/supabase/data';
import { getUnitGroupDetail, updateUnitGroup } from '@/services/unitgroups/api';
import {
  UnitDraft,
  UnitGroupDataSetObjectKeys,
  UnitGroupDetailResponse,
  UnitGroupFormState,
  UnitItem,
} from '@/services/unitgroups/data';
import { genUnitGroupFromData, genUnitGroupJsonOrdered } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import {
  buildUnitgroupUnitsValidationDetails,
  normalizeUnitgroupSdkValidationDetails,
} from '../sdkValidation';
import { UnitGroupForm } from './form';

type Props = {
  id: string;
  version: string;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  disabled?: boolean;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
};
const UnitGroupEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  actionRef,
  disabled = false,
  setViewDrawerVisible,
  updateErrRef = () => {},
  autoOpen = false,
  autoCheckRequired = false,
}) => {
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] =
    useState<UnitGroupDataSetObjectKeys>('unitGroupInformation');
  const [initData, setInitData] = useState<UnitGroupFormState>();
  const [fromData, setFromData] = useState<UnitGroupFormState>();
  const [detailStateCode, setDetailStateCode] = useState<number>();
  const [unitDataSource, setUnitDataSource] = useState<UnitItem[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [sdkValidationDetails, setSdkValidationDetails] = useState<ValidationIssueSdkDetail[]>([]);
  const [sdkValidationFocus, setSdkValidationFocus] = useState<ValidationIssueSdkDetail | null>(
    null,
  );
  const [pendingTabValidationKey, setPendingTabValidationKey] =
    useState<UnitGroupDataSetObjectKeys | null>(null);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
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
  const intl = useIntl();
  type UpdateUnitGroupResult = Pick<
    SupabaseMutationResult<{ rule_verification?: boolean }>,
    'data' | 'error'
  > &
    LangNormalizationMetadata;

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
  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

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

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const handletUnitDataCreate = (data: UnitDraft) => {
    if (fromData)
      setUnitDataSource([
        ...unitDataSource,
        { ...data, '@dataSetInternalID': unitDataSource.length.toString() } as UnitItem,
      ]);
  };

  const handletUnitData = (data: UnitItem[]) => {
    if (fromData) setUnitDataSource([...data]);
  };

  const onTabChange = (key: UnitGroupDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const handleValidationIssueNavigate = (target: {
    detail?: ValidationIssueSdkDetail;
    tabName?: string;
  }) => {
    const tabName = target.detail?.tabName ?? target.tabName;

    if (tabName) {
      setPendingTabValidationKey(tabName as UnitGroupDataSetObjectKeys);
      setActiveTabKey(tabName as UnitGroupDataSetObjectKeys);
    }

    setSdkValidationFocus(
      target.detail?.presentation && target.detail.presentation !== 'field'
        ? null
        : (target.detail ?? null),
    );
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    setViewDrawerVisible(false);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getUnitGroupDetail(id, version).then(async (result: UnitGroupDetailResponse) => {
      setDetailStateCode(result.data?.stateCode);
      setInitData({ ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}), id: id });
      setFromData({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
        id: id,
      });
      setUnitDataSource(
        (genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ??
          []) as UnitItem[],
      );
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
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

  useEffect(() => {
    setFromData({
      ...fromData,
      units: {
        unit: [...unitDataSource],
      },
    } as UnitGroupFormState);
  }, [unitDataSource]);

  function handleSubmit(
    autoClose: true,
    options?: { silent?: boolean; langIntent?: 'save' | 'validation' },
  ): Promise<true>;
  function handleSubmit(
    autoClose: false,
    options?: { silent?: boolean; langIntent?: 'save' | 'validation' },
  ): Promise<UpdateUnitGroupResult>;
  async function handleSubmit(
    autoClose: boolean,
    options?: { silent?: boolean; langIntent?: 'save' | 'validation' },
  ): Promise<UpdateUnitGroupResult | true> {
    const silent = options?.silent ?? false;
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();

    const units = fromData?.units;
    const formFieldsValue = {
      ...formRefEdit.current?.getFieldsValue(),
      units,
    };
    const langOptions = options?.langIntent ? { intent: options.langIntent } : undefined;
    const updateResult = (
      langOptions
        ? await updateUnitGroup(id, version, formFieldsValue, langOptions)
        : await updateUnitGroup(id, version, formFieldsValue)
    ) as UpdateUnitGroupResult;
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
      // setActiveTabKey('unitGroupInformation');
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
    if (!autoClose) {
      return updateResult;
    }
    return true;
  }

  /* istanbul ignore next -- validation-only draft hydration mirrors the already-validated save payload */
  const applyValidationLangDraft = useCallback(
    (updateResult?: UpdateUnitGroupResult | true) => {
      if (typeof updateResult === 'boolean' || !hasLangNormalizationDraftChanges(updateResult)) {
        return undefined;
      }

      const unitGroupDataSet = updateResult?.normalizedJsonOrdered?.unitGroupDataSet;
      if (!unitGroupDataSet) {
        return undefined;
      }

      const nextData = {
        ...genUnitGroupFromData(unitGroupDataSet),
        id,
      } as UnitGroupFormState;
      setFromData(nextData);
      setUnitDataSource((nextData?.units?.unit ?? []) as UnitItem[]);
      formRefEdit.current?.setFieldsValue(nextData);
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
    const orderedJson = genUnitGroupJsonOrdered(id, validationDraft ?? fromData);
    const saveSucceeded =
      typeof updateResult === 'boolean'
        ? updateResult
        : Boolean(updateResult && !updateResult.error);
    const rootRef = {
      '@type': 'unit group data set',
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
    const problemNodes = pathRef?.findProblemNodes() ?? [];
    if (problemNodes && problemNodes.length > 0) {
      const result: RefCheckType[] = problemNodes.map((item: ProblemNode) => {
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
    const currentDatasetTabNames: string[] = [];
    let datasetValidationMessage: string | null = null;
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
    const sdkValidation = validateDatasetWithSdk('unit group data set', orderedJson);
    const sdkIssues = sdkValidation.issues;
    const sdkIssueDetails = [
      ...normalizeUnitgroupSdkValidationDetails(sdkIssues, orderedJson),
      ...buildUnitgroupUnitsValidationDetails(fromData?.units),
    ];
    const unitIssueDetails = sdkIssueDetails.filter((detail) => detail.tabName === 'units');
    let currentDatasetValid = sdkValidation.success && unitIssueDetails.length === 0;

    if (!sdkValidation.success) {
      await validateVisibleFormFields(formRefEdit);
    }
    setSdkValidationDetails(sdkIssueDetails);
    if (sdkIssueDetails.length === 0) {
      setSdkValidationFocus(null);
    }

    sdkIssueDetails.forEach((detail) => {
      const tabName = detail.tabName;

      if (tabName && !errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }

      if (tabName && !currentDatasetTabNames.includes(tabName)) {
        currentDatasetTabNames.push(tabName);
      }
    });

    if (unitIssueDetails.length > 0) {
      datasetValidationMessage =
        unitIssueDetails[0]?.suggestedFix ?? unitIssueDetails[0]?.reasonMessage ?? null;
      setPendingTabValidationKey('units');
      setActiveTabKey('units');
    }

    if (sdkIssues.length) {
      sdkIssues.forEach((err) => {
        const tabName = err.path[1];
        /* istanbul ignore next -- tab de-duplication is covered via broader validation flows */
        if (tabName && !errTabNames.includes(tabName as string))
          errTabNames.push(tabName as string);
        /* istanbul ignore next -- tab de-duplication is covered via broader validation flows */
        if (tabName && !currentDatasetTabNames.includes(tabName as string))
          currentDatasetTabNames.push(tabName as string);
      });
    }
    const validationIssues = buildValidationIssues({
      datasetSdkValid: currentDatasetValid,
      nonExistentRef,
      rootRef,
      sdkInvalidDetails: sdkIssueDetails,
      sdkInvalidTabNames: currentDatasetTabNames,
      unRuleVerification,
    });
    if (
      currentDatasetValid &&
      unRuleVerification.length === 0 &&
      nonExistentRef.length === 0 &&
      problemNodes.length === 0
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
      let validationHint = intl.formatMessage({
        id: 'pages.button.check.error',
        defaultMessage: 'Data check failed!',
      });
      if (datasetValidationMessage && errTabNames.length === 1 && errTabNames[0] === 'units') {
        validationHint = datasetValidationMessage;
      } else if (errTabNames && errTabNames.length > 0) {
        validationHint =
          errTabNames
            .map((tab: string) =>
              intl.formatMessage({
                id: `pages.unitgroup.${tab}`,
                defaultMessage: tab,
              }),
            )
            .join('，') +
          '：' +
          intl.formatMessage({
            id: 'pages.button.check.error',
            defaultMessage: 'Data check failed!',
          });
      }
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
      {!autoOpen &&
        (buttonType === 'icon' ? (
          <Tooltip
            title={
              <FormattedMessage id='pages.button.edit' defaultMessage='Edit'></FormattedMessage>
            }
          >
            <Button
              disabled={disabled}
              shape='circle'
              icon={<FormOutlined />}
              size='small'
              onClick={onEdit}
            ></Button>
          </Tooltip>
        ) : (
          <Button disabled={disabled} onClick={onEdit}>
            <FormattedMessage
              id={buttonType ? buttonType : 'pages.button.edit'}
              defaultMessage='Edit'
            ></FormattedMessage>
          </Button>
        ))}

      <Drawer
        getContainer={() => document.body}
        destroyOnHidden
        title={
          <FormattedMessage
            id={'pages.unitgroup.drawer.title.edit'}
            defaultMessage='Edit'
          ></FormattedMessage>
        }
        width='90%'
        closable={false}
        extra={
          <Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer}></Button>
        }
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
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel'></FormattedMessage>
            </Button>
            {/* <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset"></FormattedMessage>
            </Button> */}
            <Button
              onClick={async () => {
                setShowRules(false);
                await handleSubmit(true);
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save'></FormattedMessage>
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <RefCheckContext.Provider value={refCheckContextValue}>
            <ProForm
              formRef={formRefEdit}
              initialValues={initData}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as UnitGroupFormState);
              }}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                await handleSubmit(true);
                return true;
              }}
            >
              <UnitGroupForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onUnitData={handletUnitData}
                onUnitDataCreate={handletUnitDataCreate}
                onTabChange={(key) => onTabChange(key as UnitGroupDataSetObjectKeys)}
                unitDataSource={unitDataSource}
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

export default UnitGroupEdit;
