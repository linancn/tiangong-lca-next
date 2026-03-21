import { Badge, Tooltip } from 'antd';
import type React from 'react';
import { cloneElement } from 'react';

export const HEADER_ACTION_ICON_STYLE: React.CSSProperties = {
  fontSize: 16,
  opacity: 0.5,
  cursor: 'pointer',
};

type HeaderActionIconProps = {
  title: React.ReactNode;
  icon: React.ReactElement<any>;
  onClick?: () => void;
  badgeCount?: number;
  badgeOffset?: [number, number];
  badgeStyle?: React.CSSProperties;
};

const HeaderActionIcon: React.FC<HeaderActionIconProps> = ({
  title,
  icon,
  onClick,
  badgeCount = 0,
  badgeOffset = [-5, 6],
  badgeStyle,
}) => {
  const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onClick?.();
  };

  const trigger = cloneElement(icon, {
    style: {
      ...HEADER_ACTION_ICON_STYLE,
      ...(icon.props.style ?? {}),
    },
  });

  return (
    <Tooltip title={title}>
      <span
        role='button'
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'inherit',
        }}
      >
        <Badge
          count={badgeCount}
          offset={badgeOffset}
          size='small'
          showZero={false}
          style={badgeStyle}
        >
          {trigger}
        </Badge>
      </span>
    </Tooltip>
  );
};

export default HeaderActionIcon;
