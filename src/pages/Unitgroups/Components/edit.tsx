import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import type { refDataType } from '@/pages/Utils/review';
import { checkData } from '@/pages/Utils/review';
import { getUnitGroupDetail, updateUnitGroup } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import { genUnitGroupFromData } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');
  const [initData, setInitData] = useState<any>({});
  const [fromData, setFromData] = useState<any>({});
  const [unitDataSource, setUnitDataSource] = useState<UnitTable[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const parentRefCheckContext = useRefCheckContext();
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);
  const updateReference = async () => {
    setReferenceValue(referenceValue + 1);
  };

  useEffect(() => {
    if (showRules) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      });
    }
  }, [showRules]);

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

  const onTabChange = (key: string) => {
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
        genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ?? [],
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
    });
  }, [unitDataSource]);

  const handleCheckData = async () => {
    setSpinning(true);
    setShowRules(true);
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    await checkData(
      {
        '@type': 'flow property data set',
        '@refObjectId': id,
        '@version': version,
      },
      unRuleVerification,
      nonExistentRef,
    );
    const units = fromData.units;
    if (!units?.unit || !Array.isArray(units.unit) || units.unit.length === 0) {
      message.error(
        intl.formatMessage({
          id: 'pages.unitgroups.validator.unit.required',
          defaultMessage: 'Please select unit',
        }),
      );
    } else if (units.unit.filter((item: any) => item?.quantitativeReference).length !== 1) {
      message.error(
        intl.formatMessage({
          id: 'pages.unitgroups.validator.unit.quantitativeReference.required',
          defaultMessage: 'Unit needs to have exactly one quantitative reference open',
        }),
      );
    }
    const unRuleVerificationData = unRuleVerification.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        type: 1,
      };
    });
    const nonExistentRefData = nonExistentRef.map((item: any) => {
      return {
        id: item['@refObjectId'],
        version: item['@version'],
        type: 2,
      };
    });

    setRefCheckData([...unRuleVerificationData, ...nonExistentRefData]);
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
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
            <RefCheckContext.Provider
              value={{
                refCheckData: [...parentRefCheckContext.refCheckData, ...refCheckData],
              }}
            >
              <ProForm
                formRef={formRefEdit}
                initialValues={initData}
                onValuesChange={(_, allValues) => {
                  setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
                }}
                submitter={{
                  render: () => {
                    return [];
                  },
                }}
                onFinish={async () => {
                  const units = fromData.units;
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
                        id: 'pages.button.create.success',
                        defaultMessage: 'Created successfully!',
                      }),
                    );
                    setDrawerVisible(false);
                    setViewDrawerVisible(false);
                    setActiveTabKey('unitGroupInformation');
                    actionRef?.current?.reload();
                  } else {
                    message.error(updateResult?.error?.message);
                  }
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
                  onTabChange={onTabChange}
                  unitDataSource={unitDataSource}
                  showRules={showRules}
                />
              </ProForm>
            </RefCheckContext.Provider>
          </UpdateReferenceContext.Provider>
        </Spin>
      </Drawer>
    </>
  );
};

export default UnitGroupEdit;
