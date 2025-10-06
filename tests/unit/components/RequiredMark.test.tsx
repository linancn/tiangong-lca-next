/**
 * Tests for RequiredMark component
 * Path: src/components/RequiredMark/index.tsx
 */

import RequiredMark from '@/components/RequiredMark';
import { render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type RequiredMarkProps = {
  label: ReactNode;
  errorLabel?: ReactNode;
  showError: boolean;
};

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

jest.mock('antd', () => ({
  Form: {
    Item: ({ children }: { children: ReactNode }) => <div data-testid='form-item'>{children}</div>,
  },
}));

describe('RequiredMark Component', () => {
  const renderComponent = (props: Partial<RequiredMarkProps> = {}) => {
    const defaultProps: RequiredMarkProps = {
      label: 'Dataset Name',
      showError: false,
      errorLabel: undefined,
    };

    return render(<RequiredMark {...defaultProps} {...props} />);
  };

  it('renders the provided label inside a required form item', () => {
    renderComponent();

    expect(screen.getByTestId('form-item')).toBeInTheDocument();
    expect(screen.getByText('Dataset Name')).toBeInTheDocument();
    expect(screen.queryByText('English is a required language!')).not.toBeInTheDocument();
  });

  it('displays the provided error label when showError is true', () => {
    renderComponent({ showError: true, errorLabel: 'Custom error message' });

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('falls back to the default error message when no error label is provided', () => {
    renderComponent({ showError: true });

    expect(screen.getByText('English is a required language!')).toBeInTheDocument();
  });
});
