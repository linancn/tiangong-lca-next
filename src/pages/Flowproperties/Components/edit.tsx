import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, refDataType } from '@/pages/Utils/review';
import { buildValidationIssues, checkData, validateDatasetWithSdk } from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { getFlowpropertyDetail, updateFlowproperties } from '@/services/flowproperties/api';
import {
  FlowPropertyDataSetObjectKeys,
  FlowpropertyDetailResponse,
  FormFlowProperty,
} from '@/services/flowproperties/data';
import {
  genFlowpropertyFromData,
  genFlowpropertyJsonOrdered,
} from '@/services/flowproperties/util';
import type { SupabaseMutationResult } from '@/services/supabase/data';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Drawer,
  // Select,
  Space,
  Spin,
  // Spin,
  Tooltip,
  message,
} from 'antd';
import type { FC } from 'react';
import {
  useEffect,
  // useCallback, useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage, useIntl } from 'umi';

import { ReffPath, getErrRefTab } from '@/pages/Utils/review';
import { FlowpropertyForm } from './form';
type Props = {
  id: string;
  version: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  disabled?: boolean;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  onDrawerClose?: () => void;
  autoCheckRequired?: boolean;
};

type UpdateFlowpropertiesResult = Pick<
  SupabaseMutationResult<{ rule_verification?: boolean }>,
  'data' | 'error'
>;

const FlowpropertiesEdit: FC<Props> = ({
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
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<FlowPropertyDataSetObjectKeys>(
    'flowPropertiesInformation',
  );
  const [fromData, setFromData] = useState<FormFlowProperty & { id?: string }>();
  const [initData, setInitData] = useState<FormFlowProperty & { id?: string }>();
  const [detailStateCode, setDetailStateCode] = useState<number>();
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
  const [refCheckData, setRefCheckData] = useState<RefCheckType[]>([]);
  const intl = useIntl();
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

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

  const handleUpdateRefsVersion = async (newRefs: RefVersionItem[]) => {
    const res = updateRefsData(fromData, newRefs, true);
    setFromData(res);
    formRefEdit.current?.setFieldsValue({ ...res, id });
    setRefsDrawerVisible(false);
  };

  const handleKeepVersion = async () => {
    const res = updateRefsData(fromData, refsOldList, false);
    setFromData(res);
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
      formRefEdit.current?.setFieldsValue({ ...res, id });
    }
  };

  const updateReferenceDescription = async () => {
    const { oldRefs } = await getRefsOfCurrentVersion(fromData);
    const res = updateRefsData(fromData, oldRefs, false);
    setFromData(res);
    formRefEdit.current?.setFieldsValue({ ...res, id });
  };

  const onTabChange = (key: FlowPropertyDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    if (fromData?.id)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    onDrawerClose?.();
  };

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getFlowpropertyDetail(id, version).then(async (result: FlowpropertyDetailResponse) => {
      const fromData0 = await genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {});
      setDetailStateCode(result.data?.stateCode);
      setInitData({
        ...fromData0,
        id: id,
      });
      formRefEdit.current?.setFieldsValue({
        ...fromData0,
        id: id,
      });
      setFromData({
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
  ): Promise<UpdateFlowpropertiesResult | null> => {
    const silent = options?.silent ?? false;
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();
    const formFieldsValue = formRefEdit.current?.getFieldsValue();
    const updateResult = (await updateFlowproperties(
      id,
      version,
      formFieldsValue,
    )) as UpdateFlowpropertiesResult;
    if (updateResult?.data) {
      if (updateResult?.data[0]?.rule_verification === true) {
        updateErrRef(null);
      } else {
        updateErrRef({
          id: id,
          version: version,
          ruleVerification: Boolean(updateResult?.data[0]?.rule_verification),
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
      // setActiveTabKey('flowPropertiesInformation');
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
    if (!updateResult || updateResult.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const rootRef = {
      '@type': 'flow property data set',
      '@refObjectId': id,
      '@version': version,
    } satisfies refDataType;
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      rootRef,
      Boolean(updateResult.data?.[0]?.rule_verification),
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

    const sdkValidation = validateDatasetWithSdk(
      'flow property data set',
      genFlowpropertyJsonOrdered(id, fromData),
    );
    const sdkIssues = sdkValidation.issues;
    const sdkInvalidTabNames: string[] = [];
    if (sdkIssues.length) {
      sdkIssues.forEach((err) => {
        const tabName = err.path[1];
        if (tabName && !errTabNames.includes(tabName as string))
          errTabNames.push(tabName as string);
        if (tabName && !sdkInvalidTabNames.includes(tabName as string))
          sdkInvalidTabNames.push(tabName as string);
      });
      formRefEdit.current?.validateFields();
    }
    const validationIssues = buildValidationIssues({
      datasetSdkValid: sdkValidation.success,
      nonExistentRef,
      rootRef,
      sdkInvalidTabNames,
      unRuleVerification,
    });
    if (
      unRuleVerification.length === 0 &&
      nonExistentRef.length === 0 &&
      errTabNames.length === 0 &&
      problemNodes.length === 0 &&
      sdkIssues.length === 0
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
      const validationHint =
        errTabNames && errTabNames.length > 0
          ? errTabNames
              .map((tab) =>
                intl.formatMessage({
                  id: `pages.FlowProperties.view.${tab}`,
                  defaultMessage: tab,
                }),
              )
              .join('，') +
            '：' +
            intl.formatMessage({
              id: 'pages.button.check.error',
              defaultMessage: 'Data check failed!',
            })
          : intl.formatMessage({
              id: 'pages.button.check.error',
              defaultMessage: 'Data check failed!',
            });
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
        title={
          <FormattedMessage
            id='pages.flowproperty.drawer.title.edit'
            defaultMessage='Edit Flow property'
          />
        }
        width='90%'
        closable={false}
        extra={<Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer} />}
        maskClosable={false}
        open={drawerVisible}
        onClose={closeDrawer}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
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
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id='pages.button.reset' defaultMessage='Reset' />
            </Button>
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
                } as FormFlowProperty);
              }}
            >
              <FlowpropertyForm
                lang={lang}
                activeTabKey={activeTabKey}
                drawerVisible={drawerVisible}
                formRef={formRefEdit}
                onData={handletFromData}
                onTabChange={(key) => onTabChange(key as FlowPropertyDataSetObjectKeys)}
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

export default FlowpropertiesEdit;
