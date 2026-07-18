import { render, screen, waitFor } from '@testing-library/react';

const mockReplace = jest.fn();
const mockHistory = { replace: mockReplace };
let mockPathname = '/user/login';

jest.mock('@umijs/max', () => ({
  history: mockHistory,
  Outlet: () => <div data-testid='route-outlet'>route outlet</div>,
  useLocation: jest.fn(() => ({ pathname: mockPathname })),
}));

describe('LoginFlowGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/user/login';
  });

  it.each(['/user/login', '/user/login/password_forgot', '/user/login/password_reset'])(
    'renders the exact anonymous login-flow route %s',
    (pathname) => {
      const { default: LoginFlowGuard } = require('@/wrappers/LoginFlowGuard');
      mockPathname = pathname;

      render(
        <LoginFlowGuard>
          <div data-testid='login-flow-content'>login flow</div>
        </LoginFlowGuard>,
      );

      expect(screen.getByTestId('login-flow-content')).toHaveTextContent('login flow');
      expect(mockReplace).not.toHaveBeenCalled();
    },
  );

  it('renders the router outlet in the production wrapper contract', () => {
    const { default: LoginFlowGuard } = require('@/wrappers/LoginFlowGuard');

    render(<LoginFlowGuard />);

    expect(screen.getByTestId('route-outlet')).toHaveTextContent('route outlet');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each(['/user', '/User', '/User/Login', '/user/login/', '/user/login/extra'])(
    'canonicalizes the non-allowlisted login-shell match %s',
    async (pathname) => {
      const { default: LoginFlowGuard } = require('@/wrappers/LoginFlowGuard');
      mockPathname = pathname;

      render(
        <LoginFlowGuard>
          <div data-testid='login-flow-content'>login flow</div>
        </LoginFlowGuard>,
      );

      expect(screen.queryByTestId('login-flow-content')).not.toBeInTheDocument();
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/user/login'));
    },
  );
});
