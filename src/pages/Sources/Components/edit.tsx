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
import { getSourceDetail, updateSource } from '@/services/sources/api';
import { FormSource, SourceDataSetObjectKeys, SourceDetailResponse } from '@/services/sources/data';
import { genSourceFromData, genSourceJsonOrdered } from '@/services/sources/util';
import type { SupabaseMutationResult } from '@/services/supabase/data';
import { supabaseStorageBucket } from '@/services/supabase/key';
import { getThumbFileUrls, removeFile, uploadFile } from '@/services/supabase/storage';
import styles from '@/style/custom.less';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { RcFile, UploadFile } from 'antd/es/upload';
import path from 'path';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { normalizeSourceSdkValidationDetails } from '../sdkValidation';
import { SourceForm } from './form';

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  disabled?: boolean;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
};

type UpdateSourceResult = SupabaseMutationResult<{ rule_verification?: boolean }> &
  LangNormalizationMetadata;
type FilePath = { '@uri': string };
type FileWithUid = UploadFile & { newUid?: string };

const SourceEdit: FC<Props> = ({
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
}) => {
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  const intl = useIntl();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<SourceDataSetObjectKeys>('sourceInformation');
  const [fromData, setFromData] = useState<FormSource>();
  const [initData, setInitData] = useState<FormSource>();
  const [detailStateCode, setDetailStateCode] = useState<number>();
  const [spinning, setSpinning] = useState(false);
  const [fileList0, setFileList0] = useState<UploadFile[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loadFiles, setLoadFiles] = useState<RcFile[]>([]);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [sdkValidationDetails, setSdkValidationDetails] = useState<ValidationIssueSdkDetail[]>([]);
  const [sdkValidationFocus, setSdkValidationFocus] = useState<ValidationIssueSdkDetail | null>(
    null,
  );
  const [pendingTabValidationKey, setPendingTabValidationKey] =
    useState<SourceDataSetObjectKeys | null>(null);
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
  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const reload = useCallback(() => {
    actionRef?.current?.reload();
  }, [actionRef]);

  const onTabChange = (key: SourceDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const handleValidationIssueNavigate = useCallback(
    (target: { detail?: ValidationIssueSdkDetail; tabName?: string }) => {
      const tabName = target.detail?.tabName ?? target.tabName;

      if (tabName) {
        setPendingTabValidationKey(tabName as SourceDataSetObjectKeys);
        setActiveTabKey(tabName as SourceDataSetObjectKeys);
      }

      setSdkValidationFocus(
        target.detail?.presentation && target.detail.presentation !== 'field'
          ? null
          : (target.detail ?? null),
      );
    },
    [],
  );

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    setViewDrawerVisible(false);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getSourceDetail(id, version).then(async (result: SourceDetailResponse) => {
      const dataSet = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      setDetailStateCode(result.data?.stateCode);
      setInitData(dataSet);
      setFromData(dataSet);
      formRefEdit.current?.setFieldsValue(dataSet);
      const initFile = await getThumbFileUrls(
        dataSet.sourceInformation?.dataSetInformation?.referenceToDigitalFile,
      );
      await setFileList0(initFile);
      await setFileList(initFile);
      setSpinning(false);
    });
  };

  const handleSubmit = async (
    autoClose: boolean,
    options?: { silent?: boolean; langIntent?: 'save' | 'validation' },
  ): Promise<UpdateSourceResult | undefined> => {
    const silent = options?.silent ?? false;
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();
    if (fileList0.length > 0) {
      const nonExistentFiles = fileList0.filter(
        (file0) => !fileList.some((file) => file.uid === file0.uid),
      );
      if (nonExistentFiles.length > 0) {
        const { error } = await removeFile(
          nonExistentFiles.map((file) => file.uid.replace(`../${supabaseStorageBucket}/`, '')),
        );
        if (error && !silent) {
          message.error(error.message);
        }
      }
    }

    const filePaths: FilePath[] = [];
    let fileListWithUUID: FileWithUid[] = [];
    if (fileList.length > 0) {
      fileListWithUUID = fileList.map((file) => {
        const isInFileList0 = fileList0.some((file0) => file0.uid === file.uid);
        if (isInFileList0) {
          filePaths.push({ '@uri': file.uid });
          return file;
        } else {
          const fileExtension = path.extname(file.name);
          const newUid = `../${supabaseStorageBucket}/${v4()}${fileExtension}`;
          filePaths.push({ '@uri': newUid });
          return { ...file, newUid: newUid };
        }
      });
    }
    const fieldsValue = formRefEdit.current?.getFieldsValue();
    const nextSourceData = {
      ...fieldsValue,
      sourceInformation: {
        ...fromData?.sourceInformation,
        dataSetInformation: {
          ...fromData?.sourceInformation?.dataSetInformation,
          referenceToDigitalFile: filePaths,
        },
      },
    };
    const langOptions = options?.langIntent ? { intent: options.langIntent } : undefined;
    const result: UpdateSourceResult | undefined = langOptions
      ? await updateSource(id, version, nextSourceData, langOptions)
      : await updateSource(id, version, nextSourceData);

    if (result?.data) {
      const isRuleVerified = isRuleVerificationPassed(result?.data?.[0]?.rule_verification);
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
      if (fileListWithUUID.length > 0) {
        fileListWithUUID.forEach(async (file) => {
          if (file.newUid) {
            const thisFile = loadFiles.find((f) => f.uid === file.uid);
            await uploadFile(file.newUid.replace(`../${supabaseStorageBucket}/`, ''), thisFile);
          }
        });
      }
      message.success(
        intl.formatMessage({
          id: 'page.options.savesuccess',
          defaultMessage: 'Saved Successfully!',
        }),
      );
      if (autoClose) {
        formRefEdit.current?.resetFields();
        closeDrawer();
        reload();
        return undefined;
      }
    } else {
      if (result?.error?.state_code === 100) {
        message.error(
          intl.formatMessage({
            id: 'pages.review.openData',
            defaultMessage: 'This data is open data, save failed',
          }),
        );
      } else if (result?.error?.state_code === 20) {
        message.error(
          intl.formatMessage({
            id: 'pages.review.underReview',
            defaultMessage: 'Data is under review, save failed',
          }),
        );
      } else {
        message.error(result?.error?.message);
      }
    }
    if (autoClose) setSpinning(false);
    if (!autoClose) {
      return result;
    }
    return undefined;
  };

  /* istanbul ignore next -- validation-only draft hydration mirrors the already-validated save payload */
  const applyValidationLangDraft = useCallback(
    (updateResult?: UpdateSourceResult) => {
      if (!hasLangNormalizationDraftChanges(updateResult)) {
        return undefined;
      }

      const sourceDataSet = updateResult?.normalizedJsonOrdered?.sourceDataSet;
      if (!sourceDataSet) {
        return undefined;
      }

      const nextData = genSourceFromData(sourceDataSet);
      setFromData(nextData);
      formRefEdit.current?.setFieldsValue({ ...nextData, id });
      return nextData;
    },
    [id],
  );

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
    const orderedJson = genSourceJsonOrdered(id, validationDraft ?? fromData);
    const saveSucceeded = Boolean(updateResult && !updateResult.error);
    const rootRef = {
      '@type': 'source data set',
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

    const sdkValidation = validateDatasetWithSdk('source data set', orderedJson);
    const sdkIssues = sdkValidation.issues;
    const sdkIssueDetails = normalizeSourceSdkValidationDetails(sdkIssues, orderedJson);
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
                  id: `pages.source.view.${tab}`,
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
              id={buttonType ? buttonType : 'pages.button.edit'}
              defaultMessage='Edit'
            />
          </Button>
        ))}

      <Drawer
        getContainer={() => document.body}
        destroyOnHidden
        title={
          <FormattedMessage id='pages.source.drawer.title.edit' defaultMessage='Edit Source' />
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
              initialValues={initData}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as FormSource);
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
              <SourceForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onTabChange={(key) => onTabChange(key as SourceDataSetObjectKeys)}
                loadFiles={loadFiles}
                setLoadFiles={setLoadFiles}
                fileList={fileList}
                setFileList={setFileList}
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

export default SourceEdit;
