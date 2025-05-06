import LangTextItemForm from '@/components/LangTextItem/form';
import RequiredMark from '@/components/RequiredMark';
import { ListPagination } from '@/services/general/data';
import {
  createTeamMessage,
  delRoleApi,
  getUserRoles,
  reInvitedApi,
  updateRoleApi,
} from '@/services/roles/api';
import {
  editTeamMessage,
  getTeamMembersApi,
  getTeamMessageApi,
  uploadLogoApi,
} from '@/services/teams/api';
import { TeamMemberTable } from '@/services/teams/data';
import {
  CrownOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProColumns,
  ProForm,
  ProFormInstance,
  ProTable,
} from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl } from '@umijs/max';
import {
  Button,
  Flex,
  Form,
  message,
  Modal,
  Spin,
  Switch,
  Tabs,
  theme,
  Tooltip,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import AddMemberModal from './Components/AddMemberModal';

const LogoBaseUrl = 'https://qgzvkongdjqiiamzbbts.supabase.co/storage/v1/object/public/sys-files/';

const Team = () => {
  const { token } = theme.useToken();
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

  const [titleError, setTitleError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);

  const [rank, setRank] = useState(-1);
  const actionRef = useRef<any>(null);
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const action = searchParams.get('action');

  const intl = useIntl();

  const initialUseTeamId = async () => {
    const { data, success } = await getUserRoles();
    if (success && data.length) {
      setTeamId(data[0].team_id);
      setUserRole(data[0].role);
    }
  };

  useEffect(() => {
    if (action === 'create') {
    }
    if (action === 'edit') {
      initialUseTeamId();
    }
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
    } else if (data.length > 0) {
      const { title, description } = data[0]?.json ?? {};
      setRank(data[0]?.rank);

      const formData: any = {
        title: title || [],
        description: description || [],
        rank: data[0]?.rank,
      };

      setLightLogo(data[0]?.json?.lightLogo);
      setDarkLogo(data[0]?.json?.darkLogo);
      formRefEdit.current?.setFieldsValue({
        ...formData,
        darkLogo: LogoBaseUrl + data[0]?.json?.darkLogo,
        lightLogo: LogoBaseUrl + data[0]?.json?.lightLogo,
      });
    }
    setTeamInfoSpinning(false);
  };

  useEffect(() => {
    if (teamId && userRole !== 'rejected') {
      getTeamInfo(teamId);
      actionRef.current?.reload();
    }
  }, [teamId, userRole]);

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const renderTeamInfoForm = () => {
    const getParams = (input: Record<string, any>) => {
      const result: Record<string, any> = {};

      Object.entries(input).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          result[key] = value;
        } else if (key !== 'rank' && key !== 'lightLogo' && key !== 'darkLogo') {
          const [field, lang] = key.split('-');

          if (!result[field]) {
            result[field] = [];
          }

          result[field].push({
            '#text': value,
            '@xml:lang': lang,
          });
        } else {
          result[key] = value;
        }
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

    const editTeamInfo = async (values: any) => {
      const { rank } = values;
      delete values.rank;
      const params = getParams(values);
      const { error } = await editTeamMessage(teamId, { ...params, darkLogo, lightLogo }, rank);
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
    };

    const createTeamInfo = async (values: any) => {
      const { rank } = values;
      delete values.rank;
      const params = getParams(values);
      const error = await createTeamMessage(v4(), { ...params, darkLogo, lightLogo }, rank);
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
            id: 'pages.team.createSuccess',
            defaultMessage: 'Edit Successfully!',
          }),
        );
        history.replace(`/team?action=edit`);
        window.location.reload();
      }
    };

    const submitTeamInfo = async (values: any) => {
      try {
        setTeamInfoSpinning(true);
        if (action === 'edit') {
          if (!teamId) return;
          await editTeamInfo(values);
        }
        if (action === 'create') {
          await createTeamInfo(values);
        }
      } catch (error) {
        console.log(error);
      }
      setTeamInfoSpinning(false);
    };

    return (
      <Flex gap='small' vertical style={{ maxWidth: '50%', minWidth: '200px' }}>
        <Spin spinning={teamInfoSpinning}>
          <ProForm
            disabled={
              (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') || rank > 0
            }
            formRef={formRefEdit}
            submitter={{
              resetButtonProps: false,
              render: (_, dom) => (
                <div style={{ display: 'flex', justifyContent: 'center' }}>{dom}</div>
              ),
            }}
            onFinish={(values) => submitTeamInfo(values)}
          >
            <Form.Item
              label={
                <RequiredMark
                  label={<FormattedMessage id='pages.team.info.title' defaultMessage='Team Name' />}
                  showError={titleError}
                />
              }
              style={{ marginBottom: 0 }}
            >
              <LangTextItemForm
                name='title'
                label={<FormattedMessage id='pages.team.info.title' defaultMessage='Team Name' />}
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id='pages.team.info.title.required'
                        defaultMessage='Please input team name!'
                      />
                    ),
                  },
                ]}
                setRuleErrorState={setTitleError}
              />
            </Form.Item>
            <Form.Item
              label={
                <RequiredMark
                  label={
                    <FormattedMessage
                      id='pages.team.info.description'
                      defaultMessage='Team Description'
                    />
                  }
                  showError={descriptionError}
                />
              }
              style={{ marginBottom: 0 }}
            >
              <LangTextItemForm
                name='description'
                label={
                  <FormattedMessage
                    id='pages.team.info.description'
                    defaultMessage='Team Description'
                  />
                }
                rules={[
                  {
                    required: true,
                    message: (
                      <FormattedMessage
                        id='pages.team.info.description.required'
                        defaultMessage='Please input team description!'
                      />
                    ),
                  },
                ]}
                setRuleErrorState={setDescriptionError}
              />
            </Form.Item>
            <Form.Item
              name='rank'
              label={<FormattedMessage id='pages.team.info.public' defaultMessage='Public' />}
              valuePropName='checked'
              getValueProps={(value) => ({
                checked: value !== -1,
              })}
              normalize={(value) => {
                console.log(value);
                return value ? 0 : -1;
              }}
            >
              <Switch
                disabled={
                  (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') || rank > 0
                }
              />
            </Form.Item>
            {/* <Flex gap="middle" > */}
            <Form.Item
              name='lightLogo'
              label={
                <FormattedMessage id='pages.team.info.lightLogo' defaultMessage='Light Logo' />
              }
            >
              <Upload
                disabled={
                  (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') || rank > 0
                }
                beforeUpload={() => {
                  setLightLogoSpinning(true);
                  return true;
                }}
                onRemove={() => removeLogo('lightLogo')}
                maxCount={1}
                listType='picture-card'
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
              name='darkLogo'
              label={<FormattedMessage id='pages.team.info.darkLogo' defaultMessage='Dark Logo' />}
            >
              <Upload
                disabled={
                  (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') || rank > 0
                }
                beforeUpload={() => {
                  setDarkLogoSpinning(true);
                  return true;
                }}
                onRemove={() => removeLogo('darkLogo')}
                maxCount={1}
                listType='picture-card'
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
            {/* </Flex> */}
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
        title: <FormattedMessage id='teams.members.email' defaultMessage='Email' />,
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: <FormattedMessage id='teams.members.memberName' defaultMessage='Member Name' />,
        dataIndex: 'display_name',
        key: 'display_name',
      },
      {
        title: <FormattedMessage id='teams.members.role' defaultMessage='Role' />,
        dataIndex: 'role',
        key: 'role',
        render: (_, record) => (
          <span>
            {record.role === 'admin' ? (
              <FormattedMessage id='teams.members.role.admin' defaultMessage='Admin' />
            ) : record.role === 'is_invited' ? (
              <FormattedMessage id='teams.members.role.invited' defaultMessage='Invited' />
            ) : record.role === 'owner' ? (
              <FormattedMessage id='teams.members.role.owner' defaultMessage='Owner' />
            ) : record.role === 'rejected' ? (
              <FormattedMessage id='teams.members.role.rejected' defaultMessage='Rejected' />
            ) : (
              <FormattedMessage id='teams.members.role.member' defaultMessage='Member' />
            )}
          </span>
        ),
      },
      {
        title: <FormattedMessage id='teams.members.actions' defaultMessage='Actions' />,
        key: 'actions',
        render: (_: any, record: TeamMemberTable) => (
          <Flex gap='small'>
            {
              <Tooltip
                title={<FormattedMessage id='teams.members.delete' defaultMessage='Delete' />}
              >
                <Button
                  disabled={
                    !(record.role !== 'owner' && (userRole === 'owner' || userRole === 'admin'))
                  }
                  shape='circle'
                  size='small'
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      okButtonProps: {
                        type: 'primary',
                        style: { backgroundColor: token.colorPrimary },
                      },
                      cancelButtonProps: {
                        style: { borderColor: token.colorPrimary, color: token.colorPrimary },
                      },
                      title: intl.formatMessage({ id: 'teams.members.deleteConfirm.title' }),
                      content: intl.formatMessage({ id: 'teams.members.deleteConfirm.content' }),
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
                title={<FormattedMessage id='teams.members.setAdmin' defaultMessage='Set Admin' />}
              >
                <Button
                  shape='circle'
                  size='small'
                  disabled={!(record.role === 'member' && userRole === 'owner')}
                  icon={<CrownOutlined />}
                  onClick={() => updateRole(record?.team_id, record?.user_id, 'admin')}
                />
              </Tooltip>
            }
            {
              <Tooltip
                title={
                  <FormattedMessage id='teams.members.setMember' defaultMessage='Set Member' />
                }
              >
                <Button
                  disabled={!(record.role === 'admin' && userRole === 'owner')}
                  shape='circle'
                  size='small'
                  icon={<UserOutlined />}
                  onClick={() => updateRole(record?.team_id, record?.user_id, 'member')}
                />
              </Tooltip>
            }
            {
              <Tooltip
                title={<FormattedMessage id='teams.members.reInvite' defaultMessage='re-invite' />}
              >
                <Button
                  disabled={
                    !(record.role === 'rejected' && (userRole === 'admin' || userRole === 'owner'))
                  }
                  shape='circle'
                  size='small'
                  icon={<UserAddOutlined />}
                  onClick={async () => {
                    const error = await reInvitedApi(record?.user_id, record?.team_id);
                    if (error) {
                      message.error(
                        intl.formatMessage({
                          id: 'teams.members.actionError',
                          defaultMessage: 'Action failed!',
                        }),
                      );
                    } else {
                      actionRef.current?.reload();
                      message.success(
                        intl.formatMessage({
                          id: 'teams.members.actionSuccess',
                          defaultMessage: 'Action success!',
                        }),
                      );
                    }
                  }}
                />
              </Tooltip>
            }
          </Flex>
        ),
      },
    ];

    return (
      <>
        <ProTable<TeamMemberTable, ListPagination>
          headerTitle={
            <>
              <FormattedMessage id='menu.account.team' defaultMessage='My Team' /> /{' '}
              <FormattedMessage id='pages.team.tabs.members' defaultMessage='Members Message' />
            </>
          }
          toolBarRender={() => {
            return [
              <Tooltip
                key={0}
                title={<FormattedMessage id='teams.members.add' defaultMessage='Add' />}
              >
                <Button
                  type='text'
                  disabled={!(userRole === 'admin' || userRole === 'owner')}
                  icon={<PlusOutlined />}
                  onClick={() => setAddModalVisible(true)}
                />
              </Tooltip>,
            ];
          }}
          loading={membersLoading}
          columns={columns}
          rowKey='email'
          search={false}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          request={async (
            params: {
              pageSize: number;
              current: number;
            },
            sort,
          ) => {
            try {
              if (!teamId || userRole === 'rejected') {
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
      </>
    );
  };

  const tabs = [
    {
      key: 'info',
      label: <FormattedMessage id='pages.team.tabs.info' defaultMessage='Team Information' />,
      children: renderTeamInfoForm(),
    },
  ];
  if (action === 'edit') {
    tabs.splice(1, 0, {
      key: 'members',
      label: <FormattedMessage id='pages.team.tabs.members' defaultMessage='Team Members' />,
      children: renderTeamMembersForm(),
    });
  }

  return (
    <PageContainer
      title={<FormattedMessage id='menu.account.team' defaultMessage='Team Management' />}
    >
      <Tabs activeKey={activeTabKey} onChange={onTabChange} tabPosition='left' items={tabs} />
    </PageContainer>
  );
};

export default Team;
