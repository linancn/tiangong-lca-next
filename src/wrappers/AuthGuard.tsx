import { LOGIN_PATH } from '@/services/general/publicRoutePolicy';
import { isSystemMaintenanceActive } from '@/services/general/systemStatus';
import { history, Outlet, useModel } from '@umijs/max';
import { useEffect, type ReactNode } from 'react';

export default function AuthGuard({ children }: { children?: ReactNode }) {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const maintenanceActive = isSystemMaintenanceActive(initialState?.systemStatus);

  useEffect(() => {
    if (!maintenanceActive && !currentUser && history.location.pathname !== LOGIN_PATH) {
      history.replace(LOGIN_PATH);
    }
  }, [currentUser, maintenanceActive]);

  return !maintenanceActive && currentUser ? (children ?? <Outlet />) : null;
}
