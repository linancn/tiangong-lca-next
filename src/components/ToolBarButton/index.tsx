import { Tooltip } from 'antd';
type Props = {
  icon: React.ReactNode;
  tooltip: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};
const ToolBarButton = ({ icon, tooltip, onClick, disabled = false }: Props) => {
  return (
    <div
      key='calculate'
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      className='ant-pro-table-list-toolbar-setting-item'
    >
      <span onClick={disabled ? undefined : onClick}>
        <Tooltip title={tooltip}>{icon}</Tooltip>
      </span>
    </div>
  );
};

export default ToolBarButton;
