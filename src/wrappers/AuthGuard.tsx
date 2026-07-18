import { LOGIN_PATH } from '@/services/general/publicRoutePolicy';
import { history, Outlet, useModel } from '@umijs/max';
import { useEffect, type ReactNode } from 'react';

export default function AuthGuard({ children }: { children?: ReactNode }) {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;

  useEffect(() => {
    if (!currentUser && history.location.pathname !== LOGIN_PATH) {
      history.replace(LOGIN_PATH);
    }
  }, [currentUser]);

  return currentUser ? (children ?? <Outlet />) : null;
}
