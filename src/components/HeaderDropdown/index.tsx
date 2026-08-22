import { Dropdown } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import React from 'react';

export type HeaderDropdownProps = {
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight' | 'bottomCenter';
} & Omit<DropDownProps, 'overlay' | 'overlayClassName' | 'overlayStyle'>;

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  styles,
  placement = 'bottomRight',
  ...restProps
}) => {
  return (
    <Dropdown
      styles={
        typeof styles === 'function'
          ? (info) => {
              const resolvedStyles = styles(info);
              return {
                ...resolvedStyles,
                root: {
                  minWidth: 168,
                  maxWidth: 'calc(100vw - 24px)',
                  ...resolvedStyles?.root,
                },
              };
            }
          : {
              ...styles,
              root: {
                minWidth: 168,
                maxWidth: 'calc(100vw - 24px)',
                ...styles?.root,
              },
            }
      }
      placement={placement}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
