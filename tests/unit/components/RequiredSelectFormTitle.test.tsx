/**
 * Tests for RequiredSelectFormTitle component
 * Path: src/components/RequiredSelectFormTitle/index.tsx
 */

import RequiredSelectFormTitle from '@/components/RequiredSelectFormTitle';
import { render, screen } from '@testing-library/react';

type ReactNode = import('react').ReactNode;

type RequiredSelectFormTitleProps = {
  label: ReactNode;
  ruleErrorState: boolean;
  requiredRules: { message: string }[];
  errRef?: {
    ruleVerification?: boolean;
    nonExistent?: boolean;
    stateCode?: number;
  };
};

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <>{defaultMessage ?? id}</>
  ),
}));

jest.mock('antd', () => {
  const Form = {
    Item: ({ children, ...rest }: any) => (
      <div data-testid='form-item' {...rest}>
        {children}
      </div>
    ),
  };

  const theme = {
    useToken: () => ({ token: { colorError: '#d32029' } }),
  };

  return {
    Form,
    theme,
  };
});

const renderComponent = (overrideProps: Partial<RequiredSelectFormTitleProps> = {}) => {
  const props: RequiredSelectFormTitleProps = {
    label: 'Data Source',
    ruleErrorState: overrideProps.ruleErrorState ?? true,
    requiredRules: overrideProps.requiredRules ?? [{ message: 'This field is required' }],
    errRef: overrideProps.errRef,
  };

  return render(<RequiredSelectFormTitle {...props} />);
};

describe('RequiredSelectFormTitle Component', () => {
  it('displays label and validation messages when rules fail', () => {
    renderComponent({
      ruleErrorState: true,
      requiredRules: [{ message: 'First error' }, { message: 'Second error' }],
    });

    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByText('First error')).toBeInTheDocument();
    expect(screen.getByText('Second error')).toBeInTheDocument();
  });

  it('shows incomplete data message when rule verification fails', () => {
    renderComponent({ ruleErrorState: false, errRef: { ruleVerification: false } });

    const message = screen.getByText('Data is incomplete');

    expect(message).toBeInTheDocument();
    expect(message).toHaveStyle({ color: '#d32029' });
  });

  it('shows missing data message when reference does not exist', () => {
    renderComponent({ ruleErrorState: false, errRef: { nonExistent: true } });

    expect(screen.getByText('Data does not exist')).toBeInTheDocument();
  });

  it('shows under review message for pending states', () => {
    renderComponent({ ruleErrorState: false, errRef: { stateCode: 20 } });

    expect(screen.getByText('Under review')).toBeInTheDocument();
  });

  it('renders without extra feedback when there are no errors', () => {
    renderComponent({ ruleErrorState: false, errRef: { stateCode: 100 } });

    expect(screen.queryByText('Data is incomplete')).not.toBeInTheDocument();
    expect(screen.queryByText('Data does not exist')).not.toBeInTheDocument();
    expect(screen.queryByText('Under review')).not.toBeInTheDocument();
  });
});
