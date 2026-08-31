import {
  changeEmail,
  changePassword,
  cognitoChangeEmail,
  cognitoChangePassword,
  getCurrentUser,
  setProfile,
} from '@/services/auth';
import { useAntdAppApi } from '@/contexts/AntdAppContext';
import {
  BankOutlined,
  IdcardOutlined,
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer, ProForm, ProFormInstance, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, useIntl, useModel } from '@umijs/max';
import { Flex, Form, Grid, Input, Spin, Tabs, theme } from 'antd';
import { useEffect, useRef, useState, type CSSProperties, type FC } from 'react';
import { formatAccountRole } from './roleMessage';
import OAuthConnections from './OAuthConnections';

export const ACCOUNT_FORM_CONTAINER_STYLE: CSSProperties = {
  width: '100%',
  maxWidth: 600,
  minWidth: 0,
};

export const getAccountTabPlacement = (isMobile: boolean) => (isMobile ? 'top' : 'start');

const Profile: FC = () => {
  const { message } = useAntdAppApi();
  const [activeTabKey, setActiveTabKey] = useState('baseInfo');
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance | undefined>(undefined);
  const [initData, setInitData] = useState<Auth.CurrentUser | null>(null);
  const [roleValue, setRoleValue] = useState<string>('');
  const intl = useIntl();
  const { token } = theme.useToken();
  const { setInitialState } = useModel('@@initialState');
  const useBreakpoint = Grid?.useBreakpoint ?? (() => ({}));
  const screens = useBreakpoint();
  const isMobile = screens.md === false;

  const onTabChange = (key: string) => setActiveTabKey(key);

  const renderBaseForm = () => (
    <Flex gap='middle' vertical style={ACCOUNT_FORM_CONTAINER_STYLE}>
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
              const organization = values.organization?.trim() ?? '';
              formRefEdit.current?.setFieldsValue({ organization });
              setInitData((current) =>
                current ? { ...current, ...values, organization } : current,
              );
              message.success(
                intl.formatMessage({
                  id: 'pages.account.editsuccess',
                  defaultMessage: 'Profile updated successfully.',
                }),
              );
              setInitialState((s) => ({
                ...s,
                currentUser: {
                  ...s?.currentUser,
                  name: values.name,
                  organization,
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
        <Form.Item
          label={
            <FormattedMessage
              id='pages.account.profile.organization'
              defaultMessage='Organization'
            />
          }
          name={'organization'}
          tooltip={
            <FormattedMessage
              id='pages.account.profile.organization.tooltip'
              defaultMessage='The organization or institution you belong to'
            />
          }
          rules={[
            {
              max: 200,
              message: (
                <FormattedMessage
                  id='pages.account.profile.organization.maxLength'
                  defaultMessage='Organization must not exceed 200 characters'
                />
              ),
            },
          ]}
        >
          <Input
            prefix={<BankOutlined />}
            maxLength={200}
            placeholder={intl.formatMessage({
              id: 'pages.account.profile.organization.placeholder',
              defaultMessage: 'Enter your organization',
            })}
          />
        </Form.Item>
      </ProForm>
    </Flex>
  );

  const renderChangePasswordForm = () => (
    <Flex gap='middle' vertical style={ACCOUNT_FORM_CONTAINER_STYLE}>
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
            await cognitoChangePassword(value.confirmNewPassword);
            const msg = await changePassword(value);
            if (msg.status === 'ok') {
              formRefEdit.current?.resetFields();
              message.success(
                intl.formatMessage({
                  id: 'pages.account.password.changed.success',
                  defaultMessage: 'Password changed successfully!',
                }),
              );
            } else if (msg.status === 'error') {
              if (msg.message === 'User not found') {
                message.error(
                  intl.formatMessage({
                    id: 'pages.account.userNotFound',
                    defaultMessage: 'User not found',
                  }),
                );
              } else if (msg.message === 'Password incorrect') {
                message.error(
                  intl.formatMessage({
                    id: 'pages.account.currentPassword.invalid',
                    defaultMessage: 'Invalid password',
                  }),
                );
              } else {
                message.error(msg.message);
              }
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
                  defaultMessage='Please input the current password!'
                />
              ),
            },
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={intl.formatMessage({
              id: 'pages.account.currentPassword.placeholder',
              defaultMessage: 'Current Password',
            })}
          />
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
    <Flex gap='middle' vertical style={ACCOUNT_FORM_CONTAINER_STYLE}>
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
            await cognitoChangeEmail(value.newEmail);
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
            defaultMessage: 'New Email',
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
                      defaultMessage: 'The two emails that you entered do not match!',
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

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      setSpinning(true);
      try {
        const res = await getAccountProfile();
        if (!active) {
          return;
        }
        setInitData(res);
        const localizedRole = formatAccountRole(intl, res?.role);
        setRoleValue(localizedRole);
        formRefEdit.current?.setFieldsValue({
          ...res,
          role: localizedRole,
        });
      } catch (error) {
        if (active) {
          message.error(
            intl.formatMessage({
              id: 'pages.account.loadError',
              defaultMessage: 'An error occurred while loading the account profile.',
            }),
          );
        }
      } finally {
        if (active) {
          setSpinning(false);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, [intl]);

  return (
    <PageContainer
      title={<FormattedMessage id='menu.account.profile' defaultMessage='Account Profile' />}
    >
      <Spin spinning={spinning}>
        <Tabs
          activeKey={activeTabKey}
          onChange={onTabChange}
          tabPlacement={getAccountTabPlacement(isMobile)}
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
              key: 'oauthConnections',
              label: intl.formatMessage({
                id: 'pages.account.oauth.tab',
                defaultMessage: 'Connected apps',
              }),
              children: <OAuthConnections email={initData?.email} />,
            },
          ]}
        ></Tabs>
      </Spin>
    </PageContainer>
  );
};

export default Profile;
