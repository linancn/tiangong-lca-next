import { Footer } from '@/components';
import { login, sendMagicLink } from '@/services/ant-design-pro/api';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import {
  LoginForm,
  ProConfigProvider,
  ProFormCheckbox,
  ProFormText,
  ProLayout,
} from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Alert, App, Button, ConfigProvider, message, Tabs, theme } from 'antd';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Helmet, history, SelectLang, useIntl, useModel } from 'umi';
import Settings from '../../../../config/defaultSettings';

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => (
  <Alert
    style={{
      marginBottom: 24,
    }}
    message={content}
    type="error"
    showIcon
  />
);

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('password');
  const [loading, setLoading] = useState<boolean>(false);
  const [sendMailMessage, setSendMailMessage] = useState<any>(<></>);
  const { initialState, setInitialState } = useModel('@@initialState');
  const [sendComplete, setSendComplete] = useState(false);
  const intl = useIntl();
  const [messageApi, contextHolder] = message.useMessage();
  const formRefLogin = React.useRef<any>();

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      if (type === 'email') {
        setLoading(true);
        const msg = await sendMagicLink({ ...values, type });
        setLoading(false);
        if (msg.status === 'ok') {
          setSendComplete(true);
          const defaultLoginSuccessMessage = intl.formatMessage({
            id: 'pages.login.email.success',
            defaultMessage:
              'The email was sent successfully, please login from the magic link in the email!',
          });
          messageApi.success(defaultLoginSuccessMessage);
          setSendMailMessage(
            <FormattedMessage
              id="pages.login.email.success"
              defaultMessage="The email was sent successfully, please login from the magic link in the email!"
            />,
          );
          return;
        }
        setSendMailMessage(
          <FormattedMessage
            id="pages.login.email.failure"
            defaultMessage="The email was not sent successfully, please try again!"
          />,
        );
        return;
      } else if (type === 'password') {
        // 登录
        setLoading(true);
        const msg = await login({ ...values, type });
        setLoading(false);
        if (msg.status === 'ok') {
          const defaultLoginSuccessMessage = intl.formatMessage({
            id: 'pages.login.success',
            defaultMessage: 'Login successful!',
          });
          messageApi.success(defaultLoginSuccessMessage);
          await fetchUserInfo();
          const urlParams = new URL(window.location.href).searchParams;
          history.push(urlParams.get('redirect') || '/');
          return;
        }
        // 如果失败去设置用户错误信息
        setUserLoginState(msg);
      }
    } catch (error) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: 'Login failed, please try again!',
      });
      messageApi.error(defaultLoginFailureMessage);
    }
  };

  const { status, type: loginType } = userLoginState;
  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  return (
    <App>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: isDarkMode ? '#9e3ffd' : Settings.colorPrimary,
          },
          algorithm:
            isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        {contextHolder}
        <ProConfigProvider hashed={false}>
          <ProLayout menuRender={false} menuHeaderRender={false} headerRender={false} fixedHeader={false} fixSiderbar={false}>
            <Helmet>
              <title>
                {intl.formatMessage({
                  id: 'menu.login',
                  defaultMessage: 'Login Page',
                })}
                - {Settings.title}
              </title>
            </Helmet>
            <SelectLang
              style={{
                position: 'absolute',
                right: 16,
                top: 16,
              }}
            />
            <div style={{
              marginTop: '80px',
            }}>
              <LoginForm
                formRef={formRefLogin}
                logo={isDarkMode ? 'logo_dark.svg' : Settings.logo}
                title={Settings.title}
                subTitle=""
                initialValues={{ autoLogin: true }}
                onFinish={async (values) => {
                  if (type === 'password') {
                    await handleSubmit(values as API.LoginParams);
                  }
                }}
                submitter={type === 'password' ? {
                  submitButtonProps: {
                    loading: loading,
                  },
                } : false}
              >
                <Tabs
                  activeKey={type}
                  onChange={setType}
                  centered
                  items={[
                    {
                      key: 'password',
                      label: intl.formatMessage({
                        id: 'pages.login.passwordLogin.tab',
                        defaultMessage: 'Password Login',
                      }),
                    },
                    {
                      key: 'email',
                      label: intl.formatMessage({
                        id: 'pages.login.emailLogin.tab',
                        defaultMessage: 'Email Login',
                      }),
                    },
                  ]}
                />
                {status === 'error' && loginType === 'password' && (
                  <LoginMessage
                    content={intl.formatMessage({
                      id: 'pages.login.passwordLogin.errorMessage',
                      defaultMessage: 'Incorrect username/password',
                    })}
                  />
                )}
                {type === 'password' && (
                  <>
                    <ProFormText
                      name="username"
                      fieldProps={{
                        size: 'large',
                        prefix: <UserOutlined />,
                      }}
                      placeholder={intl.formatMessage({
                        id: 'pages.login.username.placeholder',
                        defaultMessage: 'User Name',
                      })}
                      rules={[
                        {
                          required: true,
                          message: (
                            <FormattedMessage
                              id="pages.login.username.required"
                              defaultMessage="Please input your username!"
                            />
                          ),
                        },
                      ]}
                    />
                    <ProFormText.Password
                      name="password"
                      fieldProps={{
                        size: 'large',
                        prefix: <LockOutlined />,
                      }}
                      placeholder={intl.formatMessage({
                        id: 'pages.login.password.placeholder',
                        defaultMessage: 'Password',
                      })}
                      rules={[
                        {
                          required: true,
                          message: (
                            <FormattedMessage
                              id="pages.login.password.required"
                              defaultMessage="Please input your password!"
                            />
                          ),
                        },
                      ]}
                    />
                    <div
                      style={{
                        marginBottom: 24,
                      }}
                    >
                      <ProFormCheckbox noStyle name="autoLogin">
                        <FormattedMessage
                          id="pages.login.rememberMe"
                          defaultMessage="Remember me"
                        />
                      </ProFormCheckbox>
                      <a
                        style={{
                          float: 'right',
                        }}
                        href="/#/user/password_forgot"
                      >
                        <FormattedMessage
                          id="pages.login.forgotPassword"
                          defaultMessage="Forgot password"
                        />
                      </a>
                    </div>
                  </>
                )}
                {status === 'error' && loginType === 'email' && (
                  <LoginMessage
                    content={intl.formatMessage({
                      id: 'pages.login.emailLogin.errorMessage',
                      defaultMessage:
                        'Wrong email address or email address is not registered',
                    })}
                  />
                )}
                {type === 'email' && (
                  <>
                    <ProFormText
                      name="email"
                      fieldProps={{
                        size: 'large',
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
                    <div
                      style={{
                        marginBottom: 24,
                      }}
                    >
                      <Button
                        block
                        type="primary"
                        size="large"
                        loading={loading}
                        disabled={sendComplete}
                        onClick={() => {
                          setType('email');
                          if (formRefLogin?.current)
                            handleSubmit(formRefLogin.current?.getFieldsValue());
                        }}
                      >
                        <FormattedMessage
                          id="pages.login.email.submit"
                          defaultMessage="Send Login Email"
                        />
                      </Button>
                      {sendMailMessage}
                    </div>
                  </>
                )}
              </LoginForm>
            </div>
            <Footer />
          </ProLayout>
        </ProConfigProvider>
      </ConfigProvider>
    </App>
  );
};

export default Login;
