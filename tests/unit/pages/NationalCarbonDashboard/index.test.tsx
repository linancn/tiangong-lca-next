import { render, screen } from '@testing-library/react';

import NationalCarbonDashboardPage, {
  canViewNationalCarbonDashboard,
} from '@/pages/NationalCarbonDashboard';

let mockInitialState: { currentUser?: { access?: string } } | undefined;

jest.mock('@umijs/max', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) => (
    <span>{defaultMessage ?? id}</span>
  ),
  useModel: () => ({
    initialState: mockInitialState,
  }),
}));

jest.mock('pixi.js', () => ({
  Application: jest.fn(),
  Container: jest.fn(),
  Graphics: jest.fn(),
}));

jest.mock(
  '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/ProcessFlowGraphPanel',
  () => {
    return function MockProcessFlowGraphPanel() {
      return <div data-testid='process-flow-graph-panel' />;
    };
  },
);

describe('NationalCarbonDashboard access guard', () => {
  afterEach(() => {
    mockInitialState = undefined;
  });

  it('only allows admin users', () => {
    expect(canViewNationalCarbonDashboard({ access: 'admin' } as Auth.CurrentUser)).toBe(true);
    expect(canViewNationalCarbonDashboard({ access: 'user' } as Auth.CurrentUser)).toBe(false);
    expect(canViewNationalCarbonDashboard(undefined)).toBe(false);
  });

  it('renders access denied for non-admin direct visits', () => {
    mockInitialState = { currentUser: { access: 'user' } };

    render(<NationalCarbonDashboardPage />);

    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });
});
