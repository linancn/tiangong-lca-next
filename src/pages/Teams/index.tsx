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
  FileType,
  getBase64,
  getThumbFileUrls,
  isImage,
  removeLogoApi,
  uploadLogoApi,
} from '@/services/supabase/storage';
import { editTeamMessage, getTeamMembersApi, getTeamMessageApi } from '@/services/teams/api';
import { TeamMemberTable } from '@/services/teams/data';
import {
  CrownOutlined,
  DeleteOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
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
import { useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import AddMemberModal from './Components/AddMemberModal';

const Team = () => {
  const { token } = theme.useToken();
  const [activeTabKey, setActiveTabKey] = useState('info');
  const [teamId, setTeamId] = useState('');
  const [userRole, setUserRole] = useState('');

  const formRefEdit = useRef<ProFormInstance>();

  const [lightLogo, setLightLogo] = useState<FileType[]>([]);
  const [lightLogoPreviewUrl, setLightLogoPreviewUrl] = useState('');
  const [lightLogoError, setLightLogoError] = useState(false);
  const [beforeLightLogoPath, setBeforeLightLogoPath] = useState<string>('');

  const [darkLogo, setDarkLogo] = useState<FileType[]>([]);
  const [darkLogoPreviewUrl, setDarkLogoPreviewUrl] = useState('');
  const [darkLogoError, setDarkLogoError] = useState(false);
  const [beforeDarkLogoPath, setBeforeDarkLogoPath] = useState<string>('');

  const [teamInfoSpinning, setTeamInfoSpinning] = useState(false);

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
        is_public: data[0]?.is_public,
      };

      setBeforeLightLogoPath(data[0]?.json?.lightLogo);
      setBeforeDarkLogoPath(data[0]?.json?.darkLogo);

      getThumbFileUrls([{ '@uri': `${data[0]?.json?.lightLogo}` }]).then((res) => {
        if (res[0]?.status === 'done') {
          setLightLogoPreviewUrl(res[0]?.thumbUrl);
        }
      });
      if (data[0]?.json?.lightLogo) {
        setLightLogo(
          Array.isArray(data[0]?.json?.lightLogo)
            ? data[0]?.json?.lightLogo
            : [data[0]?.json?.lightLogo],
        );
      } else {
        setLightLogo([]);
      }

      getThumbFileUrls([{ '@uri': `${data[0]?.json?.darkLogo}` }]).then((res) => {
        if (res[0]?.status === 'done') {
          setDarkLogoPreviewUrl(res[0]?.thumbUrl);
        }
      });
      if (data[0]?.json?.darkLogo) {
        setDarkLogo(
          Array.isArray(data[0]?.json?.darkLogo)
            ? data[0]?.json?.darkLogo
            : [data[0]?.json?.darkLogo],
        );
      } else {
        setDarkLogo([]);
      }

      formRefEdit.current?.setFieldsValue({
        ...formData,
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
        setLightLogo([]);
        setLightLogoPreviewUrl('');
      } else {
        setDarkLogo([]);
        setDarkLogoPreviewUrl('');
      }
    };

    const editTeamInfo = async (values: any) => {
      const { rank, is_public } = values;
      delete values.rank;
      delete values.is_public;
      const params = getParams(values);
      const { error } = await editTeamMessage(teamId, { ...params }, rank, is_public);
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
      const { rank, is_public } = values;
      delete values.rank;
      delete values.is_public;
      const params = getParams(values);
      const error = await createTeamMessage(v4(), { ...params }, rank, is_public);
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

    const uploadLogo = async (fileList: FileType[], type: 'lightLogo' | 'darkLogo') => {
      if (fileList.length > 0) {
        const file = fileList[0];
        if (file) {
          if (!isImage(file)) {
            message.error(
              intl.formatMessage({
                id: 'teams.logo.typeError',
                defaultMessage: 'Only image files can be uploaded!',
              }),
            );
            if (type === 'lightLogo') {
              setLightLogo([]);
            } else {
              setDarkLogo([]);
            }
            return;
          }

          try {
            const suffix: string = file.name.split('.').pop() || '';
            const { data } = await uploadLogoApi(file.name, file, suffix);
            if (type === 'lightLogo') {
              setLightLogoError(false);
              setBeforeLightLogoPath(data?.path);
              return data.path;
            } else {
              setDarkLogoError(false);
              setBeforeDarkLogoPath(data?.path);
              return data.path;
            }
          } catch (error) {
            console.log('upload error', error);
          }
        }
      }
    };

    const handleRemoveLogo = async (type: 'lightLogo' | 'darkLogo') => {
      if (type === 'lightLogo') {
        setLightLogo([]);
        setLightLogoPreviewUrl('');
        await removeLogoApi([beforeLightLogoPath]);
      } else {
        setDarkLogo([]);
        setDarkLogoPreviewUrl('');
        await removeLogoApi([beforeDarkLogoPath]);
      }
    };

    const submitTeamInfo = async (values: any) => {
      try {
        if (!lightLogo.length || !darkLogo.length) {
          if (rank === 0) {
            setLightLogoError(!lightLogo.length);
            setDarkLogoError(!darkLogo.length);
            return;
          } else {
            if (!lightLogo.length) {
              handleRemoveLogo('lightLogo');
            }
            if (!darkLogo.length) {
              handleRemoveLogo('darkLogo');
            }
          }
        }

        setTeamInfoSpinning(true);

        const lightLogoPath = await uploadLogo(lightLogo, 'lightLogo');
        const darkLogoPath = await uploadLogo(darkLogo, 'darkLogo');
        values.lightLogo = lightLogoPath ? `../sys-files/${lightLogoPath}` : null;
        values.darkLogo = darkLogoPath ? `../sys-files/${darkLogoPath}` : null;

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
              name='is_public'
              label={
                <>
                  <FormattedMessage id='pages.team.info.public' defaultMessage='Public' />
                  <Tooltip title={intl.formatMessage({ id: 'pages.team.info.public.tooltip' })}>
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </>
              }
              valuePropName='checked'
            >
              <Switch
                disabled={
                  (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') || rank > 0
                }
              />
            </Form.Item>
            <Form.Item
              name='rank'
              label={
                <>
                  <FormattedMessage
                    id='pages.team.info.showInHome'
                    defaultMessage='Apply to display on the homepage'
                  />
                  <Tooltip title={intl.formatMessage({ id: 'pages.team.info.showInHome.tooltip' })}>
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </>
              }
              valuePropName='checked'
              getValueProps={(value) => ({
                checked: value === 0,
              })}
              normalize={(value) => {
                return value ? 0 : -1;
              }}
            >
              <Switch
                disabled={
                  (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') || rank > 0
                }
                onChange={(checked) => {
                  setRank(checked ? 0 : -1);
                  setLightLogoError(false);
                  setDarkLogoError(false);
                }}
              />
            </Form.Item>
            <Form.Item
              name='lightLogo'
              label={
                <FormattedMessage id='pages.team.info.lightLogo' defaultMessage='Light Logo' />
              }
              rules={[
                {
                  required: rank === 0,
                  message: (
                    <FormattedMessage
                      id='pages.team.info.lightLogo.required'
                      defaultMessage='Please upload light logo!'
                    />
                  ),
                },
              ]}
              validateStatus={lightLogoError ? 'error' : undefined}
              help={
                lightLogoError ? (
                  <FormattedMessage
                    id='pages.team.info.lightLogo.required'
                    defaultMessage='Please upload light logo!'
                  />
                ) : undefined
              }
            >
              <div>
                <Upload
                  disabled={
                    (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') ||
                    rank > 0
                  }
                  beforeUpload={(file) => {
                    getBase64(file as FileType).then((url) => {
                      setLightLogoPreviewUrl(url);
                      setLightLogo([file]);
                      setLightLogoError(false);
                    });

                    return false;
                  }}
                  onRemove={() => removeLogo('lightLogo')}
                  maxCount={1}
                  listType='picture-card'
                  fileList={
                    lightLogo && lightLogo.length > 0
                      ? [
                          {
                            uid: '-1',
                            name: 'logo',
                            status: 'done',
                            url: lightLogoPreviewUrl,
                          },
                        ]
                      : []
                  }
                >
                  {lightLogo && lightLogo.length === 0 && <PlusOutlined />}
                </Upload>
              </div>
            </Form.Item>

            <Form.Item
              name='darkLogo'
              label={<FormattedMessage id='pages.team.info.darkLogo' defaultMessage='Dark Logo' />}
              rules={[
                {
                  required: rank === 0,
                  message: (
                    <FormattedMessage
                      id='pages.team.info.darkLogo.required'
                      defaultMessage='Please upload dark logo!'
                    />
                  ),
                },
              ]}
              validateStatus={darkLogoError ? 'error' : undefined}
              help={
                darkLogoError ? (
                  <FormattedMessage
                    id='pages.team.info.darkLogo.required'
                    defaultMessage='Please upload dark logo!'
                  />
                ) : undefined
              }
            >
              <div
                style={
                  darkLogoPreviewUrl
                    ? { background: '#141414', display: 'inline-block', borderRadius: '8px' }
                    : {}
                }
              >
                <Upload
                  disabled={
                    (userRole !== 'admin' && userRole !== 'owner' && action !== 'create') ||
                    rank > 0
                  }
                  beforeUpload={(file) => {
                    getBase64(file as FileType).then((url) => {
                      setDarkLogoPreviewUrl(url);
                      setDarkLogo([file]);
                      setDarkLogoError(false);
                    });
                    return false;
                  }}
                  onRemove={() => removeLogo('darkLogo')}
                  maxCount={1}
                  listType='picture-card'
                  fileList={
                    darkLogo && darkLogo.length > 0
                      ? [
                          {
                            uid: '-1',
                            name: 'logo',
                            status: 'done',
                            url: darkLogoPreviewUrl,
                          },
                        ]
                      : []
                  }
                >
                  {darkLogo && darkLogo.length === 0 && <PlusOutlined />}
                </Upload>
              </div>
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
