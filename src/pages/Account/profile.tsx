import { currentUser } from '@/services/ant-design-pro/api';
import { PageContainer, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Form, Input, Space, Spin } from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';

const Profile: FC = () => {
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();

  useEffect(() => {
    setSpinning(true);
    currentUser().then((res) => {
      formRefEdit.current?.setFieldsValue(res);
      setSpinning(false);
    });
  }, []);

  return (
    <PageContainer
      title={<FormattedMessage id="menu.account.profile" defaultMessage="Account Profile" />}
    >
      <Spin spinning={spinning}>
        <ProForm
          formRef={formRefEdit}
          submitter={{
            render: () => {
              return [];
            },
          }}
          onFinish={async () => {}}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name={'userid'} hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label={<FormattedMessage id="pages.account.profile.email" defaultMessage="Email" />}
              name={'email'}
            >
              <Input disabled={true} style={{ color: '#000' }} />
            </Form.Item>
            <Form.Item
              label={<FormattedMessage id="pages.account.profile.role" defaultMessage="Role" />}
              name={'role'}
            >
              <Input disabled={true} style={{ color: '#000' }} />
            </Form.Item>
          </Space>
        </ProForm>
      </Spin>
    </PageContainer>
  );
};

export default Profile;
