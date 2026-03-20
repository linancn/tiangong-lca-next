// @ts-nocheck
import ReviewLifeCycleModelsDetail from '@/pages/Review/Components/reviewLifeCycleModels';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/components/X6Graph', () => ({
  __esModule: true,
  default: () => <div data-testid='x6-graph'>graph</div>,
}));

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  GraphProvider: ({ children }: any) => <div data-testid='graph-provider'>{children}</div>,
}));

jest.mock('@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewIndex', () => ({
  __esModule: true,
  default: ({ id, version, lang, drawerVisible, type, reviewId, tabType }: any) => (
    <div data-testid='toolbar-view'>
      {JSON.stringify({ id, version, lang, drawerVisible, type, reviewId, tabType })}
    </div>
  ),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  AuditOutlined: () => <span>audit</span>,
  CloseOutlined: () => <span>close</span>,
  ProfileOutlined: () => <span>profile</span>,
}));

jest.mock('antd', () => {
  const Layout = ({ children }: any) => <div>{children}</div>;
  Layout.Sider = ({ children }: any) => <aside>{children}</aside>;
  Layout.Content = ({ children }: any) => <main>{children}</main>;

  const Button = ({ children, onClick, icon }: any) => (
    <button type='button' aria-label={toText(icon) || toText(children)} onClick={onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, children, extra, getContainer, onClose }: any) => {
    const container = getContainer?.();

    return open ? (
      <section data-testid='drawer' data-container={String(Boolean(container))}>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <button type='button' aria-label='drawer-close' onClick={onClose}>
          close drawer
        </button>
        <div>{children}</div>
      </section>
    ) : null;
  };

  const Tooltip = ({ children }: any) => <>{children}</>;

  const theme = {
    useToken: () => ({
      token: {
        colorBgBase: '#fff',
      },
    }),
  };

  return {
    __esModule: true,
    Button,
    Drawer,
    Layout,
    Tooltip,
    theme,
  };
});

describe('ReviewLifeCycleModelsDetail', () => {
  const baseProps = {
    id: 'model-1',
    version: '1.0.0',
    lang: 'en',
    actionRef: { current: undefined },
    reviewId: 'review-1',
    tabType: 'review' as const,
  };

  it('opens the review drawer in edit mode and passes graph toolbar props through', async () => {
    render(<ReviewLifeCycleModelsDetail {...baseProps} type='edit' />);

    await userEvent.click(screen.getByRole('button', { name: 'audit' }));

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.getByText('Review model')).toBeInTheDocument();
    expect(screen.getByTestId('graph-provider')).toBeInTheDocument();
    expect(screen.getByTestId('x6-graph')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-view')).toHaveTextContent('"type":"edit"');
    expect(screen.getByTestId('toolbar-view')).toHaveTextContent('"drawerVisible":true');
  });

  it('opens the view drawer in view mode', async () => {
    render(<ReviewLifeCycleModelsDetail {...baseProps} type='view' />);

    await userEvent.click(screen.getByRole('button', { name: 'profile' }));

    expect(screen.getByText('View review')).toBeInTheDocument();
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-container', 'true');
    expect(screen.getByTestId('toolbar-view')).toHaveTextContent('"type":"view"');
    expect(screen.getByTestId('toolbar-view')).toHaveTextContent('"tabType":"review"');
  });

  it('closes the drawer through the extra close button and drawer onClose', async () => {
    render(<ReviewLifeCycleModelsDetail {...baseProps} type='edit' />);

    await userEvent.click(screen.getByRole('button', { name: 'audit' }));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'audit' }));
    expect(screen.getByTestId('drawer')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'drawer-close' }));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });
});
