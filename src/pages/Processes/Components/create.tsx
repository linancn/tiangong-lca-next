// import { checkRequiredFields } from '@/pages/Utils';
import { formatDateTime } from '@/services/general/util';
import { createProcess, getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, message, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
// import requiredFields from '../requiredFields';
import ToolBarButton from '@/components/ToolBarButton';
import { LCIAResultTable } from '@/services/lciaMethods/data';
import { ProcessForm } from './form';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
  importData?: any;
  onClose?: () => void;
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

const ProcessCreate: FC<CreateProps> = ({
  lang,
  actionRef,
  actionType = 'create',
  id,
  version,
  importData,
  onClose = () => {},
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const intl = useIntl();

  const handletFromData = async () => {
    const fieldsValue = formRefCreate.current?.getFieldsValue();
    // if (fromData?.id)
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
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletExchangeDataCreate = (data: any) => {
    // if (fromData?.id)
    setExchangeDataSource([
      ...exchangeDataSource,
      { ...data, '@dataSetInternalID': exchangeDataSource.length.toString() },
    ]);
  };

  const handletExchangeData = (data: any) => {
    if (fromData?.id) setExchangeDataSource([...data]);
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const getFormDetail = () => {
    if (!id || !version) return;
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
      const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
      setInitData({ ...dataSet, id: id });
      setFromData({ ...dataSet, id: id });
      setExchangeDataSource(dataSet?.exchanges?.exchange ?? []);
      formRefCreate.current?.resetFields();
      formRefCreate.current?.setFieldsValue({
        ...dataSet,
        id: id,
      });
      setSpinning(false);
    });
  };
  useEffect(() => {
    if (importData && importData.length > 0 && !drawerVisible) {
      setDrawerVisible(true);
    }
  }, [importData]);
  useEffect(() => {
    if (!drawerVisible) {
      onClose();
      formRefCreate.current?.resetFields();
      setInitData({});
      setFromData({});
      setExchangeDataSource([]);
      return;
    }
    if (importData && importData.length > 0) {
      const formData = genProcessFromData(importData[0].processDataSet);
      setInitData(formData);
      setFromData(formData);
      setExchangeDataSource(formData?.exchanges?.exchange ?? []);
      formRefCreate.current?.setFieldsValue(formData);
      return;
    }

    if (actionType === 'copy' || actionType === 'createVersion') {
      getFormDetail();
      return;
    }

    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': '01.01.000',
          'common:permanentDataSetURI': intl.formatMessage({
            id: 'pages.process.view.administrativeInformation.permanentDataSetURI.default',
            defaultMessage: 'Automatically generated',
          }),
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          // compliance: [
          //   {
          //     'common:approvalOfOverallCompliance': 'Fully compliant',
          //     'common:nomenclatureCompliance': 'Fully compliant',
          //     'common:methodologicalCompliance': 'Fully compliant',
          //     'common:reviewCompliance': 'Fully compliant',
          //     'common:documentationCompliance': 'Fully compliant',
          //     'common:qualityCompliance': 'Fully compliant',
          //   },
          // ],
        },
        // validation: {
        //   review: [
        //     {
        //       'common:scope': [{}],
        //     },
        //   ],
        // },
      },
    };
    const newId = v4();
    setInitData({ ...newData, id: newId });
    // formRefCreate.current?.resetFields();
    const currentData = formRefCreate.current?.getFieldsValue();
    formRefCreate.current?.setFieldsValue({ ...currentData, ...newData });
    setFromData({ ...newData, id: newId });
    setExchangeDataSource([]);
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({ ...fromData, exchanges: { exchange: exchangeDataSource } });
  }, [exchangeDataSource]);

  const handleLciaResults = (result: LCIAResultTable[]) => {
    setFromData({
      ...fromData,
      LCIAResults: {
        LCIAResult: result.map((item) => ({
          referenceToLCIAMethodDataSet: item.referenceToLCIAMethodDataSet,
          meanAmount: item.meanAmount,
        })),
      },
    });
  };

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
          <ToolBarButton
            icon={<PlusOutlined />}
            tooltip={<FormattedMessage id='pages.button.create' defaultMessage='Create' />}
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
            defaultMessage='Create process'
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
                await setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
              }
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              setSpinning(true);
              const paramsId = (actionType === 'createVersion' ? id : v4()) ?? '';
              const output = exchangeDataSource.filter(
                (e: any) => e.exchangeDirection.toUpperCase() === 'OUTPUT',
              );
              let allocatedFractionTotal = 0;
              output.forEach((e: any) => {
                allocatedFractionTotal += Number(
                  e.allocations.allocation['@allocatedFraction'].split('%')[0],
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
              const result = await createProcess(paramsId, {
                ...fromData,
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
                reload();
              } else {
                message.error(result.error.message);
              }
              setSpinning(false);
              return true;
            }}
          >
            <ProcessForm
              formType={actionType}
              lang={lang}
              activeTabKey={activeTabKey}
              formRef={formRefCreate}
              onData={handletFromData}
              onExchangeData={handletExchangeData}
              onExchangeDataCreate={handletExchangeDataCreate}
              onTabChange={onTabChange}
              exchangeDataSource={exchangeDataSource}
              lciaResults={fromData?.LCIAResults?.LCIAResult ?? []}
              onLciaResults={handleLciaResults}
            />
          </ProForm>
        </Spin>
      </Drawer>
    </>
  );
};

export default ProcessCreate;
