import { currentUser, setProfile } from '@/services/ant-design-pro/api';
import { PageContainer, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { FormattedMessage } from '@umijs/max';
import { Form, Input, message, Space, Spin } from 'antd';
import { useEffect, useRef, useState, type FC } from 'react';

const Profile: FC = () => {
  const [spinning, setSpinning] = useState(false);
  const formRefEdit = useRef<ProFormInstance>();
  const [initData, setInitData] = useState<API.CurrentUser | null>(null);

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
        <ProForm
          formRef={formRefEdit}
          onFinish={async (values) => {
            setSpinning(true);
            const msg = await setProfile(values);
            if (msg.status === 'ok') {
              message.success(
                <FormattedMessage
                  id="pages.flows.editsuccess"
                  defaultMessage="Edit Successfully!"
                />,
              );
              setSpinning(false);
            } else {
              message.error(msg?.message);
              setSpinning(false);
            }
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name={'userid'} hidden>
              <Input defaultValue={initData?.userid} />
            </Form.Item>
            <Form.Item
              label={<FormattedMessage id="pages.account.profile.name" defaultMessage="Name" />}
              name={'name'}
            >
              <Input defaultValue={initData?.name} />
            </Form.Item>
            <Form.Item
              label={<FormattedMessage id="pages.account.profile.email" defaultMessage="Email" />}
              name={'email'}
            >
              <Input disabled={true} style={{ color: '#000' }} defaultValue={initData?.email} />
            </Form.Item>
            <Form.Item
              label={<FormattedMessage id="pages.account.profile.role" defaultMessage="Role" />}
              name={'role'}
            >
              <Input disabled={true} style={{ color: '#000' }} defaultValue={initData?.role} />
            </Form.Item>
          </Space>
        </ProForm>
      </Spin>
    </PageContainer>
  );
};

export default Profile;
