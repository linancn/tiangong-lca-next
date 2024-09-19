import { getFlowDetail, updateFlows } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import { Button, Collapse, Drawer, Space, Spin, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { FlowForm } from './form';

type Props = {
  id: string;
  buttonType: string;
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowsEdit: FC<Props> = ({ id, buttonType, actionRef, lang }) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [flowType, setFlowType] = useState<string>();
  const [spinning, setSpinning] = useState(false);
  const [propertyDataSource, setPropertyDataSource] = useState<any>([]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const handletFromData = () => {
    if (fromData?.id)
      setFromData({
        ...fromData,
        [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
      });
  };

  const handletPropertyData = (data: any) => {
    if (fromData?.id)
      setPropertyDataSource([...data]);
  };

  const handletPropertyDataCreate = (data: any) => {
    if (fromData?.id)
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
    getFlowDetail(id).then(async (result: any) => {
      const fromData0 = await genFlowFromData(result.data?.json?.flowDataSet ?? {});
      setInitData({ ...fromData0, id: id });
      setPropertyDataSource(fromData0?.flowProperties?.flowProperty ?? []);
      setFromData({ ...fromData0, id: id });
      setFlowType(fromData0?.flowInformation?.LCIMethod?.typeOfDataSet);
      formRefEdit.current?.resetFields();
      formRefEdit.current?.setFieldsValue({
        ...fromData0,
        id: id,
      });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) return;
    onReset();
  }, [drawerVisible]);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}
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
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              const updateResult = await updateFlows({ ...fromData, id });
              if (updateResult?.data) {
                message.success(
                  <FormattedMessage
                    id="pages.flows.editsuccess"
                    defaultMessage="Edit successfully!"
                  />,
                );
                setDrawerVisible(false);
                setActiveTabKey('flowInformation');
                actionRef.current?.reload();
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
