import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType, useRefCheckContext } from '@/contexts/refCheckContext';
import type { ProblemNode, refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  buildValidationIssues,
  checkData,
  enrichValidationIssuesWithOwner,
  getErrRefTab,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { getUnitGroupDetail, updateUnitGroup } from '@/services/unitgroups/api';
import {
  UnitDraft,
  UnitGroupDataSetObjectKeys,
  UnitGroupDetailResponse,
  UnitGroupFormState,
  UnitItem,
} from '@/services/unitgroups/data';
import { genUnitGroupFromData, genUnitGroupJsonOrdered } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { UnitGroupForm } from './form';

type Props = {
  id: string;
  version: string;
  buttonType: string;
  lang: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  disabled?: boolean;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: RefCheckType | null) => void;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
};
const UnitGroupEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  actionRef,
  disabled = false,
  setViewDrawerVisible,
  updateErrRef = () => {},
  autoOpen = false,
  autoCheckRequired = false,
}) => {
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] =
    useState<UnitGroupDataSetObjectKeys>('unitGroupInformation');
  const [initData, setInitData] = useState<UnitGroupFormState>();
  const [fromData, setFromData] = useState<UnitGroupFormState>();
  const [detailStateCode, setDetailStateCode] = useState<number>();
  const [unitDataSource, setUnitDataSource] = useState<UnitItem[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
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
  const intl = useIntl();
  type UpdateUnitGroupResult = {
    data?: Array<{ rule_verification?: boolean }>;
    error?: { state_code?: number; message?: string };
  };

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
  // useEffect(() => {
  //   if (showRules) {
  //     setTimeout(() => {
  //       formRefEdit.current?.validateFields();
  //     });
  //   }
  // }, [showRules]);

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const handletUnitDataCreate = (data: UnitDraft) => {
    if (fromData)
      setUnitDataSource([
        ...unitDataSource,
        { ...data, '@dataSetInternalID': unitDataSource.length.toString() } as UnitItem,
      ]);
  };

  const handletUnitData = (data: UnitItem[]) => {
    if (fromData) setUnitDataSource([...data]);
  };

  const onTabChange = (key: UnitGroupDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    setViewDrawerVisible(false);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getUnitGroupDetail(id, version).then(async (result: UnitGroupDetailResponse) => {
      setDetailStateCode(result.data?.stateCode);
      setInitData({ ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}), id: id });
      setFromData({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
        id: id,
      });
      setUnitDataSource(
        (genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ??
          []) as UnitItem[],
      );
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
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

  useEffect(() => {
    setFromData({
      ...fromData,
      units: {
        unit: [...unitDataSource],
      },
    } as UnitGroupFormState);
  }, [unitDataSource]);

  const handleSubmit = async (
    autoClose: boolean,
    options?: { silent?: boolean },
  ): Promise<UpdateUnitGroupResult | true> => {
    const silent = options?.silent ?? false;
    if (autoClose) setSpinning(true);
    await updateReferenceDescription();

    const units = fromData?.units;
    const formFieldsValue = {
      ...formRefEdit.current?.getFieldsValue(),
      units,
    };
    const updateResult = (await updateUnitGroup(
      id,
      version,
      formFieldsValue,
    )) as UpdateUnitGroupResult;
    if (updateResult?.data) {
      const isRuleVerified = isRuleVerificationPassed(updateResult?.data?.[0]?.rule_verification);
      if (isRuleVerified) {
        updateErrRef(null);
      } else {
        updateErrRef({
          id: id,
          version: version,
          ruleVerification: isRuleVerified,
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
      // setActiveTabKey('unitGroupInformation');
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
    if (!autoClose) {
      return updateResult;
    }
    return true;
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
    if (typeof updateResult !== 'boolean' && updateResult?.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const rootRef = {
      '@type': 'unit group data set',
      '@refObjectId': id,
      '@version': version,
    } satisfies refDataType;
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const rootRuleVerification =
      typeof updateResult !== 'boolean'
        ? isRuleVerificationPassed(updateResult?.data?.[0]?.rule_verification)
        : false;
    const pathRef = new ReffPath(rootRef, rootRuleVerification, false);
    await checkData(rootRef, unRuleVerification, nonExistentRef, pathRef);
    const problemNodes = pathRef?.findProblemNodes() ?? [];
    if (problemNodes && problemNodes.length > 0) {
      const result: RefCheckType[] = problemNodes.map((item: ProblemNode) => {
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
    const sdkValidation = validateDatasetWithSdk(
      'unit group data set',
      genUnitGroupJsonOrdered(id, fromData),
    );
    const sdkIssues = sdkValidation.issues;
    let currentDatasetValid = sdkValidation.success;
    const units = fromData?.units;
    if (!units?.unit || !Array.isArray(units.unit) || units.unit.length === 0) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.unitgroups.validator.unit.required',
        defaultMessage: 'Please select unit',
      });
      if (!errTabNames.includes('units')) errTabNames.push('units');
      if (!currentDatasetTabNames.includes('units')) currentDatasetTabNames.push('units');
      setActiveTabKey('units');
    } else if (
      units.unit.filter((item: UnitItem) => Boolean(item?.quantitativeReference)).length !== 1
    ) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.unitgroups.validator.unit.quantitativeReference.required',
        defaultMessage: 'Unit needs to have exactly one quantitative reference open',
      });
      if (!errTabNames.includes('units')) errTabNames.push('units');
      if (!currentDatasetTabNames.includes('units')) currentDatasetTabNames.push('units');
      setActiveTabKey('units');
    }
    if (sdkIssues.length) {
      sdkIssues.forEach((err) => {
        const tabName = err.path[1];
        if (tabName && !errTabNames.includes(tabName as string))
          errTabNames.push(tabName as string);
        if (tabName && !currentDatasetTabNames.includes(tabName as string))
          currentDatasetTabNames.push(tabName as string);
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
      if (datasetValidationMessage && errTabNames.length === 1 && errTabNames[0] === 'units') {
        validationHint = datasetValidationMessage;
      } else if (errTabNames && errTabNames.length > 0) {
        validationHint =
          errTabNames
            .map((tab: string) =>
              intl.formatMessage({
                id: `pages.unitgroup.${tab}`,
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
        const validationIssuesWithOwner = await enrichValidationIssuesWithOwner(validationIssues);
        showValidationIssueModal({
          intl,
          issues: validationIssuesWithOwner,
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
      {!autoOpen &&
        (buttonType === 'icon' ? (
          <Tooltip
            title={
              <FormattedMessage id='pages.button.edit' defaultMessage='Edit'></FormattedMessage>
            }
          >
            <Button
              disabled={disabled}
              shape='circle'
              icon={<FormOutlined />}
              size='small'
              onClick={onEdit}
            ></Button>
          </Tooltip>
        ) : (
          <Button disabled={disabled} onClick={onEdit}>
            <FormattedMessage
              id={buttonType ? buttonType : 'pages.button.edit'}
              defaultMessage='Edit'
            ></FormattedMessage>
          </Button>
        ))}

      <Drawer
        getContainer={() => document.body}
        destroyOnHidden
        title={
          <FormattedMessage
            id={'pages.unitgroup.drawer.title.edit'}
            defaultMessage='Edit'
          ></FormattedMessage>
        }
        width='90%'
        closable={false}
        extra={
          <Button icon={<CloseOutlined />} style={{ border: 0 }} onClick={closeDrawer}></Button>
        }
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
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel'></FormattedMessage>
            </Button>
            {/* <Button onClick={onReset}>
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset"></FormattedMessage>
            </Button> */}
            <Button
              onClick={async () => {
                setShowRules(false);
                await handleSubmit(true);
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
              initialValues={initData}
              onValuesChange={(_, allValues) => {
                setFromData({
                  ...fromData,
                  [activeTabKey]: allValues[activeTabKey] ?? {},
                } as UnitGroupFormState);
              }}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                await handleSubmit(true);
                return true;
              }}
            >
              <UnitGroupForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onUnitData={handletUnitData}
                onUnitDataCreate={handletUnitDataCreate}
                onTabChange={(key) => onTabChange(key as UnitGroupDataSetObjectKeys)}
                unitDataSource={unitDataSource}
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

export default UnitGroupEdit;
