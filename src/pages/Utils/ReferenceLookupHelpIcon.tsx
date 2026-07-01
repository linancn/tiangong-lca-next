import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, theme } from 'antd';
import { useIntl } from 'umi';

export default function ReferenceLookupHelpIcon() {
  const intl = useIntl();
  const { token } = theme.useToken();

  const tooltip = intl.formatMessage({
    defaultMessage:
      'Find records that reference a specific dataset.\nAfter enabling this option, enter the full dataset UUID. The system searches the current data type for records whose content contains that UUID.\nThis mode does not search by name or keyword.',
    id: 'pages.search.referenceLookup.tooltip',
  });

  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
      <InfoCircleOutlined
        aria-hidden
        style={{
          color: token.colorTextTertiary,
          cursor: 'help',
          fontSize: token.fontSizeSM,
          flexShrink: 0,
          lineHeight: 1,
        }}
      />
    </Tooltip>
  );
}
