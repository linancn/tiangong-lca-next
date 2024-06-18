import { langOptions } from '@/services/general/data';
import { createUnitGroup } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DeleteOutlined, FormOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import type { ActionType, EditableFormInstance, ProColumns } from '@ant-design/pro-table';
import { EditableProTable } from '@ant-design/pro-table';
import {
  Button,
  Card,
  DatePicker,
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
import { useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
// import dayjs from 'dayjs';

// const { TextArea } = Input;

type Props = {
  actionRef: React.MutableRefObject<ActionType | undefined>;
};
const UnitGroupCreate: FC<Props> = ({ actionRef }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const formRefCreate = useRef<ProFormInstance>();

  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>(() => []);
  const editorFormRef = useRef<EditableFormInstance<UnitTable>>();

  const reload = useCallback(() => {
    actionRef.current?.reload();
  }, [actionRef]);

  const unitColumns: ProColumns<UnitTable>[] = [
    {
      title: <FormattedMessage id="unit.dataSetInternalID" defaultMessage="DataSet Internal ID" />,
      dataIndex: '@dataSetInternalID',
      // valueType: 'digit',
      formItemProps: () => {
        return {
          rules: [
            {
              required: true,
              message: (
                <FormattedMessage id="options.required" defaultMessage="This field is required" />
              ),
            },
          ],
        };
      },
    },
    {
      title: <FormattedMessage id="unit.name" defaultMessage="Name" />,
      dataIndex: 'name',
      // formItemProps: () => {
      //   return {
      //     rules: [
      //       {
      //         required: true,
      //         message: (
      //           <FormattedMessage id="options.required" defaultMessage="This field is required" />
      //         ),
      //       },
      //     ],
      //   };
      // },
    },
    {
      title: <FormattedMessage id="unit.meanValue" defaultMessage="Mean Value" />,
      dataIndex: 'meanValue',
      // formItemProps: () => {
      //   return {
      //     rules: [
      //       {
      //         required: true,
      //         message: (
      //           <FormattedMessage id="options.required" defaultMessage="This field is required" />
      //         ),
      //       },
      //     ],
      //   };
      // },
    },
    {
      title: <FormattedMessage id="unit.selected" defaultMessage="Selected" />,
      dataIndex: 'selected',
      valueType: 'switch',
    },
    {
      title: <FormattedMessage id="unit.option" defaultMessage="Option" />,
      valueType: 'option',
      width: 200,
      render: (text, record, _, action) => [
        <Tooltip key="edit" title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}>
          <Button
            size={'small'}
            shape="circle"
            icon={<FormOutlined />}
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          />
        </Tooltip>,
        <Tooltip
          key="delete"
          title={<FormattedMessage id="options.delete" defaultMessage="Delete" />}
        >
          <Button
            size={'small'}
            shape="circle"
            icon={<DeleteOutlined />}
            onClick={() => {
              const tableDataSource = formRefCreate.current?.getFieldValue('unit') as UnitTable[];
              formRefCreate.current?.setFieldsValue({
                unit: tableDataSource.filter((item) => item.id !== record.id),
              });
            }}
          />
        </Tooltip>,
      ],
    },
  ];

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
        width="800px"
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
              <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
            </Button>
            <Button onClick={() => formRefCreate.current?.submit()} type="primary" size={'middle'}>
              <FormattedMessage id="options.submit" defaultMessage="Submit" />
            </Button>
          </Space>
        }
      >
        <ProForm<{
          table: UnitTable[];
        }>
          formRef={formRefCreate}
          validateTrigger="onBlur"
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async (values) => {
            const result = await createUnitGroup({ ...values });
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
            <Card size="small" title={'UnitGroup Information'}>
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
              <br />
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
              <br />
              <Form.Item name={'referenceToReferenceUnit'}>
                <Input placeholder="Quantitative Reference" />
              </Form.Item>
            </Card>
            <Card size="small" title={'Modelling And Validation'}>
              <Form.Item name={'compliance:common:@refObjectId'}>
                <Input placeholder="@refObjectId" />
              </Form.Item>
              <Form.Item name={'compliance:common:@type'}>
                <Input placeholder="@type" />
              </Form.Item>
              <Form.Item name={'compliance:common:@uri'}>
                <Input placeholder="@uri" />
              </Form.Item>
              <Form.Item name={'compliance:common:@version'}>
                <Input placeholder="@version" />
              </Form.Item>
              <Card size="small" title={'Short Description'}>
                <Form.Item>
                  <Form.List name={'compliance:common:shortDescription'}>
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
                          + Add Short Description Item
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Form.Item>
              </Card>
              <br />
              <Form.Item name={'compliance:common:approvalOfOverallCompliance'}>
                <Input placeholder="Approval Of Overall Compliance" />
              </Form.Item>
            </Card>
            <Card size="small" title={'Administrative Information'}>
              <Form.Item name={'dataEntryBy:common:timeStamp'}>
                <DatePicker showTime placeholder="Select" />
              </Form.Item>
              <Form.Item name={'dataEntryBy:common:@refObjectId'}>
                <Input placeholder="@refObjectId" />
              </Form.Item>
              <Form.Item name={'dataEntryBy:common:@type'}>
                <Input placeholder="@type" />
              </Form.Item>
              <Form.Item name={'dataEntryBy:common:@uri'}>
                <Input placeholder="@uri" />
              </Form.Item>
              <Form.Item name={'dataEntryBy:common:@version'}>
                <Input placeholder="@version" />
              </Form.Item>
              <Card size="small" title={'Short Description'}>
                <Form.Item>
                  <Form.List name={'dataEntryBy:common:shortDescription'}>
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
                          + Add Short Description Item
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Form.Item>
              </Card>
              <br />
              <Form.Item name={'publicationAndOwnership:common:dataSetVersion'}>
                <Input placeholder="DataSet Version" />
              </Form.Item>
            </Card>
            <Card size="small" title={'Units'}>
              <EditableProTable<UnitTable>
                rowKey="id"
                editableFormRef={editorFormRef}
                name="unit"
                recordCreatorProps={{
                  record: () => {
                    let index = 0;
                    const tableDataSource = formRefCreate.current?.getFieldValue(
                      'unit',
                    ) as UnitTable[];
                    if (tableDataSource) {
                      index = tableDataSource.length;
                    }
                    return {
                      id: v4(),
                      '@dataSetInternalID': index + '',
                      name: '',
                      meanValue: '',
                      selected: false,
                    };
                  },
                }}
                columns={unitColumns}
                editable={{
                  type: 'multiple',
                  editableKeys,
                  onChange: setEditableRowKeys,
                }}
              />
            </Card>
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

export default UnitGroupCreate;
