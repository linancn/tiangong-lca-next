import { getFlowpropertiesDetail, updateFlowproperties } from '@/services/flowproperties/api';
import { langOptions } from '@/services/general/data';
import LangTextItemFrom from '@/components/LangTextItem/from';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
  Divider
} from 'antd';
import type { FC } from 'react';
import { useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

const { TextArea } = Input;

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const FlowpropertiesEdit: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
  const [editForm, setEditForm] = useState<JSX.Element>();
  const formRefEdit = useRef<ProFormInstance>();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
    setEditForm(
      <div className={styles.loading_spin_div}>
        <Spin />
      </div>,
    );
    getFlowpropertiesDetail(id).then(async (result: any) => {
      await setEditForm(
        <ProForm
          formRef={formRefEdit}
          submitter={{
            render: () => {
              return [];
            },
          }}
          initialValues={result.data}
          onFinish={async (values) => {
            const updateResult = await updateFlowproperties({ ...values });
            if (updateResult?.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
              );
              setDrawerVisible(false);
              setViewDrawerVisible(false);
              actionRef.current?.reload();
            } else {
              message.error(updateResult?.error?.message);
            }
            return true;
          }}
        >
          <Space direction="vertical">
            <Card size="small" title={'Name'}>
              <Form.Item>
                <Form.List name={'common:name'}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add Name Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>
            <Card size="small" title={'Classification'}>
              <Space>
                <Form.Item name={['common:class', '@level_0']}>
                  <Input placeholder="Level 1" />
                </Form.Item>
                <Form.Item name={['common:class', '@level_1']}>
                  <Input placeholder="Level 2" />
                </Form.Item>
                <Form.Item name={['common:class', '@level_2']}>
                  <Input placeholder="Level 3" />
                </Form.Item>
              </Space>
            </Card>
            <Card size="small" title={'General Comment'}>
              <Form.Item>
                <Form.List name={'common:generalComment'}>
                  {(subFields, subOpt) => (
                    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                      {subFields.map((subField) => (
                        <>
                          <Space key={subField.key} direction="vertical">
                            <Space>
                              <Form.Item noStyle name={[subField.name, '@xml:lang']}>
                                <Select
                                  placeholder="Select a lang"
                                  optionFilterProp="lang"
                                  options={langOptions}
                                />
                              </Form.Item>
                              <CloseOutlined
                                onClick={() => {
                                  subOpt.remove(subField.name);
                                }}
                              />
                            </Space>
                            <Form.Item noStyle name={[subField.name, '#text']}>
                              <TextArea placeholder="text" rows={1} />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add General Comment Item
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
            </Card>
            <Form.Item label="Data Set Version" name={'common:dataSetVersion'}>
              <Input />
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {() => (
                <Typography>
                  <pre>{JSON.stringify(formRefEdit.current?.getFieldsValue(), null, 2)}</pre>
                </Typography>
              )}
            </Form.Item>
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          </Space>
        </ProForm>,
      );
      await formRefEdit.current?.setFieldsValue(result.data);
    });
  }, [actionRef, id, setViewDrawerVisible]);

  const onReset = () => {
    getFlowpropertiesDetail(id).then(async (result) => {
      formRefEdit.current?.setFieldsValue(result.data);
    });
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}>
        {buttonType === 'icon' ? (
          <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
        ) : (
          <Button onClick={onEdit}>
            <FormattedMessage id="options.edit" defaultMessage="Edit" />
          </Button>
        )}
      </Tooltip>
      <Drawer
        title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}
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
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="options.reset" defaultMessage="Reset" />
            </Button>
            <Button onClick={() => formRefEdit.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        {editForm}
      </Drawer>
    </>
  );
};

export default FlowpropertiesEdit;
