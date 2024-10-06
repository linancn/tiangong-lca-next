import { Footer } from '@/components';
import { currentUser, setPassword } from '@/services/ant-design-pro/api';
import { validatePasswordStrength } from '@/services/general/util';
import { FormattedMessage, history } from '@umijs/max';
import { App, Button, ConfigProvider, Form, Input, Space, Spin, Tabs, message, theme } from 'antd';
import { useEffect, useState, type FC } from 'react';
import { Helmet, useIntl, SelectLang } from 'umi';
import Settings from '../../../../config/defaultSettings';
import { ProConfigProvider, ProLayout, LoginForm } from '@ant-design/pro-components';


const PasswordSet: FC = () => {
  const [initData, setInitData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendMailMessage, setSendMailMessage] = useState<any>(<></>);
  const intl = useIntl();
  const [spinning, setSpinning] = useState(false);
  const isDarkMode = localStorage.getItem('isDarkMode') === 'true';

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      setLoading(true);
      const msg = await setPassword(values);
      setLoading(false);
      if (msg.status === 'ok') {
        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.password.set.success',
          defaultMessage: 'The password was setted successfully!',
        });
        message.success(defaultLoginSuccessMessage);
        setSendMailMessage(
          <FormattedMessage
            id="pages.login.password.set.success"
            defaultMessage="The password was setted successfully!"
          />,
        );
        history.push('/');
        return;
      }
      setSendMailMessage(
        <>
          <FormattedMessage
            id="pages.login.password.set.failure"
            defaultMessage="The password was not setted successfully, please try again!"
          />
          <br />
          <br />({msg.message})
        </>,
      );
      return;
    } catch (error) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.password.set.failure',
        defaultMessage: 'The password was not setted successfully, please try again!',
      });
      message.error(defaultLoginFailureMessage);
    }
  };

  useEffect(() => {
    if (spinning) {
      currentUser().then((res) => {
        if (!res?.userid) {
          return;
        }
        setInitData([
          {
            name: ['userid'],
            value: res?.userid ?? '',
          },
          {
            name: ['email'],
            value: res?.email ?? '',
          },
        ]);
        setSpinning(false);
      });
    }
  }, [spinning]);

  useEffect(() => {
    setSpinning(true);
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
                  id: 'menu.password_reset',
                  defaultMessage: 'Reset Password',
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
                name="password_reset"
                fields={initData}
                onFinish={async (values) => {
                  await handleSubmit(values as API.LoginParams);
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
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item hidden name={'userid'}>
                    <Input disabled={true} />
                  </Form.Item>
                  <Form.Item name={'email'}>
                    <Input disabled={true} style={{ color: '#000' }} />
                  </Form.Item>

                  <Form.Item
                    name="new1"
                    label={
                      <FormattedMessage
                        id="pages.account.password.new1"
                        defaultMessage="New Password"
                      />
                    }
                    rules={[
                      {
                        required: true,
                        message: 'Please input a new password!',
                      },
                      {
                        validator: validatePasswordStrength,
                      },
                    ]}
                    hasFeedback
                  >
                    <Input.Password />
                  </Form.Item>

                  <Form.Item
                    name="new2"
                    label={
                      <FormattedMessage
                        id="pages.account.password.new2"
                        defaultMessage="Confirm Password"
                      />
                    }
                    rules={[
                      {
                        required: true,
                        message: 'Please input the new password again!',
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('new1') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(
                            new Error('The new password that you entered do not match!'),
                          );
                        },
                      }),
                    ]}
                    hasFeedback
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item>
                    <Button block type="primary" htmlType="submit" size="large" loading={loading}>
                      <FormattedMessage id="pages.button.submit" defaultMessage="Submit" />
                    </Button>
                  </Form.Item>
                  <Form.Item>{sendMailMessage}</Form.Item>
                </Space>
              </LoginForm>
            </Spin>
            </div>
            <Footer />
          </ProLayout>
        </ProConfigProvider>
      </ConfigProvider>
    </App>
  );
};

export default PasswordSet;
