import { useAntdAppApi } from '@/contexts/AntdAppContext';
import { listOAuthGrants, revokeOAuthGrant } from '@/services/auth';
import { DisconnectOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { OAuthGrant } from '@supabase/supabase-js';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Empty, Space, Spin, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styles from './index.less';

const { Paragraph, Text, Title } = Typography;

const formatGrantedAt = (value: string, locale: string) => {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        timestamp,
      );
};

export default function OAuthConnections() {
  const intl = useIntl();
  const { message, modal } = useAntdAppApi();
  const [grants, setGrants] = useState<OAuthGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

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
    <Card className={styles.contentCard}>
      <Space className={styles.oauthContent} orientation='vertical' size='small'>
        <header className={styles.contentHeader}>
          <Title className={styles.contentTitle} level={3}>
            {intl.formatMessage({
              id: 'pages.account.oauth.connected.title',
              defaultMessage: 'Connected applications',
            })}
          </Title>
          <Paragraph className={styles.contentDescription} type='secondary'>
            {intl.formatMessage({
              id: 'pages.account.oauth.connected.summary',
              defaultMessage: 'Review and manage applications that you have authorized.',
            })}
          </Paragraph>
        </header>

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
          <Spin className={styles.oauthState} spinning={loading}>
            {grants.length ? (
              <>
                <Text className={styles.connectionCount} type='secondary'>
                  {intl.formatMessage(
                    {
                      id: 'pages.account.oauth.count',
                      defaultMessage: '{count} connected applications',
                    },
                    { count: grants.length },
                  )}
                </Text>
                <ul className={styles.connectionList}>
                  {grants.map((grant) => (
                    <li className={styles.connectionItem} key={grant.client.id}>
                      <div className={styles.connectionSummary}>
                        <Space orientation='vertical' size={4} style={{ minWidth: 0 }}>
                          <Text className={styles.connectionName} strong>
                            {grant.client.name}
                          </Text>
                          <Text type='secondary'>
                            {intl.formatMessage(
                              {
                                id: 'pages.account.oauth.grantedAt',
                                defaultMessage: 'Authorized {date}',
                              },
                              { date: formatGrantedAt(grant.granted_at, intl.locale) },
                            )}
                          </Text>
                        </Space>
                      </div>
                      <Tag className={styles.connectionStatus} color='success'>
                        {intl.formatMessage({
                          id: 'pages.account.oauth.connectedStatus',
                          defaultMessage: 'Connected',
                        })}
                      </Tag>
                      <Button
                        danger
                        icon={<DisconnectOutlined />}
                        onClick={() => confirmRevoke(grant)}
                      >
                        {intl.formatMessage({
                          id: 'pages.account.oauth.disconnect',
                          defaultMessage: 'Disconnect',
                        })}
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className={styles.connectionFooterNote}>
                  <SafetyCertificateOutlined />
                  <Text type='secondary'>
                    {intl.formatMessage({
                      id: 'pages.account.oauth.disconnectHint',
                      defaultMessage:
                        'The application will need your permission again the next time you connect.',
                    })}
                  </Text>
                </div>
              </>
            ) : loading ? null : (
              <Empty
                className={styles.emptyState}
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
  );
}
