import { Footer } from '@/components';
import { login, sendMagicLink } from '@/services/ant-design-pro/api';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { ProFormText } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Alert, Button, Form, message, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Helmet, history, SelectLang, useIntl, useModel } from 'umi';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      marginLeft: '8px',
      color: 'rgba(0, 0, 0, 0.2)',
      fontSize: '24px',
      verticalAlign: 'middle',
      cursor: 'pointer',
      transition: 'color 0.3s',
      '&:hover': {
        color: token.colorPrimaryActive,
      },
    },
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
    'ant-btn-lg': {
      display: 'none',
    }
  };
});

// const ActionIcons = () => {
//   const { styles } = useStyles();

//   return (
//     <>
//       <AlipayCircleOutlined key="AlipayCircleOutlined" className={styles.action} />
//       <TaobaoCircleOutlined key="TaobaoCircleOutlined" className={styles.action} />
//       <WeiboCircleOutlined key="WeiboCircleOutlined" className={styles.action} />
//     </>
//   );
// };

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<string>('password');
  const [loading, setLoading] = useState<boolean>(false);
  const [sendMailMessage, setSendMailMessage] = useState<any>(<></>);
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const intl = useIntl();

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
          const defaultLoginSuccessMessage = intl.formatMessage({
            id: 'pages.login.email.success',
            defaultMessage: 'The email was sent successfully, please login from the magic link in the email!',
          });
          message.success(defaultLoginSuccessMessage);
          setSendMailMessage(
            <FormattedMessage
              id='pages.login.email.success'
              defaultMessage='The email was sent successfully, please login from the magic link in the email!'
            />
          );
          return;
        }
        setSendMailMessage(
          <FormattedMessage
            id='pages.login.email.failure'
            defaultMessage='The email was not sent successfully, please try again!'
          />
        );
        return;
      }
      else if (type === 'password') {
        // 登录
        const msg = await login({ ...values, type });
        if (msg.status === 'ok') {
          const defaultLoginSuccessMessage = intl.formatMessage({
            id: 'pages.login.success',
            defaultMessage: 'Login successful!',
          });
          message.success(defaultLoginSuccessMessage);
          await fetchUserInfo();
          const urlParams = new URL(window.location.href).searchParams;
          history.push(urlParams.get('redirect') || '/');
          return;
        }
        console.log(msg);
        // 如果失败去设置用户错误信息
        setUserLoginState(msg);
      }
    } catch (error) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: 'Login failed, please try again!',
      });
      message.error(defaultLoginFailureMessage);
    }
  };

  const { status, type: loginType } = userLoginState;

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: 'Login Page',
          })}
          - {Settings.title}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', margin: '50px 0' }}>
          <img
            src={Settings.logo}
            style={{
              height: '44px',
              marginRight: '16px',
            }}
          />
          <h1>{Settings.title}</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Form
            name="login"
            initialValues={{ remember: true }}
            style={{ width: 360 }}
            onFinish={async (values) => {
              await handleSubmit(values as API.LoginParams);
            }}
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
              </>
            )}

            {status === 'error' && loginType === 'email' && (
              <LoginMessage
                content={intl.formatMessage({
                  id: 'pages.login.emailLogin.errorMessage',
                  defaultMessage: 'Wrong email address or email address is not registered',
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
                      required: true,
                      message: (
                        <FormattedMessage
                          id="pages.login.email.required"
                          defaultMessage="Please input your email!"
                        />
                      ),
                    },
                  ]}
                />
              </>
            )}

            <Form.Item>
              <Button block type="primary" htmlType="submit" size="large" loading={loading}>
                {type === 'password' && (
                  <FormattedMessage
                    id="pages.login.submit"
                    defaultMessage="Login"
                  />)}
                {type === 'email' && (
                  <FormattedMessage
                    id="pages.login.email.submit"
                    defaultMessage="Login"
                  />)}
              </Button>
            </Form.Item>
            <Form.Item>
              {sendMailMessage}
            </Form.Item>
          </Form>

        </div>

      </div>
      <Footer />
    </div>
  );
};

export default Login;
