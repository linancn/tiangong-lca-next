import HeaderActionIcon from '@/components/HeaderActionIcon';
import { fireEvent, render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

jest.mock('antd', () => ({
  Badge: ({
    children,
    count,
    offset,
    size,
    showZero,
    style,
  }: {
    children?: ReactNode;
    count?: number;
    offset?: [number, number];
    size?: string;
    showZero?: boolean;
    style?: React.CSSProperties;
  }) => (
    <div
      data-testid='badge'
      data-count={String(count)}
      data-offset={JSON.stringify(offset)}
      data-size={size}
      data-show-zero={String(showZero)}
      style={style}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children, title }: { children?: ReactNode; title?: ReactNode }) => (
    <div>
      <div data-testid='tooltip-title'>{title}</div>
      {children}
    </div>
  ),
}));

describe('HeaderActionIcon', () => {
  it('renders shared icon styling and badge props', () => {
    render(
      <HeaderActionIcon
        title='Shared Title'
        icon={<span data-testid='icon' style={{ color: 'red' }} />}
        badgeCount={3}
        badgeOffset={[1, 2]}
        badgeStyle={{ backgroundColor: 'blue' }}
      />,
    );

    expect(screen.getByTestId('tooltip-title')).toHaveTextContent('Shared Title');
    expect(screen.getByTestId('icon')).toHaveStyle({
      fontSize: '16px',
      opacity: '0.5',
      cursor: 'pointer',
      color: 'red',
    });
    expect(screen.getByTestId('badge')).toHaveAttribute('data-count', '3');
    expect(screen.getByTestId('badge')).toHaveAttribute('data-offset', '[1,2]');
    expect(screen.getByTestId('badge')).toHaveAttribute('data-size', 'small');
    expect(screen.getByTestId('badge')).toHaveAttribute('data-show-zero', 'false');
    expect(screen.getByTestId('badge')).toHaveStyle({ backgroundColor: 'blue' });
  });

  it('uses the top-right badge offset by default', () => {
    render(
      <HeaderActionIcon title='Default Offset' icon={<span data-testid='icon' />} badgeCount={1} />,
    );

    expect(screen.getByTestId('badge')).toHaveAttribute('data-offset', '[0,0]');
  });

  it('fires actions from the wrapper click and keyboard handlers', () => {
    const onClick = jest.fn();

    render(
      <HeaderActionIcon title='Action' icon={<span data-testid='icon' />} onClick={onClick} />,
    );

    const trigger = screen.getByRole('button');

    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: ' ' });
    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
