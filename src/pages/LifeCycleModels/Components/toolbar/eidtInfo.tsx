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
import { checkRequiredFields, getAllRefObj, getRefTableName } from '@/pages/Utils';
import { getRefData, updateReviewIdAndStateCode } from '@/services/general/api';
import {
  getLifeCycleModelDetail,
  updateLifeCycleModelStateCode,
} from '@/services/lifeCycleModels/api';
import { getProcessDetail, updateProcessStateCode } from '@/services/processes/api';
import { addReviewsApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
import { v4 } from 'uuid';
import requiredFields from '../../requiredFields';
const { Paragraph } = Typography;

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
  const intl = useIntl();

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

  const handleCheckData = async (data?: any) => {
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
      return { checkResult, tabName };
    }
    message.success(
      intl.formatMessage({
        id: 'pages.button.check.success',
        defaultMessage: 'Data check successfully!',
      }),
    );
    return { checkResult, tabName };
  };

  const submitReview = async () => {
    setSpinning(true);
    const teamId = await getUserTeamId();

    const refObjs = getAllRefObj(data);
    const unReview: any[] = []; //stateCode < 20
    const underReview: any[] = []; //stateCode >= 20 && stateCode < 100
    const unReviewProcesses: any[] = [];
    const unRuleVerification: any[] = [];
    const nonExistentRef: any[] = [];

    let lifeCycleModelDetail: any = {};

    const getAllProcesses = async () => {
      lifeCycleModelDetail = await getLifeCycleModelDetail(data.id, data.version);
      if (
        lifeCycleModelDetail?.data?.state_code >= 20 &&
        lifeCycleModelDetail?.data?.state_code < 100
      ) {
        underReview.push(lifeCycleModelDetail);
        // message.error(
        //   intl.formatMessage({
        //     id: 'pages.process.review.error',
        //     defaultMessage: 'Referenced data is under review, cannot initiate another review',
        //   }),
        // );
        // return false;
      }
      const processes: any[] = [{ id: data.id, version: data.version }];
      lifeCycleModelDetail?.data?.json_tg?.xflow?.nodes?.forEach((item: any) => {
        if (item.data) {
          processes.push(item.data);
        }
      });
      return processes;
    };

    const checkReferences = async (refs: any[], checkedIds = new Set<string>()) => {
      for (const ref of refs) {
        if (checkedIds.has(ref['@refObjectId'])) continue;
        checkedIds.add(ref['@refObjectId']);

        const refResult = await getRefData(
          ref['@refObjectId'],
          ref['@version'],
          getRefTableName(ref['@type']),
          teamId,
        );
        if (refResult.success) {
          const refData = refResult?.data;
          if (
            !refData?.ruleVerification &&
            refData?.stateCode !== 100 &&
            refData?.stateCode !== 200
          ) {
            if (
              !unRuleVerification.find(
                (item) =>
                  item['@refObjectId'] === ref['@refObjectId'] &&
                  item['@version'] === ref['@version'],
              )
            ) {
              unRuleVerification.push(ref);
            }
          }
          if (refData?.stateCode >= 20 && refData?.stateCode < 100) {
            if (
              !underReview.find(
                (item) =>
                  item['@refObjectId'] === ref['@refObjectId'] &&
                  item['@version'] === ref['@version'],
              )
            ) {
              underReview.push(ref);
            }
          }

          if (refData?.stateCode < 20) {
            const json = refData?.json;
            if (
              !unReview.find(
                (item) =>
                  item['@refObjectId'] === ref['@refObjectId'] &&
                  item['@version'] === ref['@version'],
              )
            ) {
              unReview.push(ref);
            }

            const subRefs = getAllRefObj(json);
            await checkReferences(subRefs, checkedIds);
          }
        } else {
          if (
            !nonExistentRef.find(
              (item) =>
                item['@refObjectId'] === ref['@refObjectId'] &&
                item['@version'] === ref['@version'],
            )
          ) {
            nonExistentRef.push(ref);
          }
        }
      }
    };

    await checkReferences(refObjs);

    const allProcesses = await getAllProcesses();

    for (const process of allProcesses) {
      const processDetail = await getProcessDetail(process.id, process.version);
      if (
        !processDetail?.data?.ruleVerification &&
        processDetail?.data?.stateCode !== 100 &&
        processDetail?.data?.stateCode !== 200
      ) {
        unRuleVerification.unshift({
          '@type': 'process data set',
          '@refObjectId': processDetail?.data?.id,
          '@version': processDetail?.data?.version,
        });
      }
      if (processDetail?.data?.stateCode < 20) {
        unReviewProcesses.push(process);
      } else if (processDetail?.data?.stateCode >= 20 && processDetail?.data?.stateCode < 100) {
        underReview.push(processDetail);
      }
      const processRefObjs = getAllRefObj(processDetail?.data?.json);
      await checkReferences(processRefObjs);
    }
    if (
      !lifeCycleModelDetail?.data?.rule_verification &&
      lifeCycleModelDetail?.data?.state_code !== 100 &&
      lifeCycleModelDetail?.data?.state_code !== 200
    ) {
      unRuleVerification.unshift({
        '@type': 'lifeCycleModel data set',
        '@refObjectId': lifeCycleModelDetail?.data?.id,
        '@version': lifeCycleModelDetail?.data?.version,
      });
    }

    if (
      (nonExistentRef && nonExistentRef.length > 0) ||
      (unRuleVerification && unRuleVerification.length > 0) ||
      (underReview && underReview.length > 0)
    ) {
      if (!drawerVisible) {
        setDrawerVisible(true);
        onReset();
      }
      if (nonExistentRef && nonExistentRef.length > 0) {
        setNonExistentRefData(nonExistentRef);
      }
      if (unRuleVerification && unRuleVerification.length > 0) {
        setUnRuleVerificationData(unRuleVerification);
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
      return;
    }

    const reviewId = v4();
    const result = await addReviewsApi(reviewId, data.id, data.version);
    if (result?.error) return;
    if (lifeCycleModelDetail?.data?.state_code >= 20) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.submitError',
          defaultMessage: 'Submit review failed',
        }),
      );
      setSpinning(false);
      return;
    }
    const lifeCycleModelStateCode = 20;

    await updateLifeCycleModelStateCode(data.id, data.version, lifeCycleModelStateCode);

    if (unReviewProcesses.length > 0) {
      for (const process of unReviewProcesses) {
        await updateProcessStateCode(
          process.id,
          process.version,
          reviewId,
          lifeCycleModelStateCode,
        );
      }
    }
    unReview.forEach(async (item: any) => {
      await updateReviewIdAndStateCode(
        reviewId,
        item['@refObjectId'],
        item['@version'],
        getRefTableName(item['@type']),
        lifeCycleModelStateCode,
      );
    });
    message.success(
      intl.formatMessage({
        id: 'pages.process.review.submitSuccess',
        defaultMessage: 'Review submitted successfully',
      }),
    );
    setDrawerVisible(false);
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
                <Button onClick={handleCheckData}>
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
          {unRuleVerificationData && unRuleVerificationData.length > 0 && (
            <>
              <Collapse
                items={[
                  {
                    key: '1',
                    label: intl.formatMessage({
                      id: 'pages.process.review.unRuleVerification.tip',
                      defaultMessage:
                        'The following data is incomplete, please modify and resubmit for review',
                    }),
                    children: (
                      <Typography>
                        {unRuleVerificationData.map((item: any) => (
                          <Paragraph
                            key={item['@refObjectId']}
                          >{`${item['@type']} : ${item['@refObjectId']}`}</Paragraph>
                        ))}
                      </Typography>
                    ),
                  },
                ]}
              />
              <br />
            </>
          )}
          {nonExistentRefData && nonExistentRefData.length > 0 && (
            <>
              <Collapse
                items={[
                  {
                    key: '1',
                    label: intl.formatMessage({
                      id: 'pages.process.review.nonExistentRefData.tip',
                      defaultMessage:
                        'The following data is incomplete, please modify and resubmit for review',
                    }),
                    children: (
                      <Typography>
                        {nonExistentRefData.map((item: any) => (
                          <Paragraph
                            key={item['@refObjectId']}
                          >{`${item['@type']} : ${item['@refObjectId']}`}</Paragraph>
                        ))}
                      </Typography>
                    ),
                  },
                ]}
              />
              <br />
            </>
          )}
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
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
                  await setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
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
