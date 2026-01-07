import {
  getFreshUserMetadata,
  updateDataNotificationTime,
  updateTeamNotificationTime,
} from '@/services/auth';
import { getNotifyReviewsCount } from '@/services/reviews/api';
import { getTeamInvitationCountApi } from '@/services/roles/api';
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
  const [unreadCounts, setUnreadCounts] = useState<{
    total: number;
    team: number;
    data: number;
  }>({
    total: 0,
    team: 0,
    data: 0,
  });
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<number>(3);
  // Track which tabs have had their notification time updated (to avoid duplicate updates)
  const [tabsViewed, setTabsViewed] = useState<{ team: boolean; data: boolean }>({
    team: false,
    data: false,
  });
  const { token } = theme.useToken();
  const intl = useIntl();

  const updateUnreadCounts = async () => {
    // Get fresh user metadata from database (not from cached JWT claims)
    const user = await getFreshUserMetadata();
    const lastTeamViewTime = user?.update_team_notification_time ?? 0;
    const lastDataViewTime = user?.update_data_notification_time ?? 0;

    // Get data notification count (only count records newer than last view time)
    const dataCountRes = await getNotifyReviewsCount(3, lastDataViewTime);
    const dataCount = dataCountRes.success ? dataCountRes.total : 0;

    // Get team notification count (only count records newer than last view time)
    const teamCountRes = await getTeamInvitationCountApi(3, lastTeamViewTime);
    const teamCount = teamCountRes.success ? teamCountRes.total : 0;

    // Update all counts
    setUnreadCounts({
      total: dataCount + teamCount,
      data: dataCount,
      team: teamCount,
    });
  };

  useEffect(() => {
    updateUnreadCounts();
  }, []);

  const handleIconClick = () => {
    setModalVisible(true);
    // Reset viewed state when opening modal
    setTabsViewed({ team: false, data: false });
  };

  const handleModalClose = () => {
    setModalVisible(false);
  };

  // Callback when team notification data is loaded
  const handleTeamDataLoaded = async () => {
    if (!tabsViewed.team) {
      await updateTeamNotificationTime();
      setTabsViewed((prev) => ({ ...prev, team: true }));
      setUnreadCounts((prev) => ({
        ...prev,
        team: 0,
        total: prev.data, // total = data count (team is now 0)
      }));
    }
  };

  // Callback when data notification data is loaded
  const handleDataDataLoaded = async () => {
    if (!tabsViewed.data) {
      await updateDataNotificationTime();
      setTabsViewed((prev) => ({ ...prev, data: true }));
      setUnreadCounts((prev) => ({
        ...prev,
        data: 0,
        total: prev.team, // total = team count (data is now 0)
      }));
    }
  };

  const handleTimeFilterChange = (value: number) => {
    setTimeFilter(value);
  };

  const badgeStyles = {
    backgroundColor: '#ff4d4f',
    borderRadius: '7px',
    minWidth: '14px',
    height: '14px',
    lineHeight: '14px',
    padding: '0 4px',
    fontSize: '9px',
  };

  const items = [
    {
      key: 'team',
      label: (
        <Badge
          count={unreadCounts.team}
          offset={[5, 0]}
          size='small'
          showZero={false}
          style={badgeStyles}
        >
          <span>
            {intl.formatMessage({
              id: 'notification.tabs.team',
              defaultMessage: 'Team Notifications',
            })}
          </span>
        </Badge>
      ),
      children: <TeamNotification timeFilter={timeFilter} onDataLoaded={handleTeamDataLoaded} />,
    },
    {
      key: 'data',
      label: (
        <Badge
          count={unreadCounts.data}
          offset={[5, 0]}
          size='small'
          showZero={false}
          style={badgeStyles}
        >
          <span>
            {intl.formatMessage({
              id: 'notification.tabs.data',
              defaultMessage: 'Data Notifications',
            })}
          </span>
        </Badge>
      ),
      children: <DataNotification timeFilter={timeFilter} onDataLoaded={handleDataDataLoaded} />,
    },
  ];

  return (
    <>
      <Badge
        count={unreadCounts.total}
        offset={[-5, 6]}
        size='small'
        showZero={false}
        style={badgeStyles}
      >
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
