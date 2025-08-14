import { getAuth } from '@/services/manageWelcomeTeams/api';
import { getLatestReviewOfMine } from '@/services/reviews/api';
import { getLatestRolesOfMine } from '@/services/roles/api';
import { MessageOutlined } from '@ant-design/icons';
import { Badge, Modal, Select, Space, Tabs, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';
import DataNotification from './DataNotification';
import TeamNotification from './TeamNotification';

const TIME_FILTER_OPTIONS = (intl: any) => [
  {
    value: 3,
    label: intl.formatMessage({
      id: 'notification.timeFilter.3days',
      defaultMessage: 'Last 3 Days',
    }),
  },
  {
    value: 7,
    label: intl.formatMessage({
      id: 'notification.timeFilter.7days',
      defaultMessage: 'Last 7 Days',
    }),
  },
  {
    value: 30,
    label: intl.formatMessage({
      id: 'notification.timeFilter.30days',
      defaultMessage: 'Last 30 Days',
    }),
  },
  {
    value: 0,
    label: intl.formatMessage({ id: 'notification.timeFilter.all', defaultMessage: 'All' }),
  },
];

const Notification: React.FC = () => {
  const [showDot, setShowDot] = useState<boolean>(false);
  const [showDotTabs, setShowDotTabs] = useState<('team' | 'data')[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<number>(3);
  const { token } = theme.useToken();
  const intl = useIntl();

  const removeItemFromDotTabs = (item: 'team' | 'data') => {
    setShowDotTabs((prev) => prev.filter((i) => i !== item));
  };

  const updateShowTabs = async () => {
    const auth = await getAuth();
    const update_team_notification_time =
      auth?.user?.user_metadata?.update_team_notification_time ?? 0;
    const update_data_notification_time =
      auth?.user?.user_metadata?.update_data_notification_time ?? 0;
    const latestReview = await getLatestReviewOfMine();
    const latestRoles = await getLatestRolesOfMine();

    if (update_data_notification_time && latestReview && latestReview.modified_at) {
      const reviewTime = new Date(latestReview.modified_at).getTime();
      if (reviewTime > update_data_notification_time) {
        setShowDotTabs((prev) => [...prev, 'data']);
      }
    }

    if (update_team_notification_time && latestRoles && latestRoles.modified_at) {
      const rolesTime = new Date(latestRoles.modified_at).getTime();
      if (rolesTime > update_team_notification_time) {
        setShowDotTabs((prev) => [...prev, 'team']);
      }
    }
  };

  useEffect(() => {
    setShowDot(showDotTabs.length > 0);
  }, [showDotTabs]);

  useEffect(() => {
    updateShowTabs();
  }, []);

  const handleIconClick = () => {
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  const handleTimeFilterChange = (value: number) => {
    setTimeFilter(value);
  };

  const items = [
    {
      key: 'team',
      label: (
        <Badge dot={showDotTabs.includes('team')} offset={[5, 0]} size='small'>
          <span>
            {intl.formatMessage({
              id: 'notification.tabs.team',
              defaultMessage: 'Team Notifications',
            })}
          </span>
        </Badge>
      ),
      children: (
        <TeamNotification timeFilter={timeFilter} removeItemFromDotTabs={removeItemFromDotTabs} />
      ),
    },
    {
      key: 'data',
      label: (
        <Badge dot={showDotTabs.includes('data')} offset={[5, 0]} size='small'>
          <span>
            {intl.formatMessage({
              id: 'notification.tabs.data',
              defaultMessage: 'Data Notifications',
            })}
          </span>
        </Badge>
      ),
      children: (
        <DataNotification timeFilter={timeFilter} removeItemFromDotTabs={removeItemFromDotTabs} />
      ),
    },
  ];

  return (
    <>
      <Badge dot={showDot} offset={[-5, 6]} size='small'>
        <MessageOutlined
          style={{ fontSize: 16, opacity: 0.5, cursor: 'pointer' }}
          onClick={handleIconClick}
        />
      </Badge>

      <Modal
        title={
          <Space>
            <span>
              {intl.formatMessage({
                id: 'notification.title',
                defaultMessage: 'Notifications',
              })}
            </span>
          </Space>
        }
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
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, right: 0, zIndex: 9999 }}>
            <Select
              value={timeFilter}
              onChange={handleTimeFilterChange}
              options={TIME_FILTER_OPTIONS(intl)}
              style={{ width: 120 }}
              size='middle'
            />
          </div>
          <Tabs items={items} defaultActiveKey='team' />
        </div>
      </Modal>
    </>
  );
};

export default Notification;
