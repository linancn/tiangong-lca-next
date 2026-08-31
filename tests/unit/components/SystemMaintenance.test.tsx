import SystemMaintenance from '@/components/SystemMaintenance';
import { fireEvent, render, screen } from '@testing-library/react';

const mockReload = jest.fn();

jest.mock('@/utils/browserNavigation', () => ({
  __esModule: true,
  reloadBrowserPage: (...args: unknown[]) => mockReload(...args),
}));

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ id }: { id: string }) => <span>{id}</span>,
  useIntl: () => ({
    formatDate: (value: string) => `formatted:${value}`,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  ReloadOutlined: () => <span>reload</span>,
  ToolOutlined: () => <span>tool</span>,
}));

jest.mock('antd', () => ({
  __esModule: true,
  Button: ({ children, icon, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {icon}
      {children}
    </button>
  ),
  Tag: ({ children }: any) => <div>{children}</div>,
  Typography: {
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Title: ({ children, id }: any) => <h1 id={id}>{children}</h1>,
  },
}));

describe('SystemMaintenance', () => {
  beforeEach(() => mockReload.mockClear());

  it('renders release maintenance details and reloads only on user request', () => {
    render(
      <SystemMaintenance
        status={{
          schemaVersion: 1,
          phase: 'maintenance',
          reason: 'release_upgrade',
          targetVersion: '0.0.71',
          estimatedEndAt: '2026-08-14T10:30:00+08:00',
        }}
      />,
    );

    expect(screen.getByTestId('system-maintenance')).toHaveTextContent(
      'component.systemMaintenance.maintenanceTag',
    );
    expect(screen.getByText('0.0.71')).toBeInTheDocument();
    expect(screen.getByText('formatted:2026-08-14T10:30:00+08:00')).toBeInTheDocument();
    expect(screen.queryByText('component.systemMaintenance.refreshHint')).not.toBeInTheDocument();
    expect(mockReload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('renders verifying copy without optional release details', () => {
    render(<SystemMaintenance status={{ schemaVersion: 1, phase: 'verifying' }} />);

    expect(screen.getByTestId('system-maintenance')).toHaveTextContent(
      'component.systemMaintenance.verifyingTag',
    );
    expect(screen.queryByText('component.systemMaintenance.targetVersion')).not.toBeInTheDocument();
  });
});
