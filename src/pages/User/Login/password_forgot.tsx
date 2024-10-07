import { App, Button, ConfigProvider, Spin, Tabs, notification, theme } from 'antd';
import { Helmet, Link, SelectLang, useIntl } from 'umi';
import { LoginForm, ProConfigProvider, ProFormText, ProLayout } from '@ant-design/pro-components';
import { MailOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import { currentUser, forgotPasswordSendEmail } from '@/services/ant-design-pro/api';

import { Footer } from '@/components';
import { FormattedMessage } from '@umijs/max';
import Settings from '../../../../config/defaultSettings';

const PasswordForgot: React.FC = () => {
  const [initData, setInitData] = useState<API.CurrentUser>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const intl = useIntl();
  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      setLoading(true);
      const msg = await forgotPasswordSendEmail(values);
      setLoading(false);
      if (msg.status === 'ok') {
        setSendComplete(true);
        notification.success({
          message: intl.formatMessage({
            id: 'pages.login.password.forgot.success',
            defaultMessage:
              'The email was sent successfully! Please follow the email link to reset your password.',
          }),
          placement: 'top',
        });
      } else {
        notification.error({
          message: intl.formatMessage({
            id: 'pages.login.password.forgot.failure',
            defaultMessage: 'The email was not sent successfully, please try again!',
          }),
          description: msg.message,
          placement: 'top',
        });
      }
    } catch (error) {
      notification.error({
        message: intl.formatMessage({
          id: 'pages.login.password.forgot.failure',
          defaultMessage: 'The email was not sent successfully, please try again!',
        }),
        description: (error as Error).toString(),
        placement: 'top',
      });
    }
  };

  useEffect(() => {
    setSpinning(true);
    currentUser().then((res) => {
      setInitData(res ?? {});
      setSpinning(false);
    });
  }, []);

  return (
    <App>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: isDarkMode ? '#9e3ffd' : Settings.colorPrimary,
          },
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <ProConfigProvider hashed={false}>
          <ProLayout
            menuRender={false}
            menuHeaderRender={false}
            headerRender={false}
            fixedHeader={false}
            fixSiderbar={false}
          >
            <Helmet>
              <title>
                {intl.formatMessage({
                  id: 'menu.password_forgot',
                  defaultMessage: 'Forgot Password',
                })}
                - {Settings.title}
              </title>
            </Helmet>
            <SelectLang style={{ position: 'absolute', right: 16, top: 16 }} />
            <div style={{ marginTop: '80px' }}>
              <Spin spinning={spinning}>
                <LoginForm
                  layout="vertical"
                  logo={isDarkMode ? 'logo_dark.svg' : Settings.logo}
                  title={<FormattedMessage
                    id="pages.login.title"
                    defaultMessage="TianGong LCA"
                  />}
                  subTitle={<FormattedMessage
                    id="pages.login.subTitle"
                    defaultMessage="TianGong LCA"
                  />}
                  initialValues={initData}
                  onFinish={async (values) => {
                    await handleSubmit(values as API.LoginParams);
                  }}
                  submitter={{
                    resetButtonProps: {
                      style: { display: 'none' },
                    },
                    submitButtonProps: {
                      loading: loading,
                      disabled: sendComplete,
                    },
                    searchConfig: {
                      submitText: intl.formatMessage({
                        id: 'pages.login.email.verify',
                        defaultMessage: 'Send Verify Email',
                      }),
                    },
                  }}
                >
                  <Tabs
                    centered
                    items={[
                      {
                        key: 'email',
                        label: intl.formatMessage({
                          id: 'pages.login.passwordForgot.tab',
                          defaultMessage: 'Account',
                        }),
                      },
                    ]}
                  />
                  <ProFormText
                    name="email"
                    fieldProps={{
                      size: 'middle',
                      prefix: <MailOutlined />,
                    }}
                    placeholder={intl.formatMessage({
                      id: 'pages.login.email.placeholder',
                      defaultMessage: 'Email',
                    })}
                    rules={[
                      {
                        type: 'email',
                        message: (
                          <FormattedMessage
                            id="pages.login.email.wrong-format"
                            defaultMessage="The email format is incorrect!"
                          />
                        ),
                      },
                      {
                        required: true,
                        message: (
                          <FormattedMessage
                            id="pages.login.email.required"
                            defaultMessage="Please input your email!"
                          />
                        ),
                      },
                    ]}
                    disabled={sendComplete}
                  />
                </LoginForm>
                {sendComplete && (
                  <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
                    <Link to="/">
                      <Button type="primary" size="large">
                        {intl.formatMessage({
                          id: 'pages.login.password.back',
                          defaultMessage: 'Back to Login',
                        })}
                      </Button>
                    </Link>
                  </div>
                )}
              </Spin>
            </div>
            <Footer />
          </ProLayout>
        </ProConfigProvider>
      </ConfigProvider>
    </App>
  );
};

export default PasswordForgot;
