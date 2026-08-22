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
  const Button = ({ children, disabled, icon, onClick, style }: any) => (
    <button disabled={disabled} style={style} type='button' onClick={onClick}>
      {icon}
      {children}
    </button>
  );
  const Tooltip = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
    <span>
      <span data-testid='tooltip-title'>{title}</span>
      {children}
    </span>
  );

  return {
    Button,
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

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactions and updates styles when disabled', () => {
    const onClick = jest.fn();
    renderComponent({ disabled: true, onClick });
    const wrapper = screen.getByRole('button');

    expect(wrapper).toHaveStyle({ cursor: 'not-allowed' });
    expect(wrapper).toBeDisabled();

    fireEvent.click(wrapper);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses pointer cursor styling when enabled', () => {
    renderComponent();

    const wrapper = screen.getByRole('button');

    expect(wrapper).toHaveStyle({ cursor: 'pointer' });
    expect(wrapper).toBeEnabled();
  });
});
