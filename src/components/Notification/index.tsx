import HeaderActionIcon from '@/components/HeaderActionIcon';
import {
  getFreshUserMetadata,
  updateDataNotificationTime,
  updateIssueNotificationTime,
  updateTeamNotificationTime,
} from '@/services/auth';
import { getNotificationsCount } from '@/services/notifications/api';
import { getNotifyReviewsCount } from '@/services/reviews/api';
import { getTeamInvitationCountApi } from '@/services/roles/api';
import { InfoCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { Badge, Modal, Select, Space, Tabs, theme } from 'antd';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';
import DataNotification from './DataNotification';
import IssueNotification from './IssueNotification';
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

type NotificationTabKey = 'team' | 'data' | 'issue';

const NotificationTabContent: React.FC<{ message: ReactNode; children: ReactNode }> = ({
  message,
  children,
}) => {
  const { token } = theme.useToken();

  return (
    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 0 4px',
          color: token.colorTextSecondary,
          fontSize: token.fontSizeSM,
          lineHeight: token.lineHeight,
        }}
      >
        <InfoCircleOutlined style={{ color: token.colorPrimary, flexShrink: 0 }} />
        <span>{message}</span>
      </div>
      {children}
    </Space>
  );
};

const Notification: React.FC = () => {
  const [unreadCounts, setUnreadCounts] = useState<{
    total: number;
    team: number;
    data: number;
    issue: number;
  }>({
    total: 0,
    team: 0,
    data: 0,
    issue: 0,
  });
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [timeFilter, setTimeFilter] = useState<number>(3);
  const [activeTabKey, setActiveTabKey] = useState<NotificationTabKey>('team');
  // Track which tabs have had their notification time updated (to avoid duplicate updates)
  const [tabsViewed, setTabsViewed] = useState<{ team: boolean; data: boolean; issue: boolean }>({
    team: false,
    data: false,
    issue: false,
  });
  const { token } = theme.useToken();
  const intl = useIntl();

  const updateUnreadCounts = async () => {
    // Get fresh user metadata from database (not from cached JWT claims)
    const user = await getFreshUserMetadata();
    const lastTeamViewTime = user?.update_team_notification_time ?? 0;
    const lastDataViewTime = user?.update_data_notification_time ?? 0;
    const lastIssueViewTime = user?.update_issue_notification_time ?? 0;

    // Get data notification count (only count records newer than last view time)
    const dataCountRes = await getNotifyReviewsCount(3, lastDataViewTime);
    const dataCount = dataCountRes.success ? dataCountRes.total : 0;

    const issueCountRes = await getNotificationsCount(3, lastIssueViewTime);
    const issueCount = issueCountRes.success ? issueCountRes.total : 0;

    // Get team notification count (only count records newer than last view time)
    const teamCountRes = await getTeamInvitationCountApi(3, lastTeamViewTime);
    const teamCount = teamCountRes.success ? teamCountRes.total : 0;

    // Update all counts
    setUnreadCounts({
      total: dataCount + teamCount + issueCount,
      data: dataCount,
      issue: issueCount,
      team: teamCount,
    });
  };

  useEffect(() => {
    updateUnreadCounts();
  }, []);

  const handleIconClick = () => {
    setModalVisible(true);
    setActiveTabKey('team');
    // Reset viewed state when opening modal
    setTabsViewed({ team: false, data: false, issue: false });
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
        total: prev.data + prev.issue,
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
        total: prev.team + prev.issue,
      }));
    }
  };

  const handleIssueDataLoaded = async () => {
    if (!tabsViewed.issue) {
      await updateIssueNotificationTime();
      setTabsViewed((prev) => ({ ...prev, issue: true }));
      setUnreadCounts((prev) => ({
        ...prev,
        issue: 0,
        total: prev.team + prev.data,
      }));
    }
  };

  const handleTimeFilterChange = (value: number) => {
    setTimeFilter(value);
  };

  const handleTabChange = (key: string) => {
    setActiveTabKey(key as NotificationTabKey);
  };

  const badgeStyles = {
    backgroundColor: token.colorError,
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
      children: (
        <NotificationTabContent
          message={intl.formatMessage({
            id: 'notification.source.team',
            defaultMessage: 'Notifications from team invitations.',
          })}
        >
          <TeamNotification timeFilter={timeFilter} onDataLoaded={handleTeamDataLoaded} />
        </NotificationTabContent>
      ),
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
      children: (
        <NotificationTabContent
          message={intl.formatMessage({
            id: 'notification.source.data',
            defaultMessage: 'Status changes from review workflows for data you submitted.',
          })}
        >
          <DataNotification timeFilter={timeFilter} onDataLoaded={handleDataDataLoaded} />
        </NotificationTabContent>
      ),
    },
    {
      key: 'issue',
      label: (
        <Badge
          count={unreadCounts.issue}
          offset={[5, 0]}
          size='small'
          showZero={false}
          style={badgeStyles}
        >
          <span>
            {intl.formatMessage({
              id: 'notification.tabs.issue',
              defaultMessage: 'Issue Notifications',
            })}
          </span>
        </Badge>
      ),
      children: (
        <NotificationTabContent
          message={intl.formatMessage({
            id: 'notification.source.issue',
            defaultMessage: 'Validation issue notifications reported by other users.',
          })}
        >
          <IssueNotification timeFilter={timeFilter} onDataLoaded={handleIssueDataLoaded} />
        </NotificationTabContent>
      ),
    },
  ];

  return (
    <>
      <HeaderActionIcon
        title={intl.formatMessage({
          id: 'notification.title',
          defaultMessage: 'Notifications',
        })}
        icon={<MessageOutlined />}
        badgeCount={unreadCounts.total}
        badgeStyle={badgeStyles}
        onClick={handleIconClick}
      />

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
          <Tabs items={items} activeKey={activeTabKey} onChange={handleTabChange} />
        </div>
      </Modal>
    </>
  );
};

export default Notification;
