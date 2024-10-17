import { createFlowproperties } from '@/services/flowproperties/api';
// import { langOptions } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  // DatePicker,
  Drawer,
  // Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import React, {
  useCallback,
  useEffect,
  // useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage, useIntl } from 'umi';
// import UnitgroupsFrom from '@/pages/Unitgroups/Components/Unit/edit';
import { formatDateTime } from '@/services/general/util';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import { v4 } from 'uuid';
import { FlowpropertyForm } from './form';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
};
const FlowpropertiesCreate: FC<Props> = ({ actionRef, lang }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
  const [initData, setInitData] = useState<any>({});
  const [fromData, setFromData] = useState<any>({});
  const intl = useIntl();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const handletFromData = () => {
    if (fromData?.id)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
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
          'common:dataSetVersion': '01.00.000',
        },
      },
    };
    const newId = v4();
    setInitData({ ...newData, id: newId });
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(newData);
    setFromData({ ...newData, id: newId });
  }, [drawerVisible]);

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
        title={
          <FormattedMessage
            id="pages.flowproperty.drawer.title.create"
            defaultMessage="Create Flow property"
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
              <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
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
            const result = await createFlowproperties({ ...fromData });
            if (result.data) {
              message.success(
                intl.formatMessage({
                  id: 'pages.button.create.success',
                  defaultMessage: 'Created successfully!',
                }),
              );
              formRefCreate.current?.resetFields();
              setDrawerVisible(false);
              setActiveTabKey('flowPropertiesInformation');
              setFromData({});
              reload();
            } else {
              message.error(result.error.message);
            }
            return true;
          }}
        >
          <FlowpropertyForm
            lang={lang}
            activeTabKey={activeTabKey}
            drawerVisible={drawerVisible}
            formRef={formRefCreate}
            onData={handletFromData}
            onTabChange={onTabChange}
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
export default FlowpropertiesCreate;
