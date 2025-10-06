/**
 * Tests for ToolBarButton component
 * Path: src/components/ToolBarButton/index.tsx
 */

import ToolBarButton from '@/components/ToolBarButton';
import { fireEvent, render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type ToolBarButtonProps = {
  icon: ReactNode;
  tooltip: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

jest.mock('antd', () => {
  const Tooltip = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <span>
      <span data-testid='tooltip-title'>{title}</span>
      {children}
    </span>
  );

  return {
    Tooltip,
  };
});

const renderComponent = (overrideProps: Partial<ToolBarButtonProps> = {}) => {
  const onClick = overrideProps.onClick ?? jest.fn();

  const props: ToolBarButtonProps = {
    icon: (
      <span role='img' aria-label='Calculate'>
        Icon
      </span>
    ),
    tooltip: 'Run calculation',
    onClick,
    ...overrideProps,
  };

  return { ...render(<ToolBarButton {...props} />), onClick };
};

describe('ToolBarButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the provided icon along with tooltip content', () => {
    renderComponent();

    expect(screen.getByLabelText('Calculate')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-title')).toHaveTextContent('Run calculation');
  });

  it('calls onClick when the button is activated', () => {
    const { onClick } = renderComponent();

    fireEvent.click(screen.getByLabelText('Calculate'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactions and updates styles when disabled', () => {
    const onClick = jest.fn();
    renderComponent({ disabled: true, onClick });
    const icon = screen.getByLabelText('Calculate');
    const wrapper = icon.closest('.ant-pro-table-list-toolbar-setting-item') as HTMLElement;

    expect(wrapper).toHaveStyle({ cursor: 'not-allowed' });
    expect(wrapper).toHaveClass('ant-btn-disabled');

    fireEvent.click(icon);

    expect(onClick).not.toHaveBeenCalled();
  });
});
