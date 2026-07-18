import { render, screen, waitFor } from '@testing-library/react';

const mockReplace = jest.fn();
const mockHistory = {
  location: { pathname: '/dashboard/national-carbon' },
  replace: mockReplace,
};
let mockCurrentUser: Auth.CurrentUser | undefined;

jest.mock('@umijs/max', () => ({
  history: mockHistory,
  Outlet: () => <div data-testid='route-outlet'>route outlet</div>,
  useModel: jest.fn(() => ({
    initialState: mockCurrentUser ? { currentUser: mockCurrentUser } : {},
  })),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = undefined;
    mockHistory.location.pathname = '/dashboard/national-carbon';
  });

  it('renders protected content when the session is authenticated', () => {
    const { default: AuthGuard } = require('@/wrappers/AuthGuard');
    mockCurrentUser = { id: 'user-1' } as Auth.CurrentUser;

    render(
      <AuthGuard>
        <div data-testid='protected-content'>protected</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId('protected-content')).toHaveTextContent('protected');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders the router outlet in the production wrapper contract', () => {
    const { default: AuthGuard } = require('@/wrappers/AuthGuard');
    mockCurrentUser = { id: 'user-1' } as Auth.CurrentUser;

    render(<AuthGuard />);

    expect(screen.getByTestId('route-outlet')).toHaveTextContent('route outlet');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects an anonymous protected route without rendering its content', async () => {
    const { default: AuthGuard } = require('@/wrappers/AuthGuard');

    render(
      <AuthGuard>
        <div data-testid='protected-content'>protected</div>
      </AuthGuard>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/user/login'));
  });

  it('does not create a redirect loop at the canonical login path', () => {
    const { default: AuthGuard } = require('@/wrappers/AuthGuard');
    mockHistory.location.pathname = '/user/login';

    render(
      <AuthGuard>
        <div data-testid='protected-content'>protected</div>
      </AuthGuard>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
