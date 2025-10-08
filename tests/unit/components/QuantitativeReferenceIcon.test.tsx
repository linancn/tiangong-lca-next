/**
 * Tests for QuantitativeReferenceIcon component
 * Path: src/components/QuantitativeReferenceIcon/index.tsx
 */

import QuantitativeReferenceIcon from '@/components/QuantitativeReferenceIcon';
import { render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

const mockTooltipRender = jest.fn();

jest.mock('antd', () => {
  const Tooltip = ({ title, children }: { title?: ReactNode; children: ReactNode }) => {
    mockTooltipRender(title);
    return (
      <span data-testid='tooltip' data-title={typeof title === 'string' ? title : ''}>
        {children}
      </span>
    );
  };

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    Tooltip,
    theme,
  };
});

describe('QuantitativeReferenceIcon Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the success icon with themed color and tooltip when value is true', () => {
    render(<QuantitativeReferenceIcon value tooltipTitle='Reference available' />);

    const icon = screen.getByRole('img', { name: 'check-circle' });

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveStyle({ color: '#1677ff' });
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', 'Reference available');
    expect(screen.queryByRole('img', { name: 'close-circle' })).not.toBeInTheDocument();
  });

  it('renders the inactive icon without tooltip when value is false', () => {
    render(<QuantitativeReferenceIcon value={false} />);

    const icon = screen.getByRole('img', { name: 'close-circle' });

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveStyle({ opacity: '0.55' });
    expect(mockTooltipRender).not.toHaveBeenCalled();
  });
});
