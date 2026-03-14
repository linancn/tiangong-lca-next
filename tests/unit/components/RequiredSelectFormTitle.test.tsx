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
    underReviewVersion?: string;
    version?: string;
    versionUnderReview?: boolean;
    versionIsInTg?: boolean;
  };
};

jest.mock('umi', () => ({
  FormattedMessage: ({
    id,
    defaultMessage,
    values,
  }: {
    id: string;
    defaultMessage?: string;
    values?: Record<string, string>;
  }) => {
    const text = Object.entries(values ?? {}).reduce((message, [key, value]) => {
      return message.replace(`{${key}}`, value);
    }, defaultMessage ?? id);

    return <>{text}</>;
  },
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

  it('shows under review message when the same version is already under review', () => {
    renderComponent({
      ruleErrorState: false,
      errRef: { version: '01.00.000', underReviewVersion: '01.00.000' },
    });

    expect(screen.getByText('Under review')).toBeInTheDocument();
  });

  it('shows version-under-review details when another version is already under review', () => {
    renderComponent({
      ruleErrorState: false,
      errRef: {
        versionUnderReview: true,
        version: '01.00.000',
        underReviewVersion: '02.00.000',
      },
    });

    expect(
      screen.getByText(
        'The current dataset already has version 02.00.000 under review. Your version 01.00.000 cannot be submitted.',
      ),
    ).toBeInTheDocument();
  });

  it('shows published-version warning when current version is lower than TG version', () => {
    renderComponent({
      ruleErrorState: false,
      errRef: { versionIsInTg: true },
    });

    expect(
      screen.getByText(
        'The current dataset version is lower than the published version. Please create a new version based on the latest published version for corrections and updates, then submit for review.',
      ),
    ).toBeInTheDocument();
  });

  it('renders without extra feedback when there are no errors', () => {
    renderComponent({ ruleErrorState: false, errRef: { stateCode: 100 } });

    expect(screen.queryByText('Data is incomplete')).not.toBeInTheDocument();
    expect(screen.queryByText('Data does not exist')).not.toBeInTheDocument();
    expect(screen.queryByText('Under review')).not.toBeInTheDocument();
  });

  it('renders only the label when there is no errRef and rules are satisfied', () => {
    renderComponent({ ruleErrorState: false, errRef: undefined });

    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.queryByText('Data is incomplete')).not.toBeInTheDocument();
    expect(screen.queryByText('Data does not exist')).not.toBeInTheDocument();
    expect(screen.queryByText('Under review')).not.toBeInTheDocument();
  });
});
