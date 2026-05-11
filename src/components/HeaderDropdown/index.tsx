import { Dropdown } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import React from 'react';

export type HeaderDropdownProps = {
  overlayClassName?: string;
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight' | 'bottomCenter';
} & Omit<DropDownProps, 'overlay'>;

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  overlayClassName: cls,
  overlayStyle,
  placement = 'bottomRight',
  ...restProps
}) => {
  return (
    <Dropdown
      overlayClassName={cls}
      overlayStyle={{
        minWidth: 168,
        maxWidth: 'calc(100vw - 24px)',
        ...overlayStyle,
      }}
      placement={placement}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
