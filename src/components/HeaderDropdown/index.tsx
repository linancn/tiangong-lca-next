import { Dropdown, theme } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import React from 'react';

export type HeaderDropdownProps = {
  overlayClassName?: string;
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight' | 'bottomCenter';
} & Omit<DropDownProps, 'overlay'>;

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({ overlayClassName: cls, ...restProps }) => {
  const { token } = theme.useToken();
  return (
    <Dropdown
      overlayClassName={cls}
      overlayStyle={{ width: window.innerWidth <= token.screenXS ? '100%' : undefined }}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
