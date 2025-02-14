import React, { useEffect, useState } from 'react';
import { Badge, List, Button, message, Modal } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { acceptTeamInvitationApi, getTeamInvitationStatusApi, rejectTeamInvitationApi, getTeamById } from '@/services/teams/api';
import { useIntl } from 'umi';

interface Invitation {
    id: string;
    teamName: string;
    inviterName: string;
}

const Notification: React.FC = () => {
    const [teamTitle, setTeamTitle] = useState<any>([]);
    const [isBeInvited, setIsBeInvited] = useState<boolean>(false);
    const [invitedInfo, setInvitedInfo] = useState<any>({});

    const intl = useIntl();

    // 模拟获取邀请数据
    useEffect(() => {
        getTeamInvitationStatusApi().then((res) => {
            if (res.success) {
                setIsBeInvited(res.data?.role === "is_invited");
                setInvitedInfo(res.data);
                getTeamById(res.data?.team_id).then(({ success, data }) => {
                    if (success) {
                        setTeamTitle(data[0].json.title);
                    }
                })
            } else {
                setIsBeInvited(false);
            }
        })
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
    }

    return (

        <Badge dot={isBeInvited} >
            <BellOutlined onClick={() => {
                if (isBeInvited) {
                    Modal.confirm({
                        title: intl.formatMessage({ id: 'teams.notification.team.invite.title', defaultMessage: '团队邀请' }),
                        content: (intl.locale === 'zh-CN' ? teamTitle.find((item: any) => item['@xml:lang'] === 'zh')?.['#text'] : teamTitle.find((item: any) => item['@xml:lang'] === 'en')?.['#text']) + ' ' + intl.formatMessage({ id: 'teams.notification.team.invite.content', defaultMessage: '有团队邀请您进入，是否进入？' }),
                        okText: intl.formatMessage({ id: 'teams.notification.team.invite.accept', defaultMessage: '同意' }),
                        cancelText: intl.formatMessage({ id: 'teams.notification.team.invite.reject', defaultMessage: '拒绝' }),
                        onOk: handleAccept,
                        onCancel: handelReject
                    });
                }
            }} />
        </Badge>
    );
};

export default Notification;
