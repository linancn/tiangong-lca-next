import { uploadLogoApi } from '@/services/teams/api';
import { PlusOutlined } from '@ant-design/icons';
import { ProFormInstance } from '@ant-design/pro-components';
import { Card, Form, Input, Space, Spin, Switch, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { FC, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

const LogoBaseUrl = 'https://qgzvkongdjqiiamzbbts.supabase.co/storage/v1/object/public/sys-files/';

type Props = {
    formRef: React.RefObject<ProFormInstance> | React.MutableRefObject<ProFormInstance | undefined>;
    onData: () => void;
    lightLogoProps: string;
    darkLogoProps: string;
};

const TeamForm: FC<Props> = ({ onData, lightLogoProps, darkLogoProps }) => {
    const [lightLogo, setLightLogo] = useState<string>('');
    const [darkLogo, setDarkLogo] = useState<string>('');
    const [lightLogoSpinning, setLightLogoSpinning] = useState<boolean>(false);
    const [darkLogoSpinning, setDarkLogoSpinning] = useState<boolean>(false);
    const intl = useIntl();

    useEffect(() => {
        setLightLogo(lightLogoProps);
        setDarkLogo(darkLogoProps);
    }, [lightLogoProps, darkLogoProps]);

    const removeLogo = async (type: 'lightLogo' | 'darkLogo') => {
        if (type === 'lightLogo') {
            setLightLogo('');
        } else {
            setDarkLogo('');
        }
        onData();
    };

    const uploadLogo = async (fileList: UploadFile[], type: 'lightLogo' | 'darkLogo') => {
        if (fileList.length === 0) {
            if (type === 'lightLogo') {
                setLightLogo('');
                setLightLogoSpinning(false);
            } else {
                setDarkLogo('');
                setDarkLogoSpinning(false);
            }
            return;
        }

        const file = fileList[0];
        if (file.originFileObj) {
            try {
                const result = await uploadLogoApi(file.name || 'logo', file.originFileObj);
                if (result.data?.path) {
                    if (type === 'lightLogo') {
                        setLightLogo(result.data.path);
                        setLightLogoSpinning(false);
                    } else {
                        setDarkLogo(result.data.path);
                        setDarkLogoSpinning(false);
                    }
                    onData();
                }
            } catch (error) {
                message.error(
                    intl.formatMessage({
                        id: 'pages.team.uploadError',
                        defaultMessage: 'Failed to upload logo.',
                    }),
                );
                if (type === 'lightLogo') {
                    setLightLogoSpinning(false);
                } else {
                    setDarkLogoSpinning(false);
                }
            }
        }
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card size="small" title={<FormattedMessage id="component.allTeams.form.title" defaultMessage="Team Name" />}>
                <Form.Item style={{ marginBottom: 0 }}>
                    <Form.Item name={['title', 0, '@xml:lang']} style={{ display: 'inline-block', width: '120px', marginRight: '8px' }}>
                        <Input value="简体中文" disabled />
                    </Form.Item>
                    <Form.Item
                        name={['title', 0, '#text']}
                        style={{ display: 'inline-block', width: 'calc(70%)' }}
                        rules={[
                            {
                                required: true,
                                message: (
                                    <FormattedMessage
                                        id="component.allTeams.form.title.required"
                                        defaultMessage="Please input team name!"
                                    />
                                ),
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    <br />
                    <Form.Item name={['title', 1, '@xml:lang']} style={{ display: 'inline-block', width: '120px', marginRight: '8px' }}>
                        <Input value="English" disabled />
                    </Form.Item>
                    <Form.Item
                        name={['title', 1, '#text']}
                        style={{ display: 'inline-block', width: 'calc(70%)' }}
                        rules={[
                            {
                                required: true,
                                message: (
                                    <FormattedMessage
                                        id="component.allTeams.form.title.required"
                                        defaultMessage="Please input team name!"
                                    />
                                ),
                            },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                </Form.Item>
            </Card>

            <Card size="small" title={<FormattedMessage id="component.allTeams.form.description" defaultMessage="Team Description" />}>
                <Form.Item style={{ marginBottom: 0 }}>
                    <Form.Item name={['description', 0, '@xml:lang']} style={{ display: 'inline-block', width: '120px', marginRight: '8px' }}>
                        <Input value="简体中文" disabled />
                    </Form.Item>
                    <Form.Item
                        name={['description', 0, '#text']}
                        style={{ display: 'inline-block', width: 'calc(70%)' }}
                        rules={[
                            {
                                required: true,
                                message: (
                                    <FormattedMessage
                                        id="component.allTeams.form.description.required"
                                        defaultMessage="Please input team description!"
                                    />
                                ),
                            },
                        ]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <br />
                    <Form.Item name={['description', 1, '@xml:lang']} style={{ display: 'inline-block', width: '120px', marginRight: '8px' }}>
                        <Input value="English" disabled />
                    </Form.Item>
                    <Form.Item
                        name={['description', 1, '#text']}
                        style={{ display: 'inline-block', width: 'calc(70%)' }}
                        rules={[
                            {
                                required: true,
                                message: (
                                    <FormattedMessage
                                        id="component.allTeams.form.description.required"
                                        defaultMessage="Please input team description!"
                                    />
                                ),
                            },
                        ]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form.Item>
            </Card>

            <Card size="small" title={<FormattedMessage id="component.allTeams.form.public" defaultMessage="Public Display" />}>
                <Form.Item
                    name="rank"
                    valuePropName="checked"
                    getValueProps={(value) => ({
                        checked: value !== -1
                    })}
                    normalize={(value) => {
                        console.log('value', value);
                        return value ? 0 : -1;
                    }}>
                    <Switch />
                </Form.Item>
            </Card>

            <Card size="small" title={<FormattedMessage id="component.allTeams.logo.title" defaultMessage="Team Logo" />}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Form.Item
                        label={<FormattedMessage id="component.allTeams.form.lightLogo" defaultMessage="Light Logo" />}
                        labelCol={{ span: 4 }}
                        name="lightLogo"
                    >
                        <Upload
                            beforeUpload={() => {
                                setLightLogoSpinning(true);
                                return true;
                            }}
                            onRemove={() => removeLogo('lightLogo')}
                            maxCount={1}
                            listType="picture-card"
                            fileList={
                                lightLogo
                                    ? [
                                        {
                                            uid: '-1',
                                            name: 'logo',
                                            status: 'done',
                                            url: LogoBaseUrl + lightLogo,
                                        },
                                    ]
                                    : []
                            }
                            onChange={({ fileList }) => uploadLogo(fileList, 'lightLogo')}
                        >
                            {lightLogo?.length === 0 && (
                                <Spin spinning={lightLogoSpinning}>
                                    <PlusOutlined />
                                </Spin>
                            )}
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        label={<FormattedMessage id="component.allTeams.form.darkLogo" defaultMessage="Dark Logo" />}
                        labelCol={{ span: 4 }}
                        name="darkLogo"
                    >
                        <Upload
                            beforeUpload={() => {
                                setDarkLogoSpinning(true);
                                return true;
                            }}
                            onRemove={() => removeLogo('darkLogo')}
                            maxCount={1}
                            listType="picture-card"
                            fileList={
                                darkLogo
                                    ? [
                                        {
                                            uid: '-1',
                                            name: 'logo',
                                            status: 'done',
                                            url: LogoBaseUrl + darkLogo,
                                        },
                                    ]
                                    : []
                            }
                            onChange={({ fileList }) => uploadLogo(fileList, 'darkLogo')}
                        >
                            {darkLogo?.length === 0 && (
                                <Spin spinning={darkLogoSpinning}>
                                    <PlusOutlined />
                                </Spin>
                            )}
                        </Upload>
                    </Form.Item>
                </Space>
            </Card>
        </Space>
    );
};

export default TeamForm; 