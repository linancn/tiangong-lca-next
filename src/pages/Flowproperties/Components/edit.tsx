import {
  createFlowproperties,
  getFlowpropertyDetail,
  updateFlowproperties,
} from '@/services/flowproperties/api';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, FormOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';

import {
  Button,
  Collapse,
  Drawer,
  // Select,
  Space,
  Spin,
  // Spin,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import {
  useEffect,
  // useCallback, useEffect,
  useRef,
  useState,
} from 'react';
import { FormattedMessage, useIntl } from 'umi';

import { UpdateReferenceContext } from '@/contexts/updateReferenceContext';
import { genFlowpropertyFromData } from '@/services/flowproperties/util';
import { v4 } from 'uuid';
import { FlowpropertyForm } from './form';
type Props = {
  id: string;
  version: string;
  buttonType: string;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  lang: string;
  type?: 'edit' | 'copy' | 'createVersion';
};
const FlowpropertiesEdit: FC<Props> = ({
  id,
  version,
  buttonType,
  actionRef,
  lang,
  type = 'edit',
}) => {
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('flowPropertiesInformation');
  const [fromData, setFromData] = useState<any>({});
  const [initData, setInitData] = useState<any>({});
  const [spinning, setSpinning] = useState(false);
  const intl = useIntl();
  const [referenceValue, setReferenceValue] = useState(0);

  const updateReference = async () => {
    setReferenceValue(referenceValue + 1);
  };
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

  const onEdit = () => {
    setDrawerVisible(true);
  };

  const onReset = () => {
    setSpinning(true);
    formRefEdit.current?.resetFields();
    getFlowpropertyDetail(id, version).then(async (result: any) => {
      const fromData0 = await genFlowpropertyFromData(result.data?.json?.flowPropertyDataSet ?? {});
      setInitData({
        ...fromData0,
        id: id,
      });
      formRefEdit.current?.setFieldsValue({
        ...fromData0,
        id: id,
      });
      setFromData({
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
      <Tooltip
        title={
          <FormattedMessage
            id={
              type === 'copy'
                ? 'pages.button.copy'
                : type === 'createVersion'
                  ? 'pages.button.createVersion'
                  : 'pages.button.edit'
            }
            defaultMessage={
              type === 'copy' ? 'Copy' : type === 'createVersion' ? 'Create Version' : 'Edit'
            }
          />
        }
      >
        {buttonType === 'icon' ? (
          type === 'edit' ? (
            <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
          ) : type === 'createVersion' ? (
            <Button type="text" icon={<PlusOutlined />} size="small" onClick={onEdit} />
          ) : (
            <Button shape="circle" icon={<CopyOutlined />} size="small" onClick={onEdit} />
          )
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage
              id={buttonType ? buttonType : 'pages.button.edit'}
              defaultMessage="Edit"
            />
          </Button>
        )}
      </Tooltip>
      <Drawer
        getContainer={() => document.body}
        title={
          type === 'edit' ? (
            <FormattedMessage
              id="pages.flowproperty.drawer.title.edit"
              defaultMessage="Edit Flow property"
            />
          ) : type === 'createVersion' ? (
            <FormattedMessage
              id="pages.flowproperty.drawer.title.createVersion"
              defaultMessage="Create Flow property"
            />
          ) : (
            <FormattedMessage
              id="pages.flowproperty.drawer.title.copy"
              defaultMessage="Copy Flow property"
            />
          )
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
            {type === 'edit' ? (
              <Button
                onClick={() => {
                  updateReference();
                }}
              >
                <FormattedMessage
                  id="pages.button.updateReference"
                  defaultMessage="Update reference"
                />
              </Button>
            ) : (
              <></>
            )}
            <Button onClick={() => setDrawerVisible(false)}>
              {' '}
              <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="pages.button.save" defaultMessage="Save" />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <UpdateReferenceContext.Provider value={{ referenceValue }}>
            <ProForm
              formRef={formRefEdit}
              initialValues={initData}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                if (type === 'copy' || type === 'createVersion') {
                  const createResult = await createFlowproperties(
                    type === 'copy' ? v4() : id,
                    fromData,
                  );
                  if (createResult?.data) {
                    message.success(
                      intl.formatMessage({
                        id: 'pages.button.create.success',
                        defaultMessage: 'Created successfully!',
                      }),
                    );
                    setDrawerVisible(false);
                    setActiveTabKey('flowPropertiesInformation');
                    actionRef?.current?.reload();
                  } else if (createResult?.error?.code === '23505') {
                    message.error(
                      intl.formatMessage({
                        id: 'pages.button.createVersion.fail',
                        defaultMessage: 'Please change the version and submit',
                      }),
                    );
                  } else {
                    message.error(createResult?.error?.message);
                  }
                  return true;
                }

                const updateResult = await updateFlowproperties(id, version, fromData);
                if (updateResult?.data) {
                  message.success(
                    <FormattedMessage
                      id="pages.flowproperties.editsuccess"
                      defaultMessage="Edit flowproperties successfully!"
                    />,
                  );
                  setDrawerVisible(false);
                  // setViewDrawerVisible(false);
                  setActiveTabKey('flowPropertiesInformation');
                  actionRef?.current?.reload();
                } else {
                  message.error(updateResult?.error?.message);
                }
                return true;
              }}
              onValuesChange={(_, allValues) => {
                setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
              }}
            >
              <FlowpropertyForm
                lang={lang}
                activeTabKey={activeTabKey}
                drawerVisible={drawerVisible}
                formRef={formRefEdit}
                onData={handletFromData}
                onTabChange={onTabChange}
              />
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

export default FlowpropertiesEdit;
