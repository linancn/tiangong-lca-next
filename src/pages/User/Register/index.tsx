import { Footer } from '@/components';
import { reauthenticate, setPassword } from '@/services/ant-design-pro/api';
import { validatePasswordStrength } from '@/services/general/util';
import { FormattedMessage, history } from '@umijs/max';
import { Button, Form, Input, Space, Spin, message } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState, type FC } from 'react';
import { Helmet, SelectLang, useIntl } from 'umi';
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

const Register: FC = () => {
  const { styles } = useStyles();
  const [initData, setInitData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendMailMessage, setSendMailMessage] = useState<any>(<></>);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const intl = useIntl();

  const { TextArea } = Input;

  const [spinning, setSpinning] = useState(false);



  const handleClick = () => {
    setIsButtonDisabled(true);
    reauthenticate().then((res) => {
      console.log(res);
      if (res.status === 'ok') {
        message.success(
          <FormattedMessage
            id="pages.account.password.email.code.success"
            defaultMessage="The email code sended successfully!"
          />,
        );
      } else {
        message.error(res.message);
      }
    });
  }

  useEffect(() => {
    let timer: number | NodeJS.Timeout | undefined;
    if (isButtonDisabled) {
      timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(timer);
            setIsButtonDisabled(false);
            return 60;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isButtonDisabled]);

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

  }, [spinning]);

  useEffect(() => {

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
              fields={initData}
              style={{ width: 360 }}
              onFinish={async (values) => {
                await handleSubmit(values as API.LoginParams);
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item hidden name={'userid'}>
                  <Input disabled={true} />
                </Form.Item>
                <Space direction="horizontal">
                  <Form.Item name={'email'}
                    label={
                      <FormattedMessage
                        id="pages.account.profile.email"
                        defaultMessage="Email"
                      />}
                    rules={[
                      { type: 'email', },
                      { required: true, }
                    ]}
                  >
                    <Input style={{ width: '360px' }} />
                  </Form.Item>
                  <Button
                    style={{ marginTop: '6px' }}
                    onClick={handleClick}
                    disabled={isButtonDisabled}
                  >
                    {isButtonDisabled ?
                      <><FormattedMessage
                        id="pages.account.register.getEmailCode"
                        defaultMessage="Email"
                      />(${countdown} s)</>
                      :
                      <FormattedMessage
                        id="pages.account.register.getEmailCode"
                        defaultMessage="Email"
                      />
                    }
                  </Button>
                </Space>
                <Form.Item
                  name="code"
                  label={
                    <FormattedMessage
                      id="pages.account.register.emailCode"
                      defaultMessage="Email Code"
                    />
                  }
                  rules={[
                    {
                      required: true,
                      message: 'Please input your email code!',
                    },
                  ]}
                  hasFeedback
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="new1"
                  label={
                    <FormattedMessage
                      id="pages.account.password"
                      defaultMessage="Password"
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
                <Form.Item
                  label={<FormattedMessage id="pages.account.profile.name" defaultMessage="Name" />}
                  name={'name'}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label={<FormattedMessage id="pages.account.register.reason" defaultMessage="Reason for Registration" />}
                  name={'reason'}
                >
                  <TextArea rows={5} />
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

export default Register;
