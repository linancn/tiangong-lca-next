import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import type { refDataType } from '@/pages/Utils/review';
import { ReffPath, checkData, getErrRefTab } from '@/pages/Utils/review';
import { getRefsOfNewVersion, updateRefsData } from '@/pages/Utils/updateReference';
import { getUnitGroupDetail, updateUnitGroup } from '@/services/unitgroups/api';
import { FormUnitGroup, UnitGroupDataSetObjectKeys, UnitTable } from '@/services/unitgroups/data';
import { genUnitGroupFromData, genUnitGroupJsonOrdered } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { createUnitGroup as createTidasUnitGroup } from '@tiangong-lca/tidas-sdk';
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
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  updateErrRef?: (data: any) => void;
};
const UnitGroupEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  lang,
  actionRef,
  setViewDrawerVisible,
  updateErrRef = () => {},
}) => {
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] =
    useState<UnitGroupDataSetObjectKeys>('unitGroupInformation');
  const [initData, setInitData] = useState<FormUnitGroup & { id?: string }>();
  const [fromData, setFromData] = useState<FormUnitGroup & { id?: string }>();
  const [unitDataSource, setUnitDataSource] = useState<UnitTable[]>([]);
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

  const handletUnitDataCreate = (data: any) => {
    if (fromData)
      setUnitDataSource([
        ...unitDataSource,
        { ...data, '@dataSetInternalID': unitDataSource.length.toString() },
      ]);
  };

  const handletUnitData = (data: any) => {
    if (fromData) setUnitDataSource([...data]);
  };

  const onTabChange = (key: UnitGroupDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getUnitGroupDetail(id, version).then(async (result: any) => {
      setInitData({ ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}), id: id });
      setFromData({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
        id: id,
      });
      setUnitDataSource(
        (genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ??
          []) as UnitTable[],
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
      setRefCheckContextValue({ refCheckData: [] });
      setShowRules(false);
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
    } as FormUnitGroup);
  }, [unitDataSource]);

  const handleSubmit = async (autoClose: boolean) => {
    if (autoClose) setSpinning(true);
    const units = fromData?.units;
    const formFieldsValue = {
      ...formRefEdit.current?.getFieldsValue(),
      units,
    };
    const updateResult = await updateUnitGroup(id, version, formFieldsValue);
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
      if (autoClose) {
        setDrawerVisible(false);
        setViewDrawerVisible(false);
        actionRef?.current?.reload();
      }
      // setActiveTabKey('unitGroupInformation');
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
    if (!autoClose) {
      return updateResult;
    }
    return true;
  };

  const handleCheckData = async () => {
    setSpinning(true);
    const updateResult = await handleSubmit(false);
    if (updateResult.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      {
        '@type': 'unit group data set',
        '@refObjectId': id,
        '@version': version,
      },
      updateResult?.data[0]?.rule_verification,
      false,
    );
    await checkData(
      {
        '@type': 'unit group data set',
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
    const units = fromData?.units;
    if (!units?.unit || !Array.isArray(units.unit) || units.unit.length === 0) {
      message.error(
        intl.formatMessage({
          id: 'pages.unitgroups.validator.unit.required',
          defaultMessage: 'Please select unit',
        }),
      );
      setSpinning(false);
      return;
    } else if (units.unit.filter((item: any) => item?.quantitativeReference).length !== 1) {
      message.error(
        intl.formatMessage({
          id: 'pages.unitgroups.validator.unit.quantitativeReference.required',
          defaultMessage: 'Unit needs to have exactly one quantitative reference open',
        }),
      );
      setSpinning(false);
      return;
    }

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
    const tidasUnitGroup = createTidasUnitGroup(genUnitGroupJsonOrdered(id, fromData));
    const validateResult = tidasUnitGroup.validateEnhanced();
    const issues = validateResult.success ? [] : validateResult.error.issues;
    console.log('issues', issues, genUnitGroupJsonOrdered(id, fromData));
    if (issues.length) {
      issues.forEach((err) => {
        const tabName = err.path[1];
        if (tabName && !errTabNames.includes(tabName as string))
          errTabNames.push(tabName as string);
      });
      formRefEdit.current?.validateFields();
    }
    if (
      unRuleVerification.length === 0 &&
      nonExistentRef.length === 0 &&
      errTabNames.length === 0 &&
      problemNodes.length === 0 &&
      issues.length === 0
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
                id: `pages.unitgroup.${tab}`,
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
    setSpinning(false);
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.edit' defaultMessage='Edit'></FormattedMessage>}
        >
          <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit}></Button>
        </Tooltip>
      ) : (
        <Button onClick={onEdit}>
          <FormattedMessage
            id={buttonType ? buttonType : 'pages.button.edit'}
            defaultMessage='Edit'
          ></FormattedMessage>
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        destroyOnClose={true}
        title={
          <FormattedMessage
            id={'pages.unitgroup.drawer.title.edit'}
            defaultMessage='Edit'
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
            <Button onClick={handleCheckData}>
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
            <Button
              onClick={() => {
                setDrawerVisible(false);
              }}
            >
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
                } as FormUnitGroup);
              }}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={() => handleSubmit(true)}
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
