import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span>{defaultMessage || id}</span>
  ),
}));

jest.mock('antd', () => {
  const React = require('react') as typeof import('react');

  const extractText = (node: any): string => {
    if (node === null || node === undefined) {
      return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join('');
    }
    if (node?.props) {
      return (
        extractText(node.props.children) ||
        extractText(node.props.defaultMessage) ||
        extractText(node.props.message)
      );
    }
    return '';
  };

  const Tooltip = ({ title, children }: any) => {
    const label = extractText(title) || 'tooltip';
    return React.cloneElement(children, { 'aria-label': label, title: label });
  };

  const Button = React.forwardRef<HTMLButtonElement, any>((props, ref) => {
    const { children, onClick, disabled, htmlType = 'button', type: variant, ...rest } = props;
    return (
      <button
        ref={ref}
        type='button'
        data-variant={variant}
        data-html-type={htmlType}
        onClick={onClick}
        disabled={disabled}
        {...rest}
      >
        {children}
      </button>
    );
  });
  Button.displayName = 'MockButton';

  const Drawer = ({ open, title, extra, children, onClose }: any) => {
    if (!open) {
      return null;
    }
    const heading = typeof title === 'string' ? title : (title?.props?.children ?? 'Drawer');
    return (
      <section role='dialog' aria-modal='true'>
        <header>
          <h2>{heading}</h2>
          <div>{extra}</div>
        </header>
        <div>{children}</div>
        <button type='button' onClick={onClose} aria-label='close drawer'>
          Close
        </button>
      </section>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  const Card = ({ title, children }: any) => (
    <section>
      <h3>{typeof title === 'string' ? title : (title?.props?.children ?? '')}</h3>
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{typeof label === 'string' ? label : (label?.props?.children ?? '')}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Image = ({ src, alt }: any) => <img src={src} alt={alt} />;

  const Spin = ({ spinning, children }: any) => (
    <div data-testid={spinning ? 'spinner-active' : 'spinner-idle'}>{children}</div>
  );

  return {
    __esModule: true,
    Button,
    Card,
    Descriptions,
    Drawer,
    Image,
    Space,
    Spin,
    Tooltip,
  };
});

jest.mock('@/services/teams/api', () => ({
  getTeamMessageApi: jest.fn(),
}));

jest.mock('@/services/supabase/storage', () => ({
  getThumbFileUrls: jest.fn(),
}));

import TeamView from '@/components/AllTeams/view';
import { getThumbFileUrls } from '@/services/supabase/storage';
import { getTeamMessageApi } from '@/services/teams/api';

const mockGetTeamMessageApi = getTeamMessageApi as unknown as jest.MockedFunction<any>;
const mockGetThumbFileUrls = getThumbFileUrls as unknown as jest.MockedFunction<any>;

const teamResponse = {
  data: [
    {
      id: 'team-1',
      rank: -1,
      json: {
        title: [
          { '#text': 'Team EN', '@xml:lang': 'en' },
          { '#text': '团队中文', '@xml:lang': 'zh' },
        ],
        description: [
          { '#text': 'English description', '@xml:lang': 'en' },
          { '#text': '中文描述', '@xml:lang': 'zh' },
        ],
        lightLogo: 'existing/light.png',
        darkLogo: 'existing/dark.png',
      },
    },
  ],
};

describe('TeamView component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTeamMessageApi.mockResolvedValue(teamResponse);
    mockGetThumbFileUrls
      .mockImplementationOnce(() =>
        Promise.resolve([{ status: 'done', thumbUrl: 'https://cdn.example.com/light-thumb.png' }]),
      )
      .mockImplementationOnce(() =>
        Promise.resolve([{ status: 'done', thumbUrl: 'https://cdn.example.com/dark-thumb.png' }]),
      );
  });

  it('opens the drawer and renders team information', async () => {
    const user = userEvent.setup();

    render(<TeamView id='team-1' buttonType='icon' />);

    await user.click(screen.getByRole('button', { name: /view/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetTeamMessageApi).toHaveBeenCalledWith('team-1');
    });

    await waitFor(() => {
      expect(mockGetThumbFileUrls).toHaveBeenNthCalledWith(1, [{ '@uri': 'existing/light.png' }]);
      expect(mockGetThumbFileUrls).toHaveBeenNthCalledWith(2, [{ '@uri': 'existing/dark.png' }]);
    });

    expect(await screen.findByText('Team EN')).toBeInTheDocument();
    expect(screen.getByText('English description')).toBeInTheDocument();

    const lightImage = await screen.findByAltText('Light Logo');
    expect(lightImage).toHaveAttribute('src', 'https://cdn.example.com/light-thumb.png');
    const darkImage = await screen.findByAltText('Dark Logo');
    expect(darkImage).toHaveAttribute('src', 'https://cdn.example.com/dark-thumb.png');
  });

  it('closes the drawer when the close control is used', async () => {
    const user = userEvent.setup();

    render(<TeamView id='team-1' buttonType='icon' />);

    await user.click(screen.getByRole('button', { name: /view/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /close drawer/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders text button when buttonType is not icon', async () => {
    const user = userEvent.setup();

    render(<TeamView id='team-1' buttonType='default' />);

    const trigger = screen.getByRole('button', { name: /view/i });
    expect(trigger).toHaveTextContent('View');

    await user.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
