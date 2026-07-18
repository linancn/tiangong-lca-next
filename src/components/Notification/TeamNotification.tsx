import { resolveContentLanguages } from '@/services/general/contentLanguageRegistry';
import {
  acceptTeamInvitationApi,
  getTeamInvitationStatusApi,
  rejectTeamInvitationApi,
} from '@/services/roles/api';
import { Button, message, Space, Table, Tag, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'umi';

interface TeamNotificationItem {
  key: string;
  id: string;
  teamId: string;
  userId: string;
  teamTitle: string;
  role: string;
  createTime: string;
}

interface TeamNotificationProps {
  timeFilter: number;
  onDataLoaded?: () => Promise<void>;
}

const nonBlankTitle = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const resolveTeamTitle = (teamTitle: unknown, locale: string, unknownTeam: string) => {
  if (Array.isArray(teamTitle)) {
    const preferred = resolveContentLanguages(locale)
      .map((languageCode) =>
        nonBlankTitle(
          teamTitle.find((item: any) => item?.['@xml:lang'] === languageCode)?.['#text'],
        ),
      )
      .find((title): title is string => title !== null);
    const firstAvailable = teamTitle
      .map((item: any) => nonBlankTitle(item?.['#text']))
      .find((title): title is string => title !== null);
    return preferred ?? firstAvailable ?? unknownTeam;
  }

  return nonBlankTitle(teamTitle) ?? unknownTeam;
};

const TeamNotification: React.FC<TeamNotificationProps> = ({ timeFilter, onDataLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [data, setData] = useState<TeamNotificationItem[]>([]);
  const activeRef = useRef(false);
  const requestEpochRef = useRef(0);
  const intl = useIntl();
  const { token } = theme.useToken();

  const fetchTeamNotifications = async () => {
    const requestEpoch = ++requestEpochRef.current;
    const isCurrentRequest = () => activeRef.current && requestEpoch === requestEpochRef.current;
    setLoading(true);
    try {
      const res = await getTeamInvitationStatusApi(timeFilter);
      if (!isCurrentRequest()) {
        return;
      }

      if (res.success && res.data) {
        const unknownTeam = intl.formatMessage({
          id: 'teams.notifications.unknownTeam',
          defaultMessage: 'Unknown Team',
        });
        setData([
          {
            key: res.data.team_id,
            id: res.data.team_id,
            teamId: res.data.team_id,
            userId: res.data.user_id,
            teamTitle: resolveTeamTitle(res.data.teamTitle, intl.locale, unknownTeam),
            role: res.data.role,
            createTime: res.data.modifiedAt ?? new Date().toISOString(),
          },
        ]);
      } else {
        setData([]);
      }
      // Call callback after data is loaded
      if (onDataLoaded) {
        await onDataLoaded();
      }
    } catch (error) {
      if (isCurrentRequest()) {
        console.error(error);
      }
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      requestEpochRef.current += 1;
    };
  }, []);

  useEffect(() => {
    fetchTeamNotifications();
  }, [intl.locale, timeFilter]);

  const handleAccept = async (record: TeamNotificationItem) => {
    setActionLoading(`accept-${record.teamId}`);
    try {
      const { success } = await acceptTeamInvitationApi(record.teamId, record.userId);
      if (success) {
        message.success(intl.formatMessage({ id: 'teams.members.actionSuccess' }));
      } else {
        message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
    } finally {
      setActionLoading(null);
      fetchTeamNotifications();
    }
  };

  const handleReject = async (record: TeamNotificationItem) => {
    setActionLoading(`reject-${record.teamId}`);
    try {
      const { success } = await rejectTeamInvitationApi(record.teamId, record.userId);
      if (success) {
        message.success(intl.formatMessage({ id: 'teams.members.actionSuccess' }));
      } else {
        message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
    } finally {
      setActionLoading(null);
      fetchTeamNotifications();
    }
  };

  const columns: ColumnsType<TeamNotificationItem> = [
    {
      title: intl.formatMessage({
        id: 'teams.notifications.teamName',
        defaultMessage: 'Team Name',
      }),
      dataIndex: 'teamTitle',
      key: 'teamTitle',
    },
    {
      title: intl.formatMessage({ id: 'teams.notifications.status', defaultMessage: 'Status' }),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const statusMap = {
          empty: {
            color: 'gray',
            text: intl.formatMessage({
              id: 'teams.members.role.empty',
              defaultMessage: 'No information',
            }),
          },
          is_invited: {
            color: token.orange,
            text: intl.formatMessage({
              id: 'teams.notifications.status.pending',
              defaultMessage: 'Pending',
            }),
          },
          member: {
            color: token.green,
            text: intl.formatMessage({
              id: 'teams.notifications.status.accepted',
              defaultMessage: 'Accepted',
            }),
          },
          rejected: {
            color: token.red,
            text: intl.formatMessage({
              id: 'teams.members.role.rejected',
              defaultMessage: 'Rejected',
            }),
          },
          admin: {
            color: token.blue,
            text: intl.formatMessage({ id: 'teams.members.role.admin', defaultMessage: 'Admin' }),
          },
          owner: {
            color: token.colorPrimary,
            text: intl.formatMessage({ id: 'teams.members.role.owner', defaultMessage: 'Owner' }),
          },
        };
        const { color, text } = statusMap[role as keyof typeof statusMap] || statusMap.empty;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: intl.formatMessage({ id: 'teams.members.actions', defaultMessage: 'Actions' }),
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.role === 'is_invited' && (
            <>
              <Button
                type='primary'
                size='small'
                loading={actionLoading === `accept-${record.teamId}`}
                onClick={() => handleAccept(record)}
              >
                {intl.formatMessage({
                  id: 'teams.notification.team.invite.accept',
                  defaultMessage: 'Accept',
                })}
              </Button>
              <Button
                size='small'
                loading={actionLoading === `reject-${record.teamId}`}
                onClick={() => handleReject(record)}
              >
                {intl.formatMessage({
                  id: 'teams.notification.team.invite.reject',
                  defaultMessage: 'Reject',
                })}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table columns={columns} dataSource={data} loading={loading} pagination={false} size='small' />
  );
};

export default TeamNotification;
