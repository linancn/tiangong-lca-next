import LangTextItemFrom from '@/components/LangTextItem/from';
import LevelTextItemFrom from '@/components/LevelTextItem/from';
import { getSourceDetail, updateSource } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
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
    message
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import SourceSelectFrom from './select/from';

type Props = {
    id: string;
    buttonType: string;
    actionRef: React.MutableRefObject<ActionType | undefined>;
    setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const SourceEdit: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const formRefEdit = useRef<ProFormInstance>();
    const [activeTabKey, setActiveTabKey] = useState<string>('sourceInformation');
    const [fromData, setFromData] = useState<any>({});
    const [initData, setInitData] = useState<any>({});
    const [spinning, setSpinning] = useState(false);

    const handletFromData = (data: any) => {
        setFromData({ ...data });
    };

    const reload = useCallback(() => {
        actionRef.current?.reload();
    }, [actionRef]);

    const tabList = [
        { key: 'sourceInformation', tab: 'Source Information' },
        { key: 'administrativeInformation', tab: 'Administrative Information' },
    ];

    const sourceList: Record<string, React.ReactNode> = {
        sourceInformation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title={'Short Name'}>
                    <LangTextItemFrom
                        name={['sourceInformation', 'dataSetInformation', 'common:shortName']}
                        label="Short Name"
                    />
                </Card>
                <br />
                <Card size="small" title={'Classification'}>
                    <LevelTextItemFrom
                        name={[
                            'sourceInformation',
                            'dataSetInformation',
                            'classificationInformation',
                            'common:classification',
                            'common:class',
                        ]}
                        dataType={'Source'}
                        formRef={formRefEdit}
                        onData={handletFromData}
                    />
                </Card>
                <br />
                <Form.Item label="Source Citation" name={[
                    'sourceInformation',
                    'dataSetInformation',
                    'sourceCitation',
                ]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Publication Type" name={[
                    'sourceInformation',
                    'dataSetInformation',
                    'publicationType',
                ]}>
                    <Input />
                </Form.Item>
            </Space>
        ),
        administrativeInformation: (
            <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small" title={'Data Entry By'}>
                    <Form.Item label="Time Stamp" name={['administrativeInformation', 'dataEntryBy', 'common:timeStamp']}>
                        <Input />
                    </Form.Item>
                    <SourceSelectFrom
                        name={['administrativeInformation', 'dataEntryBy', 'common:referenceToDataSetFormat']}
                        label="Reference To Data Set Format"
                        lang="en"
                        formRef={formRefEdit} />
                </Card>
                <br />
                <Form.Item label='DataSet Version' name={['administrativeInformation', 'publicationAndOwnership', 'common:dataSetVersion']}>
                    <Input />
                </Form.Item>
            </Space>
        ),
    };

    const onTabChange = (key: string) => {
        setActiveTabKey(key);
    };

    const onEdit = useCallback(() => {
        setDrawerVisible(true);
    }, [setViewDrawerVisible]);

    const onReset = () => {
        setSpinning(true);
        formRefEdit.current?.resetFields();
        getSourceDetail(id).then(async (result) => {
            formRefEdit.current?.setFieldsValue({
                ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}), id: id,
            });
            setSpinning(false);
        });
    };

    useEffect(() => {
        if (drawerVisible) return;
        setSpinning(true);
        getSourceDetail(id).then(async (result: any) => {
            setInitData({ ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}), id: id });
            setFromData({ ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}), id: id });
            formRefEdit.current?.resetFields();
            formRefEdit.current?.setFieldsValue({
                ...genSourceFromData(result.data?.json?.sourceDataSet ?? {}), id: id,
            });
            setSpinning(false);
        });
    }, [drawerVisible]);

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
                title={<FormattedMessage id="options.edit" defaultMessage="Edit Source" />}
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
                <Spin spinning={spinning}>
                    <ProForm
                        formRef={formRefEdit}
                        initialValues={initData}
                        onValuesChange={(_, allValues) => {
                            setFromData({ ...fromData, [activeTabKey]: allValues[activeTabKey] ?? {} });
                        }}
                        submitter={{
                            render: () => {
                                return [];
                            },
                        }}
                        onFinish={async () => {
                            const result = await updateSource({ ...fromData });
                            if (result?.data) {
                                message.success(
                                    <FormattedMessage
                                        id="options.createsuccess"
                                        defaultMessage="Created Successfully!"
                                    />,
                                );
                                formRefEdit.current?.resetFields();
                                setDrawerVisible(false);
                                reload();
                            } else {
                                message.error(result?.error?.message);
                            }
                            return true;
                        }}
                    >
                        <Card
                            style={{ width: '100%' }}
                            // title="Card title"
                            // extra={<a href="#">More</a>}
                            tabList={tabList}
                            activeTabKey={activeTabKey}
                            onTabChange={onTabChange}
                        >
                            {sourceList[activeTabKey]}
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

export default SourceEdit;
