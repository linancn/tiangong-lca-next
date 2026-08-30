import {
  buildOAuthLoginPath,
  decideOAuthAuthorization,
  getOAuthAuthorizationDetails,
  getVerifiedOAuthSubject,
  parseOAuthAuthorizationId,
  redirectToOAuthCallback,
} from '@/services/auth';
import {
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js';
import { Alert, Avatar, Button, Card, Divider, Empty, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Helmet, history, useIntl, useLocation } from 'umi';
import styles from './index.less';

const { Paragraph, Text, Title } = Typography;

type ConsentError = 'invalid' | 'unavailable' | 'unsafe_redirect';

const formatScopeMessage = (
  scope: string,
  formatMessage: (
    descriptor: { id: string; defaultMessage: string },
    values?: Record<string, string>,
  ) => string,
) => {
  switch (scope) {
    case 'openid':
      return formatMessage({
        id: 'pages.oauth.consent.scope.openid',
        defaultMessage: 'Confirm your TianGong LCA identity',
      });
    case 'email':
      return formatMessage({
        id: 'pages.oauth.consent.scope.email',
        defaultMessage: 'Read your email address',
      });
    case 'profile':
      return formatMessage({
        id: 'pages.oauth.consent.scope.profile',
        defaultMessage: 'Read your basic profile',
      });
    case 'phone':
      return formatMessage({
        id: 'pages.oauth.consent.scope.phone',
        defaultMessage: 'Read your phone number',
      });
    default:
      return formatMessage(
        {
          id: 'pages.oauth.consent.scope.other',
          defaultMessage: 'Request the {scope} identity permission',
        },
        { scope },
      );
  }
};

const describeRedirect = (redirectUri: string): string => {
  try {
    const target = new URL(redirectUri);
    return `${target.host}${target.pathname}`;
  } catch {
    return redirectUri;
  }
};

export default function OAuthConsentPage() {
  const location = useLocation();
  const intl = useIntl();
  const authorizationId = useMemo(
    () => parseOAuthAuthorizationId(location.search),
    [location.search],
  );
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<ConsentError | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<'approve' | 'deny' | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setDetails(null);
      setError(null);
      setLoading(true);

      if (!authorizationId) {
        if (active) {
          setError('invalid');
          setLoading(false);
        }
        return;
      }

      const subject = await getVerifiedOAuthSubject();
      if (!active) return;
      if (!subject) {
        history.replace(buildOAuthLoginPath(authorizationId));
        return;
      }

      const response = await getOAuthAuthorizationDetails(authorizationId);
      if (!active) return;
      if (response.error || !response.data) {
        setError('unavailable');
        setLoading(false);
        return;
      }

      if ('redirect_url' in response.data) {
        if (!redirectToOAuthCallback(response.data.redirect_url)) {
          setError('unsafe_redirect');
          setLoading(false);
        }
        return;
      }

      setDetails(response.data);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const handleDecision = async (nextDecision: 'approve' | 'deny') => {
    if (!authorizationId || decision) return;
    setDecision(nextDecision);
    const response = await decideOAuthAuthorization(authorizationId, nextDecision);
    if (response.error || !response.data) {
      setError('unavailable');
      setDecision(null);
      return;
    }
    if (!redirectToOAuthCallback(response.data.redirect_url)) {
      setError('unsafe_redirect');
      setDecision(null);
    }
  };

  const title = intl.formatMessage({
    id: 'pages.oauth.consent.title',
    defaultMessage: 'Authorize application',
  });
  const appTitle = intl.formatMessage({
    id: 'pages.name',
    defaultMessage: 'TianGong LCA Data Platform',
  });

  const errorMessage =
    error === 'unsafe_redirect'
      ? intl.formatMessage({
          id: 'pages.oauth.consent.error.unsafeRedirect',
          defaultMessage: 'The application returned an unsafe callback. Nothing was shared.',
        })
      : error === 'invalid'
        ? intl.formatMessage({
            id: 'pages.oauth.consent.error.invalid',
            defaultMessage: 'This authorization request is malformed or incomplete.',
          })
        : intl.formatMessage({
            id: 'pages.oauth.consent.error.unavailable',
            defaultMessage:
              'This authorization request is invalid, expired, or no longer available.',
          });

  const scopes = details?.scope.split(/\s+/u).filter(Boolean) ?? [];

  return (
    <main className={styles.page}>
      <Helmet>
        <title>
          {title} - {appTitle}
        </title>
      </Helmet>
      <div className={styles.backdrop} aria-hidden />
      <Card className={styles.card} variant='borderless'>
        <div className={styles.brandMark}>
          <SafetyCertificateOutlined />
        </div>

        {loading ? (
          <div className={styles.loading} role='status'>
            <Spin size='large' />
            <Text>
              {intl.formatMessage({
                id: 'pages.oauth.consent.loading',
                defaultMessage: 'Checking this authorization request…',
              })}
            </Text>
          </div>
        ) : error || !details ? (
          <Space orientation='vertical' size='large' className={styles.fullWidth}>
            <Title level={2}>{title}</Title>
            <Alert type='error' showIcon title={errorMessage} />
            <Button onClick={() => history.replace('/account')}>
              {intl.formatMessage({
                id: 'pages.oauth.consent.return',
                defaultMessage: 'Return to TianGong LCA',
              })}
            </Button>
          </Space>
        ) : (
          <>
            <div className={styles.heading}>
              <Text className={styles.eyebrow}>
                {intl.formatMessage({
                  id: 'pages.oauth.consent.eyebrow',
                  defaultMessage: 'Secure connection request',
                })}
              </Text>
              <Title level={2}>
                {intl.formatMessage(
                  {
                    id: 'pages.oauth.consent.appTitle',
                    defaultMessage: 'Allow {clientName} to connect?',
                  },
                  { clientName: details.client.name },
                )}
              </Title>
              <Paragraph type='secondary'>
                {intl.formatMessage({
                  id: 'pages.oauth.consent.description',
                  defaultMessage:
                    'Review the identity information this application is requesting. Your LCA data permissions remain controlled separately by TianGong LCA.',
                })}
              </Paragraph>
            </div>

            <div className={styles.clientRow}>
              <Avatar size={52} icon={<AppstoreOutlined />} className={styles.clientAvatar} />
              <div className={styles.clientText}>
                <Text strong>{details.client.name}</Text>
                <Text type='secondary'>{describeRedirect(details.redirect_uri)}</Text>
              </div>
              <Tag color='green'>
                {intl.formatMessage({
                  id: 'pages.oauth.consent.registered',
                  defaultMessage: 'Registered callback',
                })}
              </Tag>
            </div>

            <Divider />
            <Text strong>
              {intl.formatMessage({
                id: 'pages.oauth.consent.permissions',
                defaultMessage: 'Requested identity permissions',
              })}
            </Text>
            {scopes.length ? (
              <ul className={styles.scopeList}>
                {scopes.map((scope) => {
                  return (
                    <li className={styles.scopeItem} key={scope}>
                      <CheckOutlined className={styles.scopeCheck} />
                      <div className={styles.scopeText}>
                        <Text>{formatScopeMessage(scope, intl.formatMessage)}</Text>
                        <Text code>{scope}</Text>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={intl.formatMessage({
                  id: 'pages.oauth.consent.permissions.none',
                  defaultMessage: 'No additional identity information requested',
                })}
              />
            )}

            <Alert
              className={styles.notice}
              type='info'
              showIcon
              title={intl.formatMessage(
                {
                  id: 'pages.oauth.consent.signedInAs',
                  defaultMessage: 'Signed in as {email}',
                },
                { email: details.user.email },
              )}
              description={intl.formatMessage({
                id: 'pages.oauth.consent.revocationHint',
                defaultMessage:
                  'You can revoke this connection later from Account → Connected apps.',
              })}
            />

            <div className={styles.actions}>
              <Button
                icon={<CloseOutlined />}
                size='large'
                disabled={decision !== null}
                loading={decision === 'deny'}
                onClick={() => void handleDecision('deny')}
              >
                {intl.formatMessage({
                  id: 'pages.oauth.consent.deny',
                  defaultMessage: 'Deny',
                })}
              </Button>
              <Button
                type='primary'
                icon={<CheckOutlined />}
                size='large'
                disabled={decision !== null}
                loading={decision === 'approve'}
                onClick={() => void handleDecision('approve')}
              >
                {intl.formatMessage({
                  id: 'pages.oauth.consent.approve',
                  defaultMessage: 'Allow connection',
                })}
              </Button>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
