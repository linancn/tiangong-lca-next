// @ts-nocheck
import { lifeCycleModelConnectionOptions } from '@/pages/LifeCycleModels/Components/graphConnectionOptions';
import LifeCycleModelView from '@/pages/LifeCycleModels/Components/view';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let latestToolbarProps: any = null;
let latestGraphProps: any = null;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  AppstoreOutlined: () => <span>appstore-icon</span>,
  CloseOutlined: () => <span>close-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled = false, icon, ...rest }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Drawer = ({ open, title, extra, children, onClose, getContainer }: any) => {
    if (!open) return null;
    return (
      <section
        role='dialog'
        aria-label={toText(title) || 'drawer'}
        data-container={String(Boolean(getContainer?.()))}
      >
        <header>{extra}</header>
        <div>{children}</div>
        <button type='button' onClick={onClose}>
          mask-close
        </button>
      </section>
    );
  };

  const Layout = ({ children }: any) => <div>{children}</div>;
  Layout.Sider = ({ children }: any) => <aside>{children}</aside>;
  Layout.Content = ({ children }: any) => <main>{children}</main>;

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
    ConfigProvider,
    Drawer,
    Layout,
    Tooltip,
    theme,
  };
});

jest.mock('@/components/X6Graph', () => ({
  __esModule: true,
  default: (props: any) => {
    latestGraphProps = props;
    return <div data-testid='x6-graph'>graph</div>;
  },
}));

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  GraphProvider: ({ children }: any) => <div data-testid='graph-provider'>{children}</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/viewIndex', () => ({
  __esModule: true,
  default: (props: any) => {
    latestToolbarProps = props;
    return <div data-testid='toolbar-view'>toolbar-view</div>;
  },
}));

describe('LifeCycleModelView', () => {
  beforeEach(() => {
    latestToolbarProps = null;
    latestGraphProps = null;
  });

  it('does not open the tool icon entry when disabled', async () => {
    renderWithProviders(
      <LifeCycleModelView
        id='model-tool'
        version='1.0.0'
        buttonType='toolIcon'
        lang='en'
        disabled
      />,
    );

    const trigger = screen.getByRole('button', { name: /lifecycle model infomation/i });
    expect(trigger).toBeDisabled();

    await userEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open the iconModel entry when disabled', async () => {
    renderWithProviders(
      <LifeCycleModelView id='model-1' version='1.0.0' buttonType='iconModel' lang='en' disabled />,
    );

    const trigger = screen.getByRole('button', { name: /view/i });
    expect(trigger).toBeDisabled();

    await userEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the drawer and forwards view props to toolbar', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <LifeCycleModelView
        id='model-1'
        version='1.0.0'
        buttonType='icon'
        lang='en'
        actionRef={actionRef as any}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(screen.getByRole('dialog', { name: /view model/i })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /view model/i })).toHaveAttribute(
      'data-container',
      'true',
    );
    expect(screen.getByTestId('graph-provider')).toBeInTheDocument();
    expect(screen.getByTestId('x6-graph')).toBeInTheDocument();
    expect(latestGraphProps?.transformOptions).toEqual({
      resizing: {
        enabled: true,
        orthogonal: false,
      },
    });
    expect(latestGraphProps?.connectionOptions).toEqual(lifeCycleModelConnectionOptions);

    await waitFor(() =>
      expect(latestToolbarProps).toMatchObject({
        id: 'model-1',
        version: '1.0.0',
        lang: 'en',
        drawerVisible: true,
        actionRef,
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the tool icon entry when enabled', async () => {
    renderWithProviders(
      <LifeCycleModelView id='model-2' version='2.0.0' buttonType='toolIcon' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /lifecycle model infomation/i }));

    expect(screen.getByRole('dialog', { name: /view model/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(latestToolbarProps).toMatchObject({
        id: 'model-2',
        version: '2.0.0',
      }),
    );
  });

  it('opens from the iconModel entry when enabled', async () => {
    renderWithProviders(
      <LifeCycleModelView id='model-3' version='3.0.0' buttonType='iconModel' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(screen.getByRole('dialog', { name: /view model/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(latestToolbarProps).toMatchObject({
        id: 'model-3',
        version: '3.0.0',
      }),
    );
  });

  it('opens from the default text button entry', async () => {
    renderWithProviders(
      <LifeCycleModelView id='model-4' version='4.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^view$/i }));

    expect(screen.getByRole('dialog', { name: /view model/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(latestToolbarProps).toMatchObject({
        id: 'model-4',
        version: '4.0.0',
      }),
    );
  });

  it('opens automatically without rendering a trigger when autoOpen is enabled', async () => {
    const onDrawerClose = jest.fn();

    renderWithProviders(
      <LifeCycleModelView
        id='model-auto'
        version='6.0.0'
        buttonType='icon'
        lang='en'
        autoOpen
        onDrawerClose={onDrawerClose}
      />,
    );

    expect(screen.queryByRole('button', { name: /^view$/i })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /view model/i })).toBeInTheDocument(),
    );
    expect(latestToolbarProps).toMatchObject({
      id: 'model-auto',
      version: '6.0.0',
      drawerVisible: true,
    });

    await userEvent.click(screen.getByRole('button', { name: /mask-close/i }));
    expect(onDrawerClose).toHaveBeenCalledTimes(1);
  });

  it('closes through the drawer mask-close action', async () => {
    renderWithProviders(
      <LifeCycleModelView id='model-5' version='5.0.0' buttonType='text' lang='en' />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^view$/i }));
    expect(screen.getByRole('dialog', { name: /view model/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /mask-close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
