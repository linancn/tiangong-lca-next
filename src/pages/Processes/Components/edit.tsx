import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { checkRequiredFields, getAllRefObj, getRefTableName } from '@/pages/Utils';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';
import { getRefData, updateDateToReviewState,getReviewsOfData } from '@/services/general/api';
import { getProcessDetail, updateProcess } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import { addReviewsApi } from '@/services/reviews/api';
import { getUserTeamId } from '@/services/roles/api';
import { getTeamMessageApi } from '@/services/teams/api';
import { getUsersByIds } from '@/services/users/api';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined, ProductOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import requiredFields from '../requiredFields';
import { ProcessForm } from './form';

const { Paragraph } = Typography;

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ProcessEdit: FC<Props> = ({
  id,
  version,
  lang,
  buttonType,
  actionRef,
  setViewDrawerVisible,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [unRuleVerificationData, setUnRuleVerificationData] = useState<any[]>([]);
  const [nonExistentRefData, setNonExistentRefData] = useState<any[]>([]);
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);
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

  const handletExchangeDataCreate = (data: any) => {
    if (fromData?.id) {
      setExchangeDataSource([
        ...exchangeDataSource,
        { ...data, '@dataSetInternalID': exchangeDataSource.length.toString() },
      ]);
    }
  };

  const handletExchangeData = (data: any) => {
    if (fromData?.id) setExchangeDataSource([...data]);
  };

  const updateReference = async () => {
    const newExchangeDataSource = await Promise.all(
      exchangeDataSource.map(async (item: any) => {
        const refObjectId = item?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
        const version = item?.referenceToFlowDataSet?.['@version'] ?? '';

        const result = await getFlowDetail(refObjectId, version);

        if (!result?.data) {
          return item;
        }

        const refData = genFlowFromData(result.data?.json?.flowDataSet ?? {});

        return {
          ...item,
          referenceToFlowDataSet: {
            ...item?.referenceToFlowDataSet,
            '@version': result.data?.version ?? '',
            'common:shortDescription': genFlowNameJson(
              refData?.flowInformation?.dataSetInformation?.name,
            ),
          },
        };
      }),
    );

    setExchangeDataSource(newExchangeDataSource);
    setReferenceValue(referenceValue + 1);
  };

  const handleCheckData = async () => {
    setShowRules(true);
    const { checkResult, tabName } = checkRequiredFields(requiredFields, fromData);
    if (!checkResult) {
      await setActiveTabKey(tabName);
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      }, 200);
      return { checkResult, tabName };
    } else {
      const exchanges = fromData?.exchanges;
      if (!exchanges || !exchanges?.exchange || exchanges?.exchange?.length === 0) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.validator.exchanges.required',
            defaultMessage: 'Please select exchanges',
          }),
        );
        await setActiveTabKey('exchanges');
        return { checkResult, tabName };
      } else if (
        exchanges?.exchange.filter((item: any) => item?.quantitativeReference).length !== 1
      ) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.validator.exchanges.quantitativeReference.required',
            defaultMessage: 'Exchange needs to have exactly one quantitative reference open',
          }),
        );
        await setActiveTabKey('exchanges');
        return { checkResult, tabName };
      }
    }

    return { checkResult, tabName };
  };

  const handleSubmit = async (closeDrawer: boolean) => {
    if (closeDrawer) setSpinning(true);
    const updateResult = await updateProcess(id, version, {
      ...fromData,
    });
    if (updateResult?.data) {
      if (!closeDrawer) {
        const dataSet = genProcessFromData(updateResult.data[0]?.json?.processDataSet ?? {});
        setInitData({
          ...dataSet,
          id: id,
          stateCode: updateResult.data[0]?.state_code,
          ruleVerification: updateResult.data[0]?.rule_verification,
        });
        setFromData({ ...dataSet, id: id });
        setExchangeDataSource(dataSet?.exchanges?.exchange ?? []);
        // formRefEdit.current?.resetFields();
        formRefEdit.current?.setFieldsValue({
          ...dataSet,
          id: id,
        });
      }
      message.success(
        intl.formatMessage({
          id: 'pages.button.save.success',
          defaultMessage: 'Save successfully!',
        }),
      );
      if (closeDrawer) {
        setSpinning(false);
        setDrawerVisible(false);
        setViewDrawerVisible(false);
      }
      actionRef?.current?.reload();
    } else {
      setSpinning(false);
      message.error(updateResult?.error?.message);
    }
    return true;
  };

  const submitReview = async () => {
    setSpinning(true);
    await handleSubmit(false);
    const { checkResult } = await handleCheckData();
    if (checkResult) {
      const { data: processDetail } = await getProcessDetail(id, version);
      if (!processDetail) {
        setSpinning(false);
        return;
      }

      const unReview: any[] = []; // stateCode < 20
      const underReview: any[] = []; // stateCode >= 20 && stateCode < 100
      const unRuleVerification: any[] = [];
      const nonExistentRef: any[] = [];

      if(processDetail.stateCode < 20){
        unReview.push({
          '@type': 'process data set',
          '@refObjectId': id,
          '@version': version,
        });
      }
      if (processDetail.stateCode >= 20 && processDetail.stateCode < 100) {
        underReview.push({
          '@type': 'process data set',
          '@refObjectId': id,
          '@version': version,
        });
      }
      if (!processDetail?.ruleVerification && processDetail.stateCode !== 100 && processDetail.stateCode !== 200) {
        unRuleVerification.unshift({
          '@type': 'process data set',
          '@refObjectId': id,
          '@version': version,
        });
      }

      
      const userTeamId = await getUserTeamId();
      const refObjs = getAllRefObj(processDetail);
      const checkReferences = async (refs: any[], checkedIds = new Set<string>()) => {
        for (const ref of refs) {
          if (checkedIds.has(ref['@refObjectId'])) continue;
          checkedIds.add(ref['@refObjectId']);

          const refResult = await getRefData(
            ref['@refObjectId'],
            ref['@version'],
            getRefTableName(ref['@type']),
            userTeamId,
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

      setNonExistentRefData(nonExistentRef);
      setUnRuleVerificationData(unRuleVerification);
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
        return;
      }

      if (processDetail.stateCode >= 20) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.review.submitError',
            defaultMessage: 'Submit review failed',
          }),
        );
        setSpinning(false);
        return;
      }
      const team = await getTeamMessageApi(processDetail.teamId);
      const user = await getUsersByIds([sessionStorage.getItem('userId') ?? '']);
      const reviewId = v4();
      const reviewJson = {
        data: {
          id,
          version,
          name: processDetail?.json?.processDataSet?.processInformation?.dataSetInformation?.name ?? {}
        },
        team: {
          id: processDetail.teamId,
          name: team?.data?.[0]?.json?.title
        },
        user: {
          id: sessionStorage.getItem('userId'),
          name: user?.[0]?.display_name,
          email: user?.[0]?.email
        },
        comment: {
          result: 0,
          message: ''
        }
      }
      const result = await addReviewsApi(reviewId, reviewJson);
      if (result?.error) return;
      for(const item of unReview){
        const oldReviews = await getReviewsOfData(item['@refObjectId'],item['@version'],getRefTableName(item['@type']));
        const updateData = {
          state_code: 20,
          reviews:[
            ...oldReviews,
            {
              key: oldReviews?.length,
              id: reviewId
            }
          ]
        }
        await updateDateToReviewState(
          item['@refObjectId'],
          item['@version'],
          getRefTableName(item['@type']),
          updateData
        );
      }
      message.success(
        intl.formatMessage({
          id: 'pages.process.review.submitSuccess',
          defaultMessage: 'Review submitted successfully',
        }),
      );
      setDrawerVisible(false);
      setSpinning(false);
    } else {
      setSpinning(false);
    }
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
      const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
      setInitData({
        ...dataSet,
        id: id,
        stateCode: result.data?.stateCode,
        ruleVerification: result.data?.ruleVerification,
      });
      setFromData({ ...dataSet, id: id });
      setExchangeDataSource(dataSet?.exchanges?.exchange ?? []);
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...dataSet,
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) {
      setShowRules(false);
      setUnRuleVerificationData([]);
      setNonExistentRefData([]);
      return;
    }
    onReset();
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({
      ...fromData,
      exchanges: {
        exchange: [...exchangeDataSource],
      },
    });
  }, [exchangeDataSource]);

  return (
    <>
      {buttonType === 'tool' ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.model.result' defaultMessage='Model result' />}
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
            <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit} />
          ) : (
            <Button onClick={onEdit}>
              <FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />
            </Button>
          )}
        </Tooltip>
      )}
      <Drawer
        getContainer={() => document.body}
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
            <Button onClick={handleCheckData}>
              <FormattedMessage id='pages.button.check' defaultMessage='Data check' />
            </Button>
            <>
              <Button
                onClick={() => {
                  submitReview();
                }}
              >
                <FormattedMessage id='pages.button.review' defaultMessage='Submit for review' />
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
          {(unRuleVerificationData && unRuleVerificationData.length > 0) ||
            (nonExistentRefData && nonExistentRefData.length > 0) ? (
            <>
              <Collapse
                items={[
                  {
                    key: '1',
                    label: intl.formatMessage({
                      id: 'pages.process.review.verify.title',
                      defaultMessage: 'Data verification details',
                    }),
                    children: (
                      <>
                        {unRuleVerificationData && unRuleVerificationData.length > 0 && (
                          <Typography>
                            <Paragraph>
                              <FormattedMessage
                                id='pages.process.review.unRuleVerification.tip'
                                defaultMessage='The following referenced data is incomplete, please complete it'
                              />
                              {unRuleVerificationData?.map((item: any) => (
                                <div key={item['@refObjectId']}>
                                  {`${item['@type']} : ${item['@refObjectId']}`}{' '}
                                  {`${item['@version']}`}
                                </div>
                              ))}
                            </Paragraph>
                          </Typography>
                        )}
                        {nonExistentRefData && nonExistentRefData.length > 0 && (
                          <Typography>
                            <Paragraph>
                              <FormattedMessage
                                id='pages.process.review.nonExistentRefData.tip'
                                defaultMessage='The following data does not exist, please check'
                              />
                              {nonExistentRefData?.map((item: any) => (
                                <div key={item['@refObjectId']}>
                                  {`${item['@type']} : ${item['@refObjectId']}`}{' '}
                                  {`${item['@version']}`}
                                </div>
                              ))}
                            </Paragraph>
                          </Typography>
                        )}
                      </>
                    ),
                  },
                ]}
              />
              <br />
            </>
          ) : null}
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
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
              onFinish={() => handleSubmit(true)}
            >
              <ProcessForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onExchangeData={handletExchangeData}
                onExchangeDataCreate={handletExchangeDataCreate}
                onTabChange={onTabChange}
                exchangeDataSource={exchangeDataSource}
                showRules={showRules}
              />
              <Form.Item name='id' hidden>
                <Input />
              </Form.Item>
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
                    <pre>
                      {JSON.stringify(
                        {
                          exchanges: {
                            exchange: [...exchangeDataSource],
                          },
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </Typography>
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessEdit;
