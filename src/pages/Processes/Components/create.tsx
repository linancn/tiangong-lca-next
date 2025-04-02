import { formatDateTime } from '@/services/general/util';
import { createProcess, getProcessDetail } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, message, Space, Spin, Tooltip, Typography } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { ProcessForm } from './form';

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

const ProcessCreate: FC<CreateProps> = ({
  lang,
  actionRef,
  actionType = 'create',
  id,
  version,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const intl = useIntl();

  const handletFromData = () => {
    if (fromData?.id)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletExchangeDataCreate = (data: any) => {
    if (fromData?.id)
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
    if (!drawerVisible) return;

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
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: [
            {
              'common:referenceToComplianceSystem': 'Fully compliant',
              'common:approvalOfOverallCompliance': 'Fully compliant',
              'common:nomenclatureCompliance': 'Fully compliant',
              'common:methodologicalCompliance': 'Fully compliant',
              'common:reviewCompliance': 'Fully compliant',
              'common:documentationCompliance': 'Fully compliant',
              'common:qualityCompliance': 'Fully compliant',
            },
          ],
        },
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
            onValuesChange={(_, allValues) => {
              setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              const paramsId = (actionType === 'createVersion' ? id : v4()) ?? '';
              const fieldsValue = formRefCreate.current?.getFieldsValue();
              if (exchangeDataSource||exchangeDataSource?.length === 0) {
                message.error(
                  intl.formatMessage({
                    id: 'pages.process.validator.exchanges.required',
                    defaultMessage: 'Please select exchanges',
                  }),
                );
                return false;
              } else if (
                exchangeDataSource.filter((item: any) => item?.quantitativeReference).length !== 1
              ) {
                message.error(
                  intl.formatMessage({
                    id: 'pages.process.validator.exchanges.quantitativeReference.required',
                    defaultMessage:
                      'Exchange needs to have exactly one quantitative reference open',
                  }),
                );
                return false;
              }

              const result = await createProcess(paramsId, {
                ...fieldsValue,
                exchanges: { exchange: [...exchangeDataSource] },
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

export default ProcessCreate;
