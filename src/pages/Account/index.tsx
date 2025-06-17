import {
  changeEmail,
  changePassword,
  currentUser,
  login,
  setProfile,
} from '@/services/ant-design-pro/api';
import { IdcardOutlined, LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { PageContainer, ProForm, ProFormInstance, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, useIntl, useModel } from '@umijs/max';
import { Flex, Form, Input, message, Spin, Tabs, theme } from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';

const Profile: FC = () => {
  const [activeTabKey, setActiveTabKey] = useState('baseInfo');
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [initData, setInitData] = useState<API.CurrentUser | null>(null);
  const [roleValue, setRoleValue] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const intl = useIntl();
  const { token } = theme.useToken();
  const { setInitialState } = useModel('@@initialState');

  const onTabChange = (key: string) => {
    if (activeTabKey === 'generateAPIKey' && key !== 'generateAPIKey' && apiKey) {
      setApiKey('');
    }

    setActiveTabKey(key);
  };

  const renderBaseForm = () => (
    <Flex gap='middle' vertical style={{ maxWidth: '50%', minWidth: '200px' }}>
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
          label={<FormattedMessage id='pages.account.profile.email' defaultMessage='Email' />}
          name={'email'}
        >
          <Input prefix={<MailOutlined />} disabled={true} />
        </Form.Item>
        <Form.Item
          label={<FormattedMessage id='pages.account.profile.role' defaultMessage='Role' />}
          name={'role'}
        >
          <Input prefix={<IdcardOutlined />} value={roleValue} disabled={true} />
        </Form.Item>
        <Form.Item
          label={<FormattedMessage id='pages.account.profile.nickName' defaultMessage='Nickname' />}
          name={'name'}
          tooltip={
            <FormattedMessage
              id='pages.account.profile.nickName.tooltip'
              defaultMessage='The name you prefer to be called'
            />
          }
        >
          <Input prefix={<UserOutlined />} />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  const renderChangePasswordForm = () => (
    <Flex gap='middle' vertical style={{ maxWidth: '50%', minWidth: '300px' }}>
      <ProForm
        formRef={formRefEdit}
        submitter={{
          render: (props, doms) => {
            return (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Flex gap='middle'>{doms}</Flex>
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
                intl.formatMessage({
                  id: 'pages.account.password.changed.success',
                  defaultMessage: 'Password changed successfully!',
                }),
              );
            } else {
              const errorMsg =
                msg.message && typeof msg.message === 'string' && msg.message.startsWith('pages.')
                  ? intl.formatMessage({ id: msg.message })
                  : msg.message;
              message.error(String(errorMsg));
            }
          } catch (error) {
            message.error(
              intl.formatMessage({
                id: 'pages.account.password.changeError',
                defaultMessage:
                  'A system error occurred while changing the password. Please try again later.',
              }),
            );
          } finally {
            setSpinning(false);
          }
        }}
      >
        <Form.Item name={'email'} initialValue={initData?.email} style={{ display: 'none' }}>
          <Input />
        </Form.Item>

        <Form.Item
          name='currentPassword'
          label={
            <FormattedMessage
              id='pages.account.password.currentPassword'
              defaultMessage='Current Password'
            />
          }
          tooltip={
            <FormattedMessage
              id='pages.account.password.currentPassword.tooltip'
              defaultMessage='Please enter your current account password to verify your identity.'
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='pages.account.currentPassword.required'
                  defaultMessage='Please input your current password!'
                />
              ),
            },
          ]}
          hasFeedback
        >
          <Input.Password prefix={<LockOutlined />} />
        </Form.Item>

        <ProFormText.Password
          name='newPassword'
          label={
            <FormattedMessage
              id='pages.account.password.newPassword'
              defaultMessage='New Password'
            />
          }
          fieldProps={{
            size: 'middle',
            prefix: <LockOutlined />,
            strengthText: (
              <FormattedMessage
                id='pages.account.newPassword.strengthText'
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
                      id='pages.account.newPassword.strengthMedium'
                      defaultMessage='Strength: Medium'
                    />
                  </div>
                );
              }
              if (pwdStatus === 'ok') {
                return (
                  <div style={{ color: token.colorSuccess }}>
                    <FormattedMessage
                      id='pages.account.newPassword.strengthStrong'
                      defaultMessage='Strength: Strong'
                    />
                  </div>
                );
              }
              return (
                <div style={{ color: token.colorError }}>
                  <FormattedMessage
                    id='pages.account.newPassword.strengthWeak'
                    defaultMessage='Strength: Weak'
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
                  id='pages.account.newPassword.required'
                  defaultMessage='Please input the new password!'
                />
              ),
            },
            {
              pattern:
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
              message: (
                <FormattedMessage
                  id='pages.account.newPassword.validation'
                  defaultMessage='Password is invalid!'
                />
              ),
            },
            {
              validator: (_, value) => {
                const currentPassword = formRefEdit.current?.getFieldValue('currentPassword');
                if (value && value === currentPassword) {
                  return Promise.reject(
                    new Error(
                      intl.formatMessage({
                        id: 'pages.account.newPassword.sameAsOld',
                        defaultMessage:
                          'New password should be different from the current password.',
                      }),
                    ),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          hasFeedback
        />

        <Form.Item
          name='confirmNewPassword'
          label={
            <FormattedMessage
              id='pages.account.password.confirmNewPassword'
              defaultMessage='Confirm New Password'
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='pages.account.confirmNewPassword.required'
                  defaultMessage='Please input the new password again!'
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
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={intl.formatMessage({
              id: 'pages.account.confirmNewPassword.placeholder',
              defaultMessage: 'Confirm New Password',
            })}
          />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  const renderChangeEmailForm = () => (
    <Flex gap='middle' vertical style={{ maxWidth: '50%', minWidth: '300px' }}>
      <ProForm
        formRef={formRefEdit}
        submitter={{
          render: (props, doms) => {
            return (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Flex gap='middle'>{doms}</Flex>
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
                intl.formatMessage({
                  id: 'pages.account.email.changed.success',
                  defaultMessage:
                    'Verification email sent successfully! Please update your email via the email link.',
                }),
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
              id='pages.account.email.currentEmail'
              defaultMessage='Current Email'
            />
          }
          initialValue={initData?.email}
        >
          <Input prefix={<MailOutlined />} disabled={true} />
        </Form.Item>

        <ProFormText
          name='newEmail'
          label={<FormattedMessage id='pages.account.newEmail' defaultMessage='New Email' />}
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
                  id='pages.account.newEmail.wrong-format'
                  defaultMessage='The email format is incorrect!'
                />
              ),
            },
            {
              required: true,
              message: (
                <FormattedMessage
                  id='pages.account.newEmail.required'
                  defaultMessage='Please input the new email!'
                />
              ),
            },
          ]}
          hasFeedback
        />

        <Form.Item
          name='confirmNewEmail'
          label={
            <FormattedMessage
              id='pages.account.email.confirmNewEmail'
              defaultMessage='Confirm New Email'
            />
          }
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='pages.account.confirmNewEmail.required'
                  defaultMessage='Please input the new email again!'
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
          <Input
            prefix={<MailOutlined />}
            placeholder={intl.formatMessage({
              id: 'pages.account.confirmNewEmail.placeholder',
              defaultMessage: 'Confirm New Email',
            })}
          />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  const renderGenerateAPIKey = () => {
    return (
      <Flex gap='middle' vertical style={{ maxWidth: '50%', minWidth: '300px' }}>
        <ProForm
          formRef={formRefEdit}
          submitter={{
            searchConfig: {
              submitText: intl.formatMessage({
                id: 'pages.account.apiKey.generateButton',
                defaultMessage: 'Generate Key',
              }),
            },
            render: (props, doms) => {
              return (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Flex gap='middle'>{doms}</Flex>
                </div>
              );
            },
          }}
          onFinish={async (values) => {
            setSpinning(true);
            try {
              // First validate credentials by attempting to login
              const loginResult = await login({
                email: initData?.email || '',
                password: values.currentPassword,
              });

              if (loginResult.status !== 'ok') {
                message.error(
                  intl.formatMessage({
                    id: 'pages.account.invalidCredentials',
                    defaultMessage: 'Invalid credentials. Please check your password.',
                  }),
                );
                setSpinning(false);
                return false;
              }

              // If login successful, generate API key
              const payload = {
                email: initData?.email || '',
                password: values.currentPassword,
              };

              // Convert JSON to string and then to Base64
              const jsonString = JSON.stringify(payload, null, 0);
              const encodedKey = btoa(jsonString);

              setApiKey(encodedKey);

              const successMsg = intl.formatMessage({
                id: 'pages.account.apiKey.generated.success',
                defaultMessage: 'API Key generated successfully!',
              });
              message.success(successMsg);

              setSpinning(false);
              return true;
            } catch (error) {
              setSpinning(false);
              message.error(
                intl.formatMessage({
                  id: 'pages.account.apiKey.generateError',
                  defaultMessage:
                    'A system error occurred while generating the API key. Please try again later.',
                }),
              );
              return false;
            }
          }}
        >
          <Form.Item name={'email'} initialValue={initData?.email} style={{ display: 'none' }}>
            <Input />
          </Form.Item>

          <ProFormText.Password
            name='currentPassword'
            label={
              <FormattedMessage
                id='pages.account.password.currentPassword'
                defaultMessage='Current Password'
              />
            }
            tooltip={
              <FormattedMessage
                id='pages.account.apiKey.currentPassword.tooltip'
                defaultMessage='Please enter your current account password to verify your identity and generate the API Key.'
              />
            }
            fieldProps={{
              size: 'middle',
              prefix: <LockOutlined />,
              strengthText: (
                <FormattedMessage
                  id='pages.account.newPassword.strengthText'
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
                    <span style={{ color: token.colorWarning }}>
                      <FormattedMessage
                        id='pages.account.newPassword.strengthMedium'
                        defaultMessage='Strength: Medium'
                      />
                    </span>
                  );
                }
                if (pwdStatus === 'ok') {
                  return (
                    <span style={{ color: token.colorSuccess }}>
                      <FormattedMessage
                        id='pages.account.newPassword.strengthStrong'
                        defaultMessage='Strength: Strong'
                      />
                    </span>
                  );
                }
                return (
                  <span style={{ color: token.colorError }}>
                    <FormattedMessage
                      id='pages.account.newPassword.strengthWeak'
                      defaultMessage='Strength: Weak'
                    />
                  </span>
                );
              },
            }}
            placeholder={intl.formatMessage({
              id: 'pages.account.apiKey.currentPassword',
              defaultMessage: 'Current Password',
            })}
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id='pages.account.currentPassword.required'
                    defaultMessage='Please input your current password!'
                  />
                ),
              },
              {
                pattern:
                  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
                message: (
                  <FormattedMessage
                    id='pages.account.newPassword.validation'
                    defaultMessage='Password is invalid!'
                  />
                ),
              },
            ]}
            hasFeedback
          />

          {apiKey && (
            <Form.Item
              label={<FormattedMessage id='pages.account.apiKey' defaultMessage='API Key' />}
            >
              <Input.TextArea value={apiKey} autoSize={{ minRows: 2, maxRows: 6 }} readOnly />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                <div style={{ color: token.colorWarning, marginTop: 8 }}>
                  <FormattedMessage
                    id='pages.account.apiKey.viewed'
                    defaultMessage='Make sure to copy it to a secure location. This key will not be shown again.'
                  />
                </div>
              </div>
            </Form.Item>
          )}
        </ProForm>
      </Flex>
    );
  };

  useEffect(() => {
    setSpinning(true);
    currentUser().then((res) => {
      setInitData(res);
      setRoleValue(
        intl.formatMessage({
          id: `pages.account.profile.role.${res?.role}`,
          defaultMessage: res?.role,
        }),
      );
      formRefEdit.current?.setFieldsValue({
        ...res,
        role: intl.formatMessage({
          id: `pages.account.profile.role.${res?.role}`,
          defaultMessage: res?.role,
        }),
      });
      setSpinning(false);
    });
  }, [intl]);

  return (
    <PageContainer
      title={<FormattedMessage id='menu.account.profile' defaultMessage='Account Profile' />}
    >
      <Spin spinning={spinning}>
        <Tabs
          activeKey={activeTabKey}
          onChange={onTabChange}
          tabPosition='left'
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
            {
              key: 'generateAPIKey',
              label: intl.formatMessage({
                id: 'pages.account.generateAPIKey',
                defaultMessage: 'Generate API Key',
              }),
              children: renderGenerateAPIKey(),
            },
          ]}
        ></Tabs>
      </Spin>
    </PageContainer>
  );
};

export default Profile;
