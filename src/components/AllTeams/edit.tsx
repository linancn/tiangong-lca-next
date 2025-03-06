import { editTeamMessage, getTeamMessageApi } from '@/services/teams/api';
import styles from '@/style/custom.less';
import { CloseOutlined, CopyOutlined, FormOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Button, Collapse, Drawer, Space, Spin, Tooltip, Typography, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import TeamForm from './form';

type Props = {
    id: string;
    buttonType: string;
    actionRef?: React.MutableRefObject<ActionType | undefined>;
    setViewDrawerVisible?: React.Dispatch<React.SetStateAction<boolean>>;
    type?: 'edit'
};

const TeamEdit: FC<Props> = ({
    id,
    buttonType,
    actionRef,
    setViewDrawerVisible,
    type = 'edit',
}) => {
    const [drawerVisible, setDrawerVisible] = useState(false);
    const formRefEdit = useRef<ProFormInstance>();
    const [spinning, setSpinning] = useState(false);
    const [initData, setInitData] = useState<any>({});
    const [fromData, setFromData] = useState<any>(undefined);
    const intl = useIntl();

    const onEdit = useCallback(() => {
        setDrawerVisible(true);
    }, [setViewDrawerVisible]);

    const handletFromData = () => {
        if (fromData) {
            const formValues = formRefEdit.current?.getFieldsValue() ?? {};
            setFromData({
                ...fromData,
                ...formValues,
            });
        }
    };

    const onReset = async () => {
        setSpinning(true);
        formRefEdit.current?.resetFields();
        const result = await getTeamMessageApi(id);
        if (result.data && result.data.length > 0) {
            const teamData = result.data[0];
            setInitData({ ...teamData });
            const formValues = {
                title: teamData.json?.title || [
                    { '#text': '', '@xml:lang': 'zh' },
                    { '#text': '', '@xml:lang': 'en' },
                ],
                description: teamData.json?.description || [
                    { '#text': '', '@xml:lang': 'zh' },
                    { '#text': '', '@xml:lang': 'en' },
                ],
                rank: teamData.rank,
                darkLogo: teamData.json?.darkLogo || '',
                lightLogo: teamData.json?.lightLogo || '',
            };

            formRefEdit.current?.setFieldsValue({ ...formValues });
            setFromData({
                ...formValues,
                json: {
                    ...teamData.json,
                },
            });
        }
        setSpinning(false);
    };

    useEffect(() => {
        if (!drawerVisible) return;
        onReset();
    }, [drawerVisible]);

    return (
        <>
            {buttonType === 'icon' ? (
                type === 'edit' ? (
                    <Tooltip title={<FormattedMessage id="pages.button.edit" defaultMessage="Edit" />}>
                        <Button shape="circle" icon={<FormOutlined />} size="small" onClick={onEdit} />
                    </Tooltip>
                ) : type === 'createVersion' ? (
                    <Tooltip
                        title={
                            <FormattedMessage id="pages.button.createVersion" defaultMessage="Create Version" />
                        }
                    >
                        <Button type="text" icon={<PlusOutlined />} size="small" onClick={onEdit} />
                    </Tooltip>
                ) : (
                    <Tooltip title={<FormattedMessage id="pages.button.copy" defaultMessage="Copy" />}>
                        <Button shape="circle" icon={<CopyOutlined />} onClick={onEdit} />
                    </Tooltip>
                )
            ) : (
                <Button onClick={onEdit}>
                    <FormattedMessage
                        id={buttonType.trim().length > 0 ? buttonType : 'component.allTeams.table.edit'}
                        defaultMessage="Edit"
                    />
                </Button>
            )}

            <Drawer
                getContainer={() => document.body}
                title={
                    type === 'edit' ? (
                        <FormattedMessage id="component.allTeams.drawer.title.edit" defaultMessage="Edit Team" />
                    ) : type === 'copy' ? (
                        <FormattedMessage id="component.allTeams.drawer.title.copy" defaultMessage="Copy Team" />
                    ) : (
                        <FormattedMessage
                            id="component.allTeams.drawer.title.createVersion"
                            defaultMessage="Create Version"
                        />
                    )
                }
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
                            <FormattedMessage id="pages.button.cancel" defaultMessage="Cancel" />
                        </Button>
                        <Button onClick={() => formRefEdit.current?.submit()} type="primary">
                            <FormattedMessage id="pages.button.save" defaultMessage="Save" />
                        </Button>
                    </Space>
                }
            >
                <Spin spinning={spinning}>
                    <ProForm
                        formRef={formRefEdit}
                        submitter={{
                            render: () => {
                                return [];
                            },
                        }}
                        initialValues={initData}
                        onFinish={async () => {
                            setSpinning(true);
                            const formValues = formRefEdit.current?.getFieldsValue() ?? {};
                            const rank = formValues.rank ? -1 : 0;
                            const jsonData = {
                                title: formValues.title,
                                description: formValues.description,
                                lightLogo: fromData?.lightLogo || '',
                                darkLogo: fromData?.darkLogo || '',
                            };
                            const updateResult = await editTeamMessage(id, jsonData, rank);
                            if (updateResult?.data) {
                                message.success(
                                    intl.formatMessage({
                                        id: 'component.allTeams.form.updateSuccess',
                                        defaultMessage: 'Team updated successfully!',
                                    }),
                                );
                                actionRef?.current?.reload();
                                setDrawerVisible(false);
                                if (setViewDrawerVisible) setViewDrawerVisible(false);
                            } else {
                                message.error(
                                    intl.formatMessage({
                                        id: 'component.allTeams.form.updateError',
                                        defaultMessage: 'Failed to update team information.',
                                    }),
                                );
                            }
                            setSpinning(false);
                            return true;
                        }}
                    >
                        <TeamForm
                            lightLogoProps={initData?.json?.lightLogo}
                            darkLogoProps={initData?.json?.darkLogo}
                            formRef={formRefEdit}
                            onData={handletFromData}
                        />
                    </ProForm>
                    <Collapse
                        items={[
                            {
                                key: '1',
                                label: 'JSON Data',
                                children: (
                                    <Typography>
                                        <pre>{JSON.stringify(fromData, null, 2)}</pre>
                                    </Typography>
                                ),
                            },
                        ]}
                    />
                </Spin>
            </Drawer>
        </>
    );
};

export default TeamEdit;
