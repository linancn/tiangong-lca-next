import { getUsersByIds } from '@/services/users/api';
import { CloseOutlined, MailOutlined, ProfileOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Drawer, Spin, Tooltip } from 'antd';
import type { ButtonType } from 'antd/es/button';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  buttonType?: string;
  userId: string;
  buttonTypeProp?: ButtonType;
};

const AccountView: FC<Props> = ({ buttonType = 'icon', buttonTypeProp = 'default', userId }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [initData, setInitData] = useState<any>(null);
  // const intl = useIntl();

  const accountContent: React.ReactNode = (
    <>
      <Descriptions
        bordered
        size='small'
        column={1}
        items={[
          {
            key: 'user-id',
            label: <FormattedMessage id='pages.account.profile.userid' defaultMessage='User ID' />,
            styles: { label: { width: '120px' } },
            children: initData?.id || '-',
          },
        ]}
      />
      <br />
      <Card
        size='small'
        title={
          <FormattedMessage id='pages.account.info.title' defaultMessage='Account Information' />
        }
      >
        <Descriptions
          bordered
          size='small'
          column={1}
          items={[
            {
              key: 'email',
              label: <FormattedMessage id='pages.account.profile.email' defaultMessage='Email' />,
              styles: { label: { width: '120px' } },
              children: (
                <>
                  <MailOutlined style={{ marginRight: 8 }} />
                  {initData?.email || '-'}
                </>
              ),
            },
            {
              key: 'nickname',
              label: (
                <FormattedMessage id='pages.account.profile.nickName' defaultMessage='Nickname' />
              ),
              styles: { label: { width: '120px' } },
              children: (
                <>
                  <UserOutlined style={{ marginRight: 8 }} />
                  {initData?.display_name || '-'}
                </>
              ),
            },
          ]}
        />
      </Card>
    </>
  );

  const onView = () => {
    setDrawerVisible(true);
    setSpinning(true);
    getUsersByIds([userId])
      .then((result) => {
        setInitData(result?.[0] ?? null);
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
        size='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <Spin spinning={spinning}>{accountContent}</Spin>
      </Drawer>
    </>
  );
};

export default AccountView;
