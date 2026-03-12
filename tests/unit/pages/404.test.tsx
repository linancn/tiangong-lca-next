import NoFoundPage from '@/pages/404';
import { fireEvent, render, screen } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('@umijs/max', () => ({
  __esModule: true,
  history: {
    push: (...args: any[]) => mockPush(...args),
  },
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => {
      if (id === 'pages.404.subTitle') return 'Sorry, the page you visited does not exist.';
      if (id === 'pages.404.buttonText') return 'Back Home';
      return id;
    },
  }),
}));

jest.mock('antd', () => ({
  __esModule: true,
  Button: ({ children, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  Result: ({ title, subTitle, extra }: any) => (
    <section>
      <h1>{title}</h1>
      <p>{subTitle}</p>
      <div>{extra}</div>
    </section>
  ),
}));

describe('404 page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the not-found message and navigates home on button click', () => {
    render(<NoFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back home/i }));

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
