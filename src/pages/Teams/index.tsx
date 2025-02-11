import { PageContainer, ProForm, ProFormInstance, ProTable, ProColumns } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Flex, Form, Spin, Tabs, Upload, message, Select, Input, Table, Button, Tooltip, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { PlusOutlined, DeleteOutlined, CrownOutlined, UserOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { getTeamMembersApi, editTeamMessage, getTeamMessageApi, updateRoleApi, delRoleApi } from '@/services/teams/api';
import { ListPagination } from '@/services/general/data';
import { TeamMemberTable } from '@/services/teams/data';
import AddMemberModal from './Components/AddMemberModal';
import { getUserRoles } from '@/services/roles/api';


const Team = () => {
    const [activeTabKey, setActiveTabKey] = useState('info');
    const [teamId, setTeamId] = useState('');
    const [userRole, setUserRole] = useState('');

    const initialUseTeamId = async () => {
        const { data, success } = await getUserRoles();
        if (success && data.length) {
            setTeamId(data[0].team_id);
            setUserRole(data[0].role);
            console.log('团队id', data[0].team_id, '用户角色', data[0].role)
        }
    }

    useEffect(() => {
        initialUseTeamId();
    }, []);

    const intl = useIntl();

    const onTabChange = (key: string) => {
        setActiveTabKey(key);
    };

    const renderTeamInfoForm = () => {
        const formRefEdit = useRef<ProFormInstance>();
        const [lightLogo, setLightLogo] = useState<UploadFile[]>([]);
        const [darkLogo, setDarkLogo] = useState<UploadFile[]>([]);
        const [teamInfoSpinning, setTeamInfoSpinning] = useState(false);

        const getTeamInfo = async (id: string) => {
            setTeamInfoSpinning(true);
            const { data, error } = await getTeamMessageApi(id);
            if (error) {
                message.error(
                    intl.formatMessage({
                        id: 'pages.team.getDetailError',
                        defaultMessage: 'Failed to get details, please refresh!',
                    }),
                );
            } else {
                // console.log('团队信息详情', data);
                const { title, description } = data[0]?.json;
                let _formData: any = {};
                title?.forEach((t: {
                    '#text': string,
                    '@xml:lang': string
                }) => {
                    _formData[`title-${t['@xml:lang']}`] = t['#text'];
                });
                description?.forEach((d: {
                    '#text': string,
                    '@xml:lang': string
                }) => {
                    _formData[`description-${d['@xml:lang']}`] = d['#text'];
                });
                // console.log('转化成表单值', _formData)
                formRefEdit.current?.setFieldsValue(_formData)
            };
            setTeamInfoSpinning(false);
        };

        useEffect(() => {
            teamId && getTeamInfo(teamId);
        }, [teamId]);

        const getParams = (input: Record<string, string>) => {
            const result: Record<string, Array<{ '#text': string, '@xml:lang': string }>> = {};

            Object.entries(input).forEach(([key, value]) => {
                const [field, lang] = key.split('-');

                if (!result[field]) {
                    result[field] = [];
                }

                result[field].push({
                    '#text': value,
                    '@xml:lang': lang
                });
            });

            return result;
        };
        return <Flex gap="middle" vertical style={{ maxWidth: '50%', minWidth: '200px' }}>
            <Spin spinning={teamInfoSpinning}>
                <ProForm
                    formRef={formRefEdit}
                    submitter={{
                        resetButtonProps: false,
                        render: (_, dom) => (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>{dom}</div>
                        ),
                    }}
                    onFinish={async (values) => {
                        setTeamInfoSpinning(true);
                        // console.log('填写的表单值', values)
                        try {
                            if (!teamId) return;
                            const params = getParams(values);
                            const { data, error } = await editTeamMessage(teamId, params);
                            if (error) {
                                message.error(
                                    intl.formatMessage({
                                        id: 'pages.team.updateError',
                                        defaultMessage: 'Failed to update team information.',
                                    }),
                                );
                            } else {
                                message.success(
                                    intl.formatMessage({
                                        id: 'pages.team.editsuccess',
                                        defaultMessage: 'Edit Successfully!',
                                    }),
                                );
                            }

                        } catch (error) {
                            console.log(error)
                        }
                        setTeamInfoSpinning(false);
                    }}
                >
                    <Form.Item
                        label={intl.formatMessage({
                            id: 'pages.team.info.title',
                            defaultMessage: 'Team Name',
                        })}
                        style={{ marginBottom: 0 }}
                    >
                        <Form.Item
                            style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}
                        >
                            <Select value="zh" disabled />
                        </Form.Item>

                        <Form.Item
                            name="title-zh"
                            style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                            rules={[
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'pages.team.info.title.required',
                                        defaultMessage: 'Please input team name!',
                                    }),
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}
                        >
                            <Select value="en" disabled />
                        </Form.Item>
                        <Form.Item
                            name="title-en"
                            style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                            rules={[
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'pages.team.info.title.required',
                                        defaultMessage: 'Please input team name!',
                                    }),
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>
                    </Form.Item>

                    <Form.Item
                        label={intl.formatMessage({
                            id: 'pages.team.info.description',
                            defaultMessage: 'Team Description',
                        })}
                        style={{ marginBottom: 0 }}
                    >
                        <Form.Item
                            style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}
                        >
                            <Select value="zh" disabled />
                        </Form.Item>
                        <Form.Item
                            name="description-zh"
                            style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                            rules={[
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'pages.team.info.description.required',
                                        defaultMessage: 'Please input team description!',
                                    }),
                                },
                            ]}
                        >
                            <Input.TextArea rows={1} />
                        </Form.Item>
                        <Form.Item
                            style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}
                        >
                            <Select value="en" disabled />
                        </Form.Item>
                        <Form.Item
                            name="description-en"
                            style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                            rules={[
                                {
                                    required: true,
                                    message: intl.formatMessage({
                                        id: 'pages.team.info.description.required',
                                        defaultMessage: 'Please input team description!',
                                    }),
                                },
                            ]}
                        >
                            <Input.TextArea rows={1} />
                        </Form.Item>
                    </Form.Item>

                    <Form.Item
                        name="lightLogo"
                        label={intl.formatMessage({
                            id: 'pages.team.info.lightLogo',
                            defaultMessage: 'Light Logo',
                        })}
                    >
                        <Upload
                            listType="picture-card"
                            fileList={lightLogo}
                            onChange={({ fileList }) => setLightLogo(fileList)}
                        >
                            {lightLogo.length < 1 && <PlusOutlined />}
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        name="darkLogo"
                        label={intl.formatMessage({
                            id: 'pages.team.info.darkLogo',
                            defaultMessage: 'Dark Logo',
                        })}
                    >
                        <Upload
                            listType="picture-card"
                            fileList={darkLogo}
                            onChange={({ fileList }) => setDarkLogo(fileList)}
                        >
                            {darkLogo.length < 1 && <PlusOutlined />}
                        </Upload>
                    </Form.Item>
                </ProForm>
            </Spin>
        </Flex>
    };

    const renderTeamMembersForm = () => {
        const [membersLoading, setMembersLoading] = useState(false);
        const [addModalVisible, setAddModalVisible] = useState(false);
        const actionRef = useRef<any>(null);

        useEffect(() => {
            teamId && actionRef.current?.reload();
        }, [teamId]);

        const updateRole = async (teamId: string, userId: string, role: 'admin' | 'member') => {
            // console.log('成为管理员或者成员', teamId, userId, role)
            try {
                const { data, error } = await updateRoleApi(teamId, userId, role);
                if (error) {
                    message.error(
                        intl.formatMessage({
                            id: 'teams.members.actionError',
                            defaultMessage: '设置失败!',
                        }),
                    );
                } else {
                    message.success(
                        intl.formatMessage({
                            id: 'teams.members.actionSuccess',
                            defaultMessage: '设置成功!',
                        }),
                    );
                    actionRef.current?.reload();
                }
            } catch (error) {
                console.error(error);
            }
        };

        const columns: ProColumns<TeamMemberTable>[] = [
            {
                title: intl.formatMessage({ id: 'teams.members.email' }),
                dataIndex: 'email',
                key: 'email'
            },
            {
                title: intl.formatMessage({ id: 'teams.members.role' }),
                dataIndex: 'role',
                key: 'role',
                render: (_, record) => (
                    <span>
                        {intl.formatMessage({
                            id: record.role === 'admin' ? 'teams.members.role.admin' : record.role === "is_invited" ? 'teams.members.role.invited' : record.role === 'owner' ? 'teams.members.role.owner' : 'teams.members.role.member'
                        })}
                    </span>
                ),
            },
            {
                title: intl.formatMessage({ id: 'teams.members.actions' }),
                key: 'actions',
                render: (_: any, record: TeamMemberTable) => (
                    <Flex gap="small">
                        {
                            record.role !== 'owner' && (<Tooltip title={intl.formatMessage({ id: 'teams.members.delete' })}>
                                <Button
                                    type="text"
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                        Modal.confirm({
                                            title: intl.formatMessage({ id: 'teams.members.deleteConfirm' }),
                                            onOk: async () => {
                                                try {
                                                    const { data, error } = await delRoleApi(record.team_id, record.user_id);
                                                    if (error) {
                                                        message.error(
                                                            intl.formatMessage({
                                                                id: 'teams.members.actionError',
                                                                defaultMessage: '操作失败!',
                                                            }),
                                                        );
                                                    } else {
                                                        message.success(
                                                            intl.formatMessage({
                                                                id: 'teams.members.actionSuccess',
                                                                defaultMessage: '操作成功!',
                                                            }),
                                                        );
                                                    }
                                                } catch (error) {
                                                    console.error(error);
                                                }
                                            },
                                        });
                                    }}
                                />
                            </Tooltip>)
                        }
                        {record.role !== 'admin' && record.role !== "is_invited" && userRole === 'owner'&&record.role!=='owner' && (
                            <Tooltip title={intl.formatMessage({ id: 'teams.members.setAdmin' })}>
                                <Button
                                    type="text"
                                    icon={<CrownOutlined />}
                                    onClick={() => updateRole(record?.team_id, record?.user_id, 'admin')}
                                />
                            </Tooltip>
                        )}
                        {record.role === 'admin' && userRole === 'owner' && (
                            <Tooltip title={intl.formatMessage({ id: 'teams.members.setMember' })}>
                                <Button
                                    type="text"
                                    icon={<UserOutlined />}
                                    onClick={() => updateRole(record?.team_id, record?.user_id, 'member')}
                                />
                            </Tooltip>
                        )}
                    </Flex>
                ),
            },
        ];

        return (
            <div>
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Tooltip title={intl.formatMessage({ id: 'teams.members.add' })}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setAddModalVisible(true)}
                        />
                    </Tooltip>
                </div>
                <ProTable<TeamMemberTable, ListPagination>
                    loading={membersLoading}
                    columns={columns}
                    rowKey="user_id"
                    search={false}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                    }}
                    toolBarRender={false}
                    request={async (
                        params: {
                            pageSize: number;
                            current: number;
                        },
                        sort,
                    ) => {
                        try {
                            if (!teamId) {
                                return
                            }
                            setMembersLoading(true);
                            const { data, success } = await getTeamMembersApi(teamId);

                            if (success) {
                                return {
                                    data,
                                    success,
                                    total: data?.length || 0
                                }
                            } else {
                                message.error(
                                    intl.formatMessage({
                                        id: 'pages.team.members.getError',
                                        defaultMessage: '获取团队成员失败!',
                                    }),
                                );
                                return {
                                    data: data || [],
                                    success: true,
                                    total: data?.length || 0
                                };
                            }
                        } catch (error) {
                            console.error(error);
                        } finally {
                            setMembersLoading(false);
                        }
                    }}
                    actionRef={actionRef}
                />
                <AddMemberModal
                    open={addModalVisible}
                    onCancel={() => setAddModalVisible(false)}
                    teamId={teamId}
                    onSuccess={() => {
                        // 刷新表格数据
                        actionRef.current?.reload();
                    }}
                />
            </div>
        );
    };

    return (
        <PageContainer
            title={<FormattedMessage id="menu.account.team" defaultMessage="Team Management" />}
        >
            <Tabs
                activeKey={activeTabKey}
                onChange={onTabChange}
                tabPosition="left"
                items={[
                    {
                        key: 'info',
                        label: intl.formatMessage({
                            id: 'pages.team.tabs.info',
                            defaultMessage: 'Team Information',
                        }),
                        children: renderTeamInfoForm(),
                    },
                    {
                        key: 'members',
                        label: intl.formatMessage({
                            id: 'pages.team.tabs.members',
                            defaultMessage: 'Team Members',
                        }),
                        children: renderTeamMembersForm(),
                    },
                ]}
            />
        </PageContainer>
    );
};

export default Team; 