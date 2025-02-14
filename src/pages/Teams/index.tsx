import { ListPagination } from '@/services/general/data';
import { getUserRoles } from '@/services/roles/api';
import {
  delRoleApi,
  editTeamMessage,
  getTeamMembersApi,
  getTeamMessageApi,
  updateRoleApi,
  uploadLogoApi,
} from '@/services/teams/api';
import { TeamMemberTable } from '@/services/teams/data';
import { CrownOutlined, DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProColumns,
  ProForm,
  ProFormInstance,
  ProTable,
} from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import {
  Button,
  Flex,
  Form,
  Input,
  message,
  Modal,
  Select,
  Spin,
  Tabs,
  Tooltip,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useRef, useState } from 'react';
import AddMemberModal from './Components/AddMemberModal';
const LogoBaseUrl = 'https://qgzvkongdjqiiamzbbts.supabase.co/storage/v1/object/public/sys-files/';

const Team = () => {
  const [activeTabKey, setActiveTabKey] = useState('info');
  const [teamId, setTeamId] = useState('');
  const [userRole, setUserRole] = useState('');

  const formRefEdit = useRef<ProFormInstance>();
  const [lightLogo, setLightLogo] = useState('');
  const [darkLogo, setDarkLogo] = useState('');
  const [teamInfoSpinning, setTeamInfoSpinning] = useState(false);
  const [lightLogoSpinning, setLightLogoSpinning] = useState(false);
  const [darkLogoSpinning, setDarkLogoSpinning] = useState(false);

  const [membersLoading, setMembersLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const actionRef = useRef<any>(null);

  const intl = useIntl();

  const initialUseTeamId = async () => {
    const { data, success } = await getUserRoles();
    if (success && data.length) {
      setTeamId(data[0].team_id);
      setUserRole(data[0].role);
    }
  };

  useEffect(() => {
    initialUseTeamId();
  }, []);

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
      const { title, description } = data[0]?.json;
      let _formData: any = {};
      title?.forEach((t: { '#text': string; '@xml:lang': string }) => {
        _formData[`title-${t['@xml:lang']}`] = t['#text'];
      });
      description?.forEach((d: { '#text': string; '@xml:lang': string }) => {
        _formData[`description-${d['@xml:lang']}`] = d['#text'];
      });
      setLightLogo(data[0]?.json.lightLogo);
      setDarkLogo(data[0]?.json.darkLogo);
      formRefEdit.current?.setFieldsValue({
        ..._formData,
        darkLogo: LogoBaseUrl + data[0]?.json.darkLogo,
        lightLogo: LogoBaseUrl + data[0]?.json.lightLogo,
      });
    }
    setTeamInfoSpinning(false);
  };

  useEffect(() => {
    if ((userRole === 'admin' || userRole === 'owner') && teamId) {
      getTeamInfo(teamId);
      actionRef.current?.reload();
    }
  }, [teamId, userRole]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const renderTeamInfoForm = () => {
    const getParams = (input: Record<string, string>) => {
      const result: Record<string, Array<{ '#text': string; '@xml:lang': string }>> = {};

      Object.entries(input).forEach(([key, value]) => {
        const [field, lang] = key.split('-');

        if (!result[field]) {
          result[field] = [];
        }

        result[field].push({
          '#text': value,
          '@xml:lang': lang,
        });
      });

      return result;
    };

    const removeLogo = async (type: 'lightLogo' | 'darkLogo') => {
      if (type === 'lightLogo') {
        setLightLogo('');
      } else {
        setDarkLogo('');
      }
    };

    const uploadLogo = async (fileList: UploadFile[], type: 'lightLogo' | 'darkLogo') => {
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj;
        if (file) {
          if (!file.type.startsWith('image/')) {
            message.error(
              intl.formatMessage({
                id: 'teams.logo.typeError',
                defaultMessage: 'Only image files can be uploaded!',
              }),
            );
            if (type === 'lightLogo') {
              setLightLogo('');
            } else {
              setDarkLogo('');
            }
            setLightLogoSpinning(false);
            setDarkLogoSpinning(false);
            return;
          }
          if (/[\u4e00-\u9fa5]/.test(file.name)) {
            message.error(
              intl.formatMessage({
                id: 'teams.logo.nameError',
                defaultMessage: 'File name cannot contain Chinese characters!',
              }),
            );
            if (type === 'lightLogo') {
              setLightLogo('');
            } else {
              setDarkLogo('');
            }
            setLightLogoSpinning(false);
            setDarkLogoSpinning(false);
            return;
          }
          try {
            const { data } = await uploadLogoApi(file.name, file);
            if (type === 'lightLogo') {
              setLightLogo(data.path);
            } else {
              setDarkLogo(data.path);
            }
          } catch (error) {
            console.log('upload error', error);
          } finally {
            setLightLogoSpinning(false);
            setDarkLogoSpinning(false);
          }
        }
      }
    };
    return (
      <Flex gap="middle" vertical style={{ maxWidth: '50%', minWidth: '200px' }}>
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
              try {
                if (!teamId) return;
                const params = getParams(values);
                const { error } = await editTeamMessage(teamId, { ...params, darkLogo, lightLogo });
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
                console.log(error);
              }
              setTeamInfoSpinning(false);
            }}
          >
            <Form.Item
              label={<FormattedMessage id="pages.team.info.title" defaultMessage="Team Name" />}
              style={{ marginBottom: 0 }}
            >
              <Form.Item style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}>
                <Select value="zh" disabled />
              </Form.Item>

              <Form.Item
                name="title-zh"
                style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.team.info.title.required"
                        defaultMessage="Please input team name!"
                      />
                    ),
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}>
                <Select value="en" disabled />
              </Form.Item>
              <Form.Item
                name="title-en"
                style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.team.info.title.required"
                        defaultMessage="Please input team name!"
                      />
                    ),
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Form.Item>

            <Form.Item
              label={
                <FormattedMessage
                  id="pages.team.info.description"
                  defaultMessage="Team Description"
                />
              }
              style={{ marginBottom: 0 }}
            >
              <Form.Item style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}>
                <Select value="zh" disabled />
              </Form.Item>
              <Form.Item
                name="description-zh"
                style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.team.info.description.required"
                        defaultMessage="Please input team description!"
                      />
                    ),
                  },
                ]}
              >
                <Input.TextArea rows={1} />
              </Form.Item>
              <Form.Item style={{ display: 'inline-block', width: '30%', marginRight: '8px' }}>
                <Select value="en" disabled />
              </Form.Item>
              <Form.Item
                name="description-en"
                style={{ display: 'inline-block', width: 'calc(70% - 8px)' }}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id="pages.team.info.description.required"
                        defaultMessage="Please input team description!"
                      />
                    ),
                  },
                ]}
              >
                <Input.TextArea rows={1} />
              </Form.Item>
            </Form.Item>

            <Form.Item
              name="lightLogo"
              label={
                <FormattedMessage id="pages.team.info.lightLogo" defaultMessage="Light Logo" />
              }
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
                {lightLogo.length === 0 && (
                  <Spin spinning={lightLogoSpinning}>
                    <PlusOutlined />
                  </Spin>
                )}
              </Upload>
            </Form.Item>

            <Form.Item
              name="darkLogo"
              label={<FormattedMessage id="pages.team.info.darkLogo" defaultMessage="Dark Logo" />}
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
                {darkLogo.length === 0 && (
                  <Spin spinning={darkLogoSpinning}>
                    <PlusOutlined />
                  </Spin>
                )}
              </Upload>
            </Form.Item>
          </ProForm>
        </Spin>
      </Flex>
    );
  };

  const renderTeamMembersForm = () => {
    const updateRole = async (teamId: string, userId: string, role: 'admin' | 'member') => {
      try {
        const { error } = await updateRoleApi(teamId, userId, role);
        if (error) {
          message.error(
            intl.formatMessage({
              id: 'teams.members.actionError',
              defaultMessage: 'Action failed!',
            }),
          );
        } else {
          message.success(
            intl.formatMessage({
              id: 'teams.members.actionSuccess',
              defaultMessage: 'Action success!',
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
        title: <FormattedMessage id="teams.members.email" defaultMessage="Email" />,
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: <FormattedMessage id="teams.members.role" defaultMessage="Role" />,
        dataIndex: 'role',
        key: 'role',
        render: (_, record) => (
          <span>
            {record.role === 'admin' ? (
              <FormattedMessage id="teams.members.role.admin" defaultMessage="Admin" />
            ) : record.role === 'is_invited' ? (
              <FormattedMessage id="teams.members.role.invited" defaultMessage="Invited" />
            ) : record.role === 'owner' ? (
              <FormattedMessage id="teams.members.role.owner" defaultMessage="Owner" />
            ) : (
              <FormattedMessage id="teams.members.role.member" defaultMessage="Member" />
            )}
          </span>
        ),
      },
      {
        title: <FormattedMessage id="teams.members.actions" defaultMessage="Actions" />,
        key: 'actions',
        render: (_: any, record: TeamMemberTable) => (
          <Flex gap="small">
            {
              <Tooltip
                title={<FormattedMessage id="teams.members.delete" defaultMessage="Delete" />}
              >
                <Button
                  disabled={record.role === 'owner' || record.role === 'admin'}
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: intl.formatMessage({ id: 'teams.members.deleteConfirm' }),
                      onOk: async () => {
                        try {
                          const { error } = await delRoleApi(record.team_id, record.user_id);
                          if (error) {
                            message.error(
                              intl.formatMessage({
                                id: 'teams.members.actionError',
                                defaultMessage: 'Action failed!',
                              }),
                            );
                          } else {
                            message.success(
                              intl.formatMessage({
                                id: 'teams.members.actionSuccess',
                                defaultMessage: 'Action success!',
                              }),
                            );
                          }
                          actionRef.current?.reload();
                        } catch (error) {
                          console.error(error);
                        }
                      },
                    });
                  }}
                />
              </Tooltip>
            }
            {
              <Tooltip
                title={<FormattedMessage id="teams.members.setAdmin" defaultMessage="Set Admin" />}
              >
                <Button
                  disabled={
                    record.role === 'is_invited' ||
                    record.role === 'admin' ||
                    userRole !== 'owner' ||
                    record.role === 'owner'
                  }
                  type="text"
                  icon={<CrownOutlined />}
                  onClick={() => updateRole(record?.team_id, record?.user_id, 'admin')}
                />
              </Tooltip>
            }
            {
              <Tooltip
                title={
                  <FormattedMessage id="teams.members.setMember" defaultMessage="Set Member" />
                }
              >
                <Button
                  disabled={record.role !== 'admin' || userRole === 'admin'}
                  type="text"
                  icon={<UserOutlined />}
                  onClick={() => updateRole(record?.team_id, record?.user_id, 'member')}
                />
              </Tooltip>
            }
          </Flex>
        ),
      },
    ];

    return (
      <div>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Tooltip title={<FormattedMessage id="teams.members.add" defaultMessage="Add" />}>
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
          rowKey="email"
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
              if (userRole === 'member' || userRole === 'is_invited' || !teamId) {
                return {
                  data: [],
                  success: true,
                  total: 0,
                };
              }
              setMembersLoading(true);
              const { data, success } = await getTeamMembersApi(params, sort, teamId);

              return {
                data: data || [],
                success: success || false,
                total: data?.length || 0,
              };
            } catch (error) {
              console.error(error);
              return {
                data: [],
                success: false,
                total: 0,
              };
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
            label: <FormattedMessage id="pages.team.tabs.info" defaultMessage="Team Information" />,
            children: renderTeamInfoForm(),
          },
          {
            key: 'members',
            label: <FormattedMessage id="pages.team.tabs.members" defaultMessage="Team Members" />,
            children: renderTeamMembersForm(),
          },
        ]}
      />
    </PageContainer>
  );
};

export default Team;
