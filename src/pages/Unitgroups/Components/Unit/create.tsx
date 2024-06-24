import { UnitTable } from '@/services/unitgroups/data';
import styles from '@/style/custom.less';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import type { ProFormInstance } from '@ant-design/pro-form';
import ProForm from '@ant-design/pro-form';
import {
    Button,
    Drawer,
    Form,
    Input,
    Space,
    Switch,
    Tooltip,
    Typography,
} from 'antd';
import type { FC } from 'react';
import { useRef, useState } from 'react';
import { FormattedMessage } from 'umi';
import { v4 } from 'uuid';

type Props = {
    onData: (data: any) => void;
};
const UnitCreate: FC<Props> = ({ onData }) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const formRefCreate = useRef<ProFormInstance>();
    const defaultData = {
        id: v4(),
        '@dataSetInternalID': '',
        name: '',
        meanValue: '',
        selected: false,
    };
    const [fromData, setFromData] = useState<UnitTable>(() => defaultData);

    return (
        <>
            <Tooltip title={<FormattedMessage id="pages.table.option.create" defaultMessage="Create"></FormattedMessage>}>
                <Button
                    size={'middle'}
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setDrawerVisible(true);
                    }}
                ></Button>
            </Tooltip>
            <Drawer
                title={<FormattedMessage id="pages.unitgroup.unit.drawer.title.create" defaultMessage="Unit Create"></FormattedMessage>}
                width="600px"
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
                        <Button onClick={() => {
                            setDrawerVisible(false);
                        }}>
                            <FormattedMessage id="pages.table.option.cancel" defaultMessage="Cancel"></FormattedMessage>
                        </Button>
                        <Button onClick={() => {
                            formRefCreate.current?.submit();
                        }} type="primary">
                            <FormattedMessage id="pages.table.option.submit" defaultMessage="Submit"></FormattedMessage>
                        </Button>
                    </Space>
                }
            >
                <ProForm
                    formRef={formRefCreate}
                    initialValues={defaultData}
                    onValuesChange={(changedValues, allValues) => {
                        setFromData(allValues);
                    }}
                    submitter={{
                        render: () => {
                            return [];
                        },
                    }}
                    onFinish={async (values) => {
                        onData({
                            id: v4(),
                            ...values,
                        });
                        setFromData(defaultData);
                        formRefCreate.current?.resetFields();
                        setDrawerVisible(false);
                        return true;
                    }}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Form.Item label="DataSet Internal ID" name={'@dataSetInternalID'}>
                            <Input></Input>
                        </Form.Item>
                        <Form.Item label="Name" name={'name'}>
                            <Input></Input>
                        </Form.Item>
                        <Form.Item label="Mean Value" name={'meanValue'}>
                            <Input></Input>
                        </Form.Item>
                        <Form.Item label="Selected" name={'selected'}>
                            <Switch></Switch>
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate>
                            {() => (
                                <Typography>
                                    <pre>{JSON.stringify(fromData, null, 2)}</pre>
                                </Typography>
                            )}
                        </Form.Item>
                    </Space>
                </ProForm>
            </Drawer>
        </>
    );
};

export default UnitCreate;
