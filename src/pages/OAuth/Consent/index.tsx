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
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { OAuthAuthorizationDetails } from '@supabase/supabase-js';
import { Alert, Avatar, Button, Card, Empty, Space, Spin, Typography, theme } from 'antd';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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

export default function OAuthConsentPage() {
  const location = useLocation();
  const intl = useIntl();
  const { token } = theme.useToken();
  const authorizationId = useMemo(
    () => parseOAuthAuthorizationId(location.search),
    [location.search],
  );
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<ConsentError | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<'approve' | 'deny' | null>(null);
  const decisionInFlight = useRef(false);

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
    if (decisionInFlight.current || !authorizationId) return;
    decisionInFlight.current = true;
    setDecision(nextDecision);
    const response = await decideOAuthAuthorization(authorizationId, nextDecision);
    if (response.error || !response.data) {
      setError('unavailable');
      setDecision(null);
      decisionInFlight.current = false;
      return;
    }
    if (!redirectToOAuthCallback(response.data.redirect_url)) {
      setError('unsafe_redirect');
      setDecision(null);
      decisionInFlight.current = false;
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
    <main
      className={styles.page}
      style={
        {
          '--consent-primary': token.colorPrimary,
          '--consent-surface': token.colorBgContainer,
          '--consent-text': token.colorText,
          '--consent-muted': `color-mix(in srgb, ${token.colorText} 72%, ${token.colorBgContainer})`,
          '--consent-border': token.colorBorderSecondary,
        } as CSSProperties
      }
    >
      <Helmet>
        <title>
          {title} - {appTitle}
        </title>
      </Helmet>
      <Card
        className={[styles.card, (loading || error || !details) && styles.stateCard]
          .filter(Boolean)
          .join(' ')}
        classNames={{ body: styles.cardBody }}
        variant='borderless'
      >
        {loading ? (
          <div className={styles.loading} role='status'>
            <SafetyCertificateOutlined className={styles.brandMark} />
            <Spin size='large' />
            <Text>
              {intl.formatMessage({
                id: 'pages.oauth.consent.loading',
                defaultMessage: 'Checking this authorization request…',
              })}
            </Text>
          </div>
        ) : error || !details ? (
          <Space orientation='vertical' size='large' className={styles.errorState}>
            <SafetyCertificateOutlined className={styles.brandMark} />
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
          <div className={styles.consentLayout}>
            <header className={styles.header}>
              <div className={styles.brandRow}>
                <SafetyCertificateOutlined className={styles.brandMark} />
                <Text className={styles.eyebrow}>
                  {intl.formatMessage({
                    id: 'pages.oauth.consent.eyebrow',
                    defaultMessage: 'Secure connection request',
                  })}
                </Text>
              </div>
              <Title level={2} id='consent-title' className={styles.heading}>
                {intl.formatMessage(
                  {
                    id: 'pages.oauth.consent.appTitle',
                    defaultMessage: 'Allow {clientName} to connect?',
                  },
                  { clientName: details.client.name },
                )}
              </Title>
            </header>

            <section className={styles.detailsPanel} aria-labelledby='consent-permissions'>
              <div className={styles.clientRow}>
                <Avatar size={56} icon={<AppstoreOutlined />} className={styles.clientAvatar} />
                <div className={styles.clientText}>
                  <Text strong className={styles.clientName}>
                    {details.client.name}
                  </Text>
                </div>
              </div>

              <Text strong id='consent-permissions' className={styles.permissionsTitle}>
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
                        <Text className={styles.scopeLabel}>
                          {formatScopeMessage(scope, intl.formatMessage)}
                        </Text>
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

              <aside className={styles.accountSummary} aria-labelledby='consent-account'>
                <Avatar size={40} icon={<UserOutlined />} className={styles.accountAvatar} />
                <div className={styles.accountDetails}>
                  <Text id='consent-account' className={styles.accountText}>
                    {intl.formatMessage(
                      {
                        id: 'pages.oauth.consent.signedInAs',
                        defaultMessage: 'Signed in as {email}',
                      },
                      { email: details.user.email },
                    )}
                  </Text>
                  <Paragraph type='secondary' className={styles.revocationHint}>
                    {intl.formatMessage({
                      id: 'pages.oauth.consent.revocationHint',
                      defaultMessage:
                        'You can revoke this connection later from Account → Connected apps.',
                    })}
                  </Paragraph>
                </div>
              </aside>

              <div className={styles.actions}>
                <Button
                  className={styles.actionButton}
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
                  className={styles.actionButton}
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
            </section>
          </div>
        )}
      </Card>
    </main>
  );
}
