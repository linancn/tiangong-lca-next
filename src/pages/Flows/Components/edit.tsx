import AISuggestion from '@/components/AISuggestion';
import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  buildValidationIssues,
  checkData,
  getErrRefTab,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { getFlowDetail, updateFlows } from '@/services/flows/api';
import {
  FlowDataSetObjectKeys,
  FlowDetailData,
  FlowDetailResponse,
  FlowPropertyData,
  FormFlowWithId,
} from '@/services/flows/data';
import { genFlowFromData, genFlowJsonOrdered } from '@/services/flows/util';
import { jsonToList } from '@/services/general/util';
import type { SupabaseMutationResult } from '@/services/supabase/data';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { FlowForm } from './form';

type Props = {
  id: string;
  version: string;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  disabled?: boolean;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  onDrawerClose?: () => void;
  autoCheckRequired?: boolean;
};

type UpdateFlowResult = Pick<
  SupabaseMutationResult<{ rule_verification?: boolean }>,
  'data' | 'error'
>;

const FlowsEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  disabled = false,
  updateErrRef = () => {},
  autoOpen = false,
  onDrawerClose,
  autoCheckRequired = false,
}) => {
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<FlowDataSetObjectKeys>('flowInformation');
  const [fromData, setFromData] = useState<FormFlowWithId>();
  const [initData, setInitData] = useState<FormFlowWithId>();
  const [detailStateCode, setDetailStateCode] = useState<number>();
  const [originJson, setOriginJson] = useState<FlowDetailData['json'] | null>(null);
  const aiSuggestionDataRef = useRef<Record<string, unknown> | null>(null);
  const [flowType, setFlowType] = useState<string>();
  const [spinning, setSpinning] = useState(false);
  const [propertyDataSource, setPropertyDataSource] = useState<FlowPropertyData[]>([]);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
  const intl = useIntl();
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

  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

  useEffect(() => {
    if (!showRules || !drawerVisible) {
      return;
    }

    const timer = window.setTimeout(() => {
      void formRefEdit.current?.validateFields();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [drawerVisible, showRules]);

  const updatePropertyDataSource = async () => {
    for (const property of propertyDataSource) {
      if (property?.referenceToFlowPropertyDataSet) {
        const { data: flowPropertyData, success } = await getFlowpropertyDetail(
          property.referenceToFlowPropertyDataSet['@refObjectId'] ?? '',
          property.referenceToFlowPropertyDataSet['@version'] ?? '',
        );
        if (success) {
          const name =
            flowPropertyData?.json?.flowPropertyDataSet?.flowPropertiesInformation
              ?.dataSetInformation?.['common:name'];
          property.referenceToFlowPropertyDataSet['common:shortDescription'] = name;
          property.referenceToFlowPropertyDataSet['@version'] = flowPropertyData?.version;
        }
      }
    }
    setPropertyDataSource([...propertyDataSource]);
  };

  const handleUpdateRefsVersion = async (newRefs: RefVersionItem[]) => {
    const res = updateRefsData(fromData, newRefs, true);
    setFromData(res);
    await updatePropertyDataSource();
    formRefEdit.current?.setFieldsValue({ ...res, id });
    setRefsDrawerVisible(false);
  };

  const handleKeepVersion = async () => {
    const res = updateRefsData(fromData, refsOldList, false);
    setFromData(res);
    await updatePropertyDataSource();
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
      await updatePropertyDataSource();
      formRefEdit.current?.setFieldsValue({ ...res, id });
    }
  };
  const updateReferenceDescription = async () => {
    const { oldRefs } = await getRefsOfCurrentVersion(fromData);
    const res = updateRefsData(fromData, oldRefs, false);
    setFromData(res);
    await updatePropertyDataSource();
    formRefEdit.current?.setFieldsValue({ ...res, id });
  };
  const onTabChange = (key: FlowDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const toFlowPropertyList = (
    flowProperty: FormFlowWithId['flowProperties']['flowProperty'] | undefined,
  ): FlowPropertyData[] => {
    if (!flowProperty) {
      return [];
    }
    return Array.isArray(flowProperty)
      ? (flowProperty as FlowPropertyData[])
      : [flowProperty as FlowPropertyData];
  };

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const handletPropertyData = (data: FlowPropertyData[]) => {
    if (fromData) setPropertyDataSource([...data]);
  };

  const handletPropertyDataCreate = (data: FlowPropertyData) => {
    if (fromData)
      setPropertyDataSource([
        ...propertyDataSource,
        { ...data, '@dataSetInternalID': propertyDataSource.length.toString() },
      ]);
  };

  useEffect(() => {
    setFromData((prev) =>
      prev
        ? ({
            ...prev,
            flowProperties: {
              flowProperty: [...propertyDataSource],
            },
          } as FormFlowWithId)
        : prev,
    );
  }, [propertyDataSource]);

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    onDrawerClose?.();
  };

  const onReset = () => {
    setSpinning(true);
    getFlowDetail(id, version).then(async (result: FlowDetailResponse) => {
      setDetailStateCode(result.data?.stateCode);
      setOriginJson(result.data?.json ?? null);
      const fromData0 = await genFlowFromData(result.data?.json?.flowDataSet ?? {});
      setInitData({ ...fromData0, id: id });
      setPropertyDataSource(toFlowPropertyList(fromData0?.flowProperties?.flowProperty));
      setFromData({ ...fromData0, id: id });
      setFlowType(fromData0?.modellingAndValidation?.LCIMethod?.typeOfDataSet);
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...fromData0,
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) {
      setDetailStateCode(undefined);
      setRefCheckContextValue({ refCheckData: [] });
      setShowRules(false);
      setAutoCheckTriggered(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleSubmit = async (
    autoClose: boolean,
    options?: { silent?: boolean },
  ): Promise<UpdateFlowResult | null | undefined> => {
    const silent = options?.silent ?? false;
    try {
      await formRefEdit.current?.validateFields();
    } catch (err) {
      console.log('err', err);
      return;
    }
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();

    const fieldsValue = formRefEdit.current?.getFieldsValue();
    const flowProperties = fromData?.flowProperties;
    const updateResult = (await updateFlows(id, version, {
      ...fieldsValue,
      flowProperties,
    })) as UpdateFlowResult;
    if (updateResult?.data) {
      if (updateResult?.data?.[0]?.rule_verification === true) {
        updateErrRef(null);
      } else {
        updateErrRef({
          id: id,
          version: version,
          ruleVerification: Boolean(updateResult?.data?.[0]?.rule_verification),
          nonExistent: false,
        });
      }
      if (!silent) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.save.success',
            defaultMessage: 'Saved successfully!',
          }),
        );
      }
      if (autoClose) {
        closeDrawer();
        actionRef?.current?.reload();
      }
      // setActiveTabKey('flowInformation');
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
    }
    if (autoClose) setSpinning(false);
    if (!autoClose) {
      return updateResult;
    }
    return null;
  };
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
    const updateResult = await handleSubmit(false, { silent });
    if (!updateResult || updateResult?.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const rootRef = {
      '@type': 'flow data set',
      '@refObjectId': id,
      '@version': version,
    } satisfies refDataType;
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      rootRef,
      Boolean(updateResult?.data?.[0]?.rule_verification),
      false,
    );
    await checkData(rootRef, unRuleVerification, nonExistentRef, pathRef);
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
    const currentDatasetTabNames: string[] = [];
    let datasetValidationMessage: string | null = null;
    nonExistentRef.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    unRuleVerification.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });
    problemNodes.forEach((item) => {
      const tabName = getErrRefTab(item, initData);
      if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
    });

    const fieldsValue = formRefEdit.current?.getFieldsValue();
    const jsonData = {
      ...fieldsValue,
      flowProperties: fromData?.flowProperties,
    };
    const sdkValidation = validateDatasetWithSdk('flow data set', genFlowJsonOrdered(id, jsonData));
    const sdkIssues = sdkValidation.issues;
    let currentDatasetValid = sdkValidation.success;
    const flowPropertiesList = jsonToList(fromData?.flowProperties?.flowProperty);
    if (!flowPropertiesList || flowPropertiesList.length === 0) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.flow.validator.flowProperties.required',
        defaultMessage: 'Please select flow properties',
      });
      if (!errTabNames.includes('flowProperties')) errTabNames.push('flowProperties');
      if (!currentDatasetTabNames.includes('flowProperties'))
        currentDatasetTabNames.push('flowProperties');
      setActiveTabKey('flowProperties');
    } else if (flowPropertiesList.filter((item) => item?.quantitativeReference).length !== 1) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.flow.validator.flowProperties.quantitativeReference.required',
        defaultMessage: 'Flow property needs to have exactly one quantitative reference open',
      });
      if (!errTabNames.includes('flowProperties')) errTabNames.push('flowProperties');
      if (!currentDatasetTabNames.includes('flowProperties'))
        currentDatasetTabNames.push('flowProperties');
      setActiveTabKey('flowProperties');
    }
    if (sdkIssues.length) {
      sdkIssues.forEach((err) => {
        if (err.path.includes('typeOfDataSet')) {
          if (!errTabNames.includes('flowInformation')) errTabNames.push('flowInformation');
          if (!currentDatasetTabNames.includes('flowInformation'))
            currentDatasetTabNames.push('flowInformation');
        } else {
          const tabName = err.path[1];
          if (tabName && !errTabNames.includes(tabName as string))
            errTabNames.push(tabName as string);
          if (tabName && !currentDatasetTabNames.includes(tabName as string))
            currentDatasetTabNames.push(tabName as string);
        }
      });
      formRefEdit.current?.validateFields();
    }
    const validationIssues = buildValidationIssues({
      datasetSdkValid: currentDatasetValid,
      nonExistentRef,
      rootRef,
      sdkInvalidTabNames: currentDatasetTabNames,
      unRuleVerification,
    });
    if (
      currentDatasetValid &&
      unRuleVerification.length === 0 &&
      nonExistentRef.length === 0 &&
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
    } else {
      let validationHint = intl.formatMessage({
        id: 'pages.button.check.error',
        defaultMessage: 'Data check failed!',
      });
      if (
        datasetValidationMessage &&
        errTabNames.length === 1 &&
        errTabNames[0] === 'flowProperties'
      ) {
        validationHint = datasetValidationMessage;
      } else if (errTabNames && errTabNames.length > 0) {
        validationHint =
          errTabNames
            .map((tab) =>
              intl.formatMessage({
                id: `pages.flow.view.${tab}`,
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
        showValidationIssueModal({
          intl,
          issues: validationIssues,
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
  const handleLatestJsonChange = (latestJson: Record<string, unknown>) => {
    aiSuggestionDataRef.current = latestJson;
  };
  const handleAISuggestionClose = () => {
    const dataSet = genFlowFromData(
      (aiSuggestionDataRef.current as { flowDataSet?: unknown } | null)?.flowDataSet ?? {},
    );
    setFromData({ ...dataSet, id: id });
    setPropertyDataSource(toFlowPropertyList(dataSet?.flowProperties?.flowProperty));
    formRefEdit.current?.resetFields();
    formRefEdit.current?.setFieldsValue({
      ...dataSet,
      id: id,
    });
  };
  return (
    <>
      {!autoOpen && (
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
              <FormattedMessage
                id={buttonType ? buttonType : 'pages.button.edit'}
                defaultMessage='Edit'
              />
            </Button>
          )}
        </Tooltip>
      )}
      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={<FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />}
        width='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={closeDrawer}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <AISuggestion
              type='flow'
              onLatestJsonChange={handleLatestJsonChange}
              onClose={handleAISuggestionClose}
              originJson={originJson}
            />
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
              {' '}
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              {' '}
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
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                await handleSubmit(true);
                return true;
              }}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as FormFlowWithId);
              }}
            >
              <FlowForm
                lang={lang}
                activeTabKey={activeTabKey}
                drawerVisible={drawerVisible}
                formRef={formRefEdit}
                onData={handletFromData}
                flowType={flowType}
                onTabChange={onTabChange}
                propertyDataSource={propertyDataSource}
                onPropertyData={handletPropertyData}
                onPropertyDataCreate={handletPropertyDataCreate}
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
};

export default FlowsEdit;
