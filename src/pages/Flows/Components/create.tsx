import { createFlows, getFlowDetail } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
import { formatDateTime } from '@/services/general/util';
// import { getSourceDetail } from '@/services/sources/api';
// import { genSourceFromData } from '@/services/sources/util';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, message, Space, Spin, Tooltip, Typography } from 'antd';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { FlowForm } from './form';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
};

// When type is 'copy' or 'createVersion', id and version are required parameters
type CreateProps =
  | (Omit<Props, 'type'> & { actionType?: 'create' })
  | (Omit<Props, 'type' | 'id' | 'version'> & {
      actionType: 'copy';
      id: string;
      version: string;
    })
  | (Omit<Props, 'type' | 'id' | 'version'> & {
      actionType: 'createVersion';
      id: string;
      version: string;
    });

const FlowsCreate: FC<CreateProps> = ({ lang, actionRef, actionType = 'create', id, version }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [initData, setInitData] = useState<any>(undefined);
  const [fromData, setFromData] = useState<any>(undefined);
  const [propertyDataSource, setPropertyDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [flowType, setFlowType] = useState<string | undefined>(undefined);

  const intl = useIntl();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
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

  const getFormDetail = () => {
    if (!id || !version) return;
    setSpinning(true);
    getFlowDetail(id, version).then(async (result: any) => {
      const fromData0 = await genFlowFromData(result.data?.json?.flowDataSet ?? {});
      setInitData({ ...fromData0, id: id });
      setPropertyDataSource(fromData0?.flowProperties?.flowProperty ?? []);
      setFromData({ ...fromData0, id: id });
      setFlowType(fromData0?.flowInformation?.LCIMethod?.typeOfDataSet);
      formRefCreate.current?.resetFields();
      formRefCreate.current?.setFieldsValue({
        ...fromData0,
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;

    if (actionType === 'copy' || actionType === 'createVersion') {
      getFormDetail();
      return;
    }

    // const referenceToComplianceSystemId = '9ba3ac1e-6797-4cc0-afd5-1b8f7bf28c6a';
    // const referenceToDataSetFormatId = 'a97a0155-0234-4b87-b4ce-a45da52f2a40';

    // getSourceDetail(referenceToComplianceSystemId, '').then(async (result1: any) => {
    //   const referenceToComplianceSystemData = genSourceFromData(
    //     result1.data?.json?.sourceDataSet ?? {},
    //   );
    //   const referenceToComplianceSystem = {
    //     '@refObjectId': referenceToComplianceSystemId,
    //     '@type': 'source data set',
    //     '@uri': `../sources/${referenceToComplianceSystemId}.xml`,
    //     '@version': result1.data?.version,
    //     'common:shortDescription':
    //       referenceToComplianceSystemData?.sourceInformation?.dataSetInformation?.[
    //         'common:shortName'
    //       ] ?? [],
    //   };

    // getSourceDetail(referenceToDataSetFormatId, '').then(async (result2: any) => {
    // const referenceToDataSetFormatData = genSourceFromData(
    //   result2.data?.json?.sourceDataSet ?? {},
    // );
    // const referenceToDataSetFormat = {
    //   '@refObjectId': referenceToDataSetFormatId,
    //   '@type': 'source data set',
    //   '@uri': `../sources/${referenceToDataSetFormatId}.xml`,
    //   '@version': result2.data?.version,
    //   'common:shortDescription':
    //     referenceToDataSetFormatData?.sourceInformation?.dataSetInformation?.[
    //       'common:shortName'
    //     ] ?? [],
    // };

    const currentDateTime = formatDateTime(new Date());
    const newData = {
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            // 'common:referenceToComplianceSystem': referenceToComplianceSystem,
            'common:approvalOfOverallCompliance': 'Fully compliant',
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
          // 'common:referenceToDataSetFormat': referenceToDataSetFormat,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': '01.01.000',
        },
      },
    };

    setInitData(newData);

    setPropertyDataSource([]);
    // formRefCreate.current?.resetFields();
    const currentData = formRefCreate.current?.getFieldsValue();
    formRefCreate.current?.setFieldsValue({ ...currentData, ...newData });
    setFromData(newData);
    // });
    // });
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage
            id={
              actionType === 'copy'
                ? 'pages.button.copy'
                : actionType === 'createVersion'
                  ? 'pages.button.createVersion'
                  : 'pages.button.create'
            }
            defaultMessage='Create'
          />
        }
      >
        {actionType === 'copy' ? (
          <Button
            shape='circle'
            icon={<CopyOutlined />}
            size='small'
            onClick={() => {
              setDrawerVisible(true);
            }}
          ></Button>
        ) : (
          <Button
            size={'middle'}
            type='text'
            icon={<PlusOutlined />}
            onClick={() => {
              setDrawerVisible(true);
            }}
          />
        )}
      </Tooltip>
      <Drawer
        destroyOnClose={true}
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id={
              actionType === 'copy'
                ? 'pages.button.copy'
                : actionType === 'createVersion'
                  ? 'pages.button.createVersion'
                  : 'pages.button.create'
            }
            defaultMessage='Flows Create'
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
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefCreate}
            initialValues={initData}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onValuesChange={(_, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
            }}
            onFinish={async () => {
              const paramsId = (actionType === 'createVersion' ? id : v4()) ?? '';
              const fieldsValue = formRefCreate.current?.getFieldsValue();
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
                return true;
              } else if (
                flowProperties.flowProperty.filter((item: any) => item?.quantitativeReference)
                  .length !== 1
              ) {
                message.error(
                  intl.formatMessage({
                    id: 'pages.flow.validator.flowProperties.quantitativeReference.required',
                    defaultMessage:
                      'Flow property needs to have exactly one quantitative reference open',
                  }),
                );
                return false;
              }
              const result = await createFlows(paramsId, {
                ...fieldsValue,
                flowProperties,
              });
              if (result.data) {
                message.success(
                  intl.formatMessage({
                    id: 'pages.button.create.success',
                    defaultMessage: 'Created successfully!',
                  }),
                );
                formRefCreate.current?.resetFields();
                setDrawerVisible(false);
                setActiveTabKey('flowInformation');
                setFromData({});
                reload();
              } else {
                message.error(result.error.message);
              }
              return true;
            }}
          >
            <FlowForm
              lang={lang}
              activeTabKey={activeTabKey}
              drawerVisible={drawerVisible}
              formRef={formRefCreate}
              onData={handletFromData}
              flowType={flowType}
              onTabChange={onTabChange}
              propertyDataSource={propertyDataSource}
              onPropertyData={handletPropertyData}
              onPropertyDataCreate={handletPropertyDataCreate}
              formType='create'
            />
          </ProForm>
        </Spin>
        <Collapse
          items={[
            {
              key: '1',
              label: 'JSON Data',
              children: (
                <Typography>
                  <pre>{JSON.stringify(fromData, null, 2)}</pre>
                </Typography>
              ),
            },
          ]}
        />
      </Drawer>
    </>
  );
};
export default FlowsCreate;
