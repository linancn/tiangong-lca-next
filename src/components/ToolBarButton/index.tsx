import { Button, Tooltip } from 'antd';

import './index.less';

export type ToolBarButtonPlacement = 'action' | 'option';

type Props = {
  icon: React.ReactNode;
  tooltip: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  placement?: ToolBarButtonPlacement;
};

const ToolBarButton = ({
  icon,
  tooltip,
  onClick,
  disabled = false,
  placement = 'action',
}: Props) => {
  return (
    <Tooltip title={tooltip}>
      <Button
        aria-disabled={disabled}
        className={`tg-pro-toolbar-button tg-pro-toolbar-button--${placement}`}
        disabled={disabled}
        icon={
          <>
            <span aria-hidden='true' className='tg-pro-toolbar-button__icon'>
              {icon}
            </span>
            <span className='tg-pro-toolbar-button__accessible-label'>{tooltip}</span>
          </>
        }
        type='text'
        onClick={onClick}
      />
    </Tooltip>
  );
};

export default ToolBarButton;
