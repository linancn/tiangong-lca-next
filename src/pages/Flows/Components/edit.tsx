import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import FlowpropertiesSelect from '@/pages/Flowproperties/Components/select/from';
import SourceSelectFrom from '@/pages/Sources/Components/select/from';
import { getFlowDetail, updateFlows } from '@/services/flows/api';
import { genFlowFromData } from '@/services/flows/util';
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
    Space,
    Spin,
    Tooltip,
    Typography,
    message,
} from 'antd';
import type { FC } from 'react';
import {
    useEffect,
    useRef, useState,
} from 'react';
import { FormattedMessage } from 'umi';


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
    const [initData, setInitData] = useState<any>({});
    const [spinning, setSpinning] = useState(false);

    const onTabChange = (key: string) => {
        setActiveTabKey(key);
    };

    const handletFromData = () => {
        setFromData({
            ...fromData,
            [activeTabKey]: formRefEdit.current?.getFieldsValue()?.[activeTabKey] ?? {},
        });
    };

    const tabList = [
        { key: 'flowInformation', tab: 'Flow Information' },
        { key: 'modellingAndValidation', tab: 'Modelling And Validation' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
        { key: 'flowProperties', tab: 'Flow Property' },
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
                            formRef={formRefEdit}
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
                        formRef={formRefEdit}
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
                        formRef={formRefEdit}
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
                    formRef={formRefEdit}
                    onData={handletFromData} />
                <br />
                <Form.Item label="Mean Value" name={['flowProperties', 'flowProperty', 'meanValue']}>
                    <Input />
                </Form.Item>
                {/* </Card> */}
            </Space>
        ),
    };

    const onEdit = () => {
        setDrawerVisible(true);
    }

    const onReset = () => {
        setSpinning(true);
        formRefEdit.current?.resetFields();
        getFlowDetail(id).then(async (result: any) => {
            formRefEdit.current?.setFieldsValue({
                ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id,
            });
            setSpinning(false);
        });
    };

    useEffect(() => {
        if (drawerVisible === false) return;
        setSpinning(true);
        getFlowDetail(id).then(async (result: any) => {
            setInitData({ ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id });
            setFromData({ ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id });
            formRefEdit.current?.resetFields();
            formRefEdit.current?.setFieldsValue({
                ...genFlowFromData(result.data?.json?.flowDataSet ?? {}), id: id,
            });
            setSpinning(false);
        });
    }, [drawerVisible]);

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
                {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
                ) : (
                    <Button onClick={onEdit}>
                        <FormattedMessage id="pages.button.edit" defaultMessage="Edit" />
                    </Button>
                )}
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}
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
                            <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
                        </Button>
                        <Button onClick={onReset}>
                            {' '}
                            <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
                        </Button>
                        <Button onClick={() => formRefEdit.current?.submit()} type="primary">
                            <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
                        </Button>
                    </Space>
                }
            >
                <Spin spinning={spinning}>
                    <ProForm
                        formRef={formRefEdit}
                        initialValues={initData}
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
                                setActiveTabKey('flowInformation')
                                actionRef.current?.reload();
                            } else {
                                message.error(updateResult?.error?.message);
                            }
                            return true;
                        }}
                        onValuesChange={(_, allValues) => {
                            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
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
                    </ProForm>
                    <Typography>
                        <pre>{JSON.stringify(fromData, null, 2)}</pre>
                    </Typography>
                </Spin>
            </Drawer>
        </>
    );
};

export default FlowsEdit;
