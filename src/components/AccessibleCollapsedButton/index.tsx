import { isValidElement, type MouseEventHandler, type ReactNode } from 'react';

export const renderAccessibleCollapsedButton = (label: string, defaultDom: ReactNode) => {
  if (!isValidElement(defaultDom)) {
    return defaultDom;
  }

  const props = defaultDom.props as {
    children?: ReactNode;
    className?: string;
    onClick?: MouseEventHandler<HTMLElement>;
  };

  return (
    <button
      aria-label={label}
      className={`${props.className ?? ''} tg-pro-layout-collapse-trigger`.trim()}
      type='button'
      onClick={props.onClick as MouseEventHandler<HTMLButtonElement> | undefined}
    >
      {props.children}
    </button>
  );
};
