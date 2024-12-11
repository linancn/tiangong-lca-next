import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { createUnitGroup } from '@/services/unitgroups/api';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { UnitGroupForm } from './form';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const UnitGroupCreate: FC<Props> = ({ lang, actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [unitDataSource, setUnitDataSource] = useState<any>([]);
  const intl = useIntl();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletFromData = () => {
    if (fromData)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
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

  useEffect(() => {
    if (drawerVisible === false) return;
    const currentDateTime = formatDateTime(new Date());
    const newData = {
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': initVersion,
        },
      },
    };
    setInitData(newData);
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(newData);
    setFromData(newData);
    setUnitDataSource([]);
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({ ...fromData, units: { unit: unitDataSource } });
  }, [unitDataSource]);

  return (
    <>
      <Tooltip
        title={
          <FormattedMessage id="pages.button.create" defaultMessage="Create"></FormattedMessage>
        }
      >
        <Button
          size={'middle'}
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            setDrawerVisible(true);
          }}
        ></Button>
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.unitgroup.drawer.title.create"
            defaultMessage="Create"
          ></FormattedMessage>
        }
        width="90%"
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
            <Button
              onClick={() => {
                setDrawerVisible(false);
              }}
            >
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel"></FormattedMessage>
            </Button>
            <Button
              onClick={() => {
                formRefCreate.current?.submit();
              }}
              type="primary"
            >
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit"></FormattedMessage>
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
            const result = await createUnitGroup(v4(), fromData);
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
          <UnitGroupForm
            lang={lang}
            activeTabKey={activeTabKey}
            formRef={formRefCreate}
            onData={handletFromData}
            onUnitData={handletUnitData}
            onUnitDataCreate={handletUnitDataCreate}
            onTabChange={onTabChange}
            unitDataSource={unitDataSource}
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

export default UnitGroupCreate;
