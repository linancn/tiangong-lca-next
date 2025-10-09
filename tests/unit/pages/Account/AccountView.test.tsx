// @ts-nocheck
/**
 * Unit tests for src/pages/Account/view.tsx.
 *
 * Focus:
 * - Drawer opens, fetches user details, and displays them.
 * - Drawer closes when the close control is clicked.
 */

import AccountView from '@/pages/Account/view';
import { getUsersByIds } from '@/services/users/api';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  MailOutlined: () => <span>mail</span>,
  ProfileOutlined: () => <span>profile</span>,
  UserOutlined: () => <span>user</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = React.forwardRef(
    ({ children, onClick, disabled, icon, ...rest }: any, ref: any) => (
      <button
        ref={ref}
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        {...rest}
      >
        {icon}
        {children}
      </button>
    ),
  );
  Button.displayName = 'MockButton';

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    const child = React.Children.only(children);
    return React.cloneElement(child, {
      'aria-label': label,
      title: label,
    });
  };

  const DescriptionsContext = React.createContext(null);

  const Descriptions = ({ children }: any) => (
    <dl data-testid='descriptions'>
      <DescriptionsContext.Provider value={null}>{children}</DescriptionsContext.Provider>
    </dl>
  );

  Descriptions.Item = ({ label, children }: any) => (
    <>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </>
  );

  const Card = ({ title, children }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{children}</div>
    </section>
  );

  const Drawer = ({ open, title, extra, children, onClose }: any) =>
    open ? (
      <div data-testid='drawer'>
        <div>
          <h2>{toText(title)}</h2>
          {extra}
        </div>
        <div>{children}</div>
        <button type='button' onClick={onClose} style={{ display: 'none' }}>
          hidden-close
        </button>
      </div>
    ) : null;

  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const ConfigProvider = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    Card,
    ConfigProvider,
    Descriptions,
    Drawer,
    Spin,
    Tooltip,
  };
});

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUsersByIds: jest.fn(),
}));

const mockGetUsersByIds = getUsersByIds as jest.MockedFunction<any>;

describe('AccountView component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUsersByIds.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        display_name: 'Alice',
      },
    ] as any);
  });

  it('fetches and renders user details when opened', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccountView userId='user-1' />);

    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'View Account' });
    await user.click(trigger);

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['user-1']);

    await waitFor(() => expect(screen.getByText('user-1')).toBeInTheDocument());
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId('spin').getAttribute('data-spinning')).toBe('false'),
    );
  });

  it('allows the user to close the drawer after viewing details', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccountView userId='user-1' />);

    const trigger = screen.getByRole('button', { name: 'View Account' });
    await user.click(trigger);

    await waitFor(() => expect(screen.getByTestId('drawer')).toBeInTheDocument());

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => expect(screen.queryByTestId('drawer')).not.toBeInTheDocument());
  });
});
