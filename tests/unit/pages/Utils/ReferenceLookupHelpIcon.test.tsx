import ReferenceLookupHelpIcon from '@/pages/Utils/ReferenceLookupHelpIcon';
import { render, screen } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (typeof node === 'object' && 'props' in node && node.props?.children) {
    return toText(node.props.children);
  }
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
      defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  InfoCircleOutlined: (props: any) => (
    <span data-testid='reference-lookup-help-icon' {...props}>
      i
    </span>
  ),
}));

jest.mock('antd', () => ({
  __esModule: true,
  Tooltip: ({ children, title }: any) => (
    <span data-testid='reference-lookup-tooltip' title={toText(title)}>
      {children}
    </span>
  ),
  theme: {
    useToken: () => ({
      token: {
        colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
        fontSizeSM: 12,
      },
    }),
  },
}));

describe('ReferenceLookupHelpIcon', () => {
  it('renders a grey help icon with the detailed reference lookup tooltip', () => {
    render(<ReferenceLookupHelpIcon />);

    expect(screen.getByTestId('reference-lookup-tooltip')).toHaveAttribute(
      'title',
      [
        'Find records that reference a specific dataset.',
        'After enabling this option, enter the full dataset UUID. The system searches the current data type for records whose content contains that UUID.',
        'This mode does not search by name or keyword.',
      ].join('\n'),
    );
    expect(screen.getByTestId('reference-lookup-help-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('reference-lookup-help-icon')).toHaveStyle({
      color: 'rgba(0, 0, 0, 0.45)',
      cursor: 'help',
      fontSize: '12px',
    });
  });
});
