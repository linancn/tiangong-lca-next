import AccessDenied from '@/components/AccessDenied';
import { render, screen } from '@testing-library/react';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span data-testid={`formatted-${id}`}>{defaultMessage ?? id}</span>
  ),
}));

jest.mock('antd', () => ({
  __esModule: true,
  Result: ({ status, subTitle, title }: any) => (
    <section data-testid='antd-result' data-status={status}>
      <h1>{title}</h1>
      <p>{subTitle}</p>
    </section>
  ),
}));

describe('AccessDenied', () => {
  it('renders the shared Ant Design 403 result', () => {
    render(<AccessDenied />);

    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.getByTestId('antd-result')).toHaveAttribute('data-status', '403');
    expect(screen.getByTestId('access-denied')).toHaveTextContent('403');
    expect(screen.getByTestId('access-denied')).toHaveTextContent(
      'You do not have permission to access this page.',
    );
  });
});
