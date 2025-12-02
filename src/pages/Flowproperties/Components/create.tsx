import { createFlowproperties, getFlowpropertyDetail } from '@/services/flowproperties/api';
import { genFlowpropertyFromData } from '@/services/flowproperties/util';
// import { langOptions } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import {
  Button,
  // DatePicker,
  Drawer,
  message,
  // Select,
  Space,
  Spin,
  Tooltip,
} from 'antd';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
// import UnitgroupsFrom from '@/pages/Unitgroups/Components/Unit/edit';
import ToolBarButton from '@/components/ToolBarButton';
import { FlowPropertyDataSetObjectKeys, FormFlowProperty } from '@/services/flowproperties/data';
import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { ProForm, ProFormInstance } from '@ant-design/pro-components';
import { v4 } from 'uuid';
import { FlowpropertyForm } from './form';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
  importData?: any;
  onClose?: () => void;
  newVersion?: string;
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
const FlowpropertiesCreate: FC<CreateProps> = ({
  actionRef,
  lang,
  actionType = 'create',
  newVersion,
  id,
  version,
  importData,
  onClose = () => {},
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<FlowPropertyDataSetObjectKeys>(
    'flowPropertiesInformation',
  );
  const [initData, setInitData] = useState<FormFlowProperty & { id?: string }>();
  const [fromData, setFromData] = useState<FormFlowProperty & { id?: string }>();
  const [spinning, setSpinning] = useState<boolean>(false);
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

  const onTabChange = (key: FlowPropertyDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const getFormDetail = () => {
    if (!id || !version) return;
    setSpinning(true);
    formRefCreate.current?.resetFields();
    getFlowpropertyDetail(id, version).then(async (result: any) => {
      const dataset = await genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {});
      if (actionType === 'createVersion' && newVersion) {
        dataset.administrativeInformation.publicationAndOwnership['common:dataSetVersion'] =
          newVersion;
      }
      setInitData({
        ...dataset,
        id: id,
      });
      formRefCreate.current?.setFieldsValue({
        ...dataset,
        id: id,
      });
      setFromData({
        ...dataset,
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
    if (drawerVisible === false) {
      onClose();
      formRefCreate.current?.resetFields();
      setInitData(undefined);
      setFromData(undefined);
      return;
    }
    if (importData && importData.length > 0) {
      const formData = genFlowpropertyFromData(importData[0].flowPropertyDataSet);
      setInitData(formData);
      formRefCreate.current?.setFieldsValue(formData);
      setFromData(formData);
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
          'common:dataSetVersion': initVersion,
          'common:permanentDataSetURI': intl.formatMessage({
            id: 'pages.FlowProperties.view.administrativeInformation.permanentDataSetURI.default',
            defaultMessage: 'Automatically generated',
          }),
        },
      },
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:approvalOfOverallCompliance': 'Fully compliant',
          },
        },
      },
    };

    setInitData(newData as FormFlowProperty);
    const currentData = formRefCreate.current?.getFieldsValue();
    formRefCreate.current?.setFieldsValue({ ...currentData, ...newData });
    setFromData(newData as FormFlowProperty);
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
                ? 'pages.flowproperty.drawer.title.copy'
                : actionType === 'createVersion'
                  ? 'pages.flowproperty.drawer.title.createVersion'
                  : 'pages.flowproperty.drawer.title.create'
            }
            defaultMessage='Create Flow property'
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
              setFromData({
                ...fromData,
                [activeTabKey]: allValues[activeTabKey] ?? {},
              } as FormFlowProperty);
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              const paramsId = (actionType === 'createVersion' ? id : v4()) ?? '';
              const formFieldsValue = formRefCreate.current?.getFieldsValue();
              const result = await createFlowproperties(paramsId, formFieldsValue);
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
                setFromData(undefined);
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
              onTabChange={(key) => onTabChange(key as FlowPropertyDataSetObjectKeys)}
              formType={actionType}
            />
          </ProForm>
        </Spin>
      </Drawer>
    </>
  );
};
export default FlowpropertiesCreate;
