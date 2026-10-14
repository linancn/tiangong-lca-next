import { cloneElement, isValidElement, type HTMLAttributes, type ReactNode } from 'react';

type CollapseTriggerProps = HTMLAttributes<HTMLElement> & {
  'data-tg-pro-layout-collapse-trigger'?: boolean;
};

export const renderAccessibleCollapsedButton = (
  label: string,
  defaultDom: ReactNode,
  collapsed?: boolean,
) => {
  if (!isValidElement<CollapseTriggerProps>(defaultDom)) {
    return defaultDom;
  }

  const props = defaultDom.props;

  // Keep ProLayout's native component: it owns the icon, state classes and styles.
  return cloneElement(defaultDom, {
    'aria-label': label,
    'aria-expanded': collapsed === undefined ? undefined : !collapsed,
    'data-tg-pro-layout-collapse-trigger': true,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (event) => {
      props.onKeyDown?.(event);
      if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        if (!event.repeat) {
          event.currentTarget.click();
        }
      }
    },
  });
};
