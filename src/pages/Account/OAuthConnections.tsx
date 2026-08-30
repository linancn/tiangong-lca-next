import { useAntdAppApi } from '@/contexts/AntdAppContext';
import { cognitoSignUp, listOAuthGrants, login, revokeOAuthGrant } from '@/services/auth';
import { ApiOutlined, DisconnectOutlined, KeyOutlined, LinkOutlined } from '@ant-design/icons';
import type { OAuthGrant } from '@supabase/supabase-js';
import { ProForm, ProFormInstance, ProFormText } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

const { Paragraph, Text, Title } = Typography;

const LEGACY_FORM_STYLE: CSSProperties = { width: '100%', maxWidth: 600, minWidth: 0 };

const formatGrantedAt = (value: string, locale: string) => {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        timestamp,
      );
};

export default function OAuthConnections({ email }: { email?: string }) {
  const intl = useIntl();
  const { message, modal } = useAntdAppApi();
  const legacyFormRef = useRef<ProFormInstance | undefined>(undefined);
  const [grants, setGrants] = useState<OAuthGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [legacyLoading, setLegacyLoading] = useState(false);

  const loadGrants = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    const response = await listOAuthGrants();
    if (response.error || !response.data) {
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    setGrants(response.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadGrants();
  }, [loadGrants]);

  const confirmRevoke = (grant: OAuthGrant) => {
    modal.confirm({
      title: intl.formatMessage(
        {
          id: 'pages.account.oauth.revoke.title',
          defaultMessage: 'Disconnect {clientName}?',
        },
        { clientName: grant.client.name },
      ),
      content: intl.formatMessage({
        id: 'pages.account.oauth.revoke.description',
        defaultMessage:
          'This revokes the grant and its refresh tokens. The application must ask you to authorize again.',
      }),
      okText: intl.formatMessage({
        id: 'pages.account.oauth.revoke.confirm',
        defaultMessage: 'Disconnect',
      }),
      okButtonProps: { danger: true },
      cancelText: intl.formatMessage({
        id: 'pages.account.oauth.revoke.cancel',
        defaultMessage: 'Keep connected',
      }),
      onOk: async () => {
        const response = await revokeOAuthGrant(grant.client.id);
        if (response.error) {
          message.error(
            intl.formatMessage({
              id: 'pages.account.oauth.revoke.error',
              defaultMessage: 'The connection could not be revoked. Try again.',
            }),
          );
          throw response.error;
        }
        setGrants((current) => current.filter(({ client }) => client.id !== grant.client.id));
        message.success(
          intl.formatMessage({
            id: 'pages.account.oauth.revoke.success',
            defaultMessage: 'Application disconnected.',
          }),
        );
      },
    });
  };

  return (
    <Flex gap='large' vertical style={{ width: '100%', maxWidth: 760, minWidth: 0 }}>
      <Alert
        type='warning'
        showIcon
        title={intl.formatMessage({
          id: 'pages.account.oauth.apiKeyRetired.title',
          defaultMessage: 'Password-encoded API keys are retired',
        })}
        description={intl.formatMessage({
          id: 'pages.account.oauth.apiKeyRetired.description',
          defaultMessage:
            'CLI and MCP connections now use revocable OAuth authorization. TianGong LCA will never display a key containing your account password.',
        })}
      />

      <Card>
        <Space orientation='vertical' size='small' style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            {intl.formatMessage({
              id: 'pages.account.oauth.connected.title',
              defaultMessage: 'Connected applications',
            })}
          </Title>
          <Paragraph type='secondary'>
            {intl.formatMessage({
              id: 'pages.account.oauth.connected.description',
              defaultMessage:
                'These applications can act with the identity permissions you approved. Database access remains limited by client capabilities and your user permissions.',
            })}
          </Paragraph>

          {loadFailed ? (
            <Alert
              type='error'
              showIcon
              title={intl.formatMessage({
                id: 'pages.account.oauth.loadError',
                defaultMessage: 'Connected applications could not be loaded.',
              })}
              action={
                <Button size='small' onClick={() => void loadGrants()}>
                  {intl.formatMessage({ id: 'pages.account.oauth.retry', defaultMessage: 'Retry' })}
                </Button>
              }
            />
          ) : (
            <Spin spinning={loading}>
              {grants.length ? (
                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                  {grants.map((grant) => (
                    <li
                      key={grant.client.id}
                      style={{
                        padding: '16px 0',
                        borderBottom: '1px solid rgba(5, 5, 5, 0.08)',
                      }}
                    >
                      <Flex align='center' gap='middle' justify='space-between' wrap>
                        <Flex align='flex-start' gap='middle' style={{ minWidth: 0 }}>
                          <Avatar icon={<ApiOutlined />} />
                          <Space orientation='vertical' size={6} style={{ minWidth: 0 }}>
                            <Text strong>{grant.client.name}</Text>
                            <Text type='secondary'>
                              {intl.formatMessage(
                                {
                                  id: 'pages.account.oauth.grantedAt',
                                  defaultMessage: 'Authorized {date}',
                                },
                                { date: formatGrantedAt(grant.granted_at, intl.locale) },
                              )}
                            </Text>
                            <Space size={[4, 4]} wrap>
                              {grant.scopes.map((scope) => (
                                <Tag key={scope}>{scope}</Tag>
                              ))}
                            </Space>
                          </Space>
                        </Flex>
                        <Button
                          danger
                          icon={<DisconnectOutlined />}
                          type='text'
                          onClick={() => confirmRevoke(grant)}
                        >
                          {intl.formatMessage({
                            id: 'pages.account.oauth.disconnect',
                            defaultMessage: 'Disconnect',
                          })}
                        </Button>
                      </Flex>
                    </li>
                  ))}
                </ul>
              ) : loading ? null : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={intl.formatMessage({
                    id: 'pages.account.oauth.empty',
                    defaultMessage: 'No applications are connected.',
                  })}
                />
              )}
            </Spin>
          )}
        </Space>
      </Card>

      <Collapse
        ghost
        items={[
          {
            key: 'legacy-cognito',
            label: (
              <Space>
                <KeyOutlined />
                {intl.formatMessage({
                  id: 'pages.account.oauth.legacy.title',
                  defaultMessage: 'Legacy compatibility provisioning',
                })}
              </Space>
            ),
            children: (
              <Flex gap='middle' vertical style={LEGACY_FORM_STYLE}>
                <Paragraph type='secondary'>
                  {intl.formatMessage({
                    id: 'pages.account.oauth.legacy.description',
                    defaultMessage:
                      'Use this only for an older integration that has not migrated yet. It provisions the retained Cognito bridge but does not create or reveal an API key.',
                  })}
                </Paragraph>
                <ProForm
                  formRef={legacyFormRef}
                  submitter={{
                    searchConfig: {
                      submitText: intl.formatMessage({
                        id: 'pages.account.oauth.legacy.submit',
                        defaultMessage: 'Provision legacy access',
                      }),
                    },
                    submitButtonProps: { loading: legacyLoading, icon: <LinkOutlined /> },
                    resetButtonProps: false,
                  }}
                  onFinish={async ({ currentPassword }) => {
                    setLegacyLoading(true);
                    try {
                      const loginResult = await login({
                        email: email ?? '',
                        password: currentPassword,
                      });
                      if (loginResult.status !== 'ok') {
                        message.error(
                          intl.formatMessage({
                            id: 'pages.account.invalidCredentials',
                            defaultMessage: 'Invalid credentials. Please check your password.',
                          }),
                        );
                        return false;
                      }
                      await cognitoSignUp(currentPassword);
                      legacyFormRef.current?.resetFields();
                      message.success(
                        intl.formatMessage({
                          id: 'pages.account.oauth.legacy.success',
                          defaultMessage: 'Legacy compatibility access provisioned.',
                        }),
                      );
                      return true;
                    } catch {
                      message.error(
                        intl.formatMessage({
                          id: 'pages.account.oauth.legacy.error',
                          defaultMessage: 'Legacy compatibility access could not be provisioned.',
                        }),
                      );
                      return false;
                    } finally {
                      setLegacyLoading(false);
                    }
                  }}
                >
                  <ProFormText.Password
                    name='currentPassword'
                    label={intl.formatMessage({
                      id: 'pages.account.password.currentPassword',
                      defaultMessage: 'Current Password',
                    })}
                    rules={[
                      {
                        required: true,
                        message: intl.formatMessage({
                          id: 'pages.account.currentPassword.required',
                          defaultMessage: 'Please input the current password!',
                        }),
                      },
                    ]}
                  />
                </ProForm>
              </Flex>
            ),
          },
        ]}
      />
    </Flex>
  );
}
