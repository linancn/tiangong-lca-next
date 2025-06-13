import { RefCheckContext, useRefCheckContext } from '@/contexts/refCheckContext';
import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import type { refDataType } from '@/pages/Utils/review';
import { checkData } from '@/pages/Utils/review';
import { getFlowpropertyDetail } from '@/services/flowproperties/api';
import { getFlowDetail, updateFlows } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Spin, Tooltip, Typography, message } from 'antd';
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
};
const FlowsEdit: FC<Props> = ({ id, version, buttonType, actionRef, lang }) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [fromData, setFromData] = useState<any>(undefined);
  const [initData, setInitData] = useState<any>({});
  const [flowType, setFlowType] = useState<string>();
  const [spinning, setSpinning] = useState(false);
  const [propertyDataSource, setPropertyDataSource] = useState<any>([]);
  const [showRules, setShowRules] = useState<boolean>(false);
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);
  const [refCheckData, setRefCheckData] = useState<any[]>([]);
  const parentRefCheckData = useRefCheckContext();

  useEffect(() => {
    if (showRules) {
      setTimeout(() => {
        formRefEdit.current?.validateFields();
      });
    }
  }, [showRules]);

  const updateReference = async () => {
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
    setReferenceValue(referenceValue + 1);
  };

  const onTabChange = (key: string) => {
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
    });
  }, [propertyDataSource]);

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const onReset = () => {
    setSpinning(true);
    getFlowDetail(id, version).then(async (result: any) => {
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
      setShowRules(false);
      return;
    }
    onReset();
  }, [drawerVisible]);

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

    const flowProperties = fromData?.flowProperties;
    if (
      !flowProperties ||
      !flowProperties?.flowProperty ||
      flowProperties?.flowProperty?.length === 0
    ) {
      message.error(
        intl.formatMessage({
          id: 'pages.flow.validator.flowProperties.required',
          defaultMessage: 'Please select flow properties',
        }),
      );
    } else if (
      flowProperties.flowProperty.filter((item: any) => item?.quantitativeReference).length !== 1
    ) {
      message.error(
        intl.formatMessage({
          id: 'pages.flow.validator.flowProperties.quantitativeReference.required',
          defaultMessage: 'Flow property needs to have exactly one quantitative reference open',
        }),
      );
    }

    setRefCheckData([...unRuleVerificationData, ...nonExistentRefData]);
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
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
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
            <RefCheckContext.Provider value={[...parentRefCheckData, ...refCheckData]}>
              <ProForm
                formRef={formRefEdit}
                initialValues={initData}
                submitter={{
                  render: () => {
                    return [];
                  },
                }}
                onFinish={async () => {
                  const fieldsValue = formRefEdit.current?.getFieldsValue();
                  const flowProperties = fromData?.flowProperties;
                  // if (
                  //   !flowProperties ||
                  //   !flowProperties?.flowProperty ||
                  //   flowProperties?.flowProperty?.length === 0
                  // ) {
                  //   message.error(
                  //     intl.formatMessage({
                  //       id: 'pages.flow.validator.flowProperties.required',
                  //       defaultMessage: 'Please select flow properties',
                  //     }),
                  //   );
                  //   return true;
                  // } else if (
                  //   flowProperties.flowProperty.filter((item: any) => item?.quantitativeReference)
                  //     .length !== 1
                  // ) {
                  //   message.error(
                  //     intl.formatMessage({
                  //       id: 'pages.flow.validator.flowProperties.quantitativeReference.required',
                  //       defaultMessage:
                  //         'Flow property needs to have exactly one quantitative reference open',
                  //     }),
                  //   );
                  //   return false;
                  // }
                  const updateResult = await updateFlows(id, version, {
                    ...fieldsValue,
                    flowProperties,
                  });
                  if (updateResult?.data) {
                    message.success(
                      intl.formatMessage({
                        id: 'pages.flows.editsuccess',
                        defaultMessage: 'Edit successfully!',
                      }),
                    );
                    setDrawerVisible(false);
                    setActiveTabKey('flowInformation');
                    actionRef?.current?.reload();
                  } else {
                    message.error(updateResult?.error?.message);
                  }
                  return true;
                }}
                onValuesChange={(_, allValues) => {
                  setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
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
                          flowProperties: {
                            flowProperty: [...propertyDataSource],
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

export default FlowsEdit;
