import { isAnonymousAllowedPath, LOGIN_PATH } from '@/services/general/publicRoutePolicy';
import { history, Outlet, useLocation } from '@umijs/max';
import { useEffect, type ReactNode } from 'react';

export default function LoginFlowGuard({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const isExactLoginFlowPath = isAnonymousAllowedPath(pathname);

  useEffect(() => {
    if (!isExactLoginFlowPath) {
      history.replace(LOGIN_PATH);
    }
  }, [isExactLoginFlowPath]);

  return isExactLoginFlowPath ? (children ?? <Outlet />) : null;
}
