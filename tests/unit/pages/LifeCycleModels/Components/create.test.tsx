// @ts-nocheck
import LifeCycleModelCreate from '@/pages/LifeCycleModels/Components/create';
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

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  CopyOutlined: () => <span>copy-icon</span>,
  PlusOutlined: () => <span>plus-icon</span>,
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

  const Drawer = ({ open, title, extra, children, onClose }: any) => {
    if (!open) return null;
    return (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
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

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(tooltip)}
    </button>
  ),
}));

jest.mock('@/components/X6Graph', () => ({
  __esModule: true,
  default: () => <div data-testid='x6-graph'>graph</div>,
}));

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  GraphProvider: ({ children }: any) => <div data-testid='graph-provider'>{children}</div>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/editIndex', () => ({
  __esModule: true,
  default: (props: any) => {
    latestToolbarProps = props;
    return (
      <div data-testid='toolbar-edit'>
        <button type='button' onClick={() => props.setIsSave(true)}>
          mark-save
        </button>
      </div>
    );
  },
}));

describe('LifeCycleModelCreate', () => {
  beforeEach(() => {
    latestToolbarProps = null;
  });

  it('opens the drawer and forwards create metadata to toolbar edit', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <LifeCycleModelCreate
        buttonType='icon'
        lang='en'
        actionRef={actionRef as any}
        actionType='copy'
        id='model-1'
        version='1.0.0'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));

    expect(screen.getByRole('dialog', { name: /create model/i })).toBeInTheDocument();
    expect(screen.getByTestId('graph-provider')).toBeInTheDocument();
    expect(screen.getByTestId('x6-graph')).toBeInTheDocument();

    await waitFor(() =>
      expect(latestToolbarProps).toMatchObject({
        actionType: 'copy',
        id: 'model-1',
        version: '1.0.0',
        lang: 'en',
        drawerVisible: true,
        action: 'create',
      }),
    );
  });

  it('auto-opens with import data and reloads after a saved close', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <LifeCycleModelCreate
        buttonType='text'
        lang='en'
        actionRef={actionRef as any}
        importData={[{ id: 'import-1' }] as any}
        newVersion='02.00.000'
      />,
    );

    expect(await screen.findByRole('dialog', { name: /create model/i })).toBeInTheDocument();
    await waitFor(() => expect(latestToolbarProps?.importData).toEqual([{ id: 'import-1' }]));
    expect(latestToolbarProps?.newVersion).toBe('02.00.000');

    await userEvent.click(screen.getByRole('button', { name: /mark-save/i }));
    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));

    expect(actionRef.current.reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes without reloading when nothing was saved', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    renderWithProviders(
      <LifeCycleModelCreate buttonType='text' lang='en' actionRef={actionRef as any} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByRole('dialog', { name: /create model/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /mask-close/i }));

    expect(actionRef.current.reload).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
