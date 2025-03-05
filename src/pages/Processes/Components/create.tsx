import { formatDateTime } from '@/services/general/util';
import { createProcess } from '@/services/processes/api';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { ProcessForm } from './form';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const ProcessCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('processInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [exchangeDataSource, setExchangeDataSource] = useState<any>([]);
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

  useEffect(() => {
    if (!drawerVisible) return;

    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
      },
    };
    const newId = v4();
    setInitData({ ...newData, id: newId });
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(newData);
    setFromData({ ...newData, id: newId });
    setExchangeDataSource([]);
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({ ...fromData, exchanges: { exchange: exchangeDataSource } });
  }, [exchangeDataSource]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.create" defaultMessage="Create" />}>
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        />
      </Tooltip>
      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id="pages.process.drawer.title.create"
            defaultMessage="Create process"
          />
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
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
            </Button>
          </Space>
        }
      >
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
            const result = await createProcess(v4(), fromData);
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
