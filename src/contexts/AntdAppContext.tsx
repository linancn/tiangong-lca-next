import { App } from 'antd';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

export type AntdAppApi = ReturnType<typeof App.useApp>;

type AntdAppAction = (api: AntdAppApi) => void;

type AntdAppRegistration = {
  api: AntdAppApi;
  owner: symbol;
};

let registrations: AntdAppRegistration[] = [];
let pendingActions: AntdAppAction[] = [];

/**
 * Executes feedback work through the mounted Ant Design App instance.
 *
 * Request interceptors and service-worker events can run before the React tree
 * commits. Those calls are retained until the provider mounts instead of
 * falling back to Ant Design's context-free static APIs.
 */
export function dispatchAntdAppAction(action: AntdAppAction): void {
  const activeApi = registrations[registrations.length - 1]?.api;
  if (activeApi) {
    action(activeApi);
    return;
  }

  pendingActions.push(action);
}

export function useAntdAppApi(): AntdAppApi {
  return App.useApp();
}

function useAntdAppApiRegistration(api: AntdAppApi): void {
  const ownerRef = useRef(Symbol('antd-app-provider'));

  useEffect(() => {
    const owner = ownerRef.current;
    registrations = registrations.filter((registration) => registration.owner !== owner);
    registrations.push({ api, owner });
    const actions = pendingActions;
    pendingActions = [];
    actions.forEach((action) => action(api));

    return () => {
      registrations = registrations.filter((registration) => registration.owner !== owner);
    };
  }, [api]);
}

/** Registers the Umi-provided global Ant Design App API for non-component callers. */
export function AntdAppApiRegistrar({ children }: PropsWithChildren) {
  const api = App.useApp();
  useAntdAppApiRegistration(api);
  return children;
}
