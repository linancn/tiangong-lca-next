// @ts-nocheck
/**
 * Welcome workflow integration tests
 * User paths covered:
 * - Visitor scans homepage hero metrics, then opens the Data Ecosystem modal via the Data Teams link and sees team thumbnails hydrated from getTeams + getThumbFileUrls
 * - Visitor launches a team entry from the modal and is redirected to the team models listing
 * - Visitor in dark mode sees dark-themed thumbnails; empty team responses keep the modal responsive without spinner lockups
 * Services touched under test: getTeams, getThumbFileUrls
 */

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage, id }) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }) => defaultMessage ?? id,
  }),
}));

jest.mock('react-countup', () => ({
  __esModule: true,
  default: ({ end }) => <span data-testid='countup-value'>{end}</span>,
}));

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }) => (
    <div data-testid='page-container'>
      <div data-testid='page-title'>{title ?? ''}</div>
      <div>{children}</div>
    </div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const token = {
    colorPrimary: '#1677ff',
    colorBgElevated: '#ffffff',
    boxShadow: 'none',
    colorText: '#1f1f1f',
    colorFillSecondary: '#fafafa',
    colorTextSecondary: '#595959',
    colorSplit: '#d9d9d9',
  };

  const ConfigProvider = ({ children }) => <>{children}</>;

  const CardMeta = ({ title, description }) => (
    <div data-testid='card-meta'>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  );

  const Card = ({ children, cover, onClick, hoverable, bodyStyle, className, style, ...rest }) => {
    void hoverable;
    return (
      <div
        data-testid={onClick ? 'card-clickable' : 'card'}
        role={onClick ? 'button' : 'group'}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        className={className}
        style={style}
        {...rest}
      >
        {cover}
        <div style={bodyStyle ?? undefined}>{children}</div>
      </div>
    );
  };
  Card.Meta = CardMeta;

  const Typography = {
    Link: ({ children, onClick, href = '#', strong, ...rest }) => {
      void strong;
      return (
        <a
          href={href}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
          }}
          {...rest}
        >
          {children}
        </a>
      );
    },
    Paragraph: ({ children, strong, ...rest }) => {
      void strong;
      return (
        <p data-testid='typography-paragraph' {...rest}>
          {children}
        </p>
      );
    },
    Text: ({ children, strong, ...rest }) => {
      void strong;
      return (
        <span data-testid='typography-text' {...rest}>
          {children}
        </span>
      );
    },
  };

  const Row = ({ children, wrap, justify, align, gutter, ...rest }) => {
    void wrap;
    void justify;
    void align;
    void gutter;
    return (
      <div data-testid='row' {...rest}>
        {children}
      </div>
    );
  };

  const Col = ({ children, ...rest }) => (
    <div data-testid='col' {...rest}>
      {children}
    </div>
  );

  const Divider = (props) => <hr data-testid='divider' {...props} />;

  const Space = ({ children, wrap, ...rest }) => {
    void wrap;
    return (
      <div data-testid='space' {...rest}>
        {children}
      </div>
    );
  };

  const Spin = () => <div data-testid='spin'>loading</div>;

  const Statistic = ({ title, value, formatter }) => (
    <div data-testid='statistic'>
      <div>{title}</div>
      <div>{formatter ? formatter(value) : value}</div>
    </div>
  );

  const Image = ({ src, alt = '', preview, ...rest }) => {
    void preview;
    return <img src={src} alt={alt} data-testid='image' {...rest} />;
  };

  const Button = ({ children, onClick, type: buttonType, ...rest }) => {
    void buttonType;
    return (
      <button type='button' onClick={onClick} {...rest}>
        {children}
      </button>
    );
  };

  const Modal = ({ open, onCancel, children, title, width }) => {
    if (!open) {
      return null;
    }
    return (
      <div data-testid='modal' data-width={width ?? ''}>
        <div data-testid='modal-title'>{title}</div>
        <button type='button' onClick={onCancel}>
          Close
        </button>
        <div>{children}</div>
      </div>
    );
  };
  Modal.confirm = jest.fn();

  return {
    __esModule: true,
    Button,
    Card,
    Col,
    ConfigProvider,
    Divider,
    Image,
    Modal,
    Row,
    Space,
    Spin,
    Statistic,
    Typography,
    theme: {
      useToken: () => ({ token }),
    },
  };
});

jest.mock('@/services/teams/api', () => ({
  getTeams: jest.fn(),
}));

jest.mock('@/services/supabase/storage', () => ({
  getThumbFileUrls: jest.fn(),
}));

import Welcome from '@/pages/Welcome';
import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeams } from '@/services/teams/api';
import userEvent from '@testing-library/user-event';
import { mockTeam } from '../../helpers/testData';
import { renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

const mockGetTeams = getTeams as jest.Mock;
const mockGetThumbFileUrls = getThumbFileUrls as jest.Mock;

const buildTeam = (overrides = {}) => ({
  ...mockTeam,
  json: {
    ...mockTeam.json,
    lightLogo: '../sys-files/light.svg',
    darkLogo: '../sys-files/dark.svg',
    description: [
      { '@xml:lang': 'en', '#text': 'Test team description' },
      { '@xml:lang': 'zh', '#text': '测试团队描述' },
    ],
    ...overrides.json,
  },
  ...overrides,
});

const flushTeamsLoading = () => waitFor(() => expect(mockGetTeams).toHaveBeenCalled());

describe('WelcomeWorkflow integration', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    delete (window as any).location;
    (window as any).location = {
      href: 'http://localhost/',
      assign: jest.fn(),
      replace: jest.fn(),
    };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.location.href = 'http://localhost/';
  });

  it('opens Data Ecosystem modal, resolves teams, and navigates to team models', async () => {
    localStorage.setItem('isDarkMode', 'false');

    mockGetTeams.mockResolvedValue({
      data: [buildTeam()],
      success: true,
    });
    mockGetThumbFileUrls
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/light.png' }])
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/dark.png' }]);

    renderWithProviders(<Welcome />);

    const user = userEvent.setup();
    const dataTeamsLink = screen.getByRole('link', { name: /Data Teams/i });
    await user.click(dataTeamsLink);

    const modal = await screen.findByTestId('modal');

    await flushTeamsLoading();

    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Test Team EN')).toBeInTheDocument());

    expect(mockGetThumbFileUrls).toHaveBeenCalledTimes(2);

    const [teamCard] = within(modal).getAllByTestId('card-clickable');
    const teamLogo = within(teamCard).getByRole('img', { hidden: true });
    expect(teamLogo).toHaveAttribute('src', 'https://cdn.example/light.png');

    const clickableCard = screen
      .getByText('Test Team EN')
      .closest('[data-testid="card-clickable"]');
    expect(clickableCard).not.toBeNull();
    await user.click(clickableCard as Element);

    expect(window.location.href).toContain('/tgdata/models?tid=team-123');

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);
    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
  });

  it('prefers dark thumbnails when dark mode is active', async () => {
    localStorage.setItem('isDarkMode', 'true');

    mockGetTeams.mockResolvedValue({
      data: [buildTeam()],
      success: true,
    });
    mockGetThumbFileUrls
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/light.png' }])
      .mockResolvedValueOnce([{ status: 'done', thumbUrl: 'https://cdn.example/dark.png' }]);

    renderWithProviders(<Welcome />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /Data Teams/i }));

    const modal = await screen.findByTestId('modal');

    await flushTeamsLoading();
    await waitFor(() => expect(screen.getByText('Test Team EN')).toBeInTheDocument());

    const [teamCard] = within(modal).getAllByTestId('card-clickable');
    const teamLogo = within(teamCard).getByRole('img', { hidden: true });
    expect(teamLogo).toHaveAttribute('src', 'https://cdn.example/dark.png');
  });

  it('keeps modal responsive when no teams are returned', async () => {
    localStorage.setItem('isDarkMode', 'false');

    mockGetTeams.mockResolvedValue({
      data: [],
      success: false,
    });

    renderWithProviders(<Welcome />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /Data Teams/i }));

    await flushTeamsLoading();

    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument());
    expect(screen.queryByText('Test Team EN')).not.toBeInTheDocument();
    expect(mockGetThumbFileUrls).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });
});
