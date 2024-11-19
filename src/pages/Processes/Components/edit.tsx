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
  id: string | undefined;
  lang: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ProcessEdit: FC<Props> = ({ id, lang, buttonType, actionRef, setViewDrawerVisible }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState(false);
  const intl = useIntl();

  const handletFromData = () => {
    if (fromData?.id) {
      console.log('fromData', formRefEdit.current?.getFieldsValue()?.[activeTabKey]);
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

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    if (!id) return;
    setSpinning(true);
    getProcessDetail(id).then(async (result: any) => {
      setInitData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}), id: id });
      setFromData({ ...genProcessFromData(result.data?.json?.processDataSet ?? {}), id: id });
      setExchangeDataSource(
        genProcessFromData(result.data?.json?.processDataSet ?? {})?.exchanges?.exchange ?? [],
      );
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...genProcessFromData(result.data?.json?.processDataSet ?? {}),
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
          title={<FormattedMessage id="pages.button.model.result" defaultMessage="Model result" />}
          placement="left"
        >
          <Button
            type="primary"
            icon={<ProductOutlined />}
            size="small"
            style={{ boxShadow: 'none' }}
            onClick={onEdit}
          />
        </Tooltip>
      ) : (
        <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
          {buttonType === 'icon' ? (
            <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
          ) : (
            <Button onClick={onEdit}>
              <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
            </Button>
          )}
        </Tooltip>
      )}
      <Drawer
        title={
          <FormattedMessage id="pages.process.drawer.title.edit" defaultMessage="Edit process" />
        }
        width="90%"
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
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
              const updateResult = await updateProcess({
                ...fromData,
                id: id,
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
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          </ProForm>
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
