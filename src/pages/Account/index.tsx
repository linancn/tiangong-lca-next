import { currentUser, setProfile, changePassword, changeEmail } from '@/services/ant-design-pro/api';
import { PageContainer, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Flex, Form, Input, message, Spin, Tabs } from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';

const Profile: FC = () => {
  const [activeTabKey, setActiveTabKey] = useState('baseInfo');
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [initData, setInitData] = useState<API.CurrentUser | null>(null);

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
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {dom}
            </div>
          ),
        }}
        onFinish={async (values) => {
          setSpinning(true);
          try {
            const msg = await setProfile(values);
            if (msg.status === 'ok') {
              message.success(
                <FormattedMessage
                  id="pages.flows.editsuccess"
                  defaultMessage="Edit Successfully!"
                />,
              );
            } else {
              message.error(msg?.message);
            }
          } catch (error) {
            message.error('An error occurred while updating the profile.');
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
                <Flex gap='middle'>
                  {doms}
                </Flex>
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
          name="current"
          label={
            <FormattedMessage
              id="pages.account.password.current"
              defaultMessage="Current Password"
            />
          }
          rules={[
            {
              required: true,
              message: 'Please input your current password!',
            },
          ]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="new1"
          label={
            <FormattedMessage id="pages.account.password.new1" defaultMessage="New Password" />
          }
          rules={[
            {
              required: true,
              message: 'Please input the new password again!',
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
                <Flex gap='middle'>
                  {doms}
                </Flex>
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

        <Form.Item name={'email'}
          label={
            <FormattedMessage
              id="pages.account.email.currentEmail"
              defaultMessage="Current Email"
            />
          }
          initialValue={initData?.email}>
          <Input disabled={true} />
        </Form.Item>

        <Form.Item
          name="newEmail"
          label={
            <FormattedMessage id="pages.account.email.newEmail" defaultMessage="New Email" />
          }
          rules={[
          ]}
          hasFeedback
        >
          <Input />
        </Form.Item>

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
              message: 'Please input the new password again!',
            },
            {
              validator: (_, value) => {
                if (!value || formRefEdit.current?.getFieldValue('newEmail') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error('The two email addresses that you entered do not match.'),
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
        <Tabs activeKey={activeTabKey} onChange={onTabChange} tabPosition="left"
          items={[
            {
              key: 'baseInfo',
              label: '基本信息',
              children: renderBaseForm(),
            },
            {
              key: 'changePassword',
              label: '修改密码',
              children: renderChangePasswordForm(),
            },
            {
              key: 'changeEmail',
              label: '修改邮箱',
              children: renderChangeEmailForm(),
            },
          ]}>
        </Tabs>
      </Spin>
    </PageContainer >
  );
};

export default Profile;
