import { getSystemUserRoleApi } from '@/services/roles/api';
import {
  AuditOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { logout } from '@/services/auth';
import { getUserRoles } from '@/services/roles/api';
import { Button, Modal, Spin, theme } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { flushSync } from 'react-dom';
import { FormattedMessage } from 'umi';
import AllTeams from '../AllTeams';
import HeaderDropdown from '../HeaderDropdown';

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  const { token } = theme.useToken();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '100%',
        lineHeight: 'inherit',
        gap: '8px',
        color: token.colorText,
      }}
    >
      <UserOutlined />
      {currentUser?.name}
    </span>
  );
};

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({ children }) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [isLoadingHovered, setIsLoadingHovered] = useState(false);
  // const [isUserInTeam, setIsUserInTeam] = useState(false);
  const [showAllTeamsModal, setShowAllTeamsModal] = useState(false);
  const [userData, setUserData] = useState<{ user_id: string; role: string } | null>(null);

  const getUserRole = async () => {
    const { data } = await getUserRoles();

    if (data && data?.length && data[0].role !== 'rejected') {
      // setIsUserInTeam(true);
      return true;
    } else {
      // setIsUserInTeam(false);
      return false;
    }
  };

  const getSystemUserRole = async () => {
    const userData = await getSystemUserRoleApi();
    setUserData(userData);
  };

  useEffect(() => {
    // getUserRole();
    getSystemUserRole();
  }, []);
  /**
   * Logout and save the current URL
   */
  const loginOut = async () => {
    await logout();
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    /** This method will redirect to the location specified by the redirect parameter */
    const redirect = urlParams.get('redirect');
    // Note: There may be security issues, please note
    if (window.location.pathname !== '/user/login' && !redirect) {
      const params = new URLSearchParams();
      params.set('redirect', pathname + search);
      history.replace({
        pathname: '/user/login',
        search: params.toString(),
      });
    }
  };
  const { initialState, setInitialState } = useModel('@@initialState');

  const onMenuClick = useCallback(
    async (event: MenuInfo) => {
      const { key } = event;
      if (key === 'logout') {
        flushSync(() => {
          setInitialState((s) => ({ ...s, currentUser: undefined }));
        });
        loginOut();
        return;
      }
      if (key === 'system') {
        history.push(`/manageSystem`);

        return;
      }
      if (key === 'review') {
        history.push(`/review`);
        return;
      }
      if (key === 'team') {
        const isUserInTeam = await getUserRole();
        if (isUserInTeam) {
          history.push(`/team?action=edit`);
        } else {
          Modal.confirm({
            okButtonProps: {
              type: 'primary',
              style: { backgroundColor: token.colorPrimary },
            },
            cancelButtonProps: {
              style: { borderColor: token.colorPrimary, color: token.colorPrimary },
            },
            title: intl.formatMessage({
              id: 'teams.modal.noTeam.title',
              defaultMessage: 'You are not in any team',
            }),
            content: intl.formatMessage({
              id: 'teams.modal.noTeam.content',
              defaultMessage: 'You can create a team or join an existing team',
            }),
            closable: true,
            footer: () => (
              <>
                <Button
                  style={{ borderColor: token.colorPrimary, color: token.colorPrimary }}
                  onClick={() => {
                    setShowAllTeamsModal(true);
                    Modal.destroyAll();
                  }}
                >
                  {intl.formatMessage({
                    id: 'teams.modal.noTeam.join',
                    defaultMessage: 'Join Team',
                  })}
                  {/* <FormattedMessage id="" defaultMessage="" /> */}
                </Button>
                <Button
                  type='primary'
                  style={{ backgroundColor: token.colorPrimary }}
                  onClick={() => {
                    Modal.destroyAll();
                    if (location.pathname === '/team') {
                      const searchParams = new URLSearchParams(location.search);
                      searchParams.set('action', 'create');
                      history.replace({
                        pathname: location.pathname,
                        search: searchParams.toString(),
                      });
                      window.location.reload();
                    } else {
                      history.push('/team?action=create');
                    }
                  }}
                >
                  {/* <FormattedMessage id="teams.modal.noTeam.create" defaultMessage="Create Team" /> */}
                  {intl.formatMessage({
                    id: 'teams.modal.noTeam.create',
                    defaultMessage: 'Create Team',
                  })}
                </Button>
              </>
            ),
          });
        }
        return;
      }
      history.push(`/account`);
    },
    [setInitialState],
  );

  const loadingContainerStyle = useMemo(
    () => ({
      display: 'flex',
      height: '48px',
      marginLeft: 'auto',
      overflow: 'hidden',
      alignItems: 'center',
      padding: '0 8px',
      cursor: 'pointer',
      borderRadius: token.borderRadius,
    }),
    [token.borderRadius],
  );

  const loading = (
    <span
      style={{
        ...loadingContainerStyle,
        backgroundColor: isLoadingHovered ? token.colorBgTextHover : undefined,
      }}
      onMouseEnter={() => setIsLoadingHovered(true)}
      onMouseLeave={() => setIsLoadingHovered(false)}
    >
      <Spin
        size='small'
        style={{
          marginLeft: 8,
          marginRight: 8,
        }}
      />
    </span>
  );

  if (!initialState) {
    return loading;
  }

  const { currentUser } = initialState;

  if (!currentUser || !currentUser.name) {
    return loading;
  }

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <FormattedMessage id='menu.account.profile' defaultMessage='Account Profile' />,
    },
    {
      key: 'team',
      icon: <TeamOutlined />,
      label: <FormattedMessage id='menu.account.team' defaultMessage='Team Management' />,
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: <FormattedMessage id='menu.manageSystem' defaultMessage='System Settings' />,
      hidden:
        userData?.role !== 'admin' && userData?.role !== 'owner' && userData?.role !== 'member',
    },
    {
      key: 'review',
      icon: <AuditOutlined />,
      label: <FormattedMessage id='menu.account.review' defaultMessage='Review Management' />,
      hidden: userData?.role !== 'review-admin' && userData?.role !== 'review-member',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <FormattedMessage id='menu.account.logout' defaultMessage='Logout' />,
    },
  ];

  return (
    <>
      <HeaderDropdown
        menu={{
          selectedKeys: [],
          onClick: onMenuClick,
          items: menuItems,
        }}
      >
        {children}
      </HeaderDropdown>
      <Modal
        title={<FormattedMessage id='component.allTeams.table.title' defaultMessage='All Teams' />}
        closable
        width={'90%'}
        open={showAllTeamsModal}
        onCancel={() => setShowAllTeamsModal(false)}
        footer={null}
      >
        <AllTeams tableType='joinTeam' />
      </Modal>
    </>
  );
};
