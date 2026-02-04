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
import type { RefCheckType } from '@/contexts/refCheckContext';
import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import type { refDataType } from '@/pages/Utils/review';
import {
  checkReferences,
  checkVersions,
  dealModel,
  dealProcress,
  getAllRefObj,
  getErrRefTab,
  ReffPath,
  updateReviewsAfterCheckData,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import { genLifeCycleModelJsonOrdered } from '@/services/lifeCycleModels/util';
import { getProcessDetail } from '@/services/processes/api';
import { getUserTeamId } from '@/services/roles/api';
import { createLifeCycleModel as createTidasLifeCycleModel } from '@tiangong-lca/tidas-sdk';
import { v4 } from 'uuid';

type Props = {
  lang: string;
  data: any;
  onData: (data: any) => void;
  action: string;
  actionType?: 'create' | 'copy' | 'createVersion';
};
const ToolbarEditInfo = forwardRef<any, Props>(
  ({ lang, data, onData, action, actionType }, ref) => {
    const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
    const [refsLoading, setRefsLoading] = useState(false);
    const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
    const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

    const [drawerVisible, setDrawerVisible] = useState(false);
    const [activeTabKey, setActiveTabKey] = useState<string>('lifeCycleModelInformation');
    const formRefEdit = useRef<ProFormInstance>();
    const [fromData, setFromData] = useState<any>({});
    const [spinning, setSpinning] = useState(false);
    const [showRules, setShowRules] = useState<boolean>(false);
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
    const intl = useIntl();
    let modelDetail: any;

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
    const updateReferenceDescription = async (data: any) => {
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

    const handleCheckData: (
      from: 'review' | 'checkData',
      nodes: any[],
      edges: any[],
    ) => Promise<{
      checkResult: boolean;
      unReview: refDataType[];
      problemNodes?: refDataType[];
    }> = async (from, nodes: any[], edges: any[]) => {
      if (nodes?.length) {
        const quantitativeReferenceProcress = nodes.find(
          (node) => node?.data?.quantitativeReference === '1',
        );
        if (!quantitativeReferenceProcress) {
          message.error(
            intl.formatMessage({
              id: 'pages.lifecyclemodel.validator.nodes.quantitativeReference.required',
              defaultMessage: 'Please select a node as reference',
            }),
          );
          setSpinning(false);
          return { checkResult: false, unReview: [] };
        }
      } else {
        message.error(
          intl.formatMessage({
            id: 'pages.lifecyclemodel.validator.nodes.required',
            defaultMessage: 'Please add node',
          }),
        );
        setSpinning(false);
        return { checkResult: false, unReview: [] };
      }
      if (!edges?.length) {
        message.error(
          intl.formatMessage({
            id: 'pages.lifecyclemodel.validator.exchanges.required',
            defaultMessage: 'Please add connection line',
          }),
        );
        setSpinning(false);
        return { checkResult: false, unReview: [] };
      }

      setShowRules(true);

      const userTeamId = await getUserTeamId();

      const unReview: refDataType[] = []; //stateCode < 20
      const underReview: refDataType[] = []; //stateCode >= 20 && stateCode < 100
      const unRuleVerification: refDataType[] = [];
      const nonExistentRef: refDataType[] = [];
      const allRefs = new Set<string>();

      modelDetail = await getLifeCycleModelDetail(data.id, data.version);
      if (modelDetail.stateCode >= 20 && modelDetail.stateCode < 100) {
        message.error(
          intl.formatMessage({
            id: 'pages.lifecyclemodel.checkData.inReview',
            defaultMessage: 'This data set is under review and cannot be validated',
          }),
        );
        setSpinning(false);
        return { checkResult: false, unReview };
      }
      const tidasLifeCycleModel = createTidasLifeCycleModel(
        genLifeCycleModelJsonOrdered(data.id, {
          ...modelDetail.data.json.lifeCycleModelDataSet,
          model: { ...modelDetail.data.json_tg.xflow },
        }),
      );
      const validateResult = tidasLifeCycleModel.validateEnhanced();
      const issues = validateResult.success
        ? []
        : validateResult.error.issues.filter(
            (item) =>
              !item.path.includes('validation') &&
              !item.path.includes('complianceDeclarations') &&
              !item.path.includes('quantitativeReference'),
          );
      let valid = issues.length === 0;
      dealModel(modelDetail?.data, unReview, underReview, unRuleVerification, nonExistentRef);

      const { data: sameProcressWithModel } = await getProcessDetail(data.id, data.version);
      if (sameProcressWithModel) {
        dealProcress(
          sameProcressWithModel,
          unReview,
          underReview,
          unRuleVerification,
          nonExistentRef,
        );
      }

      const refObjs = getAllRefObj(modelDetail?.data);
      const path = await checkReferences(
        refObjs,
        new Map<string, any>(),
        userTeamId,
        unReview,
        underReview,
        unRuleVerification,
        nonExistentRef,
        new ReffPath(
          {
            '@refObjectId': data.id,
            '@version': data.version,
            '@type': 'lifeCycleModel data set',
          },
          modelDetail?.data?.ruleVerification,
          false,
        ),
        allRefs,
      );
      allRefs.add(`${data.id}:${data.version}:lifeCycleModel data set`);
      if (sameProcressWithModel) allRefs.add(`${data.id}:${data.version}:process data set`);
      await checkVersions(allRefs, path);

      const problemNodes = path?.findProblemNodes(from) ?? [];
      if (problemNodes && problemNodes.length > 0) {
        let underReviewVersionProcessAndModel: RefCheckType[] = [];
        let versionIsInTgProcessAndModel: RefCheckType[] = [];
        let result = problemNodes.map((item: any) => {
          if (item['@type'] === 'process data set' || item['@type'] === 'lifeCycleModel data set') {
            if (item.underReviewVersion && item.underReviewVersion !== item['@version']) {
              underReviewVersionProcessAndModel.push(item);
            }
            if (item.versionIsInTg) {
              versionIsInTgProcessAndModel.push(item);
            }
          }
          return {
            id: item['@refObjectId'],
            version: item['@version'],
            ruleVerification: item.ruleVerification,
            nonExistent: item.nonExistent,
            versionUnderReview: item.versionUnderReview,
            underReviewVersion: item.underReviewVersion,
            versionIsInTg: item.versionIsInTg,
          };
        });
        setRefCheckData(result);
        if (underReviewVersionProcessAndModel.length) {
          const errorMessages: string[] = [];
          underReviewVersionProcessAndModel.forEach((item: any) => {
            if (item['@type'] === 'lifeCycleModel data set') {
              errorMessages.push(
                intl.formatMessage(
                  {
                    id: 'pages.select.versionUnderReview.lifecycleModel',
                    defaultMessage:
                      'The model data set {id} already has version {underReviewVersion} under review. Your version {currentVersion} cannot be submitted for review.',
                  },
                  {
                    underReviewVersion: item.underReviewVersion,
                    currentVersion: item['@version'],
                    id: item['@refObjectId'],
                  },
                ),
              );
            } else if (item['@type'] === 'process data set') {
              errorMessages.push(
                intl.formatMessage(
                  {
                    id: 'pages.select.versionUnderReview.process',
                    defaultMessage:
                      'The process data set {id} already has version {underReviewVersion} under review. Your version {currentVersion} cannot be submitted for review.',
                  },
                  {
                    underReviewVersion: item.underReviewVersion,
                    currentVersion: item['@version'],
                    id: item['@refObjectId'],
                  },
                ),
              );
            }
          });
          message.error(
            <div>
              {errorMessages.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </div>,
          );
          setSpinning(false);
          return { checkResult: false, unReview, problemNodes };
        }
        if (versionIsInTgProcessAndModel.length) {
          const errorMessages: string[] = [
            intl.formatMessage({
              id: 'pages.select.versionIsInTg',
              defaultMessage:
                'The current dataset version is lower than the published version. Please create a new version based on the latest published version for corrections and updates, then submit for review.',
            }),
          ];
          versionIsInTgProcessAndModel.forEach((item: any) => {
            if (item['@type'] === 'lifeCycleModel data set') {
              errorMessages.push(
                intl.formatMessage(
                  {
                    id: 'pages.select.versionIsInTg.model',
                    defaultMessage: 'model {id}',
                  },
                  {
                    id: item['@refObjectId'],
                  },
                ),
              );
            }
            if (item['@type'] === 'process data set') {
              errorMessages.push(
                intl.formatMessage(
                  {
                    id: 'pages.select.versionIsInTg.process',
                    defaultMessage: 'process {id}',
                  },
                  {
                    id: item['@refObjectId'],
                  },
                ),
              );
            }
          });
          message.error(
            <div>
              {errorMessages.map((msg, index) => (
                <div key={index}>{msg}</div>
              ))}
            </div>,
          );
          setSpinning(false);
          return { checkResult: false, unReview, problemNodes };
        }
      } else {
        setRefCheckData([]);
      }

      if (from === 'review' && underReview && underReview.length > 0) {
        valid = false;
        message.error(
          intl.formatMessage({
            id: 'pages.lifecyclemodel.review.error',
            defaultMessage: 'Referenced data is under review, cannot initiate another review',
          }),
        );
        setSpinning(false);
        return { checkResult: valid, unReview, problemNodes };
      }

      // Only submit the process corresponding to the model; sub-products are not submitted for review.
      // const submodels = modelDetail?.data?.json_tg?.submodels;
      // if (submodels) {
      //   submodels.forEach((item: any) => {
      //     unReview.push({
      //       '@refObjectId': item.id,
      //       '@version': data.version,
      //       '@type': 'process data set',
      //     });
      //   });
      // }
      if (
        valid &&
        nonExistentRef?.length === 0 &&
        unRuleVerification.length === 0 &&
        problemNodes?.length === 0 &&
        issues.length === 0
      ) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.check.success',
            defaultMessage: 'Data check successfully!',
          }),
        );
        setSpinning(false);
        return { checkResult: true, unReview, problemNodes };
      } else {
        const errTabNames: string[] = [];
        let processInstanceValid = true;
        const modelDataset = modelDetail?.data?.json?.lifeCycleModelDataSet;
        issues.forEach((err: any) => {
          if (err.path.includes('processInstance')) {
            processInstanceValid = false;
          } else {
            const tabName = err?.path[1];
            if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
          }
        });
        nonExistentRef.forEach((item: any) => {
          const tabName = getErrRefTab(item, modelDataset);
          if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
        });
        unRuleVerification.forEach((item: any) => {
          const tabName = getErrRefTab(item, modelDataset);
          if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
        });
        problemNodes.forEach((item: any) => {
          const tabName = getErrRefTab(item, modelDataset);
          if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
        });
        if (errTabNames && errTabNames.length > 0) {
          message.error(
            errTabNames
              .map((tab: any) =>
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
              }),
          );
          if (!drawerVisible) {
            setDrawerVisible(true);
            onReset();
          }
          if (issues.filter((item: any) => !item.path.includes('processInstance')).length > 0) {
            setTimeout(() => {
              formRefEdit.current?.validateFields();
            }, 200);
          }
          setSpinning(false);
          return { checkResult: false, unReview, problemNodes };
        } else if (!processInstanceValid) {
          message.error(
            intl.formatMessage({
              id: 'pages.lifecyclemodel.review.processInstanceError',
              defaultMessage: 'Please complete the process instance data',
            }),
          );
          setSpinning(false);
          return { checkResult: false, unReview, problemNodes };
        } else if (unRuleVerification && unRuleVerification.length > 0) {
          const unRuleVerificationMainProduce = unRuleVerification.find((item: any) => {
            return (
              item['@refObjectId'] === data.id &&
              item['@version'] === data.version &&
              item['@type'] === 'process data set'
            );
          });
          if (unRuleVerificationMainProduce) {
            valid = false;

            message.error(
              intl.formatMessage({
                id: 'pages.lifecyclemodel.review.mainProduceError',
                defaultMessage:
                  'Please complete the main product process data in the model results',
              }),
            );
            setSpinning(false);
            return { checkResult: valid, unReview, problemNodes };
          }
        }
        message.error(
          intl.formatMessage({
            id: 'pages.button.check.error',
            defaultMessage: 'Data check failed!',
          }),
        );
        setSpinning(false);
        return { checkResult: false, unReview, problemNodes };
      }
    };

    const submitReview = async (unReview: refDataType[]) => {
      setSpinning(true);

      const reviewId = v4();
      const result = await updateReviewsAfterCheckData(
        modelDetail?.data?.teamId,
        {
          id: data.id,
          version: data.version,
          name:
            modelDetail?.data?.json?.lifeCycleModelDataSet?.lifeCycleModelInformation
              ?.dataSetInformation?.name ?? {},
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
          destroyOnClose
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
