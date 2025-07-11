import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
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
import type { refDataType } from '@/pages/Utils/review';
import {
  checkReferences,
  checkRequiredFields,
  dealModel,
  dealProcress,
  getAllRefObj,
  ReffPath,
  updateReviewsAfterCheckData,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';
import { getProcessDetail } from '@/services/processes/api';

import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { getUserTeamId } from '@/services/roles/api';
import { v4 } from 'uuid';
import requiredFields from '../../requiredFields';
type Props = {
  lang: string;
  data: any;
  onData: (data: any) => void;
  action: string;
};
const ToolbarEditInfo = forwardRef<any, Props>(({ lang, data, onData, action }, ref) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('lifeCycleModelInformation');
  const formRefEdit = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  const [referenceValue, setReferenceValue] = useState(0);
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

  const updateReference = async () => {
    setReferenceValue(referenceValue + 1);
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
      setRefCheckContextValue({refCheckData: []})
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleCheckData: (
    nodes: any[],
    edges: any[],
  ) => Promise<{
    checkResult: boolean;
    unReview: refDataType[];
    problemNodes?: refDataType[];
  }> = async (nodes: any[], edges: any[]) => {
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

    modelDetail = await getLifeCycleModelDetail(data.id, data.version);
    setShowRules(true);
    const { checkResult } = checkRequiredFields(requiredFields, data ?? fromData);

    const userTeamId = await getUserTeamId();

    const unReview: refDataType[] = []; //stateCode < 20
    const underReview: refDataType[] = []; //stateCode >= 20 && stateCode < 100
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];

    if (!modelDetail) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.submitError',
          defaultMessage: 'Submit review failed',
        }),
      );
      setSpinning(false);
      return { checkResult: false, unReview };
    }

    const { data: sameProcressWithModel } = await getProcessDetail(data.id, data.version);
    dealModel(modelDetail?.data, unReview, underReview, unRuleVerification, nonExistentRef);
    dealProcress(sameProcressWithModel, unReview, underReview, unRuleVerification, nonExistentRef);

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
    );
    const problemNodes = path?.findProblemNodes();

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

    if (!checkResult) {
      if (!drawerVisible) {
        setDrawerVisible(true);
        onReset();
      }
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      }, 200);
    }
    if (
      (nonExistentRef && nonExistentRef.length > 0) ||
      (unRuleVerification && unRuleVerification.length > 0) ||
      (underReview && underReview.length > 0)
    ) {
      if (underReview && underReview.length > 0) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.review.error',
            defaultMessage: 'Referenced data is under review, cannot initiate another review',
          }),
        );
      }
      setSpinning(false);
      return { checkResult: false, unReview, problemNodes };
    }

    setSpinning(false);
    return { checkResult, unReview, problemNodes };
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
                <FormattedMessage id='pages.button.review' defaultMessage='Submit for review' />
              </Button>
            )} */}
            {action === 'edit' ? (
              <>
                {/* <Button onClick={() => handleCheckData()}>
                  <FormattedMessage id='pages.button.check' defaultMessage='Data check' />
                </Button> */}

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
              </>
            ) : (
              <></>
            )}
            <Button
              onClick={() => {
                setDrawerVisible(false);
              }}
            >
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel'></FormattedMessage>
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
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
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
                  lang={lang}
                  activeTabKey={activeTabKey}
                  formRef={formRefEdit}
                  onTabChange={onTabChange}
                  onData={handletFromData}
                  showRules={showRules}
                />
              </ProForm>
            </RefCheckContext.Provider>
          </UpdateReferenceContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
});

export default ToolbarEditInfo;
