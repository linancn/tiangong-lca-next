import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import FlowpropertiesSelect from '@/pages/Flowproperties/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import { createFlows } from '@/services/flows/api';
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
    Space,
    Tooltip,
    Typography,
    message,
} from 'antd';
import type { FC } from 'react';
import React, {
    useCallback,
    useEffect,
    useRef, useState
} from 'react';
import { FormattedMessage } from 'umi';

type Props = {
    lang: string,
    actionRef: React.MutableRefObject<ActionType | undefined>;
};
const FlowsCreate: FC<Props> = ({ lang, actionRef }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const formRefCreate = useRef<ProFormInstance>();
    const [activeTabKey, setActiveTabKey] = useState<string>('flowInformation');
    const [fromData, setFromData] = useState<any>({});

    const reload = useCallback(() => {
        actionRef.current?.reload();
    }, [actionRef]);

    const onTabChange = (key: string) => {
        setActiveTabKey(key);
    };

    const handletFromData = () => {
        setFromData({
            ...fromData,
            [activeTabKey]: formRefCreate.current?.getFieldsValue()?.[activeTabKey] ?? {},
        });
    };

    const tabList = [
        { key: 'flowInformation', tab: 'Flow Information' },
        { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
        { key: 'flowProperties', tab: 'Flow Properties' },
    ];

    const contentList: Record<string, React.ReactNode> = {
        flowInformation:
            (
                <Space direction="vertical" style={{ width: '100%' }}>
                    {/* <Card size="small" title={'Data Set Information'}> */}
                    <Card size="small" title={'Base Name'}>
                        <LangTextItemFrom name={['flowInformation', 'dataSetInformation', 'name', 'baseName']} label="Base Name" />
                    </Card>
                    <br />
                    <Card size="small" title={'Synonyms'}>
                        <LangTextItemFrom name={['flowInformation', 'dataSetInformation', 'common:synonyms']} label="Synonyms" />
                    </Card>
                    <br />
                    <Card size="small" title={'Classification'}>
                        <LevelTextItemFrom
                            dataType='Flow'
                            formRef={formRefCreate}
                            onData={handletFromData}
                            name={['flowInformation', 'dataSetInformation', "classificationInformation", 'common:elementaryFlowCategorization', 'common:category']} />
                    </Card>
                    <br />
                    <Form.Item label='CAS Number' name={['flowInformation', 'dataSetInformation', 'CASNumber']}>
                        <Input />
                    </Form.Item>
                    <br />
                    <Card size="small" title={'General Comment'}>
                        <LangTextItemFrom name={['flowInformation', 'dataSetInformation', "common:generalComment"]} label="General Comment" />
                    </Card>
                    <br />
                    <Form.Item label='EC Number' name={['flowInformation', 'dataSetInformation', 'common:other', 'ecn:ECNumber']}>
                        <Input />
                    </Form.Item>
                    {/* </Card> */}
                    {/* <br />
                    <Card size="small" title={'Quantitative Reference'}>
                        <Form.Item label='Reference To Reference Flow Property' name={['flowInformation', 'quantitativeReference', 'referenceToReferenceFlowProperty']}>
                            <Input />
                        </Form.Item>
                    </Card> */}
                </Space>
            ),
        modellingAndValidation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                {/* <Card size="small" title={'LCI Method'}> */}
                <Form.Item label="LCI Method: Type Of Data Set" name={['modellingAndValidation', 'LCIMethod', 'typeOfDataSet']}>
                    <Input />
                </Form.Item>
                {/* </Card> */}
                <br />
                <Card size="small" title={'Compliance Declarations'}>
                    <SourceSelectFrom
                        lang={lang}
                        formRef={formRefCreate}
                        label={'Reference To Compliance System'}
                        name={['modellingAndValidation', 'complianceDeclarations', 'compliance', 'common:referenceToComplianceSystem']}
                        onData={handletFromData} />
                    <br />
                    <Form.Item label="Approval Of Overall Compliance" name={['modellingAndValidation', 'complianceDeclarations', 'compliance', 'common:approvalOfOverallCompliance']}>
                        <Input />
                    </Form.Item>
                </Card>
            </Space>
        ),
        administrativeInformation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Card
                    size="small"
                    title={'Data Entry By'}
                >
                    <Form.Item label="Time Stamp" name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}>
                        <Input />
                    </Form.Item>
                    <SourceSelectFrom
                        lang={lang}
                        formRef={formRefCreate}
                        label={'Reference To Data Set Format'}
                        name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
                        onData={handletFromData} />
                </Card>

                <Card size="small" title={'Publication And Ownership'}>
                    <Form.Item label="Data Set Version" name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Permanent Data Set URI" name={['administrativeInformation', 'publicationAndOwnership', 'common:permanentDataSetURI']}>
                        <Input />
                    </Form.Item>
                </Card>
            </Space>
        ),
        flowProperties: (
            <Space direction="vertical" style={{ width: '100%' }}>
                {/* <Card size="small" title={'Flow Property'}> */}
                {/* <Form.Item label="Data Set Internal ID" name={['flowProperties', 'flowProperty', '@dataSetInternalID']}>
                    <Input />
                </Form.Item>
                <br /> */}
                <FlowpropertiesSelect
                    label='Reference To Flow Property Data Set'
                    name={['flowProperties', 'flowProperty', 'referenceToFlowPropertyDataSet']}
                    lang={lang}
                    formRef={formRefCreate}
                    onData={handletFromData} />
                <br />
                <Form.Item label="Mean Value" name={['flowProperties', 'flowProperty', 'meanValue']}>
                    <Input />
                </Form.Item>
                {/* </Card> */}
            </Space>
        ),
    };

    useEffect(() => {
        if (drawerVisible === false) return;
        setFromData({});
        formRefCreate.current?.resetFields();
        formRefCreate.current?.setFieldsValue({});
    }, [drawerVisible]);

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.table.option.create" defaultMessage="Create" />}>
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
                title={<FormattedMessage id="pages.table.option.create" defaultMessage="Flows Create" />}
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
                        <Button onClick={() => setDrawerVisible(false)}>
                            {' '}
                            <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel" />
                        </Button>
                        <Button onClick={() => formRefCreate.current?.submit()} type="primary">
                            <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit" />
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
                    onValuesChange={(_, allValues) => {
                        setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
                    }}
                    onFinish={async () => {
                        const result = await createFlows({ ...fromData });
                        if (result.data) {
                            message.success(
                                <FormattedMessage
                                    id="pages.flows.createsuccess"
                                    defaultMessage="Created Successfully!"
                                />,
                            );
                            formRefCreate.current?.resetFields();
                            setDrawerVisible(false);
                            setActiveTabKey('flowInformation');
                            setFromData({});
                            reload();
                        } else {
                            message.error(result.error.message);
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
            </Drawer>
        </>
    );
};
export default FlowsCreate;
