import { changePassword, currentUser } from '@/services/ant-design-pro/api';
import { validatePasswordStrength } from '@/services/general/util';
import { PageContainer, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Form, Input, message, Space, Spin } from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';

const PasswordChange: FC = () => {
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  // const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  // const [countdown, setCountdown] = useState(60);

  // const handleClick = () => {
  //   setIsButtonDisabled(true);
  //   reauthenticate().then((res) => {
  //     if (res.status === 'ok') {
  //       message.success(
  //         <FormattedMessage
  //           id="pages.account.password.email.code.success"
  //           defaultMessage="The email code sended successfully!"
  //         />,
  //       );
  //     } else {
  //       message.error(res.message);
  //     }
  //   });
  // }

  // useEffect(() => {
  //   let timer: number | NodeJS.Timeout | undefined;
  //   if (isButtonDisabled) {
  //     timer = setInterval(() => {
  //       setCountdown((prevCountdown) => {
  //         if (prevCountdown <= 1) {
  //           clearInterval(timer);
  //           setIsButtonDisabled(false);
  //           return 60;
  //         }
  //         return prevCountdown - 1;
  //       });
  //     }, 1000);
  //   }
  //   return () => clearInterval(timer);
  // }, [isButtonDisabled]);

  useEffect(() => {
    setSpinning(true);
    currentUser().then((res) => {
      formRefEdit.current?.setFieldsValue(res);
      setSpinning(false);
    });
  }, []);

  return (
    <PageContainer>
      <Spin spinning={spinning}>
        <ProForm
          formRef={formRefEdit}
          submitter={{
            render: (props, doms) => {
              return [...doms];
            },
          }}
          onFinish={async (value) => {
            changePassword(value).then((res) => {
              if (res.status === 'ok') {
                formRefEdit.current?.resetFields();
                message.success(
                  <FormattedMessage
                    id="pages.account.password.changed.success"
                    defaultMessage="Password changed successfully!"
                  />,
                );
              } else {
                message.error(res.message);
              }
            });
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name={'userid'} hidden>
              <Input />
            </Form.Item>
            {/* <Space direction="horizontal">
              <Form.Item name={'email'}
                label={
                  <FormattedMessage
                    id="pages.account.profile.email"
                    defaultMessage="Email"
                  />}
              >
                <Input disabled={true} style={{ width: '300px', color: '#000' }} />
              </Form.Item>
              <Button
                style={{ marginTop: '6px' }}
                onClick={handleClick}
                disabled={isButtonDisabled}
              >
                {isButtonDisabled ? `Get Email Code (${countdown} s)` : 'Get Email Code'}
              </Button>
            </Space>
            <Form.Item
              name="code"
              label={
                <FormattedMessage
                  id="pages.account.password.code"
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
            </Form.Item> */}

            <Form.Item hidden name={'email'}>
              <Input disabled={true} style={{ color: '#000' }} />
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
          </Space>
        </ProForm>
      </Spin>
    </PageContainer>
  );
};

export default PasswordChange;
