import {
  acceptTeamInvitationApi,
  getTeamInvitationStatusApi,
  rejectTeamInvitationApi,
} from '@/services/roles/api';
import { getTeamById } from '@/services/teams/api';
import { MessageOutlined } from '@ant-design/icons';
import { Badge, message, Modal, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'umi';

const Notification: React.FC = () => {
  const [teamTitle, setTeamTitle] = useState<any>([]);
  const [isBeInvited, setIsBeInvited] = useState<boolean>(false);
  const [invitedInfo, setInvitedInfo] = useState<any>({});
  const { token } = theme.useToken();
  const intl = useIntl();

  useEffect(() => {
    getTeamInvitationStatusApi().then((res) => {
      if (res.success) {
        setIsBeInvited(res.data?.role === 'is_invited');
        setInvitedInfo(res.data);
        getTeamById(res.data?.team_id).then(({ success, data }) => {
          if (success) {
            setTeamTitle(data[0]?.json?.title);
          }
        });
      } else {
        setIsBeInvited(false);
      }
    });
  }, []);

  const handleAccept = async () => {
    try {
      const { success } = await acceptTeamInvitationApi(invitedInfo.team_id, invitedInfo.user_id);
      if (success) {
        setIsBeInvited(false);
        message.success(intl.formatMessage({ id: 'teams.members.actionSuccess' }));
      } else {
        message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
    }
  };

  const handelReject = async () => {
    try {
      const { success } = await rejectTeamInvitationApi(invitedInfo.team_id, invitedInfo.user_id);
      if (success) {
        message.success(intl.formatMessage({ id: 'teams.members.actionSuccess' }));
        setIsBeInvited(false);
      } else {
        message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
      }
    } catch (error) {
      message.error(intl.formatMessage({ id: 'teams.members.actionError' }));
    }
  };

  return (
    <Badge dot={isBeInvited} offset={[-5, 6]} size='small'>
      <MessageOutlined
        style={{ fontSize: 16, opacity: 0.5 }}
        onClick={() => {
          if (isBeInvited) {
            Modal.confirm({
              okButtonProps: {
                type: 'primary',
                style: { backgroundColor: token.colorPrimary },
              },
              cancelButtonProps: {
                style: { borderColor: token.colorPrimary, color: token.colorPrimary },
              },
              title: intl.formatMessage({
                id: 'teams.notification.team.invite.title',
                defaultMessage: 'Team Invitation',
              }),
              content:
                (intl.locale === 'zh-CN'
                  ? (teamTitle?.find((item: any) => item['@xml:lang'] === 'zh')?.['#text'] ??
                    teamTitle[0]?.['#text'])
                  : (teamTitle?.find((item: any) => item['@xml:lang'] === 'en')?.['#text'] ??
                    teamTitle[0]?.['#text'])) +
                ' ' +
                intl.formatMessage({
                  id: 'teams.notification.team.invite.content',
                  defaultMessage: 'has invited you to join, would you like to accept?',
                }),
              okText: intl.formatMessage({
                id: 'teams.notification.team.invite.accept',
                defaultMessage: 'Accept',
              }),
              cancelText: intl.formatMessage({
                id: 'teams.notification.team.invite.reject',
                defaultMessage: 'Reject',
              }),
              onOk: handleAccept,
              onCancel: handelReject,
            });
          }
        }}
      />
    </Badge>
  );
};

export default Notification;
