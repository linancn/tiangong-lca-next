import styles from '@/style/custom.less';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import {
  Button,
  Collapse,
  Drawer,
  // Input,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { LifeCycleModelForm } from '../form';

// const { TextArea } = Input;

type Props = {
  lang: string;
  data: any;
  onData: (data: any) => void;
};
const ToolbarEditInfo: FC<Props> = ({ lang, data, onData }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('lifeCycleModelInformation');
  const formRefCreate = useRef<ProFormInstance>();
  const [fromData, setFromData] = useState<any>({});
  // const [refleshSpinning, setRefleshSpinning] = useState(false);

  // const refleshFlowInfo = () => {
  //   setRefleshSpinning(true);
  //   getFlowDetail(flowId).then(async (result: any) => {
  //     const flow = genFlowFromData(result.data?.json?.flowDataSet ?? {});
  //     formRefCreate.current?.setFieldValue(
  //       ['productInformation', 'referenceToFlowDataSet', 'common:name'],
  //       flow?.flowInformation?.dataSetInformation?.name?.baseName,
  //     );
  //     formRefCreate.current?.setFieldValue(
  //       ['productInformation', 'referenceToFlowDataSet', 'common:generalComment'],
  //       flow?.flowInformation?.dataSetInformation?.['common:generalComment'],
  //     );
  //     setFromData({
  //       ...fromData,
  //       productInformation: {
  //         ...fromData.productInformation,
  //         referenceToFlowDataSet: {
  //           ...fromData.productInformation.referenceToFlowDataSet,
  //           'common:name': flow?.flowInformation?.dataSetInformation?.name?.baseName,
  //           'common:generalComment':
  //             flow?.flowInformation?.dataSetInformation?.['common:generalComment'],
  //         },
  //       },
  //     });
  //     setRefleshSpinning(false);
  //   });
  // };

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
    if (!drawerVisible) return;
    formRefCreate.current?.resetFields();
    formRefCreate.current?.setFieldsValue(data);
    setFromData(data);
  }, [drawerVisible]);

  return (
    <>
      <Tooltip
        title={<FormattedMessage id="pages.button.model.info" defaultMessage="Base infomation" />}
        placement="left"
      >
        <Button
          type="primary"
          size="small"
          icon={<InfoOutlined />}
          style={{ boxShadow: 'none' }}
          onClick={() => {
            setDrawerVisible(true);
          }}
        ></Button>
      </Tooltip>
      <Drawer
        title={
          <FormattedMessage
            id="pages.flow.model.drawer.title.info"
            defaultMessage="Model base infomation"
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
          initialValues={data}
          onValuesChange={(_, allValues) => {
            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
          }}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {
            onData({ ...fromData });
            formRefCreate.current?.resetFields();
            setDrawerVisible(false);
            return true;
          }}
        >
          <LifeCycleModelForm
            lang={lang}
            activeTabKey={activeTabKey}
            formRef={formRefCreate}
            onTabChange={onTabChange}
            onData={handletFromData}
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

export default ToolbarEditInfo;
