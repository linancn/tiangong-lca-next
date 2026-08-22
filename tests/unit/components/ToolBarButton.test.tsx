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
  placement?: 'action' | 'option';
};

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

  it('renders a real icon-only Ant button with one accessible name and tooltip', async () => {
    const { container } = renderComponent();
    const button = screen.getByRole('button', { name: 'Run calculation' });

    expect(button).toHaveClass('ant-btn-icon-only');
    expect(button).toHaveClass('tg-pro-toolbar-button--action');
    expect(container.querySelector('.tg-pro-toolbar-button__icon')).toHaveTextContent('Icon');

    fireEvent.mouseEnter(button);

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Run calculation');
  });

  it('calls onClick when the button is activated', () => {
    const { onClick } = renderComponent();

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactions and updates styles when disabled', () => {
    const onClick = jest.fn();
    renderComponent({ disabled: true, onClick });
    const wrapper = screen.getByRole('button');

    expect(wrapper).toHaveAttribute('aria-disabled', 'true');
    expect(wrapper).toBeDisabled();

    fireEvent.click(wrapper);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses the standalone toolbar action placement by default', () => {
    renderComponent();

    const wrapper = screen.getByRole('button');

    expect(wrapper).toHaveClass('tg-pro-toolbar-button--action');
    expect(wrapper).toHaveAttribute('aria-disabled', 'false');
    expect(wrapper).toBeEnabled();
  });

  it('supports the compact placement used inside native ProTable options', () => {
    renderComponent({ placement: 'option' });

    expect(screen.getByRole('button')).toHaveClass('tg-pro-toolbar-button--option');
  });
});
