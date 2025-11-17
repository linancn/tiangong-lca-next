import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import type { refDataType } from '@/pages/Utils/review';
import { checkData } from '@/pages/Utils/review';
import { getRefsOfNewVersion, updateRefsData } from '@/pages/Utils/updateReference';
import { getFlowpropertyDetail, updateFlowproperties } from '@/services/flowproperties/api';
import { FlowPropertyDataSetObjectKeys, FormFlowProperty } from '@/services/flowproperties/data';
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

import { genFlowpropertyFromData } from '@/services/flowproperties/util';

import { ReffPath, getErrRefTab } from '@/pages/Utils/review';
import { FlowpropertyForm } from './form';
type Props = {
  id: string;
  version: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  updateErrRef?: (data: any) => void;
};
const FlowpropertiesEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  updateErrRef = () => {},
}) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<FlowPropertyDataSetObjectKeys>(
    'flowPropertiesInformation',
  );
  const [fromData, setFromData] = useState<FormFlowProperty & { id?: string }>();
  const [initData, setInitData] = useState<FormFlowProperty & { id?: string }>();
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const intl = useIntl();
  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

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

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getFlowpropertyDetail(id, version).then(async (result: any) => {
      const fromData0 = await genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {});
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
      setRefCheckContextValue({ refCheckData: [] });
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

  const handleSubmit = async (autoClose: boolean) => {
    if (autoClose) setSpinning(true);
    const formFieldsValue = formRefEdit.current?.getFieldsValue();
    const updateResult = await updateFlowproperties(id, version, formFieldsValue);
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
      setActiveTabKey('flowPropertiesInformation');
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
    if (updateResult.error) {
      setSpinning(false);
      return;
    }
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const pathRef = new ReffPath(
      {
        '@type': 'flow property data set',
        '@refObjectId': id,
        '@version': version,
      },
      updateResult?.data[0]?.rule_verification,
      false,
    );
    await checkData(
      {
        '@type': 'flow property data set',
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
                    id: `pages.FlowProperties.view.${tab}`,
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
    setSpinning(false);
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
        title={
          <FormattedMessage
            id='pages.flowproperty.drawer.title.edit'
            defaultMessage='Edit Flow property'
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
            <Button onClick={() => setDrawerVisible(false)}>
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
              onFinish={() => handleSubmit(true)}
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
