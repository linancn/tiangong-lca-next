import AISuggestion from '@/components/AISuggestion';
import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import type { refDataType } from '@/pages/Utils/review';
import { ReffPath, checkData, getErrRefTab } from '@/pages/Utils/review';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { getFlowDetail, updateFlows } from '@/services/flows/api';
import { FlowDataSetObjectKeys, FormFlow } from '@/services/flows/data';
import { genFlowFromData } from '@/services/flows/util';
import { getRefsOfNewVersion, getRuleVerification, updateRefsData } from '@/services/general/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import schema from '../flows_schema.json';
import { FlowForm } from './form';

type Props = {
  id: string;
  version: string;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  updateErrRef?: (data: any) => void;
};
const FlowsEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  updateErrRef = () => {},
}) => {
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<FlowDataSetObjectKeys>('flowInformation');
  const [fromData, setFromData] = useState<FormFlow & { id?: string }>();
  const [initData, setInitData] = useState<FormFlow & { id?: string }>();
  const [originJson, setOriginJson] = useState<any>({});
  let AISuggestionData: any;
  const [flowType, setFlowType] = useState<string>();
  const [spinning, setSpinning] = useState(false);
  const [propertyDataSource, setPropertyDataSource] = useState<any>([]);
  const [showRules, setShowRules] = useState<boolean>(false);
  const intl = useIntl();
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

  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

  const updatePropertyDataSource = async () => {
    propertyDataSource.forEach(async (property: any, index: number) => {
      if (property?.referenceToFlowPropertyDataSet) {
        const { data: flowPropertyData, success } = await getFlowpropertyDetail(
          property.referenceToFlowPropertyDataSet['@refObjectId'],
          property.referenceToFlowPropertyDataSet['@version'],
        );
        if (success) {
          const name =
            flowPropertyData?.json?.flowPropertyDataSet?.flowPropertiesInformation
              ?.dataSetInformation?.['common:name'];
          property.referenceToFlowPropertyDataSet['common:shortDescription'] = name;
          property.referenceToFlowPropertyDataSet['@version'] = flowPropertyData?.version;
        }
        if (index === propertyDataSource.length - 1) {
          setPropertyDataSource([...propertyDataSource]);
        }
      }
    });
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
  const onTabChange = (key: FlowDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const handletPropertyData = (data: any) => {
    if (fromData) setPropertyDataSource([...data]);
  };

  const handletPropertyDataCreate = (data: any) => {
    if (fromData)
      setPropertyDataSource([
        ...propertyDataSource,
        { ...data, '@dataSetInternalID': propertyDataSource.length.toString() },
      ]);
  };

  useEffect(() => {
    setFromData({
      ...fromData,
      flowProperties: {
        flowProperty: [...propertyDataSource],
      },
    } as any);
  }, [propertyDataSource]);

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const onReset = () => {
    setSpinning(true);
    getFlowDetail(id, version).then(async (result: any) => {
      setOriginJson(result.data?.json ?? {});
      const fromData0 = await genFlowFromData(result.data?.json?.flowDataSet ?? {});
      setInitData({ ...fromData0, id: id });
      setPropertyDataSource(fromData0?.flowProperties?.flowProperty ?? []);
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
      setRefCheckContextValue({ refCheckData: [] });
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleSubmit = async (autoClose: boolean) => {
    try {
      await formRefEdit.current?.validateFields();
    } catch (err) {
      console.log('err', err);
      return;
    }
    if (autoClose) setSpinning(true);
    const fieldsValue = formRefEdit.current?.getFieldsValue();
    const flowProperties = fromData?.flowProperties;
    const updateResult = await updateFlows(id, version, {
      ...fieldsValue,
      flowProperties,
    });
    if (updateResult?.data) {
      if (updateResult?.data[0]?.rule_verification === true) {
        updateErrRef(null);
      } else {
        updateErrRef({
          id: id,
          version: version,
          ruleVerification: updateResult?.data[0]?.rule_verification,
          nonExistent: false,
        });
      }
      message.success(
        intl.formatMessage({
          id: 'pages.button.save.success',
          defaultMessage: 'Saved successfully!',
        }),
      );
      if (autoClose) setDrawerVisible(false);
      setActiveTabKey('flowInformation');
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
    }
    if (autoClose) setSpinning(false);
    if (!autoClose) {
      return updateResult;
    }
    return true;
  };
  const handleCheckData = async () => {
    setSpinning(true);
    const updateResult = await handleSubmit(false);
    if (updateResult?.error) {
      setSpinning(false);
      return;
    }
    let { errors } = getRuleVerification(schema, updateResult?.data[0]?.json);
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      {
        '@type': 'contact data set',
        '@refObjectId': id,
        '@version': version,
      },
      updateResult?.data[0]?.rule_verification,
      false,
    );
    await checkData(
      {
        '@type': 'flow data set',
        '@refObjectId': id,
        '@version': version,
      },
      unRuleVerification,
      nonExistentRef,
      pathRef,
    );
    const problemNodes = pathRef?.findProblemNodes() ?? [];
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
    const unRuleVerificationData = unRuleVerification.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        ruleVerification: false,
        nonExistent: false,
      };
    });
    const nonExistentRefData = nonExistentRef.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        ruleVerification: true,
        nonExistent: true,
      };
    });

    const flowProperties = fromData?.flowProperties;
    if (
      !flowProperties ||
      !flowProperties?.flowProperty ||
      (flowProperties?.flowProperty as any)?.length === 0
    ) {
      message.error(
        intl.formatMessage({
          id: 'pages.flow.validator.flowProperties.required',
          defaultMessage: 'Please select flow properties',
        }),
      );
    } else if (
      (flowProperties?.flowProperty as any)?.filter((item: any) => item?.quantitativeReference)
        .length !== 1
    ) {
      message.error(
        intl.formatMessage({
          id: 'pages.flow.validator.flowProperties.quantitativeReference.required',
          defaultMessage: 'Flow property needs to have exactly one quantitative reference open',
        }),
      );
    } else {
      const errTabNames: string[] = [];
      nonExistentRef.forEach((item: any) => {
        const tabName = getErrRefTab(item, initData);
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      unRuleVerification.forEach((item: any) => {
        const tabName = getErrRefTab(item, initData);
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      problemNodes.forEach((item: any) => {
        const tabName = getErrRefTab(item, initData);
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      errors.forEach((err: any) => {
        const tabName = err?.path?.split('.')[1];
        if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
      });
      formRefEdit.current
        ?.validateFields()
        .then(() => {})
        .catch((err: any) => {
          const errorFields = err?.errorFields ?? [];
          errorFields.forEach((item: any) => {
            const tabName = item?.name[0];
            if (tabName && !errTabNames.includes(tabName)) errTabNames.push(tabName);
          });
        })
        .finally(() => {
          if (
            unRuleVerificationData.length === 0 &&
            nonExistentRefData.length === 0 &&
            errTabNames.length === 0 &&
            problemNodes.length === 0
          ) {
            message.success(
              intl.formatMessage({
                id: 'pages.button.check.success',
                defaultMessage: 'Data check successfully!',
              }),
            );
          } else {
            if (errTabNames && errTabNames.length > 0) {
              message.error(
                errTabNames
                  .map((tab: any) =>
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
          }
        });
    }
    setSpinning(false);
  };
  const handleLatestJsonChange = (latestJson: any) => {
    AISuggestionData = latestJson;
  };
  const handleAISuggestionClose = () => {
    const dataSet = genFlowFromData(AISuggestionData?.flowDataSet ?? {});
    setFromData({ ...dataSet, id: id });
    setPropertyDataSource(dataSet?.flowProperties?.flowProperty ?? []);
    formRefEdit.current?.resetFields();
    formRefEdit.current?.setFieldsValue({
      ...dataSet,
      id: id,
    });
  };
  return (
    <>
      <Tooltip title={<FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />}>
        {buttonType === 'icon' ? (
          <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage
              id={buttonType ? buttonType : 'pages.button.edit'}
              defaultMessage='Edit'
            />
          </Button>
        )}
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={<FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />}
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
              type='flow'
              onLatestJsonChange={handleLatestJsonChange}
              onClose={handleAISuggestionClose}
              originJson={originJson}
            />
            <Button onClick={handleCheckData}>
              <FormattedMessage id='pages.button.check' defaultMessage='Data check' />
            </Button>
            <Button
              onClick={() => {
                handleUpdateReference();
              }}
            >
              <FormattedMessage
                id='pages.button.updateReference'
                defaultMessage='Update reference'
              />
            </Button>
            <Button onClick={() => setDrawerVisible(false)}>
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
              onFinish={() => handleSubmit(true)}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as FormFlow);
              }}
            >
              <FlowForm
                lang={lang}
                activeTabKey={activeTabKey}
                drawerVisible={drawerVisible}
                formRef={formRefEdit}
                onData={handletFromData}
                flowType={flowType}
                onTabChange={(key) => onTabChange(key as FlowDataSetObjectKeys)}
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
