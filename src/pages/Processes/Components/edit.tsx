import AISuggestion from '@/components/AISuggestion';
import { RefCheckContext } from '@/contexts/refCheckContext';
import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import type { refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  checkReferences,
  dealProcress,
  getAllRefObj,
  getErrRefTab,
  updateReviewsAfterCheckData,
  updateUnReviewToUnderReview,
} from '@/pages/Utils/review';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';
import { getRuleVerification } from '@/services/general/util';
import { LCIAResultTable } from '@/services/lciaMethods/data';
import { getProcessDetail, updateProcess } from '@/services/processes/api';
import { genProcessFromData, genProcessJsonOrdered } from '@/services/processes/util';
import { getUserTeamId } from '@/services/roles/api';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined, ProductOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import schema from '../processes_schema.json';
import { ProcessForm } from './form';

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
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [originJson, setOriginJson] = useState<any>({});
  let AISuggestionData: any;
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  // const [unRuleVerificationData, setUnRuleVerificationData] = useState<any[]>([]);
  // const [nonExistentRefData, setNonExistentRefData] = useState<any[]>([]);
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const [refCheckContextValue, setRefCheckContextValue] = useState<any>({
    refCheckData: [],
  });
  useEffect(() => {
    setRefCheckContextValue({
      refCheckData: [...refCheckData],
    });
  }, [refCheckData]);

  useEffect(() => {
    if (autoOpen && id && version) {
      setDrawerVisible(true);
    }
  }, [autoOpen, id, version]);

  const handleLatestJsonChange = (latestJson: any) => {
    AISuggestionData = latestJson;
  };

  const handleAISuggestionClose = () => {
    const dataSet = genProcessFromData(AISuggestionData?.processDataSet ?? {});
    setFromData({ ...dataSet, id: id });
    setExchangeDataSource(dataSet?.exchanges?.exchange ?? []);
    formRefEdit.current?.resetFields();
    formRefEdit.current?.setFieldsValue({
      ...dataSet,
      id: id,
    });
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
  const handleSubmit = async (closeDrawer: boolean) => {
    if (closeDrawer) setSpinning(true);
    const output = exchangeDataSource.filter(
      (e: any) => e.exchangeDirection.toUpperCase() === 'OUTPUT',
    );
    let allocatedFractionTotal = 0;
    output.forEach((e: any) => {
      allocatedFractionTotal += Number(
        e?.allocations?.allocation['@allocatedFraction']?.split('%')[0],
      );
    });
    if (allocatedFractionTotal > 100) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.validator.allocatedFraction',
          defaultMessage: 'Allocated fraction total of output is greater than 100%',
        }),
      );
      setSpinning(false);
      return;
    }
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
      updateNodeCb({
        '@refObjectId': id,
        '@version': version,
        '@type': 'process data set',
      });
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
      if (closeDrawer) setSpinning(false);
    }
    if (!closeDrawer) {
      return updateResult;
    }
    return true;
  };

  const handleCheckData = async (processDetail: any) => {
    setSpinning(true);
    setShowRules(true);
    let { valid, errors } = getRuleVerification(schema, genProcessJsonOrdered(id, processDetail));
    if (!valid) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      }, 200);
    } else {
      const exchanges = fromData?.exchanges;
      if (!exchanges || !exchanges?.exchange || exchanges?.exchange?.length === 0) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.validator.exchanges.required',
            defaultMessage: 'Please select exchanges',
          }),
        );
        valid = false;
        await setActiveTabKey('exchanges');
      } else if (
        exchanges?.exchange.filter((item: any) => item?.quantitativeReference).length !== 1
      ) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.validator.exchanges.quantitativeReference.required',
            defaultMessage: 'Exchange needs to have exactly one quantitative reference open',
          }),
        );
        valid = false;
        await setActiveTabKey('exchanges');
      }
    }

    const unReview: any[] = []; // stateCode < 20
    const underReview: any[] = []; // stateCode >= 20 && stateCode < 100
    const unRuleVerification: any[] = [];
    const nonExistentRef: any[] = [];

    dealProcress(processDetail, unReview, underReview, unRuleVerification, nonExistentRef);

    const userTeamId = await getUserTeamId();
    const refObjs = getAllRefObj(processDetail);

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
          '@refObjectId': id,
          '@version': version,
          '@type': 'process data set',
        },
        processDetail?.ruleVerification,
        false,
      ),
    );

    const problemNodes = path?.findProblemNodes() ?? [];

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

    // setNonExistentRefData(nonExistentRef);
    // setUnRuleVerificationData(unRuleVerification);
    if (
      (nonExistentRef && nonExistentRef.length > 0) ||
      (unRuleVerification && unRuleVerification.length > 0) ||
      (underReview && underReview.length > 0)
    ) {
      valid = false;
      setSpinning(false);
      if (underReview && underReview.length > 0) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.review.error',
            defaultMessage: 'Referenced data is under review, cannot initiate another review',
          }),
        );
        return { checkResult: valid, unReview };
      }
    }

    if (processDetail.stateCode >= 20) {
      message.error(
        intl.formatMessage({
          id: 'pages.process.review.submitError',
          defaultMessage: 'Submit review failed',
        }),
      );
      setSpinning(false);
      valid = false;
      // return { checkResult, unReview };
    }
    if (
      valid &&
      nonExistentRef?.length === 0 &&
      unRuleVerification.length === 0 &&
      problemNodes.length === 0
    ) {
      message.success(
        intl.formatMessage({
          id: 'pages.button.check.success',
          defaultMessage: 'Data check successfully!',
        }),
      );
      setSpinning(false);
    } else {
      const errTabNames: string[] = [];
      errors.forEach((err: any) => {
        const tabName = err?.path?.split('.')[1];
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      nonExistentRef.forEach((item: any) => {
        const tabName = getErrRefTab(item, processDetail);
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      unRuleVerification.forEach((item: any) => {
        const tabName = getErrRefTab(item, processDetail);
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      problemNodes.forEach((item: any) => {
        const tabName = getErrRefTab(item, processDetail);
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      if (errTabNames && errTabNames.length > 0) {
        message.error(
          errTabNames
            .map((tab: any) =>
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
            }),
        );
      } else {
        message.error(
          intl.formatMessage({
            id: 'pages.button.check.error',
            defaultMessage: 'Data check failed!',
          }),
        );
      }

      setSpinning(false);
      return { checkResult: valid, unReview };
    }
    setSpinning(false);
    return { checkResult: valid, unReview };
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
    if (!updateResult.data) {
      setSpinning(false);
      return;
    }
    const { checkResult, unReview } = await handleCheckData({
      id: updateResult.data[0]?.id,
      version: updateResult.data[0]?.version,
      ...genProcessFromData(updateResult.data[0]?.json?.processDataSet),
      ruleVerification: updateResult.data[0]?.rule_verification,
      stateCode: updateResult.data[0]?.state_code,
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
      setDrawerVisible(false);
      setSpinning(false);
    } else {
      setSpinning(false);
    }
  };

  const onTabChange = (key: string) => {
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
    getProcessDetail(id, version).then(async (result: any) => {
      setOriginJson(result.data?.json ?? {});
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
      setRefCheckData([]);
      // setUnRuleVerificationData([]);
      // setNonExistentRefData([]);
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

  const handleLciaResults = (result: LCIAResultTable[]) => {
    setFromData({
      ...fromData,
      LCIAResults: {
        LCIAResult: result.map((item) => ({
          key: item.key,
          referenceToLCIAMethodDataSet: item.referenceToLCIAMethodDataSet,
          meanAmount: item.meanAmount,
        })),
      },
    });
  };

  return (
    <>
      {buttonType === 'toolIcon' ? (
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
      ) : buttonType === 'tool' ? (
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
        destroyOnClose={true}
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
              onLatestJsonChange={handleLatestJsonChange}
              onClose={handleAISuggestionClose}
              originJson={originJson}
            />
            <Button
              onClick={async () => {
                setSpinning(true);
                const updateResult = await handleSubmit(false);
                if (updateResult.error) {
                  setSpinning(false);
                  return;
                }

                await handleCheckData({
                  id: updateResult.data[0]?.id,
                  version: updateResult.data[0]?.version,
                  ...genProcessFromData(updateResult.data[0]?.json?.processDataSet),
                  ruleVerification: updateResult.data[0]?.rule_verification,
                  stateCode: updateResult.data[0]?.state_code,
                });
              }}
            >
              <FormattedMessage id='pages.button.check' defaultMessage='Data check' />
            </Button>
            <>
              {!hideReviewButton && (
                <Button
                  onClick={() => {
                    submitReview();
                  }}
                >
                  <FormattedMessage id='pages.button.review' defaultMessage='Submit for review' />
                </Button>
              )}
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
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
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
                  lciaResults={fromData?.LCIAResults?.LCIAResult ?? []}
                  onLciaResults={handleLciaResults}
                />
                <Form.Item name='id' hidden>
                  <Input />
                </Form.Item>
              </ProForm>
            </RefCheckContext.Provider>
          </UpdateReferenceContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessEdit;
