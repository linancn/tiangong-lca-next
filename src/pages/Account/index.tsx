import {
  currentUser,
  setProfile,
  changePassword,
  changeEmail,
} from '@/services/ant-design-pro/api';
import { PageContainer, ProForm, ProFormInstance, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, useIntl, useModel } from '@umijs/max';
import { Flex, Form, Input, message, Spin, Tabs, theme } from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';
import { LockOutlined, MailOutlined } from '@ant-design/icons';

const Profile: FC = () => {
  const [activeTabKey, setActiveTabKey] = useState('baseInfo');
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [initData, setInitData] = useState<API.CurrentUser | null>(null);
  const intl = useIntl();
  const { token } = theme.useToken();
  const { setInitialState } = useModel('@@initialState');

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const renderBaseForm = () => (
    <Flex gap="middle" vertical style={{ maxWidth: '50%', minWidth: '200px' }}>
      <ProForm
        formRef={formRefEdit}
        submitter={{
          resetButtonProps: false,
          render: (_, dom) => (
            <div style={{ display: 'flex', justifyContent: 'center' }}>{dom}</div>
          ),
        }}
        onFinish={async (values) => {
          setSpinning(true);
          try {
            const msg = await setProfile(values);
            if (msg.status === 'ok') {
              message.success(
                intl.formatMessage({
                  id: 'pages.account.editsuccess',
                  defaultMessage: 'Edit Successfully!',
                }),
              );
              setInitialState((s) => ({
                ...s,
                currentUser: {
                  ...s?.currentUser,
                  name: values.name,
                },
              }));
            } else {
              message.error(msg?.message);
            }
          } catch (error) {
            message.error(
              intl.formatMessage({
                id: 'pages.account.updateError',
                defaultMessage: 'An error occurred while updating the profile.',
              }),
            );
          } finally {
            setSpinning(false);
          }
        }}
      >
        <Form.Item
          label={<FormattedMessage id="pages.account.profile.email" defaultMessage="Email" />}
          name={'email'}
        >
          <Input disabled={true} />
        </Form.Item>
        <Form.Item
          label={<FormattedMessage id="pages.account.profile.role" defaultMessage="Role" />}
          name={'role'}
        >
          <Input disabled={true} />
        </Form.Item>
        <Form.Item
          label={<FormattedMessage id="pages.account.profile.name" defaultMessage="Name" />}
          name={'name'}
          tooltip="The name you prefer to be called"
        >
          <Input />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  const renderChangePasswordForm = () => (
    <Flex gap="middle" vertical style={{ maxWidth: '50%', minWidth: '300px' }}>
      <ProForm
        formRef={formRefEdit}
        submitter={{
          render: (props, doms) => {
            return (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Flex gap="middle">{doms}</Flex>
              </div>
            );
          },
        }}
        onFinish={async (value) => {
          setSpinning(true);
          try {
            const msg = await changePassword(value);
            if (msg.status === 'ok') {
              formRefEdit.current?.resetFields();
              message.success(
                <FormattedMessage
                  id="pages.account.password.changed.success"
                  defaultMessage="Password changed successfully!"
                />,
              );
            } else {
              message.error(msg.message);
            }
          } catch (error) {
            message.error('An error occurred while changing the password.');
          } finally {
            setSpinning(false);
          }
        }}
      >
        <Form.Item name={'email'} initialValue={initData?.email} style={{ display: 'none' }}>
          <Input />
        </Form.Item>

        <Form.Item
          name="currentPassword"
          label={
            <FormattedMessage
              id="pages.account.password.currentPassword"
              defaultMessage="Current Password"
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="pages.account.currentPassword.required"
                  defaultMessage="Please input your current password!"
                />
              ),
            },
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

        <ProFormText.Password
          name="newPassword"
          label={
            <FormattedMessage
              id="pages.account.password.newPassword"
              defaultMessage="New Password"
            />
          }
          fieldProps={{
            size: 'middle',
            prefix: <LockOutlined />,
            strengthText: (
              <FormattedMessage
                id="pages.account.newPassword.strengthText"
                defaultMessage="Password must contain at least 8 characters, including lowercase and uppercase letters, digits, and symbols."
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
                      id="pages.account.newPassword.strengthMedium"
                      defaultMessage="Medium"
                    />
                  </div>
                );
              }
              if (pwdStatus === 'ok') {
                return (
                  <div style={{ color: token.colorSuccess }}>
                    <FormattedMessage
                      id="pages.account.newPassword.strengthStrong"
                      defaultMessage="Strong"
                    />
                  </div>
                );
              }
              return (
                <div style={{ color: token.colorError }}>
                  <FormattedMessage
                    id="pages.account.newPassword.strengthWeak"
                    defaultMessage="Weak"
                  />
                </div>
              );
            },
          }}
          placeholder={intl.formatMessage({
            id: 'pages.account.newPassword.placeholder',
            defaultMessage: 'New Password',
          })}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="pages.account.newPassword.required"
                  defaultMessage="Please input the new password!"
                />
              ),
            },
            {
              pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
              message: (
                <FormattedMessage
                  id="pages.account.newPassword.validation"
                  defaultMessage="Password is invalid!"
                />
              ),
            },
          ]}
          hasFeedback
        />

        <Form.Item
          name="confirmNewPassword"
          label={
            <FormattedMessage
              id="pages.account.password.confirmNewPassword"
              defaultMessage="Confirm New Password"
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="pages.account.confirmNewPassword.required"
                  defaultMessage="Please input the new password again!"
                />
              ),
            },
            {
              validator: (_, value) => {
                if (!value || formRefEdit.current?.getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    intl.formatMessage({
                      id: 'pages.account.passwordsDoNotMatch',
                      defaultMessage: 'The two passwords that you entered do not match!',
                    }),
                  ),
                );
              },
            },
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  const renderChangeEmailForm = () => (
    <Flex gap="middle" vertical style={{ maxWidth: '50%', minWidth: '300px' }}>
      <ProForm
        formRef={formRefEdit}
        submitter={{
          render: (props, doms) => {
            return (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Flex gap="middle">{doms}</Flex>
              </div>
            );
          },
        }}
        onFinish={async (value) => {
          setSpinning(true);
          try {
            const msg = await changeEmail(value);
            if (msg.status === 'ok') {
              formRefEdit.current?.resetFields();
              message.success(
                <FormattedMessage
                  id="pages.account.email.changed.success"
                  defaultMessage="Verification email sent successfully! Please update your email via the email link."
                />,
              );
            } else {
              message.error(msg.message);
            }
          } catch (error) {
            message.error('An error occurred while changing the email.');
          } finally {
            setSpinning(false);
          }
        }}
      >
        <Form.Item
          name={'email'}
          label={
            <FormattedMessage
              id="pages.account.email.currentEmail"
              defaultMessage="Current Email"
            />
          }
          initialValue={initData?.email}
        >
          <Input disabled={true} />
        </Form.Item>

        <ProFormText
          name="newEmail"
          label={<FormattedMessage id="pages.account.newEmail" defaultMessage="New Email" />}
          fieldProps={{
            size: 'middle',
            prefix: <MailOutlined />,
          }}
          placeholder={intl.formatMessage({
            id: 'pages.account.newEmail.placeholder',
            defaultMessage: 'Email',
          })}
          rules={[
            {
              type: 'email',
              message: (
                <FormattedMessage
                  id="pages.account.newEmail.wrong-format"
                  defaultMessage="The email format is incorrect!"
                />
              ),
            },
            {
              required: true,
              message: (
                <FormattedMessage
                  id="pages.account.newEmail.required"
                  defaultMessage="Please input the new email!"
                />
              ),
            },
          ]}
          hasFeedback
        />

        <Form.Item
          name="confirmNewEmail"
          label={
            <FormattedMessage
              id="pages.account.email.confirmNewEmail"
              defaultMessage="Confirm New Email"
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="pages.account.confirmNewEmail.required"
                  defaultMessage="Please input the new email again!"
                />
              ),
            },
            {
              validator: (_, value) => {
                if (!value || formRefEdit.current?.getFieldValue('newEmail') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    intl.formatMessage({
                      id: 'pages.account.emailsDoNotMatch',
                      defaultMessage: 'The two email addresses that you entered do not match.',
                    }),
                  ),
                );
              },
            },
          ]}
          hasFeedback
        >
          <Input />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  useEffect(() => {
    setSpinning(true);
    currentUser().then((res) => {
      setInitData(res);
      formRefEdit.current?.setFieldsValue(res);
      setSpinning(false);
    });
  }, []);

  return (
    <PageContainer
      title={<FormattedMessage id="menu.account.profile" defaultMessage="Account Profile" />}
    >
      <Spin spinning={spinning}>
        <Tabs
          activeKey={activeTabKey}
          onChange={onTabChange}
          tabPosition="left"
          items={[
            {
              key: 'baseInfo',
              label: intl.formatMessage({
                id: 'pages.account.baseInfo',
                defaultMessage: 'Basic Information',
              }),
              children: renderBaseForm(),
            },
            {
              key: 'changePassword',
              label: intl.formatMessage({
                id: 'pages.account.changePassword',
                defaultMessage: 'Change Password',
              }),
              children: renderChangePasswordForm(),
            },
            {
              key: 'changeEmail',
              label: intl.formatMessage({
                id: 'pages.account.changeEmail',
                defaultMessage: 'Change Email',
              }),
              children: renderChangeEmailForm(),
            },
          ]}
        ></Tabs>
      </Spin>
    </PageContainer>
  );
};

export default Profile;
