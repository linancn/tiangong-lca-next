import { currentUser } from '@/services/ant-design-pro/api';
import {
  CloseOutlined,
  IdcardOutlined,
  MailOutlined,
  ProfileOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Spin, Tooltip } from 'antd';
import type { ButtonType } from 'antd/es/button';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  buttonType?: string;
  userId?: string;
  buttonTypeProp?: ButtonType;
};

const AccountView: FC<Props> = ({ buttonType = 'icon', buttonTypeProp = 'default' }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<API.CurrentUser | null>(null);
  const intl = useIntl();

  const accountContent: React.ReactNode = (
    <>
      <Descriptions bordered size={'small'} column={1}>
        <Descriptions.Item
          label={<FormattedMessage id='pages.account.profile.userid' defaultMessage='User ID' />}
          labelStyle={{ width: '120px' }}
        >
          {initData?.userid || '-'}
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Card
        size='small'
        title={
          <FormattedMessage id='pages.account.info.title' defaultMessage='Account Information' />
        }
      >
        <Descriptions bordered size={'small'} column={1}>
          <Descriptions.Item
            label={<FormattedMessage id='pages.account.profile.email' defaultMessage='Email' />}
            labelStyle={{ width: '120px' }}
          >
            <MailOutlined style={{ marginRight: 8 }} />
            {initData?.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={<FormattedMessage id='pages.account.profile.role' defaultMessage='Role' />}
            labelStyle={{ width: '120px' }}
          >
            <IdcardOutlined style={{ marginRight: 8 }} />
            {initData?.role
              ? intl.formatMessage({
                  id: `pages.account.profile.role.${initData.role}`,
                  defaultMessage: initData.role,
                })
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <FormattedMessage id='pages.account.profile.nickName' defaultMessage='Nickname' />
            }
            labelStyle={{ width: '120px' }}
          >
            <UserOutlined style={{ marginRight: 8 }} />
            {initData?.name || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  );

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    currentUser()
      .then((result) => {
        setInitData(result);
      })
      .finally(() => {
        setSpinning(false);
      });
  };

  return (
    <>
      {buttonType === 'icon' ? (
        <Tooltip
          title={<FormattedMessage id='pages.account.view.tooltip' defaultMessage='View Account' />}
        >
          <Button
            shape='circle'
            type={buttonTypeProp}
            icon={<ProfileOutlined />}
            size='small'
            onClick={onView}
          />
        </Tooltip>
      ) : (
        <Button onClick={onView}>
          <FormattedMessage id='pages.account.view.button' defaultMessage='View Account' />
        </Button>
      )}

      <Drawer
        getContainer={() => document.body}
        title={
          <FormattedMessage
            id='pages.account.drawer.title.view'
            defaultMessage='View Account Information'
          />
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={true}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>{accountContent}</Spin>
      </Drawer>
    </>
  );
};

export default AccountView;
