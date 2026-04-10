import styles from '@/style/custom.less';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Drawer,
  message,
  // Input,
  Space,
  Spin,
  Tooltip,
} from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { LifeCycleModelForm } from '../form';
// const { TextArea } = Input;
import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import type { RefCheckType } from '@/contexts/refCheckContext';
import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, refDataType } from '@/pages/Utils/review';
import {
  buildValidationIssues,
  checkReferences,
  checkVersions,
  dealModel,
  dealProcress,
  enrichValidationIssuesWithOwner,
  getAllRefObj,
  getErrRefTab,
  mapValidationIssuesToRefCheckData,
  ReffPath,
  submitDatasetReview,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { normalizeLangPayloadForSave } from '@/services/general/api';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import type {
  LifeCycleModelCheckDataOptions,
  LifeCycleModelDetailData,
  LifeCycleModelDetailResponse,
  LifeCycleModelFormState,
  LifeCycleModelGraphEdge,
  LifeCycleModelGraphNode,
  LifeCycleModelSubModel,
  LifeCycleModelToolbarEditInfoHandle,
  LifeCycleModelValidationIssue,
} from '@/services/lifeCycleModels/data';
import {
  genLifeCycleModelJsonOrdered,
  genReferenceToResultingProcess,
} from '@/services/lifeCycleModels/util';
import { genLifeCycleModelProcesses } from '@/services/lifeCycleModels/util_calculate';
import { getProcessDetail } from '@/services/processes/api';
import { getUserTeamId } from '@/services/roles/api';

export type ToolbarEditInfoHandle = LifeCycleModelToolbarEditInfoHandle<refDataType>;

type ReviewProblemNode = ProblemNode & {
  versionUnderReview?: boolean;
  underReviewVersion?: string;
  versionIsInTg?: boolean;
};

type Props = {
  lang: string;
  data: LifeCycleModelFormState;
  onData: (data: LifeCycleModelFormState) => void;
  action: string;
  actionType?: 'create' | 'copy' | 'createVersion';
};

type ValidationPayload = LifeCycleModelFormState & {
  model?: {
    nodes?: LifeCycleModelGraphNode[];
    edges?: LifeCycleModelGraphEdge[];
  };
};

const cloneValidationValue = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const getLifecycleModelDatasetVersion = (jsonOrdered: any, fallbackVersion: string): string => {
  return (
    jsonOrdered?.lifeCycleModelDataSet?.administrativeInformation?.publicationAndOwnership?.[
      'common:dataSetVersion'
    ] ?? fallbackVersion
  );
};

const buildSdkValidationDataset = async ({
  modelId,
  version,
  payload,
  oldSubmodels,
}: {
  modelId: string;
  version: string;
  payload: ValidationPayload;
  oldSubmodels: LifeCycleModelSubModel[];
}) => {
  const rawLifeCycleModelJsonOrdered = genLifeCycleModelJsonOrdered(modelId, payload);
  const normalizedResult = await normalizeLangPayloadForSave(rawLifeCycleModelJsonOrdered);
  const normalizedLifeCycleModelJsonOrdered =
    normalizedResult?.payload ?? rawLifeCycleModelJsonOrdered;

  const { lifeCycleModelProcesses } = await genLifeCycleModelProcesses(
    modelId,
    payload?.model?.nodes ?? [],
    normalizedLifeCycleModelJsonOrdered,
    oldSubmodels,
  );

  return genReferenceToResultingProcess(
    lifeCycleModelProcesses,
    getLifecycleModelDatasetVersion(normalizedLifeCycleModelJsonOrdered, version),
    cloneValidationValue(normalizedLifeCycleModelJsonOrdered),
  );
};

const ToolbarEditInfo = forwardRef<ToolbarEditInfoHandle, Props>(
  ({ lang, data, onData, action, actionType }, ref) => {
    const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
    const [refsLoading, setRefsLoading] = useState(false);
    const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
    const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

    const [drawerVisible, setDrawerVisible] = useState(false);
    const [activeTabKey, setActiveTabKey] = useState<string>('lifeCycleModelInformation');
    const formRefEdit = useRef<ProFormInstance>();
    const [fromData, setFromData] = useState<LifeCycleModelFormState>({});
    const [spinning, setSpinning] = useState(false);
    const [showRules, setShowRules] = useState<boolean>(false);
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
    const intl = useIntl();
    const modelDetailRef = useRef<LifeCycleModelDetailData | undefined>(undefined);

    useEffect(() => {
      if (showRules) {
        formRefEdit.current?.validateFields();
      }
    }, [showRules, activeTabKey]);

    const handleUpdateRefsVersion = async (newRefs: RefVersionItem[]) => {
      const res = updateRefsData(fromData, newRefs, true);
      setFromData(res);
      formRefEdit.current?.setFieldsValue({ ...res });
      setRefsDrawerVisible(false);
    };

    const handleKeepVersion = async () => {
      const res = updateRefsData(fromData, refsOldList, false);
      setFromData(res);
      formRefEdit.current?.setFieldsValue({ ...res });
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
        formRefEdit.current?.setFieldsValue({ ...res });
      }
    };
    const updateReferenceDescription = async (data: LifeCycleModelFormState) => {
      const { oldRefs } = await getRefsOfCurrentVersion({ ...data, ...fromData });
      const res = updateRefsData({ ...data, ...fromData }, oldRefs, false);
      setFromData(res);
      formRefEdit.current?.setFieldsValue({ ...res });
    };
    const handletFromData = () => {
      const fieldsValue = formRefEdit.current?.getFieldsValue();

      if (activeTabKey === 'complianceDeclarations') {
        setFromData({
          ...fromData,
          modellingAndValidation: {
            ...fromData?.modellingAndValidation,
            complianceDeclarations: fieldsValue?.modellingAndValidation?.complianceDeclarations,
          },
        });
        return;
      }
      if (activeTabKey === 'validation') {
        setFromData({
          ...fromData,
          modellingAndValidation: {
            ...fromData?.modellingAndValidation,
            validation: fieldsValue?.modellingAndValidation?.validation,
          },
        });
        return;
      }

      // if (fromData) {
      setFromData({
        ...fromData,
        [activeTabKey]: fieldsValue?.[activeTabKey] ?? {},
      });
      // }
    };

    const onTabChange = (key: string) => {
      setActiveTabKey(key);
    };

    const onReset = () => {
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue(data);
      setFromData(data);
    };

    useEffect(() => {
      if (!drawerVisible) {
        setRefCheckContextValue({ refCheckData: [] });
        setShowRules(false);
        return;
      }
      onReset();
    }, [drawerVisible]);

    const handleCheckData = async (
      from: 'review' | 'checkData',
      nodes: LifeCycleModelGraphNode[],
      edges: LifeCycleModelGraphEdge[],
      options?: LifeCycleModelCheckDataOptions,
    ): Promise<{
      checkResult: boolean;
      unReview: refDataType[];
      problemNodes?: refDataType[];
    }> => {
      const silent = options?.silent ?? false;
      const validationSnapshot = options?.validationSnapshot;
      const validationModelId = validationSnapshot?.modelId ?? data.id ?? '';
      const validationVersion = validationSnapshot?.version ?? data.version ?? '';
      setSpinning(true);
      if (nodes?.length) {
        const quantitativeReferenceProcress = nodes.find(
          (node) => node?.data?.quantitativeReference === '1',
        );
        if (!quantitativeReferenceProcress) {
          if (!silent) {
            message.error(
              intl.formatMessage({
                id: 'pages.lifecyclemodel.validator.nodes.quantitativeReference.required',
                defaultMessage: 'Please select a node as reference',
              }),
            );
          }
          setSpinning(false);
          return { checkResult: false, unReview: [] };
        }
      } else {
        if (!silent) {
          message.error(
            intl.formatMessage({
              id: 'pages.lifecyclemodel.validator.nodes.required',
              defaultMessage: 'Please add node',
            }),
          );
        }
        setSpinning(false);
        return { checkResult: false, unReview: [] };
      }
      setShowRules(true);

      const userTeamId = await getUserTeamId();

      const unReview: refDataType[] = [];
      const underReview: refDataType[] = [];
      const unRuleVerification: refDataType[] = [];
      const nonExistentRef: refDataType[] = [];
      const allRefs = new Set<string>();

      const modelDetailResp: LifeCycleModelDetailResponse = await getLifeCycleModelDetail(
        validationModelId,
        validationVersion,
      );
      const currentModelDetail = modelDetailResp.success ? modelDetailResp.data : undefined;
      modelDetailRef.current = currentModelDetail;
      if (!currentModelDetail) {
        if (!silent) {
          message.error(
            intl.formatMessage({
              id: 'pages.button.check.error',
              defaultMessage: 'Data check failed!',
            }),
          );
        }
        setSpinning(false);
        return { checkResult: false, unReview };
      }
      if (
        currentModelDetail.stateCode >= 20 &&
        currentModelDetail.stateCode < 100 &&
        from === 'checkData'
      ) {
        if (!silent) {
          message.error(
            intl.formatMessage({
              id: 'pages.lifecyclemodel.checkData.inReview',
              defaultMessage: 'This data set is under review and cannot be validated',
            }),
          );
        }
        setSpinning(false);
        return { checkResult: false, unReview };
      }

      const rootRef = {
        '@refObjectId': validationModelId,
        '@version': validationVersion,
        '@type': 'lifeCycleModel data set',
      } satisfies refDataType;
      const sdkValidationSource = validationSnapshot?.payload ?? {
        ...currentModelDetail.json.lifeCycleModelDataSet,
        model: { ...currentModelDetail.json_tg?.xflow },
      };
      const orderedValidationDataset = await buildSdkValidationDataset({
        modelId: validationModelId,
        version: validationVersion,
        payload: sdkValidationSource,
        oldSubmodels: currentModelDetail?.json_tg?.submodels ?? [],
      });
      const sdkValidation = validateDatasetWithSdk(
        'lifeCycleModel data set',
        orderedValidationDataset,
      );
      const issues: LifeCycleModelValidationIssue[] = sdkValidation.issues;
      let currentDatasetValid = sdkValidation.success;
      let processInstanceValid = true;
      const errTabNames: string[] = [];
      const currentDatasetTabNames: string[] = [];

      issues.forEach((err: LifeCycleModelValidationIssue) => {
        if (err.path.includes('processInstance')) {
          processInstanceValid = false;
        } else {
          const tabName = typeof err?.path[1] === 'string' ? err.path[1] : undefined;
          if (tabName && !errTabNames.includes(tabName)) {
            errTabNames.push(tabName);
          }
          if (tabName && !currentDatasetTabNames.includes(tabName)) {
            currentDatasetTabNames.push(tabName);
          }
        }
      });
      if (!currentDatasetValid) {
        setTimeout(() => {
          formRefEdit.current?.validateFields();
        }, 200);
      }
      dealModel(currentModelDetail, unReview, underReview, unRuleVerification, nonExistentRef);

      const { data: sameProcressWithModel } = await getProcessDetail(
        validationModelId,
        validationVersion,
      );
      if (sameProcressWithModel) {
        dealProcress(
          sameProcressWithModel,
          unReview,
          underReview,
          unRuleVerification,
          nonExistentRef,
        );
      }

      const refObjs = getAllRefObj(orderedValidationDataset);
      const path = await checkReferences(
        refObjs,
        new Map<string, unknown>(),
        userTeamId,
        unReview,
        underReview,
        unRuleVerification,
        nonExistentRef,
        new ReffPath(rootRef, currentModelDetail.ruleVerification, false),
        allRefs,
        {
          rootRef,
        },
      );
      allRefs.add(`${validationModelId}:${validationVersion}:lifeCycleModel data set`);
      if (sameProcressWithModel) {
        allRefs.add(`${validationModelId}:${validationVersion}:process data set`);
      }
      await checkVersions(allRefs, path);

      const problemNodes = (path?.findProblemNodes(from) ?? []) as ReviewProblemNode[];
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

      const submodels: LifeCycleModelSubModel[] = currentModelDetail?.json_tg?.submodels ?? [];
      if (submodels) {
        submodels.forEach((item) => {
          if (item.type === 'secondary') {
            unReview.push({
              '@refObjectId': item.id,
              '@version': data.version ?? '',
              '@type': 'process data set',
            });
          }
        });
      }
      if (
        currentDatasetValid &&
        nonExistentRef?.length === 0 &&
        unRuleVerification.length === 0 &&
        problemNodes?.length === 0 &&
        issues.length === 0
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
        return { checkResult: true, unReview, problemNodes };
      }

      const modelDataset = orderedValidationDataset?.lifeCycleModelDataSet;
      nonExistentRef.forEach((item) => {
        const tabName = getErrRefTab(item, modelDataset);
        if (tabName && !errTabNames.includes(tabName)) {
          errTabNames.push(tabName);
        }
      });
      unRuleVerification.forEach((item) => {
        const tabName = getErrRefTab(item, modelDataset);
        if (
          tabName &&
          !errTabNames.includes(tabName) &&
          item['@type'] !== 'lifeCycleModel data set' &&
          item['@type'] !== 'process data set'
        ) {
          errTabNames.push(tabName);
        }
      });
      problemNodes.forEach((item) => {
        const tabName = getErrRefTab(item, modelDataset);
        if (
          tabName &&
          !errTabNames.includes(tabName) &&
          item['@type'] !== 'lifeCycleModel data set' &&
          item['@type'] !== 'process data set'
        ) {
          errTabNames.push(tabName);
        }
      });

      let validationHint = intl.formatMessage({
        id: 'pages.button.check.error',
        defaultMessage: 'Data check failed!',
      });

      if (errTabNames.length > 0) {
        validationHint =
          errTabNames
            .map((tab: string) =>
              intl.formatMessage({
                id: `pages.lifeCycleModel.view.${tab}`,
                defaultMessage: tab,
              }),
            )
            .join('，') +
          '：' +
          intl.formatMessage({
            id: 'pages.button.check.error',
            defaultMessage: 'Data check failed!',
          });
        if (!drawerVisible) {
          setDrawerVisible(true);
          onReset();
        }
      } else if (!processInstanceValid) {
        validationHint = intl.formatMessage({
          id: 'pages.lifecyclemodel.review.processInstanceError',
          defaultMessage: 'Please complete the process instance data',
        });
      } else if (unRuleVerification && unRuleVerification.length > 0) {
        const unRuleVerificationMainProduce = unRuleVerification.find((item) => {
          return (
            item['@refObjectId'] === data.id &&
            item['@version'] === data.version &&
            item['@type'] === 'process data set'
          );
        });
        const unRuleVerificationSubProduce = unRuleVerification.find((item) => {
          return submodels?.find(
            (sub) =>
              sub.type === 'secondary' &&
              sub.id === item['@refObjectId'] &&
              item['@type'] === 'process data set',
          );
        });
        if (unRuleVerificationMainProduce) {
          validationHint = intl.formatMessage({
            id: 'pages.lifecyclemodel.review.mainProduceError',
            defaultMessage: 'Please complete the main product process data in the model results',
          });
        } else if (unRuleVerificationSubProduce) {
          validationHint = intl.formatMessage({
            id: 'pages.lifecyclemodel.review.subProduceError',
            defaultMessage: 'Please complete the sub product process data in the model results',
          });
        }
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
      return { checkResult: false, unReview, problemNodes };
    };

    const submitReview = async () => {
      setSpinning(true);
      const currentModelDetail = modelDetailRef.current;
      if (!currentModelDetail) {
        message.error(
          intl.formatMessage({
            id: 'pages.lifecyclemodel.review.submitError',
            defaultMessage: 'Submit review failed',
          }),
        );
        setSpinning(false);
        return;
      }

      const result = await submitDatasetReview(
        'lifecyclemodels',
        currentModelDetail.id,
        currentModelDetail.version,
      );

      if (result?.error) {
        message.error(
          result.error.message ||
            intl.formatMessage({
              id: 'pages.lifecyclemodel.review.submitError',
              defaultMessage: 'Submit review failed',
            }),
        );
        setSpinning(false);
        return;
      }

      message.success(
        intl.formatMessage({
          id: 'pages.process.review.submitSuccess',
          defaultMessage: 'Review submitted successfully',
        }),
      );
      setDrawerVisible(false);
      setSpinning(false);
    };

    useImperativeHandle(ref, () => ({
      submitReview: submitReview,
      handleCheckData: handleCheckData,
      updateReferenceDescription: updateReferenceDescription,
    }));

    return (
      <>
        <Tooltip
          title={<FormattedMessage id='pages.button.model.info' defaultMessage='Base infomation' />}
          placement='left'
        >
          <Button
            type='primary'
            size='small'
            icon={<InfoOutlined />}
            style={{ boxShadow: 'none' }}
            onClick={() => {
              setDrawerVisible(true);
            }}
          ></Button>
        </Tooltip>
        <Drawer
          getContainer={() => document.body}
          destroyOnHidden
          title={
            <FormattedMessage
              id='pages.flow.model.drawer.title.info'
              defaultMessage='Model base infomation'
            ></FormattedMessage>
          }
          width='90%'
          closable={false}
          extra={
            <Button
              icon={<CloseOutlined />}
              style={{ border: 0 }}
              onClick={() => {
                setDrawerVisible(false);
              }}
            ></Button>
          }
          maskClosable={false}
          open={drawerVisible}
          onClose={() => {
            setDrawerVisible(false);
          }}
          footer={
            <Space size={'middle'} className={styles.footer_right}>
              {/* {showReview && (
              <Button onClick={submitReview}>
                <FormattedMessage id='pages.button.review' defaultMessage='Submit for Review' />
              </Button>
            )} */}
              {action === 'edit' ? (
                <>
                  {/* <Button onClick={() => handleCheckData()}>
                  <FormattedMessage id='pages.button.check' defaultMessage='Data Check' />
                </Button> */}

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
              ) : (
                <></>
              )}
              <Button
                onClick={() => {
                  setDrawerVisible(false);
                }}
              >
                <FormattedMessage
                  id='pages.button.cancel'
                  defaultMessage='Cancel'
                ></FormattedMessage>
              </Button>
              <Button
                onClick={() => {
                  setShowRules(false);
                  formRefEdit.current?.submit();
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
                initialValues={data}
                onValuesChange={async (_, allValues) => {
                  if (activeTabKey === 'validation') {
                    await setFromData({
                      ...fromData,
                      modellingAndValidation: {
                        ...fromData?.modellingAndValidation,
                        validation: { ...allValues?.modellingAndValidation?.validation },
                      },
                    });
                  } else if (activeTabKey === 'complianceDeclarations') {
                    await setFromData({
                      ...fromData,
                      modellingAndValidation: {
                        ...fromData?.modellingAndValidation,
                        complianceDeclarations: {
                          ...allValues?.modellingAndValidation?.complianceDeclarations,
                        },
                      },
                    });
                  } else {
                    await setFromData({
                      ...fromData,
                      [activeTabKey]: allValues[activeTabKey] ?? {},
                    });
                  }
                }}
                submitter={{
                  render: () => {
                    return [];
                  },
                }}
                onFinish={async () => {
                  // if (!checkResult) {
                  //   await setActiveTabKey(tabName);
                  //   formRefEdit.current?.validateFields();
                  //   return false;
                  // }
                  onData({ ...fromData });
                  formRefEdit.current?.resetFields();
                  setDrawerVisible(false);
                  return true;
                }}
              >
                <LifeCycleModelForm
                  formType={action}
                  actionType={actionType}
                  lang={lang}
                  activeTabKey={activeTabKey}
                  formRef={formRefEdit}
                  onTabChange={onTabChange}
                  onData={handletFromData}
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
  },
);

export default ToolbarEditInfo;
