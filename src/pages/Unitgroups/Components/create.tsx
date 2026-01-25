import ToolBarButton from '@/components/ToolBarButton';
import { initVersion } from '@/services/general/data';
import { formatDateTime } from '@/services/general/util';
import { createUnitGroup, getUnitGroupDetail } from '@/services/unitgroups/api';
import { FormUnitGroup, UnitGroupDataSetObjectKeys } from '@/services/unitgroups/data';
import { genUnitGroupFromData } from '@/services/unitgroups/util';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Drawer, message, Space, Spin, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { v4 } from 'uuid';
import { UnitGroupForm } from './form';

type Props = {
  lang: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  actionType?: 'create' | 'copy' | 'createVersion';
  id?: string;
  version?: string;
  importData?: any;
  onClose?: () => void;
  disabled?: boolean;
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

const UnitGroupCreate: FC<CreateProps> = ({
  lang,
  actionRef,
  actionType = 'create',
  newVersion,
  id,
  version,
  importData,
  onClose = () => {},
  disabled = false,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] =
    useState<UnitGroupDataSetObjectKeys>('unitGroupInformation');
  const [fromData, setFromData] = useState<FormUnitGroup & { id?: string }>();
  const [initData, setInitData] = useState<FormUnitGroup & { id?: string }>();
  const [unitDataSource, setUnitDataSource] = useState<any>([]);
  const [spinning, setSpinning] = useState<boolean>(false);
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

  const onTabChange = (key: UnitGroupDataSetObjectKeys) => {
    setActiveTabKey(key);
  };

  const getFormDetail = () => {
    if (!id || !version) return;
    setSpinning(true);
    getUnitGroupDetail(id, version).then(async (result: any) => {
      const dataset = genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {});
      if (actionType === 'createVersion' && newVersion) {
        dataset.administrativeInformation.publicationAndOwnership['common:dataSetVersion'] =
          newVersion;
      }
      setInitData({ ...dataset, id: id });
      setFromData({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
        id: id,
      });
      setUnitDataSource(
        genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {})?.units?.unit ?? [],
      );
      formRefCreate.current?.resetFields();
      formRefCreate.current?.setFieldsValue({
        ...genUnitGroupFromData(result.data?.json?.unitGroupDataSet ?? {}),
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
      setInitData(undefined);
      setFromData(undefined);
      setUnitDataSource([]);
      formRefCreate.current?.resetFields();
      return;
    }
    if (importData && importData.length > 0) {
      const formData = genUnitGroupFromData(importData[0].unitGroupDataSet);
      setInitData(formData);
      setFromData(formData);
      setUnitDataSource(formData?.units?.unit ?? []);
      formRefCreate.current?.resetFields();
      formRefCreate.current?.setFieldsValue(formData);
      return;
    }
    if (actionType === 'copy' || actionType === 'createVersion') {
      getFormDetail();
      return;
    }
    const currentDateTime = formatDateTime(new Date());
    const newData = {
      modellingAndValidation: {
        complianceDeclarations: {
          compliance: {
            'common:approvalOfOverallCompliance': 'Fully compliant',
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': currentDateTime,
        },
        publicationAndOwnership: {
          'common:dataSetVersion': initVersion,
        },
      },
    };
    setInitData(newData as FormUnitGroup);
    const currentData = formRefCreate.current?.getFieldsValue();
    formRefCreate.current?.setFieldsValue({ ...currentData, ...newData });
    setFromData(newData as FormUnitGroup);
    setUnitDataSource([]);
  }, [drawerVisible]);

  useEffect(() => {
    setFromData({ ...(fromData ?? {}), units: { unit: unitDataSource } } as FormUnitGroup);
  }, [unitDataSource]);

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
          ></FormattedMessage>
        }
      >
        {actionType === 'copy' ? (
          <Button
            disabled={disabled}
            shape='circle'
            icon={<CopyOutlined />}
            size='small'
            onClick={() => {
              setDrawerVisible(true);
            }}
          ></Button>
        ) : (
          <ToolBarButton
            disabled={disabled}
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
                ? 'pages.unitgroup.drawer.title.copy'
                : actionType === 'createVersion'
                  ? 'pages.unitgroup.drawer.title.createVersion'
                  : 'pages.unitgroup.drawer.title.create'
            }
            defaultMessage='Create'
          ></FormattedMessage>
        }
        width='90%'
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
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel'></FormattedMessage>
            </Button>
            <Button
              onClick={() => {
                formRefCreate.current?.submit();
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save'></FormattedMessage>
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <ProForm
            formRef={formRefCreate}
            initialValues={initData}
            onValuesChange={(_, allValues) => {
              const nextSlice = allValues[activeTabKey] ?? {};
              const applyUpdate = () => {
                setFromData(
                  (prev) =>
                    ({
                      ...prev,
                      [activeTabKey]: nextSlice,
                    }) as FormUnitGroup,
                );
              };

              if (typeof globalThis.queueMicrotask === 'function') {
                globalThis.queueMicrotask(applyUpdate);
              } else {
                Promise.resolve().then(applyUpdate);
              }
            }}
            submitter={{
              render: () => {
                return [];
              },
            }}
            onFinish={async () => {
              const paramsId = (actionType === 'createVersion' ? id : v4()) ?? '';
              const units = fromData?.units;
              const formFieldsValue = {
                ...formRefCreate.current?.getFieldsValue(),
                units,
              };
              const result = await createUnitGroup(paramsId, formFieldsValue);
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
              formType={actionType}
              lang={lang}
              activeTabKey={activeTabKey}
              formRef={formRefCreate}
              onData={handletFromData}
              onUnitData={handletUnitData}
              onUnitDataCreate={handletUnitDataCreate}
              onTabChange={(key) => onTabChange(key as UnitGroupDataSetObjectKeys)}
              unitDataSource={unitDataSource}
            />
          </ProForm>
        </Spin>
      </Drawer>
    </>
  );
};

export default UnitGroupCreate;
