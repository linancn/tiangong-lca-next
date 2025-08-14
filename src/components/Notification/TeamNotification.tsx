import { updateTeamNotificationTime } from '@/services/auth/api';
import {
  acceptTeamInvitationApi,
  getTeamInvitationStatusApi,
  rejectTeamInvitationApi,
} from '@/services/roles/api';
import { getTeamById } from '@/services/teams/api';
import { Button, message, Space, Table, Tag, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
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
  removeItemFromDotTabs: (item: 'team' | 'data') => void;
}

const TeamNotification: React.FC<TeamNotificationProps> = ({
  timeFilter,
  removeItemFromDotTabs,
}) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [data, setData] = useState<TeamNotificationItem[]>([]);
  const intl = useIntl();
  const { token } = theme.useToken();

  const fetchTeamNotifications = async () => {
    setLoading(true);
    try {
      const res = await getTeamInvitationStatusApi(timeFilter);

      if (res.success && res.data) {
        await updateTeamNotificationTime();
        removeItemFromDotTabs('team');
        const teamData = await getTeamById(res.data.team_id);
        if (teamData.success && teamData.data?.[0]) {
          const teamTitle = teamData.data[0]?.json?.title;
          const title =
            intl.locale === 'zh-CN'
              ? (teamTitle?.find((item: any) => item['@xml:lang'] === 'zh')?.['#text'] ??
                teamTitle[0]?.['#text'])
              : (teamTitle?.find((item: any) => item['@xml:lang'] === 'en')?.['#text'] ??
                teamTitle[0]?.['#text']);

          setData([
            {
              key: res.data.team_id,
              id: res.data.team_id,
              teamId: res.data.team_id,
              userId: res.data.user_id,
              teamTitle: title || 'Unknown Team',
              role: res.data.role,
              createTime: new Date().toLocaleString(),
            },
          ]);
        }
      } else {
        setData([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamNotifications();
  }, [timeFilter]);

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
      title: intl.formatMessage({ id: 'teams.members.memberName', defaultMessage: 'Team Name' }),
      dataIndex: 'teamTitle',
      key: 'teamTitle',
    },
    {
      title: intl.formatMessage({ id: 'teams.members.role', defaultMessage: 'Status' }),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const statusMap = {
          empty: {
            color: 'gray',
            text: intl.formatMessage({ id: 'teams.members.role.empty', defaultMessage: 'Empty' }),
          },
          is_invited: {
            color: token.orange,
            text: intl.formatMessage({
              id: 'teams.members.role.invited',
              defaultMessage: 'Pending',
            }),
          },
          member: {
            color: token.green,
            text: intl.formatMessage({
              id: 'teams.members.role.member',
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
