import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import styles from '@/style/custom.less';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  Drawer,
  message,
  Modal,
  // Input,
  Space,
  Spin,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { LifeCycleModelForm } from '../form';
// const { TextArea } = Input;
// import { checkRequiredFields } from '@/pages/Utils';
import { getRefData, updateReviewIdAndStateCode } from '@/services/general/api';
import {
  getLifeCycleModelDetail,
  updateLifeCycleModelStateCode,
} from '@/services/lifeCycleModels/api';
import { getProcessDetail, updateProcessStateCode } from '@/services/processes/api';
import { addReviewsApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
import { v4 } from 'uuid';
// import requiredFields from '../../requiredFields';

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
  const intl = useIntl();
  const { token } = theme.useToken();

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
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);
  let lifeCycleModelDetail: any = {};

  const getAllProcesses = async () => {
    lifeCycleModelDetail = await getLifeCycleModelDetail(data.id, data.version);
    if (
      lifeCycleModelDetail?.data?.state_code >= 20 &&
      lifeCycleModelDetail?.data?.state_code < 100
    ) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.error',
          defaultMessage: 'Referenced data is under review, cannot initiate another review',
        }),
      );
      return false;
    }
    const processes: any[] = [{ id: data.id, version: data.version }];
    lifeCycleModelDetail?.data?.json_tg?.xflow?.nodes?.forEach((item: any) => {
      if (item.data) {
        processes.push(item.data);
      }
    });
    return processes;
  };

  const getAllRefObj = (obj: any): any[] => {
    // console.log('getAllRefObj', obj)
    const result: any[] = [];

    const traverse = (current: any) => {
      if (!current || typeof current !== 'object') return;

      if ('@refObjectId' in current && current['@refObjectId'] && current['@version']) {
        result.push(current);
      }

      if (Array.isArray(current)) {
        current.forEach((item) => traverse(item));
      } else if (typeof current === 'object') {
        Object.values(current).forEach((value) => traverse(value));
      }
    };

    traverse(obj);
    return result;
  };
  const showUnRuleVerification = (refs: any[]) => {
    Modal.confirm({
      okButtonProps: {
        type: 'primary',
        style: { backgroundColor: token.colorPrimary },
      },
      title: intl.formatMessage({
        id: 'pages.process.review.unRuleVerification.modal.title',
        defaultMessage: 'Notice',
      }),
      width: 500,
      content: (
        <>
          <div>
            {intl.formatMessage({
              id: 'pages.process.review.unRuleVerification.modal.content',
              defaultMessage:
                'The following data is incomplete, please modify and resubmit for review',
            })}
            :
          </div>
          <div>
            {refs.map((item: any) => (
              <div key={item['@refObjectId']}>{`${item['@type']} : ${item['@refObjectId']}`}</div>
            ))}
          </div>
        </>
      ),
      okText: intl.formatMessage({
        id: 'pages.process.review.unRuleVerification.modal.button.ok',
        defaultMessage: 'OK',
      }),
      cancelButtonProps: { style: { display: 'none' } },
      onOk: () => {},
    });
  };
  const submitReview = async () => {
    setSpinning(true);
    const teamId = await getUserTeamId();

    const tableDict = {
      'contact data set': 'contacts',
      'source data set': 'sources',
      'unit group data set': 'unitgroups',
      'flow property data set': 'flowproperties',
      'flow data set': 'flows',
    };
    const getTableName = (type: string) => {
      return tableDict[type as keyof typeof tableDict] ?? undefined;
    };

    const refObjs = getAllRefObj(data);
    const unReview: any[] = [];
    const unReviewProcesses: any[] = [];
    const unRuleVerification: any[] = [];
    let getRefError = false;
    const checkReferences = async (
      refs: any[],
      checkedIds = new Set<string>(),
    ): Promise<boolean> => {
      for (const ref of refs) {
        if (checkedIds.has(ref['@refObjectId'])) continue;
        checkedIds.add(ref['@refObjectId']);

        const refResult = await getRefData(
          ref['@refObjectId'],
          ref['@version'],
          getTableName(ref['@type']),
          teamId,
        );
        if (refResult.success) {
          const refData = refResult?.data;
          if (!refData?.ruleVerification) {
            unRuleVerification.push(ref);
          }
          if (refData?.stateCode >= 20 && refData?.stateCode < 100) {
            message.error(
              intl.formatMessage({
                id: 'pages.process.review.error',
                defaultMessage: 'Referenced data is under review, cannot initiate another review',
              }),
            );
            return false;
          }

          if (refData?.stateCode < 20) {
            const json = refData?.json;
            unReview.push(ref);

            const subRefs = getAllRefObj(json);
            await checkReferences(subRefs, checkedIds);
          }
        } else {
          getRefError = true;
          return false;
        }
      }
      return true;
    };

    const refCheckResult = await checkReferences(refObjs);
    if (refCheckResult) {
      const allProcesses = await getAllProcesses();
      if (!allProcesses) return false;
      for (const process of allProcesses) {
        const processDetail = await getProcessDetail(process.id, process.version);
        if (!processDetail?.data?.ruleVerification) {
          unRuleVerification.unshift({
            '@type': 'process data set',
            '@refObjectId': processDetail?.data?.id,
            '@version': processDetail?.data?.version,
          });
        }
        if (processDetail?.data?.stateCode < 20) {
          unReviewProcesses.push(process);
        } else if (processDetail?.data?.stateCode >= 20 && processDetail?.data?.stateCode < 100) {
          message.error(
            intl.formatMessage({
              id: 'pages.process.review.error',
              defaultMessage: 'Referenced data is under review, cannot initiate another review',
            }),
          );
          return false;
        }
        const processRefObjs = getAllRefObj(processDetail?.data?.json);
        const processCheckResult = await checkReferences(processRefObjs);
        if (!processCheckResult) {
          message.error(
            intl.formatMessage({
              id: 'pages.process.review.submitError',
              defaultMessage: 'Submit review failed',
            }),
          );
          return false;
        }
      }
      if (!lifeCycleModelDetail?.data?.rule_verification) {
        unRuleVerification.unshift({
          '@type': 'lifeCycleModel data set',
          '@refObjectId': lifeCycleModelDetail?.data?.id,
          '@version': lifeCycleModelDetail?.data?.version,
        });
      }

      if (unRuleVerification.length > 0) {
        showUnRuleVerification(unRuleVerification);
        setSpinning(false);
        return;
      }

      if (getRefError) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.review.submitError',
            defaultMessage: 'Submit review failed',
          }),
        );
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
      const lifeCycleModelStateCode = lifeCycleModelDetail?.data?.state_code + 20;

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
          getTableName(item['@type']),
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
    }
    setSpinning(false);
  };

  useImperativeHandle(ref, () => ({
    submitReview: async () => {
      await submitReview();
    },
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
                // const { checkResult, tabName } = checkRequiredFields(requiredFields, fromData);
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
