import Admin from '@/pages/Admin';
import { render, screen } from '@testing-library/react';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) =>
      defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  HeartTwoTone: () => <span>heart</span>,
  SmileTwoTone: () => <span>smile</span>,
}));

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  PageContainer: ({ content, children }: any) => (
    <section>
      <div>{content}</div>
      {children}
    </section>
  ),
}));

jest.mock('antd', () => ({
  __esModule: true,
  Alert: ({ message }: any) => <div>{message}</div>,
  Card: ({ children }: any) => <div>{children}</div>,
  Typography: {
    Title: ({ children }: any) => <h2>{children}</h2>,
  },
}));

describe('Admin page', () => {
  it('renders the admin-only content and external guidance link', () => {
    render(<Admin />);

    expect(screen.getByText('This page can only be viewed by admin')).toBeInTheDocument();
    expect(
      screen.getByText('Faster and stronger heavy-duty components have been released.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /use block/i })).toHaveAttribute(
      'href',
      'https://pro.ant.design/docs/block-cn',
    );
  });
});
