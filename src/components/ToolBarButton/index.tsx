import { Button, Tooltip } from 'antd';
type Props = {
  icon: React.ReactNode;
  tooltip: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};
const ToolBarButton = ({ icon, tooltip, onClick, disabled = false }: Props) => {
  return (
    <Tooltip title={tooltip}>
      <Button
        disabled={disabled}
        icon={icon}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        type='text'
        onClick={onClick}
      >
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {tooltip}
        </span>
      </Button>
    </Tooltip>
  );
};

export default ToolBarButton;
