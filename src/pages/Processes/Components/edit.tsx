import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';
import { getProcessDetail, updateProcess } from '@/services/processes/api';
import { genProcessFromData } from '@/services/processes/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined, ProductOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { ProcessForm } from './form';

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ProcessEdit: FC<Props> = ({
  id,
  version,
  lang,
  buttonType,
  actionRef,
  setViewDrawerVisible,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);

  const handletFromData = () => {
    if (fromData?.id) {
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
    }
  };

  const handletExchangeDataCreate = (data: any) => {
    if (fromData?.id) {
      setExchangeDataSource([
        ...exchangeDataSource,
        { ...data, '@dataSetInternalID': exchangeDataSource.length.toString() },
      ]);
    }
  };

  const handletExchangeData = (data: any) => {
    if (fromData?.id) setExchangeDataSource([...data]);
  };

  const updateReference = async () => {
    const newExchangeDataSource = await Promise.all(
      exchangeDataSource.map(async (item: any) => {
        const refObjectId = item?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
        const version = item?.referenceToFlowDataSet?.['@version'] ?? '';

        const result = await getFlowDetail(refObjectId, version);

        if (!result?.data) {
          return item;
        }

        const refData = genFlowFromData(result.data?.json?.flowDataSet ?? {});

        return {
          ...item,
          referenceToFlowDataSet: {
            ...item?.referenceToFlowDataSet,
            '@version': result.data?.version ?? '',
            'common:shortDescription': genFlowNameJson(
              refData?.flowInformation?.dataSetInformation?.name,
            ),
          },
        };
      }),
    );

    setExchangeDataSource(newExchangeDataSource);
    setReferenceValue(referenceValue + 1);
  };

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: any) => {
      const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
      setInitData({ ...dataSet, id: id });
      setFromData({ ...dataSet, id: id });
      setExchangeDataSource(dataSet?.exchanges?.exchange ?? []);
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...dataSet,
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({
      ...fromData,
      exchanges: {
        exchange: [...exchangeDataSource],
      },
    });
  }, [exchangeDataSource]);

  return (
    <>
      {buttonType === 'tool' ? (
        <Tooltip
          title={<FormattedMessage id='pages.button.model.result' defaultMessage='Model result' />}
          placement='left'
        >
          <Button
            disabled={id === ''}
            type='primary'
            icon={<ProductOutlined />}
            size='small'
            style={{ boxShadow: 'none' }}
            onClick={onEdit}
          />
        </Tooltip>
      ) : (
        <Tooltip title={<FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />}>
          {buttonType === 'icon' ? (
            <Button shape='circle' icon={<FormOutlined />} size='small' onClick={onEdit} />
          ) : (
            <Button onClick={onEdit}>
              <FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />
            </Button>
          )}
        </Tooltip>
      )}
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id={'pages.process.drawer.title.edit'}
            defaultMessage={'Edit process'}
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
            <>
              <Button onClick={() => {}}>
                <FormattedMessage id='pages.button.review' defaultMessage='Submit for review' />
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
            </>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button> */}

            <Button onClick={() => formRefEdit.current?.submit()} type='primary'>
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
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
                setSpinning(true);
                const fieldsValue = formRefEdit.current?.getFieldsValue();
                if (!exchangeDataSource || exchangeDataSource?.length === 0) {
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
                const updateResult = await updateProcess(id, version, {
                  ...fieldsValue,
                  exchanges: { exchange: [...exchangeDataSource] },
                });
                if (updateResult?.data) {
                  message.success(
                    intl.formatMessage({
                      id: 'pages.button.create.success',
                      defaultMessage: 'Created successfully!',
                    }),
                  );
                  setSpinning(false);
                  setDrawerVisible(false);
                  setViewDrawerVisible(false);
                  actionRef?.current?.reload();
                } else {
                  setSpinning(false);
                  message.error(updateResult?.error?.message);
                }
                return true;
              }}
            >
              <ProcessForm
                lang={lang}
                activeTabKey={activeTabKey}
                formRef={formRefEdit}
                onData={handletFromData}
                onExchangeData={handletExchangeData}
                onExchangeDataCreate={handletExchangeDataCreate}
                onTabChange={onTabChange}
                exchangeDataSource={exchangeDataSource}
              />
              <Form.Item name='id' hidden>
                <Input />
              </Form.Item>
            </ProForm>
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
                          exchanges: {
                            exchange: [...exchangeDataSource],
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

export default ProcessEdit;
