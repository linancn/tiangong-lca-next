import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { SettingDrawer, type SettingDrawerProps } from '@ant-design/pro-components';
import { useState } from 'react';

import './index.less';

type AccessibleSettingDrawerProps = Omit<
  SettingDrawerProps,
  'collapse' | 'onCollapseChange' | 'prefixCls'
> & {
  closeLabel: string;
  openLabel: string;
};

const AccessibleSettingDrawer = ({
  closeLabel,
  openLabel,
  ...settingDrawerProps
}: AccessibleSettingDrawerProps) => {
  const [open, setOpen] = useState(false);
  const label = open ? closeLabel : openLabel;

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-label={label}
        className='tg-setting-drawer-trigger'
        title={label}
        type='button'
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <CloseOutlined aria-hidden /> : <SettingOutlined aria-hidden />}
      </button>
      <SettingDrawer
        {...settingDrawerProps}
        collapse={open}
        prefixCls='tg-pro'
        onCollapseChange={setOpen}
      />
    </>
  );
};

export default AccessibleSettingDrawer;
