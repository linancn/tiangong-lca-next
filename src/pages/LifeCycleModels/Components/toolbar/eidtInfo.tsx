import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import styles from '@/style/custom.less';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  Drawer,
  message,
  // Input,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { LifeCycleModelForm } from '../form';
// const { TextArea } = Input;
import {
  checkReferences,
  checkRequiredFields,
  dealModel,
  dealProcress,
  getAllProcessesOfModel,
  getAllRefObj,
  updateReviewsAfterCheckData,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';
import { getLifeCycleModelDetail } from '@/services/lifeCycleModels/api';

import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { getProcessDetail } from '@/services/processes/api';
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
  const [unRuleVerificationData, setUnRuleVerificationData] = useState<any[]>([]);
  const [nonExistentRefData, setNonExistentRefData] = useState<any[]>([]);
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const parentRefCheckData = useRefCheckContext();
  const intl = useIntl();
  let modelDetail: any;

  useEffect(() => {
    const unRuleVerification = unRuleVerificationData.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        type: 1,
      };
    });
    const nonExistentRef = nonExistentRefData.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        type: 2,
      };
    });

    setRefCheckData([...unRuleVerification, ...nonExistentRef]);
  }, [unRuleVerificationData, nonExistentRefData]);

  useEffect(() => {
    if (showRules) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      });
    }
  }, [showRules]);

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
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleCheckData = async () => {
    modelDetail = await getLifeCycleModelDetail(data.id, data.version);
    setShowRules(true);
    const { checkResult, tabName } = checkRequiredFields(requiredFields, data ?? fromData);
    if (!checkResult) {
      if (!drawerVisible) {
        setDrawerVisible(true);
        onReset();
      }
      await setActiveTabKey(tabName);
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      }, 100);
    }

    const userTeamId = await getUserTeamId();
    const refObjs = getAllRefObj(data);

    const unReview: any[] = []; //stateCode < 20
    const underReview: any[] = []; //stateCode >= 20 && stateCode < 100
    const unRuleVerification: any[] = [];
    const nonExistentRef: any[] = [];

    if (!modelDetail) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.submitError',
          defaultMessage: 'Submit review failed',
        }),
      );
      setSpinning(false);
      return { checkResult, unReview };
    }

    dealModel(modelDetail?.data, unReview, underReview, unRuleVerification);

    const refsSet = new Set<string>();
    await checkReferences(
      refObjs,
      refsSet,
      userTeamId,
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
    );

    const allProcesses = await getAllProcessesOfModel(modelDetail?.data);
    for (const process of allProcesses) {
      const modelOfProcess = await getLifeCycleModelDetail(process.id, process.version);
      if (modelOfProcess) {
        dealModel(modelOfProcess?.data, unReview, underReview, unRuleVerification);
      }
      const processDetail = await getProcessDetail(process.id, process.version);
      dealProcress(processDetail?.data, unReview, underReview, unRuleVerification, nonExistentRef);

      const processRefObjs = getAllRefObj(processDetail?.data?.json);
      await checkReferences(
        processRefObjs,
        refsSet,
        userTeamId,
        unReview,
        underReview,
        unRuleVerification,
        nonExistentRef,
      );
    }

    setNonExistentRefData(nonExistentRef);
    setUnRuleVerificationData(unRuleVerification);
    if (
      (nonExistentRef && nonExistentRef.length > 0) ||
      (unRuleVerification && unRuleVerification.length > 0) ||
      (underReview && underReview.length > 0)
    ) {
      if (!drawerVisible) {
        setDrawerVisible(true);
        onReset();
      }
      if (underReview && underReview.length > 0) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.review.error',
            defaultMessage: 'Referenced data is under review, cannot initiate another review',
          }),
        );
      }
      setSpinning(false);
      return { checkResult, unReview };
    }

    if (modelDetail?.data?.state_code >= 20) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.submitError',
          defaultMessage: 'Submit review failed',
        }),
      );
      setSpinning(false);
      return { checkResult, unReview };
    }
    setSpinning(false);
    return { checkResult, unReview };
  };

  const submitReview = async (unReview: any[]) => {
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
                <Button onClick={() => handleCheckData()}>
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
            <RefCheckContext.Provider value={[...parentRefCheckData, ...refCheckData]}>
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
          <Collapse
            items={[
              {
                key: '1',
                label: 'JSON Data',
                children: (
                  <Typography>
                    <pre>{JSON.stringify(fromData, null, 2)}</pre>
                  </Typography>
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>
    </>
  );
});

export default ToolbarEditInfo;
