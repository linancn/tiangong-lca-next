import { getTeamInvitationStatusApi } from '@/services/roles/api';
import { MessageOutlined } from '@ant-design/icons';
import { Badge, Modal, Tabs, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';
import DataNotification from './DataNotification';
import TeamNotification from './TeamNotification';

const Notification: React.FC = () => {
  const [isBeInvited, setIsBeInvited] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const { token } = theme.useToken();
  const intl = useIntl();

  const checkTeamInvitation = async () => {
    try {
      const res = await getTeamInvitationStatusApi();
      if (res.success) {
        setIsBeInvited(res.data?.role === 'is_invited');
      } else {
        setIsBeInvited(false);
      }
    } catch (error) {
      setIsBeInvited(false);
    }
  };

  useEffect(() => {
    checkTeamInvitation();
  }, []);

  const handleIconClick = () => {
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const items = [
    {
      key: 'team',
      label: intl.formatMessage({
        id: 'notification.tabs.team',
        defaultMessage: 'Team Notifications',
      }),
      children: <TeamNotification />,
    },
    {
      key: 'data',
      label: intl.formatMessage({
        id: 'notification.tabs.data',
        defaultMessage: 'Data Notifications',
      }),
      children: <DataNotification />,
    },
  ];

  return (
    <>
      <Badge dot={isBeInvited} offset={[-5, 6]} size='small'>
        <MessageOutlined
          style={{ fontSize: 16, opacity: 0.5, cursor: 'pointer' }}
          onClick={handleIconClick}
        />
      </Badge>

      <Modal
        title={intl.formatMessage({
          id: 'notification.title',
          defaultMessage: 'Notifications',
        })}
        open={modalVisible}
        onCancel={handleModalClose}
        footer={null}
        width={800}
        okButtonProps={{
          style: { backgroundColor: token.colorPrimary },
        }}
        cancelButtonProps={{
          style: { borderColor: token.colorPrimary, color: token.colorPrimary },
        }}
      >
        <Tabs
          items={items}
          defaultActiveKey='team'
          // onChange={() => {
          //   checkTeamInvitation();
          // }}
        />
      </Modal>
    </>
  );
};

export default Notification;
