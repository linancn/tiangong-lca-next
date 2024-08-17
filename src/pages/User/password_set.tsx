import { Footer } from '@/components';
import { currentUser, setPassword } from '@/services/ant-design-pro/api';
import { validatePasswordStrength } from '@/services/general/util';
import { ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage, history } from '@umijs/max';
import { Button, Form, Input, message, Space, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState, type FC } from 'react';
import { Helmet, SelectLang, useIntl } from 'umi';
import Settings from '../../../config/defaultSettings';

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
    },
  };
});

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const PasswordSet: FC = () => {
  const { styles } = useStyles();
  const formRefEdit = useRef<ProFormInstance>();
  const [initData, setInitData] = useState<API.CurrentUser>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [sendMailMessage, setSendMailMessage] = useState<any>(<></>);
  const intl = useIntl();

  const [spinning, setSpinning] = useState(false);

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
        <FormattedMessage
          id="pages.login.password.set.failure"
          defaultMessage="The password was not setted successfully, please try again!"
        />,
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
    setSpinning(true);
    currentUser().then((res) => {
      setInitData(res ?? {});
      setSpinning(false);
    });
  }, []);

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.password_set',
            defaultMessage: 'Set Password',
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
          <Spin spinning={spinning}>
            <Form
              name="password_set"
              layout={'vertical'}
              initialValues={initData}
              style={{ width: 360 }}
              onFinish={async (values) => {
                await handleSubmit(values as API.LoginParams);
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name={'userid'} hidden>
                  <Input />
                </Form.Item>
                <Form.Item hidden name={'email'}>
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
                    {
                      validator: (_, value) => {
                        if (!value || formRefEdit.current?.getFieldValue('new1') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error('The two passwords that you entered do not match!'),
                        );
                      },
                    },
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
            </Form>
          </Spin>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PasswordSet;
