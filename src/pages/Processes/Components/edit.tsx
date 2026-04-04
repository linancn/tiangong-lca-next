import AISuggestion from '@/components/AISuggestion';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType } from '@/contexts/refCheckContext';
import type { ProblemNode, refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  buildValidationIssues,
  checkReferences,
  checkVersions,
  dealProcress,
  enrichValidationIssuesWithOwner,
  getAllRefObj,
  getErrRefTab,
  mapValidationIssuesToRefCheckData,
  updateReviewsAfterCheckData,
  updateUnReviewToUnderReview,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';

import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';
import { toBigNumberOrZero } from '@/services/general/bignumber';
import { jsonToList } from '@/services/general/util';
import { LCIAResultTable } from '@/services/lciaMethods/data';
import { getProcessDetail, updateProcess } from '@/services/processes/api';
import {
  FormProcess,
  ProcessDataSetObjectKeys,
  ProcessDetailData,
  ProcessDetailResponse,
  ProcessExchangeData,
} from '@/services/processes/data';
import { genProcessFromData, genProcessJsonOrdered } from '@/services/processes/util';
import { getUserTeamId } from '@/services/roles/api';
import styles from '@/style/custom.less';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
import { CloseOutlined, FormOutlined, ProductOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { ProcessForm } from './form';

type TabKeysType = ProcessDataSetObjectKeys | 'validation' | 'complianceDeclarations';
type FormProcessWithDatas = FormProcess & {
  id?: string;
  stateCode?: number;
  ruleVerification?: boolean;
};
type ProcessCheckTarget = FormProcessWithDatas & {
  id: string;
  version: string;
  stateCode: number;
  ruleVerification: boolean;
};
type HandleSubmitResult = Awaited<ReturnType<typeof updateProcess>>;
type RefProblemNode = ProblemNode & {
  versionUnderReview?: boolean;
  underReviewVersion?: string;
  versionIsInTg?: boolean;
};

const toReferenceValue = (reference?: ProcessExchangeData['referenceToFlowDataSet']) => {
  return Array.isArray(reference) ? reference[0] : reference;
};

type SdkValidationIssueLike = {
  path: PropertyKey[];
};

const getProcessSdkIssueTabName = (issue: SdkValidationIssueLike) => {
  const section = typeof issue.path?.[1] === 'string' ? issue.path[1] : undefined;

  if (section === 'processInformation' && issue.path?.[2] === 'quantitativeReference') {
    return 'exchanges';
  }

  return section;
};

const cloneProcessData = (data?: FormProcessWithDatas) => {
  if (!data) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(data)) as FormProcessWithDatas;
};

const toProcessExchanges = (exchangeData: ProcessExchangeData[]) =>
  ({
    exchange: exchangeData as FormProcessWithDatas['exchanges']['exchange'],
  }) as FormProcessWithDatas['exchanges'];

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
  hideReviewButton?: boolean;
  updateNodeCb?: (ref: refDataType) => Promise<void>;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
  actionFrom?: 'modelResult';
};
const ProcessEdit: FC<Props> = ({
  id,
  version,
  lang,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  disabled = false,
  hideReviewButton = false,
  updateNodeCb = () => {},
  autoOpen = false,
  autoCheckRequired = false,
  actionFrom,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<TabKeysType>('processInformation');
  const [fromData, setFromData] = useState<FormProcessWithDatas>();
  const [initData, setInitData] = useState<FormProcessWithDatas>();
  const [originJson, setOriginJson] = useState<ProcessDetailData['json']>({});
  const aiSuggestionDataRef = useRef<ProcessDetailData['json']>();
  const [exchangeDataSource, setExchangeDataSource] = useState<ProcessExchangeData[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
  const intl = useIntl();
  const [refCheckData, setRefCheckData] = useState<RefCheckType[]>([]);
  const [refCheckContextValue, setRefCheckContextValue] = useState<{
    refCheckData: RefCheckType[];
  }>({
    refCheckData: [],
  });
  useEffect(() => {
    setRefCheckContextValue({
      refCheckData: [...refCheckData],
    });
  }, [refCheckData]);

  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  useEffect(() => {
    if (autoOpen && id && version) {
      setDrawerVisible(true);
    }
  }, [autoOpen, id, version]);

  const applyProcessData = useCallback(
    (nextData: FormProcessWithDatas, options?: { resetFields?: boolean }) => {
      const normalizedData = { ...nextData, id } as FormProcessWithDatas;
      setFromData(normalizedData);
      setExchangeDataSource(
        ((normalizedData?.exchanges?.exchange ?? []) as ProcessExchangeData[]).map((item) => ({
          ...item,
        })),
      );
      if (options?.resetFields) {
        formRefEdit.current?.resetFields();
      }
      formRefEdit.current?.setFieldsValue(normalizedData);
    },
    [id],
  );

  const getCurrentProcessData = useCallback(() => {
    const baseData = {
      ...(initData ?? {}),
      ...(fromData ?? {}),
    } as FormProcessWithDatas;

    if (Object.keys(baseData).length === 0) {
      return undefined;
    }

    const fieldsValue = formRefEdit.current?.getFieldsValue() ?? {};
    const currentData = {
      ...baseData,
      ...fieldsValue,
      exchanges: {
        exchange: [...exchangeDataSource],
      },
      id,
    } as FormProcessWithDatas;

    if (activeTabKey === 'validation') {
      currentData.modellingAndValidation = {
        ...baseData?.modellingAndValidation,
        validation: {
          ...fieldsValue?.modellingAndValidation?.validation,
        },
      };
    } else if (activeTabKey === 'complianceDeclarations') {
      currentData.modellingAndValidation = {
        ...baseData?.modellingAndValidation,
        complianceDeclarations: {
          ...fieldsValue?.modellingAndValidation?.complianceDeclarations,
        },
      };
    } else {
      currentData[activeTabKey] = fieldsValue?.[activeTabKey] ?? baseData?.[activeTabKey];
    }

    return currentData;
  }, [activeTabKey, exchangeDataSource, fromData, id, initData]);

  const handleLatestJsonChange = (latestJson: ProcessDetailData['json']) => {
    aiSuggestionDataRef.current = latestJson;
  };

  const handleAISuggestionClose = () => {
    const dataSet = genProcessFromData(aiSuggestionDataRef.current?.processDataSet ?? {});
    applyProcessData({ ...dataSet, id }, { resetFields: true });
  };
  const handletFromData = async () => {
    if (fromData?.id) {
      const fieldsValue = formRefEdit.current?.getFieldsValue();
      if (activeTabKey === 'validation') {
        await setFromData({
          ...fromData,
          modellingAndValidation: {
            ...fromData?.modellingAndValidation,
            validation: { ...fieldsValue?.modellingAndValidation?.validation },
          },
        });
      } else if (activeTabKey === 'complianceDeclarations') {
        await setFromData({
          ...fromData,
          modellingAndValidation: {
            ...fromData?.modellingAndValidation,
            complianceDeclarations: {
              ...fieldsValue?.modellingAndValidation?.complianceDeclarations,
            },
          },
        });
      } else {
        await setFromData({
          ...fromData,
          [activeTabKey]: fieldsValue?.[activeTabKey] ?? {},
        });
      }
    }
  };

  const handletExchangeDataCreate = (data: ProcessExchangeData) => {
    if (fromData?.id) {
      const nextExchangeDataSource = [
        ...exchangeDataSource,
        { ...data, '@dataSetInternalID': exchangeDataSource.length.toString() },
      ];
      setExchangeDataSource(nextExchangeDataSource);
      setFromData({
        ...fromData,
        exchanges: {
          exchange: nextExchangeDataSource,
        },
      } as FormProcessWithDatas);
    }
  };

  const handletExchangeData = (data: ProcessExchangeData[]) => {
    if (fromData?.id) {
      const nextExchangeDataSource = [...data];
      setExchangeDataSource(nextExchangeDataSource);
      setFromData({
        ...fromData,
        exchanges: {
          exchange: nextExchangeDataSource,
        },
      } as FormProcessWithDatas);
    }
  };

  const updateExchangeDataSource = async (exchangeData: ProcessExchangeData[]) => {
    const newExchangeDataSource = await Promise.all(
      exchangeData.map(async (item) => {
        const reference = toReferenceValue(item?.referenceToFlowDataSet);
        const refObjectId = reference?.['@refObjectId'] ?? '';
        const version = reference?.['@version'] ?? '';

        const result = await getFlowDetail(refObjectId, version);

        if (!result?.data) {
          return item;
        }

        const refData = genFlowFromData(result.data?.json?.flowDataSet ?? {});
        const shortDescription = (
          genFlowNameJson(refData?.flowInformation?.dataSetInformation?.name) ?? []
        ).filter(
          (
            item,
          ): item is {
            '@xml:lang': string;
            '#text': string;
          } => typeof item?.['@xml:lang'] === 'string' && typeof item?.['#text'] === 'string',
        );
        const latestReference = {
          ...(reference ?? {}),
          '@version': result.data?.version ?? '',
          'common:shortDescription': shortDescription,
        };

        return {
          ...item,
          referenceToFlowDataSet: latestReference,
        };
      }),
    );
    return newExchangeDataSource;
  };

  const handleUpdateRefsVersion = async (newRefs: RefVersionItem[]) => {
    const currentData = cloneProcessData(getCurrentProcessData());
    if (!currentData) {
      return;
    }
    const res = updateRefsData(currentData, newRefs, true) as FormProcessWithDatas;
    const nextExchangeDataSource = await updateExchangeDataSource(
      (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
    );
    applyProcessData({
      ...res,
      exchanges: toProcessExchanges(nextExchangeDataSource),
    });
    setRefsDrawerVisible(false);
  };

  const handleKeepVersion = async () => {
    const currentData = cloneProcessData(getCurrentProcessData());
    if (!currentData) {
      return;
    }
    const res = updateRefsData(currentData, refsOldList, false) as FormProcessWithDatas;
    const nextExchangeDataSource = await updateExchangeDataSource(
      (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
    );
    applyProcessData({
      ...res,
      exchanges: toProcessExchanges(nextExchangeDataSource),
    });
    setRefsDrawerVisible(false);
  };

  const handleUpdateReference = async () => {
    setRefsLoading(true);
    const currentData = cloneProcessData(getCurrentProcessData());
    if (!currentData) {
      setRefsLoading(false);
      return;
    }
    const { newRefs, oldRefs } = await getRefsOfNewVersion(currentData);
    setRefsNewList(newRefs);
    setRefsOldList(oldRefs);
    setRefsLoading(false);
    if (newRefs && newRefs.length) {
      setRefsDrawerVisible(true);
    } else {
      const res = updateRefsData(currentData, oldRefs, false) as FormProcessWithDatas;
      const nextExchangeDataSource = await updateExchangeDataSource(
        (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
      );
      applyProcessData({
        ...res,
        exchanges: toProcessExchanges(nextExchangeDataSource),
      });
    }
  };

  const updateReferenceDescription = async (processData: FormProcessWithDatas) => {
    const currentData = cloneProcessData(processData) as FormProcessWithDatas;
    const { oldRefs } = await getRefsOfCurrentVersion(currentData);
    const res = updateRefsData(currentData, oldRefs, false) as FormProcessWithDatas;
    const nextExchangeDataSource = await updateExchangeDataSource(
      (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
    );
    const nextData = {
      ...res,
      exchanges: toProcessExchanges(nextExchangeDataSource),
    } as FormProcessWithDatas;
    applyProcessData(nextData);
    return nextData;
  };

  const handleSubmit = async (
    closeDrawer: boolean,
    options?: { silent?: boolean },
  ): Promise<HandleSubmitResult> => {
    const silent = options?.silent ?? false;
    if (closeDrawer) setSpinning(true);
    const currentData = getCurrentProcessData();
    if (!currentData) {
      if (closeDrawer) {
        setSpinning(false);
      }
      return;
    }
    const processData = await updateReferenceDescription(currentData);
    const output = (processData.exchanges.exchange as ProcessExchangeData[]).filter(
      (e) => e.exchangeDirection?.toUpperCase() === 'OUTPUT',
    );
    let allocatedFractionTotal = toBigNumberOrZero(0);
    output.forEach((e) => {
      if (e?.allocations?.allocation && e?.allocations?.allocation['@allocatedFraction']) {
        const fractionText = e.allocations.allocation['@allocatedFraction']?.toString?.();
        const fraction = typeof fractionText === 'string' ? fractionText.replace('%', '') : '';
        allocatedFractionTotal = allocatedFractionTotal.plus(toBigNumberOrZero(fraction));
      }
    });
    if (allocatedFractionTotal.isEqualTo(0)) {
      const referenceIndex = output.findIndex(
        (e) => e.quantitativeReference === true && e.exchangeDirection?.toUpperCase() === 'OUTPUT',
      );
      if (referenceIndex > -1) {
        output[referenceIndex].allocations = {
          allocation: {
            '@allocatedFraction': '100%',
          },
        };
      }
    }
    if (allocatedFractionTotal.isGreaterThan(100)) {
      if (!silent) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.validator.allocatedFraction',
            defaultMessage: 'Allocated fraction total of output is greater than 100%. It is',
          }) +
            ' ' +
            allocatedFractionTotal.toString() +
            '%.',
        );
      }
      setSpinning(false);
      return;
    }

    const updateResult = await updateProcess(id, version, {
      ...processData,
    });
    if (updateResult?.data) {
      if (!closeDrawer) {
        const dataSet = genProcessFromData(updateResult.data[0]?.json?.processDataSet ?? {});
        const nextData = {
          ...dataSet,
          id,
          stateCode: updateResult.data[0]?.state_code,
          ruleVerification: updateResult.data[0]?.rule_verification,
        } as FormProcessWithDatas;
        setInitData(nextData);
        applyProcessData(nextData);
      }
      updateNodeCb({
        '@refObjectId': id,
        '@version': version,
        '@type': 'process data set',
      });
      if (!silent) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.save.success',
            defaultMessage: 'Save successfully!',
          }),
        );
      }
      if (closeDrawer) {
        setSpinning(false);
        setDrawerVisible(false);
        setViewDrawerVisible(false);
      }
      actionRef?.current?.reload();
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
      if (closeDrawer) setSpinning(false);
    }
    if (!closeDrawer) {
      return updateResult;
    }
    return undefined;
  };

  const handleCheckData = async (
    from: 'review' | 'checkData',
    processDetail: ProcessCheckTarget,
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent ?? false;
    setSpinning(true);
    setShowRules(true);
    if (processDetail.stateCode >= 20 && processDetail.stateCode < 100 && from === 'checkData') {
      if (!silent) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.checkData.inReview',
            defaultMessage: 'This data set is under review and cannot be validated',
          }),
        );
      }
      setSpinning(false);
      return { checkResult: false, unReview: [] };
    }
    const rootRef = {
      '@refObjectId': id,
      '@version': version,
      '@type': 'process data set',
    } satisfies refDataType;
    const orderedJson = genProcessJsonOrdered(id, processDetail);
    const sdkValidation = validateDatasetWithSdk('process data set', orderedJson);
    const sdkIssues = sdkValidation.issues;
    let currentDatasetValid = sdkValidation.success;
    const errTabNames: string[] = [];
    const currentDatasetTabNames: string[] = [];
    let datasetValidationMessage: string | null = null;

    sdkIssues.forEach((item) => {
      const tabName = getProcessSdkIssueTabName(item as SdkValidationIssueLike);
      if (tabName && !errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }
      if (tabName && !currentDatasetTabNames.includes(tabName)) {
        currentDatasetTabNames.push(tabName);
      }
    });
    if (!currentDatasetValid) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      }, 200);
    }

    const exchanges = processDetail?.exchanges;
    const exchangeList = (exchanges?.exchange ?? []) as ProcessExchangeData[];
    if (!exchanges || !exchanges?.exchange || exchanges?.exchange?.length === 0) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.process.validator.exchanges.required',
        defaultMessage: 'Please select exchanges',
      });
      if (!errTabNames.includes('exchanges')) {
        errTabNames.push('exchanges');
      }
      if (!currentDatasetTabNames.includes('exchanges')) {
        currentDatasetTabNames.push('exchanges');
      }
    } else if (exchangeList.filter((item) => item?.quantitativeReference).length !== 1) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.process.validator.exchanges.quantitativeReference.required',
        defaultMessage: 'Exchange needs to have exactly one quantitative reference open',
      });
      if (!errTabNames.includes('exchanges')) {
        errTabNames.push('exchanges');
      }
      if (!currentDatasetTabNames.includes('exchanges')) {
        currentDatasetTabNames.push('exchanges');
      }
    }

    const unReview: refDataType[] = []; // stateCode < 20
    const underReview: refDataType[] = []; // stateCode >= 20 && stateCode < 100
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const allRefs = new Set<string>();

    dealProcress(processDetail, unReview, underReview, unRuleVerification, nonExistentRef);

    const userTeamId = await getUserTeamId();
    const refObjs = getAllRefObj(processDetail);

    const path = await checkReferences(
      refObjs,
      new Map<string, unknown>(),
      userTeamId,
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
      new ReffPath(rootRef, processDetail?.ruleVerification, false),
      allRefs,
    );
    allRefs.add(`${id}:${version}:process data set`);
    await checkVersions(allRefs, path);
    const problemNodes = (path?.findProblemNodes(from) ?? []) as RefProblemNode[];
    const validationIssues = buildValidationIssues({
      actionFrom: from,
      datasetSdkValid: currentDatasetValid,
      nonExistentRef,
      problemNodes,
      rootRef,
      sdkInvalidTabNames: currentDatasetTabNames,
      unRuleVerification,
    });
    if (validationIssues.length > 0) {
      setRefCheckData(mapValidationIssuesToRefCheckData(validationIssues));
    } else {
      setRefCheckData([]);
    }
    if (
      currentDatasetValid &&
      nonExistentRef?.length === 0 &&
      unRuleVerification.length === 0 &&
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
      setSpinning(false);
      return { checkResult: true, unReview };
    }

    nonExistentRef.forEach((item) => {
      const tabName = getErrRefTab(item, processDetail);
      if (tabName && !errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }
    });
    unRuleVerification.forEach((item) => {
      const tabName = getErrRefTab(item, processDetail);
      if (tabName && !errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }
    });
    problemNodes.forEach((item) => {
      const tabName = getErrRefTab(item, processDetail);
      if (tabName && !errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }
    });

    let validationHint = intl.formatMessage({
      id: 'pages.button.check.error',
      defaultMessage: 'Data check failed!',
    });
    if (datasetValidationMessage && errTabNames.length === 1 && errTabNames[0] === 'exchanges') {
      validationHint = datasetValidationMessage;
    } else if (errTabNames.length > 0) {
      validationHint =
        errTabNames
          .map((tab: string) =>
            intl.formatMessage({
              id: `pages.process.view.${tab}`,
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
        title: intl.formatMessage({
          id:
            from === 'review'
              ? 'pages.validationIssues.modal.reviewTitle'
              : 'pages.validationIssues.modal.checkDataTitle',
          defaultMessage:
            from === 'review' ? 'Review submission blocked' : 'Data validation issues',
        }),
      });
    } else if (!silent) {
      message.error(validationHint);
    }

    setSpinning(false);
    return { checkResult: false, unReview };
  };

  const runCheckData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    setSpinning(true);
    const updateResult = await handleSubmit(false, { silent });
    if (!updateResult || updateResult?.error) {
      setSpinning(false);
      return { checkResult: false, unReview: [] as refDataType[] };
    }
    const updatedProcess = updateResult.data?.[0];
    if (
      !updatedProcess?.id ||
      !updatedProcess?.version ||
      typeof updatedProcess.state_code !== 'number'
    ) {
      setSpinning(false);
      return { checkResult: false, unReview: [] as refDataType[] };
    }
    return handleCheckData(
      'checkData',
      {
        id: updatedProcess.id,
        version: updatedProcess.version,
        ...genProcessFromData(updatedProcess.json?.processDataSet),
        ruleVerification: isRuleVerificationPassed(updatedProcess.rule_verification),
        stateCode: updatedProcess.state_code,
      },
      { silent },
    );
  };

  const submitReview = async () => {
    setSpinning(true);
    const updateResult = await handleSubmit(false);
    const { data: processDetail } = await getProcessDetail(id, version);
    if (!processDetail) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.submitError',
          defaultMessage: 'Submit review failed',
        }),
      );
      setSpinning(false);
      return;
    }
    if (!updateResult?.data) {
      setSpinning(false);
      return;
    }
    const updatedProcess = updateResult.data?.[0];
    if (
      !updatedProcess?.id ||
      !updatedProcess?.version ||
      typeof updatedProcess.state_code !== 'number'
    ) {
      setSpinning(false);
      return;
    }
    const { checkResult, unReview } = await handleCheckData('review', {
      id: updatedProcess.id,
      version: updatedProcess.version,
      ...genProcessFromData(updatedProcess.json?.processDataSet),
      ruleVerification: isRuleVerificationPassed(updatedProcess.rule_verification),
      stateCode: updatedProcess.state_code,
    });

    if (checkResult) {
      setSpinning(true);
      const reviewId = v4();
      const result = await updateReviewsAfterCheckData(
        processDetail.teamId,
        {
          id,
          version,
          name:
            processDetail?.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {},
        },
        reviewId,
      );
      if (result?.error) return;
      await updateUnReviewToUnderReview(unReview, reviewId);
      message.success(
        intl.formatMessage({
          id: 'pages.process.review.submitSuccess',
          defaultMessage: 'Review submitted successfully',
        }),
      );
      actionRef?.current?.reload();
      setDrawerVisible(false);
      setViewDrawerVisible(false);
      setSpinning(false);
    } else {
      setSpinning(false);
    }
  };

  const onTabChange = (key: TabKeysType) => {
    setActiveTabKey(key);
    if (showRules) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      }, 200);
    }
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: ProcessDetailResponse) => {
      setOriginJson(result.data?.json ?? {});
      const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
      const nextData = {
        ...dataSet,
        id,
        stateCode: result.data?.stateCode,
        ruleVerification: result.data?.ruleVerification,
      } as FormProcessWithDatas;
      setInitData(nextData);
      applyProcessData(nextData, { resetFields: true });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) {
      setShowRules(false);
      setRefCheckData([]);
      setAutoCheckTriggered(false);
      // setUnRuleVerificationData([]);
      // setNonExistentRefData([]);
      return;
    }
    onReset();
  }, [drawerVisible]);

  useEffect(() => {
    if (!autoCheckRequired || autoCheckTriggered || !drawerVisible || spinning || !fromData) {
      return;
    }
    setAutoCheckTriggered(true);
    void runCheckData({ silent: true });
  }, [autoCheckRequired, autoCheckTriggered, drawerVisible, fromData, runCheckData, spinning]);

  const handleLciaResults = (result: LCIAResultTable[]) => {
    const updatedLciaResults = result.map((item) => ({
      referenceToLCIAMethodDataSet: item.referenceToLCIAMethodDataSet,
      meanAmount: String(item.meanAmount ?? ''),
    }));
    setFromData(
      (prev) =>
        ({
          ...prev,
          LCIAResults: {
            LCIAResult: updatedLciaResults,
          },
        }) as FormProcessWithDatas,
    );
  };

  return (
    <>
      {!autoOpen &&
        (buttonType === 'toolIcon' ? (
          <Tooltip
            title={
              <FormattedMessage
                id='pages.button.model.process'
                defaultMessage='Process infomation'
              ></FormattedMessage>
            }
            placement='left'
          >
            <Button
              type='primary'
              size='small'
              style={{ boxShadow: 'none' }}
              icon={<FormOutlined />}
              onClick={onEdit}
              disabled={disabled}
            />
          </Tooltip>
        ) : buttonType === 'toolResultIcon' ? (
          <Tooltip
            title={
              <FormattedMessage id='pages.button.model.result' defaultMessage='Model result' />
            }
            placement='left'
          >
            <Button
              disabled={id === ''}
              type='primary'
              icon={<ProductOutlined />}
              size='small'
              style={{ boxShadow: 'none' }}
              onClick={onEdit}
            />
          </Tooltip>
        ) : buttonType === 'tool' ? (
          <Tooltip
            title={
              <FormattedMessage id='pages.button.model.result' defaultMessage='Model result' />
            }
            placement='left'
          >
            <Button
              disabled={id === ''}
              type='primary'
              icon={<ProductOutlined />}
              size='small'
              style={{ boxShadow: 'none' }}
              onClick={onEdit}
            />
          </Tooltip>
        ) : (
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
                <FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />
              </Button>
            )}
          </Tooltip>
        ))}
      <Drawer
        getContainer={() => document.body}
        destroyOnHidden
        title={
          <FormattedMessage
            id={'pages.process.drawer.title.edit'}
            defaultMessage={'Edit process'}
          />
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
            <AISuggestion
              type='process'
              onLatestJsonChange={handleLatestJsonChange}
              onClose={handleAISuggestionClose}
              originJson={originJson}
            />
            <Button
              onClick={async () => {
                await runCheckData();
              }}
            >
              <FormattedMessage id='pages.button.check' defaultMessage='Data Check' />
            </Button>
            <>
              {!hideReviewButton && (
                <Button
                  onClick={() => {
                    submitReview();
                  }}
                >
                  <FormattedMessage id='pages.button.review' defaultMessage='Submit for Review' />
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
            </>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              {' '}
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
          <RefCheckContext.Provider value={refCheckContextValue}>
            <ProForm
              formRef={formRefEdit}
              initialValues={initData}
              onValuesChange={async (_, allValues) => {
                if (activeTabKey === 'validation') {
                  await setFromData({
                    ...fromData,
                    modellingAndValidation: {
                      ...fromData?.modellingAndValidation,
                      validation: { ...allValues?.modellingAndValidation?.validation },
                    },
                  } as FormProcessWithDatas);
                } else if (activeTabKey === 'complianceDeclarations') {
                  await setFromData({
                    ...fromData,
                    modellingAndValidation: {
                      ...fromData?.modellingAndValidation,
                      complianceDeclarations: {
                        ...allValues?.modellingAndValidation?.complianceDeclarations,
                      },
                    },
                  } as FormProcessWithDatas);
                } else {
                  await setFromData({
                    ...fromData,
                    [activeTabKey]: allValues[activeTabKey] ?? {},
                  } as FormProcessWithDatas);
                }
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
              <ProcessForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onExchangeData={handletExchangeData}
                onExchangeDataCreate={handletExchangeDataCreate}
                onTabChange={(key) => onTabChange(key as TabKeysType)}
                exchangeDataSource={exchangeDataSource}
                actionFrom={actionFrom}
                showRules={showRules}
                lciaResults={jsonToList(fromData?.LCIAResults?.LCIAResult) as LCIAResultTable[]}
                onLciaResults={handleLciaResults}
              />
              <Form.Item name='id' hidden>
                <Input />
              </Form.Item>
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

export default ProcessEdit;
