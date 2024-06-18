import { getUnitGroupDetail, updateUnitGroup } from '@/services/unitgroups/api';
import { UnitTable } from '@/services/unitgroups/data';
import { langOptions } from '@/services/general/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
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
    Spin,
    Tooltip,
    Typography,
    message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import dayjs from 'dayjs';

// const { TextArea } = Input;

type Props = {
    id: string;
    buttonType: string;
    actionRef: React.MutableRefObject<ActionType | undefined>;
    setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const UnitGroupEdit: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
    const [editForm, setEditForm] = useState<JSX.Element>();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const formRefEdit = useRef<ProFormInstance>();

    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>(() => []);
    const editorFormRef = useRef<EditableFormInstance<UnitTable>>();
    // const editorActionRef = useRef<ActionType>();
    const [unitDataSource, setUnitDataSource] = useState<readonly UnitTable[]>([]);

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
        },
        {
            title: <FormattedMessage id="unit.meanValue" defaultMessage="Mean Value" />,
            dataIndex: 'meanValue',
        },
        {
            title: <FormattedMessage id="unit.selected" defaultMessage="Selected" />,
            dataIndex: 'selected',
            key: 'selected',
            valueType: 'switch',
        },
        {
            title: <FormattedMessage id="unit.option" defaultMessage="Option" />,
            valueType: 'option',
            width: 200,
            render: (text, row, _, action) => [
                <Tooltip key="editable" title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}>
                    <Button
                        size={'small'}
                        shape="circle"
                        icon={<FormOutlined />}
                        onClick={() => {
                            // editorActionRef.current?.startEditable(row.id);
                            // setEditableRowKeys([...editableKeys, row.id]);
                            console.log(action?.startEditable, row);

                            action?.startEditable?.(row.id);
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
                            const tableDataSource = formRefEdit.current?.getFieldValue('unit') as UnitTable[];
                            formRefEdit.current?.setFieldsValue({
                                unit: tableDataSource.filter((item) => item.id !== row.id),
                            });
                            // setUnitDataSource(unitDataSource.filter((item) => item.id !== row.id));
                        }}
                    />
                </Tooltip>,
            ],
        },
    ];

    const setDate = (data: any) => {
        if (data['dataEntryBy:common:timeStamp']) {
            data['dataEntryBy:common:timeStamp'] = dayjs(data['dataEntryBy:common:timeStamp'], 'YYYY.MM.DD HH:mm:ss');
        }
    };

    const setUnits = (data: any) => {
        if (data.unit) {
            const unitData = data.unit.map((item: any) => {
                return {
                    id: v4(),
                    '@dataSetInternalID': item['@dataSetInternalID'],
                    name: item.name,
                    meanValue: item.meanValue,
                    selected: false,
                };
            });
            data.unit = unitData;
            formRefEdit.current?.setFieldsValue({ unit: unitData });
        }
    };

    const onEdit = useCallback(() => {
        setDrawerVisible(true);
        setEditForm(
            <div className={styles.loading_spin_div}>
                <Spin />
            </div>,
        );
        getUnitGroupDetail(id).then((result: any) => {
            setDate(result.data);
            setUnits(result.data);
            // setEditForm(
            //     <ProForm<{
            //         unit: UnitTable[];
            //     }>
            //         formRef={formRefEdit}
            //         validateTrigger="onBlur"
            //         submitter={{
            //             render: () => {
            //                 return [];
            //             },
            //         }}
            //         initialValues={result.data}
            //         onFinish={async (values) => {
            //             const updateResult = await updateUnitGroup({ ...values });
            //             if (updateResult?.data) {
            //                 message.success(
            //                     <FormattedMessage
            //                         id="options.createsuccess"
            //                         defaultMessage="Created Successfully!" />
            //                 );
            //                 setDrawerVisible(false);
            //                 setViewDrawerVisible(false);
            //                 actionRef.current?.reload();
            //             } else {
            //                 message.error(updateResult?.error?.message);
            //             }
            //             return true;
            //         }}
            //     >
            //         <Space direction="vertical">
            //             <Card size="small" title={'UnitGroup Information'}>
            //                 <Card size="small" title={'Name'}>
            //                     <Form.Item>
            //                         <Form.List name={'common:name'}>
            //                             {(subFields, subOpt) => (
            //                                 <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
            //                                     {subFields.map((subField) => (
            //                                         <>
            //                                             <Space key={subField.key} direction="vertical">
            //                                                 <Space>
            //                                                     <Form.Item noStyle name={[subField.name, '@xml:lang']}>
            //                                                         <Select
            //                                                             placeholder="Select a lang"
            //                                                             optionFilterProp="lang"
            //                                                             options={langOptions}
            //                                                         />
            //                                                     </Form.Item>
            //                                                     <CloseOutlined
            //                                                         onClick={() => {
            //                                                             subOpt.remove(subField.name);
            //                                                         }}
            //                                                     />
            //                                                 </Space>
            //                                                 <Form.Item noStyle name={[subField.name, '#text']}>
            //                                                     <Input placeholder="text" />
            //                                                 </Form.Item>
            //                                             </Space>
            //                                         </>
            //                                     ))}
            //                                     <Button type="dashed" onClick={() => subOpt.add()} block>
            //                                         + Add Name Item
            //                                     </Button>
            //                                 </div>
            //                             )}
            //                         </Form.List>
            //                     </Form.Item>
            //                 </Card>
            //                 <br />
            //                 <Card size="small" title={'Classification'}>
            //                     <Space>
            //                         <Form.Item name={['common:class', '@level_0']}>
            //                             <Input placeholder="Level 1" />
            //                         </Form.Item>
            //                         <Form.Item name={['common:class', '@level_1']}>
            //                             <Input placeholder="Level 2" />
            //                         </Form.Item>
            //                         <Form.Item name={['common:class', '@level_2']}>
            //                             <Input placeholder="Level 3" />
            //                         </Form.Item>
            //                     </Space>
            //                 </Card>
            //                 <br />
            //                 <Form.Item name={'referenceToReferenceUnit'}>
            //                     <Input placeholder="Quantitative Reference" />
            //                 </Form.Item>
            //             </Card>
            //             <Card size="small" title={'Modelling And Validation'}>
            //                 <Form.Item name={'compliance:common:@refObjectId'}>
            //                     <Input placeholder="@refObjectId" />
            //                 </Form.Item>
            //                 <Form.Item name={'compliance:common:@type'}>
            //                     <Input placeholder="@type" />
            //                 </Form.Item>
            //                 <Form.Item name={'compliance:common:@uri'}>
            //                     <Input placeholder="@uri" />
            //                 </Form.Item>
            //                 <Form.Item name={'compliance:common:@version'}>
            //                     <Input placeholder="@version" />
            //                 </Form.Item>
            //                 <Card size="small" title={'Short Description'}>
            //                     <Form.Item>
            //                         <Form.List name={'compliance:common:shortDescription'}>
            //                             {(subFields, subOpt) => (
            //                                 <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
            //                                     {subFields.map((subField) => (
            //                                         <>
            //                                             <Space key={subField.key} direction="vertical">
            //                                                 <Space>
            //                                                     <Form.Item noStyle name={[subField.name, '@xml:lang']}>
            //                                                         <Select
            //                                                             placeholder="Select a lang"
            //                                                             optionFilterProp="lang"
            //                                                             options={langOptions}
            //                                                         />
            //                                                     </Form.Item>
            //                                                     <CloseOutlined
            //                                                         onClick={() => {
            //                                                             subOpt.remove(subField.name);
            //                                                         }}
            //                                                     />
            //                                                 </Space>
            //                                                 <Form.Item noStyle name={[subField.name, '#text']}>
            //                                                     <Input placeholder="text" />
            //                                                 </Form.Item>
            //                                             </Space>
            //                                         </>
            //                                     ))}
            //                                     <Button type="dashed" onClick={() => subOpt.add()} block>
            //                                         + Add Short Description Item
            //                                     </Button>
            //                                 </div>
            //                             )}
            //                         </Form.List>
            //                     </Form.Item>
            //                 </Card>
            //                 <br />
            //                 <Form.Item name={'compliance:common:approvalOfOverallCompliance'}>
            //                     <Input placeholder="Approval Of Overall Compliance" />
            //                 </Form.Item>
            //             </Card>
            //             <Card size="small" title={'Administrative Information'}>
            //                 <Form.Item name={'dataEntryBy:common:timeStamp'}>
            //                     <DatePicker showTime placeholder="Select" />
            //                 </Form.Item>
            //                 <Form.Item name={'dataEntryBy:common:@refObjectId'}>
            //                     <Input placeholder="@refObjectId" />
            //                 </Form.Item>
            //                 <Form.Item name={'dataEntryBy:common:@type'}>
            //                     <Input placeholder="@type" />
            //                 </Form.Item>
            //                 <Form.Item name={'dataEntryBy:common:@uri'}>
            //                     <Input placeholder="@uri" />
            //                 </Form.Item>
            //                 <Form.Item name={'dataEntryBy:common:@version'}>
            //                     <Input placeholder="@version" />
            //                 </Form.Item>
            //                 <Card size="small" title={'Short Description'}>
            //                     <Form.Item>
            //                         <Form.List name={'dataEntryBy:common:shortDescription'}>
            //                             {(subFields, subOpt) => (
            //                                 <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
            //                                     {subFields.map((subField) => (
            //                                         <>
            //                                             <Space key={subField.key} direction="vertical">
            //                                                 <Space>
            //                                                     <Form.Item noStyle name={[subField.name, '@xml:lang']}>
            //                                                         <Select
            //                                                             placeholder="Select a lang"
            //                                                             optionFilterProp="lang"
            //                                                             options={langOptions}
            //                                                         />
            //                                                     </Form.Item>
            //                                                     <CloseOutlined
            //                                                         onClick={() => {
            //                                                             subOpt.remove(subField.name);
            //                                                         }}
            //                                                     />
            //                                                 </Space>
            //                                                 <Form.Item noStyle name={[subField.name, '#text']}>
            //                                                     <Input placeholder="text" />
            //                                                 </Form.Item>
            //                                             </Space>
            //                                         </>
            //                                     ))}
            //                                     <Button type="dashed" onClick={() => subOpt.add()} block>
            //                                         + Add Short Description Item
            //                                     </Button>
            //                                 </div>
            //                             )}
            //                         </Form.List>
            //                     </Form.Item>
            //                 </Card>
            //                 <br />
            //                 <Form.Item name={'publicationAndOwnership:common:dataSetVersion'}>
            //                     <Input placeholder="DataSet Version" />
            //                 </Form.Item>
            //             </Card>
            //             <Card size="small" title={'Units'}>
            //                 <EditableProTable<UnitTable>
            //                     rowKey="id"
            //                     editableFormRef={editorFormRef}
            //                     // actionRef={editorActionRef}
            //                     name="unit"
            //                     recordCreatorProps={{
            //                         record: () => {
            //                             let index = 0;
            //                             const tableDataSource = formRefEdit.current?.getFieldValue(
            //                                 'unit',
            //                             ) as UnitTable[];
            //                             if (tableDataSource) {
            //                                 index = tableDataSource.length;
            //                             }
            //                             return {
            //                                 id: v4(),
            //                                 '@dataSetInternalID': index + '',
            //                                 name: '',
            //                                 meanValue: '',
            //                                 selected: false,
            //                             };
            //                         },
            //                     }}
            //                     columns={unitColumns}
            //                     // request={async () => ({
            //                     //     data: result.data.unit,
            //                     //     total: result.data.unit.length,
            //                     //     success: true,
            //                     // })}
            //                     value={unitDataSource}
            //                     onChange={setUnitDataSource}
            //                     editable={{
            //                         type: 'multiple',
            //                         // editableKeys: unitDataSource.map((item: any) => item.id),
            //                         editableKeys,
            //                         onChange: setEditableRowKeys,
            //                         // onSave: async (key, row) => {
            //                         // },
            //                         // onDelete: async (key) => {
            //                         // },
            //                         // onCancel: async (key, row) => {
            //                         //     const newEditableKeys = editableKeys.filter(itemKey => itemKey !== key);
            //                         //     setEditableRowKeys(newEditableKeys);
            //                         // }
            //                     }}
            //                 />
            //             </Card>
            //             <Form.Item noStyle shouldUpdate>
            //                 {() => (
            //                     <Typography>
            //                         <pre>{JSON.stringify(formRefEdit.current?.getFieldsValue(), null, 2)}</pre>
            //                     </Typography>
            //                 )}
            //             </Form.Item>
            //             <Form.Item name="id" hidden>
            //                 <Input />
            //             </Form.Item>
            //         </Space>
            //     </ProForm>
            // );
            formRefEdit.current?.setFieldsValue(result.data);
        });
    }, [actionRef, id, setViewDrawerVisible]);

    const onReset = () => {
        getUnitGroupDetail(id).then((result) => {
            setDate(result.data);
            setUnits(result.data);
            formRefEdit.current?.setFieldsValue(result.data);
        });
    };

    return (
        <>
            <Tooltip title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}>
                {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
                ) : (
                    <Button size="small" onClick={onEdit}>
                        <FormattedMessage id="options.edit" defaultMessage="Edit" />
                    </Button>
                )}
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="options.edit" defaultMessage="Edit" />}
                width="800px"
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
                            <FormattedMessage id="options.cancel" defaultMessage="Cancel" />
                        </Button>
                        <Button onClick={onReset}>
                            <FormattedMessage id="options.reset" defaultMessage="Reset" />
                        </Button>
                        <Button onClick={() => formRefEdit.current?.submit()} type="primary">
                            <FormattedMessage id="options.submit" defaultMessage="Submit" />
                        </Button>
                    </Space>
                }
            >
                {/* {editForm} */}
                {/* initialValues={result.data} */}
                <ProForm<{
                    unit: UnitTable[];
                }>
                    formRef={formRefEdit}
                    validateTrigger="onBlur"
                    submitter={{
                        render: () => {
                            return [];
                        },
                    }}

                    onFinish={async (values) => {
                        const updateResult = await updateUnitGroup({ ...values });
                        if (updateResult?.data) {
                            message.success(
                                <FormattedMessage
                                    id="options.createsuccess"
                                    defaultMessage="Created Successfully!" />
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
                                // actionRef={editorActionRef}
                                name="unit"
                                recordCreatorProps={{
                                    record: () => {
                                        let index = 0;
                                        const tableDataSource = formRefEdit.current?.getFieldValue(
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
                                // request={async () => ({
                                //     data: result.data.unit,
                                //     total: result.data.unit.length,
                                //     success: true,
                                // })}
                                value={unitDataSource}
                                onChange={setUnitDataSource}
                                editable={{
                                    type: 'multiple',
                                    // editableKeys: unitDataSource.map((item: any) => item.id),
                                    editableKeys,
                                    onChange: setEditableRowKeys,
                                    // onSave: async (key, row) => {
                                    // },
                                    // onDelete: async (key) => {
                                    // },
                                    // onCancel: async (key, row) => {
                                    //     const newEditableKeys = editableKeys.filter(itemKey => itemKey !== key);
                                    //     setEditableRowKeys(newEditableKeys);
                                    // }
                                }}
                            />
                        </Card>
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
                </ProForm>
            </Drawer>
        </>
    );
};

export default UnitGroupEdit;
