import { LogoutOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import React, { useCallback, useEffect, useState } from 'react';

import { outLogin } from '@/services/ant-design-pro/api';
import { getUserRoles } from '@/services/roles/api';
import { Modal, Spin, Button } from 'antd';
import { createStyles } from 'antd-style';
import { stringify } from 'querystring';
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
  return <span className="anticon">{currentUser?.name}</span>;
};

const useStyles = createStyles(({ token }) => {
  return {
    action: {
      display: 'flex',
      height: '48px',
      marginLeft: 'auto',
      overflow: 'hidden',
      alignItems: 'center',
      padding: '0 8px',
      cursor: 'pointer',
      borderRadius: token.borderRadius,
      '&:hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
  };
});

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({ children }) => {
  const intl = useIntl();
  const [isUserInTeam, setIsUserInTeam] = useState(false);
  const [showAllTeamsModal, setShowAllTeamsModal] = useState(false);
  const initialUserRole = async () => {
    const { data } = await getUserRoles();

    if (data&&data?.length&&data[0].role!=='rejected') {
      setIsUserInTeam(true);
    } else {
      setIsUserInTeam(false);
    }
  };

  useEffect(() => {
    initialUserRole();
  }, []);
  /**
   * 退出登录，并且将当前的 url 保存
   */
  const loginOut = async () => {
    await outLogin();
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    /** 此方法会跳转到 redirect 参数所在的位置 */
    const redirect = urlParams.get('redirect');
    // Note: There may be security issues, please note
    if (window.location.pathname !== '/user/login' && !redirect) {
      history.replace({
        pathname: '/user/login',
        search: stringify({
          redirect: pathname + search,
        }),
      });
    }
  };
  const { styles } = useStyles();

  const { initialState, setInitialState } = useModel('@@initialState');

  const onMenuClick = useCallback(
    (event: MenuInfo) => {
      const { key } = event;
      if (key === 'logout') {
        flushSync(() => {
          setInitialState((s) => ({ ...s, currentUser: undefined }));
        });
        loginOut();
        return;
      }
      if (key === 'team') {
        if (isUserInTeam) {
          history.push(`/team?action=edit`);
        } else {
          Modal.confirm({
            title: intl.formatMessage({
              id: 'teams.modal.noTeam.title',
              defaultMessage: 'You are not in any team',
            }),
            content: intl.formatMessage({
              id: 'teams.modal.noTeam.content',
              defaultMessage: 'You can create a team or join an existing team',
            }),
            closable: true,
            footer: (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button
                  style={{ borderColor: '#5C246A', color: '#5C246A' }}
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
                  type="primary"
                  style={{ backgroundColor: '#5C246A' }}
                  onClick={() => {
                    Modal.destroyAll();
                    if (location.pathname === '/team') {
                      const searchParams = new URLSearchParams(location.search);
                      searchParams.set('action', 'create');
                      history.replace({
                        pathname: location.pathname,
                        search: searchParams.toString()
                      });
                      window.location.reload();
                    } else {
                      history.push('/team?action=create');
                    }
                  }}
                >
                  {/* <FormattedMessage id="teams.modal.noTeam.create" defaultMessage="Create Team" /> */}
                  {
                    intl.formatMessage({
                      id: 'teams.modal.noTeam.create',
                      defaultMessage: 'Create Team',
                    })
                  }
                </Button>
              </div>
            ),
          });
        }
        return;
      }
      history.push(`/account`);
    },
    [setInitialState, isUserInTeam],
  );

  const loading = (
    <span className={styles.action}>
      <Spin
        size="small"
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
      label: <FormattedMessage id="menu.account.profile" defaultMessage="Account Profile" />,
    },
    {
      key: 'team',
      icon: <TeamOutlined />,
      label: <FormattedMessage id="menu.account.team" defaultMessage="Team Management" />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <FormattedMessage id="menu.account.logout" defaultMessage="Logout" />,
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
        width={'90%'}
        open={showAllTeamsModal}
        onCancel={() => setShowAllTeamsModal(false)}
        footer={null}
      >
        <AllTeams />
      </Modal>
    </>
  );
};
