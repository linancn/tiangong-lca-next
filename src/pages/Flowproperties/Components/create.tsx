import { createFlowproperties } from '@/services/flowproperties/api';
import { langOptions } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { FC } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowpropertiesCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();
  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);
  return (
    <>
      <Tooltip title={<FormattedMessage id="options.create" defaultMessage="Create" />}>
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
        title={<FormattedMessage id="options.create" defaultMessage="Create" />}
        width="600px"
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
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary">
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm
          formRef={formRefCreate}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async (values) => {
            const result = await createFlowproperties({ ...values });
            if (result.data) {
              message.success(
                <FormattedMessage
                  id="options.createsuccess"
                  defaultMessage="Created Successfully!"
                />,
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
          <Space direction="vertical">
            {/* <Card size="small" title={'Short Name'}>
                        <Form.Item>
                            <Form.List name={'common:shortName'}>
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
                                            + Add Short Name Item
                                        </Button>
                                    </div>
                                )}
                            </Form.List>
                        </Form.Item>
                    </Card> */}
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
            <Card size="small" title={'GeneralComment'}>
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
                              <Input placeholder="text" />
                            </Form.Item>
                          </Space>
                        </>
                      ))}
                      <Button type="dashed" onClick={() => subOpt.add()} block>
                        + Add GeneralComment Item
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
                  <pre>{JSON.stringify(formRefCreate.current?.getFieldsValue(), null, 2)}</pre>
                </Typography>
              )}
            </Form.Item>
          </Space>
        </ProForm>
      </Drawer>
    </>
  );
};
export default FlowpropertiesCreate;
