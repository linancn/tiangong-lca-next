import { Footer } from '@/components';
import { currentUser, forgotPasswordSendEmail } from '@/services/ant-design-pro/api';
import { MailOutlined } from '@ant-design/icons';
import { ProFormText } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Button, Form, Space, Spin, message } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState, type FC } from 'react';
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

const PasswordForgot: FC = () => {
  const { styles } = useStyles();
  const [initData, setInitData] = useState<API.CurrentUser>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [sendMailMessage, setSendMailMessage] = useState<any>(<>123</>);
  const [sendComplete, setSendComplete] = useState(false);
  const intl = useIntl();

  const [spinning, setSpinning] = useState(false);

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      setLoading(true);
      const msg = await forgotPasswordSendEmail(values);
      setLoading(false);
      if (msg.status === 'ok') {
        setSendComplete(true);
        // const defaultLoginSuccessMessage = intl.formatMessage({
        //   id: 'pages.login.password.forgot.success',
        //   defaultMessage: 'The email was setted successfully!',
        // });
        // message.success(defaultLoginSuccessMessage);
        setSendMailMessage(
          <FormattedMessage
            id="pages.login.password.forgot.success"
            defaultMessage="The email was setted successfully! Please follow the email link to reset your password."
          />,
        );
        return;
      } else {
        setSendMailMessage(
          <>
            <FormattedMessage
              id="pages.login.password.forgot.failure"
              defaultMessage="The email was not setted successfully, please try again!"
            />
            <br />({msg.message})
          </>,
        );
        message.error(sendMailMessage);
        return;
      }
    } catch (error) {
      setSendMailMessage(
        <>
          <FormattedMessage
            id="pages.login.password.forgot.failure"
            defaultMessage="The email was not setted successfully, please try again!"
          />
          <br />({error})
        </>,
      );
      message.error(sendMailMessage);
      return;
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
            id: 'menu.password_forgot',
            defaultMessage: 'Forgot Password',
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
                <Form.Item>
                  <Button
                    block
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    disabled={sendComplete}
                  >
                    <FormattedMessage
                      id="pages.login.email.verify"
                      defaultMessage="Send Verify Email"
                    />
                  </Button>
                </Form.Item>
                <Form.Item hidden={!sendComplete}>{sendMailMessage}</Form.Item>
              </Space>
            </Form>
          </Spin>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PasswordForgot;
