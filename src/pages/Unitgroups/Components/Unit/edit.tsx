import LangTextItemFrom from '@/components/LangTextItem/from';
import styles from '@/style/custom.less';
import { CloseOutlined, FormOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import {
    Button,
    Card,
    Drawer,
    Form,
    Input,
    Space,
    Switch,
    Tooltip,
    Typography,
} from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
    id: string;
    data: any;
    buttonType: string;
    actionRef: React.MutableRefObject<ActionType | undefined>;
    setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
    onData: (data: any) => void;
};
const UnitEdit: FC<Props> = ({ id, data, buttonType, actionRef, setViewDrawerVisible, onData }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [fromData, setFromData] = useState<any>({});
    const [initData, setInitData] = useState<any>({});
    const formRefEdit = useRef<ProFormInstance>();

    const onEdit = useCallback(() => {
        setDrawerVisible(true);
    }, [setViewDrawerVisible]);

    const onReset = () => {
        // setSpinning(true);
        formRefEdit.current?.resetFields();
        const filteredData = data?.find((item: any) => item['@dataSetInternalID'] === id) ?? {};
        setInitData(filteredData);
        formRefEdit.current?.setFieldsValue(filteredData);
        setFromData(filteredData);
        // setSpinning(false);
    };

    useEffect(() => {
        if (drawerVisible) return;
        onReset();
    }, [drawerVisible]);

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.table.option.edit" defaultMessage="Edit"></FormattedMessage>}>
                {buttonType === 'icon' ? (
                    <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit}></Button>
                ) : (
                    <Button onClick={onEdit}>
                        <FormattedMessage id="pages.table.option.edit" defaultMessage="Edit"></FormattedMessage>
                    </Button>
                )}
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="pages.unitgroup.unit.drawer.title.edit" defaultMessage="Unit Edit"></FormattedMessage>}
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
                maskClosable={false}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false);
                }}
                footer={
                    <Space size={'middle'} className={styles.footer_right}>
                        <Button onClick={() => setDrawerVisible(false)}>
                            {' '}
                            <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel" />
                        </Button>
                        <Button onClick={() => formRefEdit.current?.submit()} type="primary">
                            <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit" />
                        </Button>
                    </Space>
                }
            >
                <ProForm
                    formRef={formRefEdit}
                    initialValues={initData}
                    onValuesChange={(_, allValues) => {
                        setFromData(allValues ?? {});
                    }}
                    submitter={{
                        render: () => {
                            return [];
                        },
                    }}
                    onFinish={async () => {
                        onData(
                            data.map((item: any) => {
                                if (item['@dataSetInternalID'] === id) {
                                    return fromData;
                                }
                                return item;
                            }),
                        );
                        formRefEdit.current?.resetFields();
                        setDrawerVisible(false);
                        actionRef.current?.reload();
                        return true;
                    }}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Form.Item name={'@dataSetInternalID'} hidden>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Name" name={'name'}>
                            <Input />
                        </Form.Item>
                        <Card size="small" title={'General Comment'}>
                            <LangTextItemFrom name={'generalComment'} label={'General Comment'} />
                        </Card>
                        <Form.Item label="Mean Value" name={'meanValue'}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Quantitative Reference" name={'quantitativeReference'}>
                            <Switch></Switch>
                        </Form.Item>
                    </Space>
                </ProForm>
                <Typography>
                    <pre>{JSON.stringify(fromData, null, 2)}</pre>
                </Typography>
            </Drawer>
        </>
    );
};

export default UnitEdit;
