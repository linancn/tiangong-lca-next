import { login, signUp } from '@/services/ant-design-pro/api';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import {
  LoginForm,
  ProConfigProvider,
  ProFormCheckbox,
  ProFormText,
  ProLayout,
} from '@ant-design/pro-components';
import { Alert, App, Button, ConfigProvider, Tabs, message, theme } from 'antd';
import React, { useState } from 'react';
import { Helmet, SelectLang, history, useIntl, useModel } from 'umi';

import { Footer } from '@/components';
import { FormattedMessage } from '@umijs/max';
import { Typography } from 'antd';
import { flushSync } from 'react-dom';
import Settings from '../../../../config/defaultSettings';

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => (
  <Alert
    style={{
      marginBottom: 24,
    }}
    message={content}
    type='error'
    showIcon
  />
);

const { Link } = Typography;

const termsOfServiceLink = (
  <Link href='/terms_of_use.html' target='_blank' rel='noopener noreferrer'>
    <FormattedMessage id='pages.login.termsOfUse' defaultMessage='Terms of Use' />
  </Link>
);

const privacyPolicyLink = (
  <Link href='/privacy_notice.html' target='_blank' rel='noopener noreferrer'>
    <FormattedMessage id='pages.login.privacyNotice' defaultMessage='Privacy Notice' />
  </Link>
);

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('login');
  const [loading, setLoading] = useState<boolean>(false);
  const { initialState, setInitialState } = useModel('@@initialState');
  const [sendComplete, setSendComplete] = useState(false);
  const intl = useIntl();
  const [messageApi, contextHolder] = message.useMessage();
  const formRefLogin = React.useRef<any>();
  const { token } = theme.useToken();

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
      if (type === 'register') {
        setLoading(true);
        const msg = await signUp({ ...values, type });
        setLoading(false);
        if (msg.status === 'ok') {
          setSendComplete(true);
          const defaultSignUpSuccessMessage = intl.formatMessage({
            id: 'pages.login.signUp.success',
            defaultMessage:
              'The email has been sent successfully. Please check your inbox and follow the link to complete the process.',
          });
          messageApi.open({
            type: 'success',
            content: defaultSignUpSuccessMessage,
            duration: 10,
          });
          return;
        }
        if (msg.status === 'existed') {
          setSendComplete(true);
          const defaultSignUpExistedMessage = intl.formatMessage({
            id: 'pages.login.signUp.existed',
            defaultMessage: 'This email has already been registered. Try Login or Forgot Password?',
          });
          messageApi.open({
            type: 'error',
            content: defaultSignUpExistedMessage,
            duration: 10,
          });
          return;
        }
        setUserLoginState(msg);
        return;
      } else if (type === 'login') {
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
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        {contextHolder}
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
            <div
              style={{
                marginTop: '80px',
              }}
            >
              <LoginForm
                formRef={formRefLogin}
                logo={isDarkMode ? '/logo_dark.svg' : Settings.logo}
                title={<FormattedMessage id='pages.login.title' defaultMessage='TianGong LCA' />}
                subTitle={
                  <FormattedMessage
                    id='pages.login.subTitle'
                    defaultMessage="World\'s Largest Open & Free LCA Database"
                  />
                }
                initialValues={{ autoLogin: true }}
                onFinish={async (values) => {
                  if (type === 'login') {
                    await handleSubmit(values as API.LoginParams);
                  }
                }}
                submitter={
                  type === 'login'
                    ? {
                        submitButtonProps: {
                          loading: loading,
                        },
                      }
                    : false
                }
              >
                <Tabs
                  activeKey={type}
                  onChange={setType}
                  centered
                  items={[
                    {
                      key: 'login',
                      label: intl.formatMessage({
                        id: 'pages.login.login.tab',
                        defaultMessage: 'Login',
                      }),
                    },
                    {
                      key: 'register',
                      label: intl.formatMessage({
                        id: 'pages.login.register.tab',
                        defaultMessage: 'Register',
                      }),
                    },
                  ]}
                />
                {status === 'error' && loginType === 'login' && (
                  <LoginMessage
                    content={intl.formatMessage({
                      id: 'pages.login.passwordLogin.errorMessage',
                      defaultMessage: 'Incorrect username/password',
                    })}
                  />
                )}
                {status === 'error' && loginType === 'register' && (
                  <LoginMessage
                    content={intl.formatMessage({
                      id: 'pages.login.signUp.errorMessage',
                      defaultMessage: 'Validation email failed to send.',
                    })}
                  />
                )}
                {type === 'login' && (
                  <>
                    <ProFormText
                      name='email'
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
                              id='pages.login.email.wrong-format'
                              defaultMessage='The email format is incorrect!'
                            />
                          ),
                        },
                        {
                          required: true,
                          message: (
                            <FormattedMessage
                              id='pages.login.email.required'
                              defaultMessage='Please input your email!'
                            />
                          ),
                        },
                      ]}
                    />
                    <ProFormText.Password
                      name='password'
                      fieldProps={{
                        size: 'middle',
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
                              id='pages.login.password.required'
                              defaultMessage='Please input your password!'
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
                      <ProFormCheckbox noStyle name='autoLogin'>
                        <FormattedMessage
                          id='pages.login.rememberMe'
                          defaultMessage='Remember me'
                        />
                      </ProFormCheckbox>
                      <a
                        style={{
                          float: 'right',
                        }}
                        href='/user/login/password_forgot'
                      >
                        <FormattedMessage
                          id='pages.login.forgotPassword'
                          defaultMessage='Forgot password'
                        />
                      </a>
                    </div>
                  </>
                )}
                {type === 'register' && (
                  <>
                    <ProFormText
                      name='email'
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
                              id='pages.login.email.wrong-format'
                              defaultMessage='The email format is incorrect!'
                            />
                          ),
                        },
                        {
                          required: true,
                          message: (
                            <FormattedMessage
                              id='pages.login.email.required'
                              defaultMessage='Please input your email!'
                            />
                          ),
                        },
                      ]}
                    />
                    <ProFormText.Password
                      name='password'
                      fieldProps={{
                        size: 'middle',
                        prefix: <LockOutlined />,
                        strengthText: (
                          <FormattedMessage
                            id='pages.login.password.strengthText'
                            defaultMessage='Password must contain at least 8 characters, including lowercase and uppercase letters, digits, and symbols.'
                          />
                        ),
                        statusRender: (value) => {
                          const getStatus = () => {
                            if (value && value.length > 12) {
                              return 'ok';
                            }
                            if (value && value.length > 8) {
                              return 'pass';
                            }
                            return 'poor';
                          };
                          const pwdStatus = getStatus();
                          if (pwdStatus === 'pass') {
                            return (
                              <div style={{ color: token.colorWarning }}>
                                <FormattedMessage
                                  id='pages.login.password.strengthMedium'
                                  defaultMessage='Medium'
                                />
                              </div>
                            );
                          }
                          if (pwdStatus === 'ok') {
                            return (
                              <div style={{ color: token.colorSuccess }}>
                                <FormattedMessage
                                  id='pages.login.password.strengthStrong'
                                  defaultMessage='Strong'
                                />
                              </div>
                            );
                          }
                          return (
                            <div style={{ color: token.colorError }}>
                              <FormattedMessage
                                id='pages.login.password.strengthWeak'
                                defaultMessage='Weak'
                              />
                            </div>
                          );
                        },
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
                              id='pages.login.password.required'
                              defaultMessage='Please input your password!'
                            />
                          ),
                        },
                        {
                          pattern:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
                          message: (
                            <FormattedMessage
                              id='pages.login.password.validation'
                              defaultMessage='Password is invalid!'
                            />
                          ),
                        },
                      ]}
                      hasFeedback
                    />
                    <ProFormText.Password
                      name='confirmPassword'
                      fieldProps={{
                        size: 'middle',
                        prefix: <LockOutlined />,
                      }}
                      dependencies={['password']}
                      hasFeedback
                      placeholder={intl.formatMessage({
                        id: 'pages.login.confirmPassword.placeholder',
                        defaultMessage: 'Confirm Password',
                      })}
                      rules={[
                        {
                          required: true,
                          message: (
                            <FormattedMessage
                              id='pages.login.confirmPassword.required'
                              defaultMessage='Please confirm your password!'
                            />
                          ),
                        },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error(
                                intl.formatMessage({
                                  id: 'pages.login.password.confirm.error',
                                  defaultMessage: 'The two passwords do not match!',
                                }),
                              ),
                            );
                          },
                        }),
                      ]}
                    />
                    <div
                      style={{
                        marginBottom: 24,
                        justifyContent: 'center',
                        textAlign: 'center',
                      }}
                    >
                      <FormattedMessage
                        id='pages.login.terms'
                        defaultMessage='By signing up, you agree to our {termsOfService} and {privacyPolicy}.'
                        values={{
                          termsOfService: termsOfServiceLink,
                          privacyPolicy: privacyPolicyLink,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginBottom: 24,
                      }}
                    >
                      <Button
                        block
                        type='primary'
                        size='large'
                        loading={loading}
                        disabled={sendComplete}
                        onClick={async () => {
                          const values = await formRefLogin.current?.validateFields();
                          await handleSubmit(values);
                        }}
                      >
                        <FormattedMessage
                          id='pages.login.register.submit'
                          defaultMessage='Sign Up'
                        />
                      </Button>
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
