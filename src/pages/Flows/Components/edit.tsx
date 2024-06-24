import { getFlowsDetail, updateFlows } from '@/services/flows/api';
import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ProForm } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import type { ActionType } from '@ant-design/pro-table';
import FlowpropertiesSelect from '@/pages/Flowproperties/Components/select/from';
import {
    Button,
    Card,
    Drawer,
    Form,
    Input,
    // Select,
    Space,
    // Spin,
    Tooltip,
    Typography,
    message,
    Divider
} from 'antd';
import type { FC } from 'react';
import {
    // useCallback, useEffect,
    useRef, useState, React
} from 'react';
import { FormattedMessage } from 'umi';
import {
    classificationToJson,
    getLangList,
} from '@/services/general/util';


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
    const tabList = [
        { key: 'flowInformation', tab: 'Flow Information' },
        { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
        { key: 'flowProperties', tab: 'Flow Properties' },
    ];
    const onTabChange = (key: string) => {
        setActiveTabKey(key);
        formRefEdit.current?.setFieldsValue(fromData[key]);
    };
    const handleFlowPropertiesData = (keys: string[], data: any) => {
        // 创建一个新对象，以避免直接修改状态
        const newData = { ...fromData[activeTabKey] };
        // 递归地设置嵌套值
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }
        // 设置最后一个键的值
        current[keys[keys.length - 1]] = data;
        // 更新状态
        setFromData({ ...fromData, [activeTabKey]: newData });
    }
    function initFlowsInformation() {
        return (<Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title={'Flow Information'}>
                <Card size="small" title={'Data Set Information'}>
                    <Card size="small" title={'Name'}>
                        <LangTextItemFrom name={['dataSetInformation', 'name', 'baseName']} label="Base Name" />
                    </Card>
                    <br />
                    <Card size="small" title={'Synonyms'}>
                        <LangTextItemFrom name={['dataSetInformation', 'common:synonyms']} label="Synonyms" />
                    </Card>
                    <br />
                    <Card size="small" title={'Classification'}>
                        <LevelTextItemFrom name={['dataSetInformation', "classificationInformation", 'common:elementaryFlowCategorization', 'common:category']} />
                    </Card>
                    <br />
                    <Card size="small">
                        <Form.Item label='CAS Number' name={['dataSetInformation', 'CASNumber']}>
                            <Input />
                        </Form.Item>
                    </Card>
                    <br />
                    <Card size="small" title={'General Comment'}>
                        <LangTextItemFrom name={['dataSetInformation', "common:generalComment"]} label="General Comment" />
                    </Card>
                    <br />
                    <Card size="small">
                        <Form.Item label='EC Number' name={['dataSetInformation', 'common:other', 'ecn:ECNumber']}>
                            <Input />
                        </Form.Item>
                    </Card>
                    <br />
                </Card>
                <br />
                <Card size="small" title={'Quantitative Reference'}>
                    <Form.Item label='Reference To Reference Flow Property' name={['quantitativeReference', 'referenceToReferenceFlowProperty']}>
                        <Input />
                    </Form.Item>
                </Card>
            </Card>
        </Space>)
    }
    function initModellingAndValidation() {
        return (<Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title={'LCI Method'}>
                <Form.Item label="Type Of Data Set" name={['LCIMethod', 'typeOfDataSet']}>
                    <Input placeholder="@refObjectId" />
                </Form.Item>
            </Card>
            <br />
            <Card size="small" title={'Compliance Declarations'}>
                <Form.Item label="Ref Object Id" name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@refObjectId']}>
                    <Input placeholder="@refObjectId" />
                </Form.Item>
                <Form.Item label='Type' name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@type']}>
                    <Input placeholder="@type" />
                </Form.Item>
                <Form.Item label='URI' name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', '@uri']}>
                    <Input placeholder="@uri" />
                </Form.Item>
                <Divider orientationMargin="0" orientation="left" plain>
                    Short Description
                </Divider>
                <LangTextItemFrom
                    name={['complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem', 'common:shortDescription']}
                    label="Short Description"
                />
                <Form.Item label="Approval Of Overall Compliance" name={['complianceDeclarations', 'compliance', 'common:approvalOfOverallCompliance']}>
                    <Input />
                </Form.Item>
            </Card>
        </Space>)
    }
    function initAdministrativeInformation() {
        return (<Space direction="vertical" style={{ width: '100%' }}>
            <Card
                size="small"
                title={'Data Entry By'}
            >
                <Form.Item label="Time Stamp" name={['dataEntryBy', 'common:timeStamp']}>
                    <Input />
                </Form.Item>
                <Card
                    size="small"
                    title={'Reference To Data Set Format'}
                >
                    <Form.Item
                        label="Type"
                        name={[
                            'dataEntryBy',
                            'common:referenceToDataSetFormat',
                            '@type',
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="Ref Object Id"
                        name={[
                            'dataEntryBy',
                            'common:referenceToDataSetFormat',
                            '@refObjectId',
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        label="URI"
                        name={['dataEntryBy', 'common:referenceToDataSetFormat', '@uri']}
                    >
                        <Input />
                    </Form.Item>
                    <Divider orientationMargin="0" orientation="left" plain>
                        Short Description
                    </Divider>
                    <LangTextItemFrom
                        name={[
                            'dataEntryBy',
                            'common:referenceToDataSetFormat',
                            'common:shortDescription',
                        ]}
                        label="Short Description"
                    />
                </Card>

            </Card>

            <Card size="small" title={'Publication And Ownership'}>
                <Form.Item label="Data Set Version" name={['publicationAndOwnership', 'common:dataSetVersion']}>
                    <Input />
                </Form.Item>
                <Form.Item label="Permanent Data Set URI" name={['publicationAndOwnership', 'common:permanentDataSetURI']}>
                    <Input />
                </Form.Item>
            </Card>
        </Space>)
    }
    function initFlowPropertis() {
        return (<Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title={'Flow Property'}>
                <Form.Item label="Data Set Internal ID" name={['flowProperty', '@dataSetInternalID']}>
                    <Input />
                </Form.Item>
                <br />
                <FlowpropertiesSelect
                    label='Reference To Flow Property Data Set'
                    name={['flowProperty', 'referenceToFlowPropertyDataSet']}
                    lang={lang}
                    formRef={formRefEdit}
                    onData={handleFlowPropertiesData} />
                {/* <Card size="small" title={'Reference To Flow Property Data Set'}>
                    <Form.Item label="Type" name={['flowProperty', 'referenceToFlowPropertyDataSet', '@type']}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Ref Object Id" name={['flowProperty', 'referenceToFlowPropertyDataSet', '@refObjectId']}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="URI" name={['flowProperty', 'referenceToFlowPropertyDataSet', '@uri']}>
                        <Input />
                    </Form.Item>
                    <Divider orientationMargin="0" orientation="left" plain>
                        Short Description
                    </Divider>
                    <LangTextItemFrom
                        name={['flowProperty', 'referenceToFlowPropertyDataSet', 'common:shortDescription']}
                        label="Short Description"
                    />
                </Card> */}
                <br />
                <Form.Item label="Mean Value" name={['flowProperty', 'meanValue']}>
                    <Input />
                </Form.Item>
            </Card>
        </Space>)
    }
    const initFlowsInformationData = (data: any) => {
        let dataSetInformation = data?.['dataSetInformation'];
        let quantitativeReference = data?.['quantitativeReference'];
        return {
            dataSetInformation: {
                'common:UUID': dataSetInformation?.["common:UUID"],
                'name': {
                    "baseName": getLangList(dataSetInformation?.["name"]?.["baseName"]),
                },
                "common:synonyms": getLangList(dataSetInformation?.["common:synonyms"]),
                classificationInformation: {
                    'common:elementaryFlowCategorization': {
                        'common:category': classificationToJson(dataSetInformation?.classificationInformation?.['common:elementaryFlowCategorization']?.['common:category']),
                    },
                },
                "CASNumber": dataSetInformation?.["CASNumber"],
                'common:generalComment': getLangList(dataSetInformation?.["common:generalComment"]),
                "common:other": {
                    "ecn:ECNumber": dataSetInformation?.["common:other"]?.["ecn:ECNumber"]
                }
            },
            quantitativeReference: {
                referenceToReferenceFlowProperty: quantitativeReference?.['referenceToReferenceFlowProperty']
            }
        }
    }

    const initModellingAndValidationData = (data: any) => {
        let compliance = data?.complianceDeclarations.compliance
        let referenceToComplianceSystem = compliance?.['common:referenceToComplianceSystem']
        return {
            "LCIMethod": {
                "typeOfDataSet": data?.["LCIMethod"]?.["typeOfDataSet"]
            },
            complianceDeclarations: {
                compliance: {
                    'common:referenceToComplianceSystem': {
                        '@refObjectId': referenceToComplianceSystem?.['@refObjectId'],
                        '@type': referenceToComplianceSystem?.['@type'],
                        '@uri': referenceToComplianceSystem?.['@uri'],
                        'common:shortDescription': getLangList(referenceToComplianceSystem?.['common:shortDescription']),
                    },
                    'common:approvalOfOverallCompliance': compliance?.['common:approvalOfOverallCompliance'],
                },
            },
        }
    }
    const initAdministrativeInformationData = (data: any) => {
        return {
            dataEntryBy: {
                'common:timeStamp': data?.['dataEntryBy']?.['common:timeStamp'],
                'common:referenceToDataSetFormat': {
                    '@type': data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['@type'],
                    '@refObjectId': data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['@refObjectId'],
                    '@uri': data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['@uri'],
                    'common:shortDescription': getLangList(data?.['dataEntryBy']?.['common:referenceToDataSetFormat']?.['common:shortDescription']),
                },
            },
            publicationAndOwnership: {
                'common:dataSetVersion': data?.['publicationAndOwnership']?.['common:dataSetVersion'],
                'common:permanentDataSetURI': data?.['publicationAndOwnership']?.['common:permanentDataSetURI'],
            },
        }
    }
    const initFlowproperties = (data: any) => {
        let flowProperty = data?.["flowProperty"]
        let referenceToFlowPropertyDataSet = flowProperty?.["referenceToFlowPropertyDataSet"]
        return {
            "flowProperty": {
                "@dataSetInternalID": flowProperty?.["@dataSetInternalID"],
                "referenceToFlowPropertyDataSet": {
                    "@refObjectId": referenceToFlowPropertyDataSet?.["@refObjectId"],
                    "@type": referenceToFlowPropertyDataSet?.["@type"],
                    "@uri": referenceToFlowPropertyDataSet?.["@uri"],
                    "common:shortDescription": getLangList(referenceToFlowPropertyDataSet?.['common:shortDescription']),
                },
                "meanValue": flowProperty?.["meanValue"]
            }
        }
    }
    const contentList: Record<string, React.ReactNode> = {
        flowInformation: initFlowsInformation(),
        modellingAndValidation: initModellingAndValidation(),
        administrativeInformation: initAdministrativeInformation(),
        flowProperties: initFlowPropertis()
    }
    const initDataFn = (data: any) => {
        let flowInformation = initFlowsInformationData(data?.['flowInformation'])
        let modellingAndValidation = initModellingAndValidationData(data?.['modellingAndValidation'])
        let administrativeInformation = initAdministrativeInformationData(data?.['administrativeInformation'])
        let flowProperties = initFlowproperties(data?.['flowProperties'])
        return {
            flowInformation: flowInformation,
            modellingAndValidation: modellingAndValidation,
            administrativeInformation: administrativeInformation,
            flowProperties: flowProperties,
        }
    }
    const onEdit = () => {
        setDrawerVisible(true);
        getFlowsDetail(id).then(async (result: any) => {
            let initData = result.data?.json?.['flowDataSet']
            let data: { [key: string]: any } = initDataFn(initData)
            setFromData({ ...data });
            formRefEdit.current?.setFieldsValue(data?.[activeTabKey]);
        });
    }
    const onReset = () => {
        getFlowsDetail(id).then(async (result: any) => {
            let initData = result.data?.json?.['flowDataSet']
            let data: { [key: string]: any } = initDataFn(initData)
            setFromData({
                ...data
            });
            formRefEdit.current?.setFieldsValue(data?.[activeTabKey]);
        });
    };

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit" />}>
                {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
                ) : (
                    <Button onClick={onEdit}>
                        <FormattedMessage id="pages.table.option.edit" defaultMessage="Edit" />
                    </Button>
                )}
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit" />}
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
                            <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel" />
                        </Button>
                        <Button onClick={onReset}>
                            {' '}
                            <FormattedMessage id="pages.table.option.reset" defaultMessage="Reset" />
                        </Button>
                        <Button onClick={() => formRefEdit.current?.submit()} type="primary">
                            <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit" />
                        </Button>
                    </Space>
                }
            >
                <ProForm
                    formRef={formRefEdit}
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
                                    defaultMessage="Edit Successfully!"
                                />,
                            );
                            setDrawerVisible(false);
                            // setViewDrawerVisible(false);
                            setActiveTabKey('flowInformation')
                            actionRef.current?.reload();
                        } else {
                            message.error(updateResult?.error?.message);
                        }
                        return true;
                    }}
                    onValuesChange={async (changedValues, allValues) => {
                        setFromData({ ...fromData, [activeTabKey]: allValues })
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

            </Drawer>
        </>
    );
};

export default FlowsEdit;
