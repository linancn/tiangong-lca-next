import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { ListPagination } from '@/services/general/data';
import { getUnitGroupDetail, updateUnitGroup } from '@/services/unitgroups/api';
import { classificationToJson, getLangList, } from '@/services/general/util';
import { UnitTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import ProTable from '@ant-design/pro-table';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType, ProColumns } from '@ant-design/pro-table';
import {
    Button,
    Card,
    DatePicker,
    Divider,
    Drawer,
    Form,
    Input,
    Popconfirm,
    Space,
    Tooltip,
    Typography,
    message,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';
import dayjs from 'dayjs';
import UnitCreate from './Unit/create';
import UnitEdit from './Unit/edit';

type Props = {
    id: string;
    buttonType: string;
    actionRef: React.MutableRefObject<ActionType | undefined>;
    setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const UnitGroupEdit: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const formRefEdit = useRef<ProFormInstance>();
    const [activeTabKey, setActiveTabKey] = useState<string>('unitGroupInformation');
    const [fromData, setFromData] = useState<any>({});
    const [unitDataSource, setUnitDataSource] = useState<readonly UnitTable[]>([]);

    const tabList = [
        { key: 'unitGroupInformation', tab: 'UnitGroup Information' },
        { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
        { key: 'units', tab: 'Units' },
    ];

    const setUnitGroupInformationData = (data: any) => {
        let dataSetInformation = data?.dataSetInformation;
        return {
            unitGroupInformation: {
                dataSetInformation: {
                    'common:UUID': dataSetInformation?.['common:UUID'],
                    'common:name': getLangList(dataSetInformation?.["common:name"]),
                    classificationInformation: {
                        'common:classification': {
                            'common:class': classificationToJson(dataSetInformation?.classificationInformation?.['common:classification']?.['common:class']),
                        },
                    },
                },
                quantitativeReference: {
                    referenceToReferenceUnit: data?.quantitativeReference?.referenceToReferenceUnit,
                }
            }
        };
    };
    const setModellingAndValidationData = (data: any) => {
        let referenceToComplianceSystem = data?.complianceDeclarations?.compliance?.['common:referenceToComplianceSystem'];
        return {
            modellingAndValidation: {
                complianceDeclarations: {
                    compliance: {
                        'common:referenceToComplianceSystem': {
                            '@refObjectId': referenceToComplianceSystem?.['@refObjectId'],
                            '@type': referenceToComplianceSystem?.['@type'],
                            '@uri': referenceToComplianceSystem?.['@uri'],
                            '@version': referenceToComplianceSystem?.['@version'],
                            'common:shortDescription': getLangList(referenceToComplianceSystem?.['common:shortDescription']),
                        },
                        'common:approvalOfOverallCompliance': data?.complianceDeclarations?.compliance?.['common:approvalOfOverallCompliance'],
                    }
                }
            }
        };
    };
    const setAdministrativeInformationData = (data: any) => {
        let referenceToDataSetFormat = data?.dataEntryBy?.['common:referenceToDataSetFormat'];
        return {
            administrativeInformation: {
                dataEntryBy: {
                    'common:timeStamp': dayjs(data?.dataEntryBy?.['common:timeStamp'], 'YYYY.MM.DD HH:mm:ss'),
                    'common:referenceToDataSetFormat': {
                        '@refObjectId': referenceToDataSetFormat?.['@refObjectId'],
                        '@type': referenceToDataSetFormat?.['@type'],
                        '@uri': referenceToDataSetFormat?.['@uri'],
                        '@version': referenceToDataSetFormat?.['@version'],
                        'common:shortDescription': getLangList(referenceToDataSetFormat?.['common:shortDescription']),
                    }
                },
                publicationAndOwnership: {
                    'common:dataSetVersion': data?.publicationAndOwnership?.['common:dataSetVersion'],
                }
            }
        };
    };
    const setUnitsData = (data: any) => {
        let compute_units = [];
        if (data?.unit) {
            compute_units = data?.unit.map((item: any) => {
                return {
                    id: v4(),
                    '@dataSetInternalID': item['@dataSetInternalID'],
                    name: item.name,
                    meanValue: item.meanValue,
                    selected: false,
                };
            });
        }
        return {
            units: {
                unit: compute_units,
            }
        };
    };
    const setData = (data: any) => {
        return {
            ...setUnitGroupInformationData(data?.unitGroupInformation),
            ...setModellingAndValidationData(data?.modellingAndValidation),
            ...setAdministrativeInformationData(data?.administrativeInformation),
            ...setUnitsData(data?.units),
        };
    };

    const createUnitData = (data: any) => {
        setUnitDataSource([...unitDataSource, data]);
    };

    const editUnitData = (data: any) => {
        const newUnitDataSource = unitDataSource.map((item: UnitTable) => {
            if (item.id === data.id) {
                return data;
            }
            return item;
        });
        setUnitDataSource(newUnitDataSource);
    };

    const unitColumns: ProColumns<UnitTable>[] = [
        {
            title: <FormattedMessage id="pages.table.index" defaultMessage="Index"></FormattedMessage>,
            valueType: 'index',
            search: false,
        },
        {
            title: <FormattedMessage id="pages.unitgroup.unit.dataSetInternalID" defaultMessage="DataSet Internal ID"></FormattedMessage>,
            dataIndex: '@dataSetInternalID',
            search: false,
        },
        {
            title: <FormattedMessage id="pages.unitgroup.unit.name" defaultMessage="Name"></FormattedMessage>,
            dataIndex: 'name',
            search: false,
        },
        {
            title: <FormattedMessage id="pages.unitgroup.unit.meanValue" defaultMessage="Mean Value"></FormattedMessage>,
            dataIndex: 'meanValue',
            search: false,
        },
        {
            title: <FormattedMessage id="pages.unitgroup.unit.selected" defaultMessage="Selected"></FormattedMessage>,
            dataIndex: 'selected',
            valueType: 'switch',
            search: false,
        },
        {
            title: <FormattedMessage id="pages.table.option" defaultMessage="Option"></FormattedMessage>,
            valueType: 'option',
            search: false,
            render: (_, row) => {
                return [
                    <Space size={'small'} key={0}>
                        <Tooltip title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit"></FormattedMessage>}>
                            <UnitEdit buttonType={'icon'} editData={row} onData={editUnitData}></UnitEdit>
                        </Tooltip>
                        <Tooltip title={<FormattedMessage id="pages.table.option.delete" defaultMessage="Delete"></FormattedMessage>}>
                            <Popconfirm title={<FormattedMessage id="pages.table.option.delete.confirm" defaultMessage="Delete"></FormattedMessage>}
                                onConfirm={() => {
                                    const newUnitDataSource = unitDataSource.filter((item: UnitTable) => item.id !== row.id);
                                    setUnitDataSource(newUnitDataSource);
                                }}>
                                <Button size={'small'} shape="circle" icon={<DeleteOutlined />}></Button>
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                ];
            }
        },
    ];

    const contentList: Record<string, React.ReactNode> = {
        unitGroupInformation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title={'Name'}>
                    <LangTextItemFrom name={['dataSetInformation', 'common:name']} label="Name"></LangTextItemFrom>
                </Card>
                <Card size="small" title={'Classification'}>
                    <LevelTextItemFrom name={['dataSetInformation', "classificationInformation", 'common:classification', 'common:class']}></LevelTextItemFrom>
                </Card>
                <Form.Item label="Reference To Reference Unit" name={['quantitativeReference', 'referenceToReferenceUnit']}>
                    <Input></Input>
                </Form.Item>
                <Form.Item label="ID" name={['dataSetInformation', 'common:UUID']} hidden>
                    <Input></Input>
                </Form.Item>
            </Space>
        ),
        modellingAndValidation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title={'Reference To Compliance System'}>
                    <Form.Item label="Ref Object Id" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@refObjectId']}>
                        <Input></Input>
                    </Form.Item>
                    <Form.Item label="Type" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@type']}>
                        <Input></Input>
                    </Form.Item>
                    <Form.Item label="URI" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@uri']}>
                        <Input></Input>
                    </Form.Item>
                    <Form.Item label="Version" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@version']}>
                        <Input></Input>
                    </Form.Item>
                    <Divider orientationMargin="0" orientation="left" plain>
                        Short Description
                    </Divider>
                    <LangTextItemFrom label="Name" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', 'common:shortDescription']}></LangTextItemFrom>
                </Card>
                <Form.Item label="Approval Of Overall Compliance" name={['complianceDeclarations', 'compliance', 'common:approvalOfOverallCompliance']}>
                    <Input></Input>
                </Form.Item>
            </Space>
        ),
        administrativeInformation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item label="TimeStamp" name={['dataEntryBy', 'common:timeStamp']}>
                    <DatePicker showTime></DatePicker>
                </Form.Item>
                <Card size="small" title={'Reference To DataSet Format'}>
                    <Form.Item label="Ref Object Id" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@refObjectId']}>
                        <Input></Input>
                    </Form.Item>
                    <Form.Item label="Type" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@type']}>
                        <Input></Input>
                    </Form.Item>
                    <Form.Item label="URI" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@uri']}>
                        <Input></Input>
                    </Form.Item>
                    <Form.Item label="Version" name={['dataEntryBy', 'common:referenceToDataSetFormat', '@version']}>
                        <Input></Input>
                    </Form.Item>
                    <Divider orientationMargin="0" orientation="left" plain>
                        Short Description
                    </Divider>
                    <LangTextItemFrom label="Name" name={['dataEntryBy', 'common:referenceToDataSetFormat', 'common:shortDescription']}></LangTextItemFrom>
                </Card>
                <Form.Item label="DataSet Version" name={['publicationAndOwnership', 'common:dataSetVersion']}>
                    <Input></Input>
                </Form.Item>
            </Space>
        ),
        units: (
            <ProTable<UnitTable, ListPagination>
                search={{
                    defaultCollapsed: false,
                }}
                pagination={{
                    showSizeChanger: false,
                    pageSize: 10,
                }}
                toolBarRender={() => {
                    return [<UnitCreate key={0} onData={createUnitData}></UnitCreate>];
                }}
                dataSource={unitDataSource}
                columns={unitColumns}
            ></ProTable>
        ),
    };

    const onTabChange = (key: string) => {
        setActiveTabKey(key);
        if (key === 'units') setUnitDataSource(fromData[key]?.unit ?? []);
        formRefEdit.current?.setFieldsValue(fromData[key]);
    };

    const onEdit = useCallback(() => {
        setDrawerVisible(true);
        getUnitGroupDetail(id).then((result: any) => {
            let unitGroupDataSet = result.data?.json?.unitGroupDataSet;
            let data: { [key: string]: any } = setData(unitGroupDataSet);
            setFromData(data);
            setUnitDataSource(data?.units?.unit ?? []);
            formRefEdit.current?.setFieldsValue(data?.[activeTabKey]);
        });
    }, [actionRef, id, setViewDrawerVisible]);

    const onReset = () => {
        getUnitGroupDetail(id).then((result: any) => {
            let unitGroupDataSet = result.data?.json?.unitGroupDataSet;
            let data: { [key: string]: any } = setData(unitGroupDataSet);
            setFromData(data);
            setUnitDataSource(data?.units?.unit ?? []);
            formRefEdit.current?.setFieldsValue(data?.[activeTabKey]);
        });
    };

    useEffect(() => {
        setFromData({ ...fromData, units: { unit: unitDataSource } });
    }, [unitDataSource]);

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit"></FormattedMessage>}>
                {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit}></Button>
                ) : (
                    <Button size="small" onClick={onEdit}>
                        <FormattedMessage id="pages.table.option.edit" defaultMessage="Edit"></FormattedMessage>
                    </Button>
                )}
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="pages.unitgroup.drawer.title.edit" defaultMessage="Edit"></FormattedMessage>}
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
                maskClosable={true}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                }}
                footer={
                    <Space size={'middle'} className={styles.footer_right}>
                        <Button onClick={() => {
                            setDrawerVisible(false);
                        }}>
                            <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel"></FormattedMessage>
                        </Button>
                        <Button onClick={onReset}>
                            <FormattedMessage id="pages.table.option.reset" defaultMessage="Reset"></FormattedMessage>
                        </Button>
                        <Button onClick={() => {
                            formRefEdit.current?.submit();
                        }} type="primary">
                            <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit"></FormattedMessage>
                        </Button>
                    </Space>
                }
            >
                <ProForm
                    formRef={formRefEdit}
                    onValuesChange={(changedValues, allValues) => {
                        setFromData({ ...fromData, [activeTabKey]: allValues ?? {} });
                    }}
                    submitter={{
                        render: () => {
                            return [];
                        },
                    }}
                    onFinish={async () => {
                        const updateResult = await updateUnitGroup({ ...fromData, id });
                        if (updateResult?.data) {
                            message.success(
                                <FormattedMessage
                                    id="options.createsuccess"
                                    defaultMessage="Created Successfully!">
                                </FormattedMessage>
                            );
                            setDrawerVisible(false);
                            setViewDrawerVisible(false);
                            setActiveTabKey('unitGroupInformation');
                            actionRef.current?.reload();
                        } else {
                            message.error(updateResult?.error?.message);
                        }
                        return true;
                    }}
                >
                    <Card
                        style={{ width: '100%' }}
                        tabList={tabList}
                        activeTabKey={activeTabKey}
                        onTabChange={onTabChange}
                    >
                        {contentList[activeTabKey]}
                    </Card>
                    <Form.Item noStyle shouldUpdate>
                        {() => (
                            <Typography>
                                <pre>{JSON.stringify(fromData, null, 2)}</pre>
                            </Typography>
                        )}
                    </Form.Item>
                </ProForm>
            </Drawer >
        </>
    );
};

export default UnitGroupEdit;
