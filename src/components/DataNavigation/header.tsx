import type { ProLayoutProps } from '@ant-design/pro-components';
import type { CSSProperties } from 'react';

type NativeHeaderRender = Exclude<ProLayoutProps['headerRender'], boolean | undefined>;

/** Align the native scope menu with the live sidebar, without owning collapse state. */
export const renderDataNavigationHeader: NativeHeaderRender = (props, defaultDom) => {
  const width = props.collapsed ? (props.menu?.collapsedWidth ?? 64) : props.siderWidth;
  const aligned =
    props.layout === 'mix' &&
    props.splitMenus &&
    !props.isMobile &&
    props.hasSiderMenu &&
    width !== undefined;

  // Keep the same wrapper when a route has no sidebar so header actions stay mounted.
  return (
    <div
      className={`tg-data-navigation-header${aligned ? ' tg-data-navigation-header-aligned' : ''}`}
      data-collapsed={aligned && Boolean(props.collapsed)}
      style={aligned ? ({ '--tg-header-sider-width': `${width}px` } as CSSProperties) : undefined}
    >
      {defaultDom}
    </div>
  );
};
