/**
 * Integration tests for the Processes workflow.
 * Paths exercised:
 * - src/pages/Processes/index.tsx
 * - src/pages/Processes/Components/create.tsx (mocked interface)
 * - src/pages/Processes/Components/edit.tsx (mocked interface)
 * - src/pages/Processes/Components/ReviewDetail.tsx (mocked interface)
 *
 * User journey covered:
 * 1. Owner lands on /mydata processes list, team metadata resolves, and rows render from getProcessTableAll.
 * 2. Owner imports JSON to seed create drawer, triggers create flow, and ProTable reloads.
 * 3. Owner opens inline edit drawer, saves changes, and observes another table reload.
 * 4. Owner expands review detail from the actions dropdown.
 * 5. Query parameters with id/version auto-open the edit drawer for deep links.
 *
 * Services mocked:
 * - getProcessTableAll
 * - getProcessTablePgroongaSearch
 * - process_hybrid_search
 * - getTeamById
 */

import ProcessesPage from '@/pages/Processes';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../helpers/testUtils';

const setTestLocation = (pathname: string, search = '') => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname, search: search ? `?${search}` : '' });
};

jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/processes', search: '' });
  return umi.createUmiMock();
});

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

jest.mock('@ant-design/pro-table', () => require('@/tests/mocks/proTable').createProTableMock());

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid='all-versions'>{children}</div>,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: ({ onOk, disabled }: any) => (
    <button type='button' data-testid='contribute' disabled={disabled} onClick={() => onOk?.()}>
      Contribute
    </button>
  ),
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <button type='button' data-testid={`export-${id}-${version}`}>
      Export
    </button>
  ),
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button
      type='button'
      data-testid='import-data'
      onClick={() =>
        onJsonData?.([
          {
            processDataSet: {
              processInformation: {
                dataSetInformation: {
                  name: 'Imported process',
                },
              },
            },
          },
        ])
      }
    >
      Import JSON
    </button>
  ),
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <button type='button' data-testid='table-filter' onClick={() => onChange?.('published')}>
      Filter Published
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <button type='button' data-testid={`view-${id}-${version}`}>
      View {id}
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/delete', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <button type='button' data-testid={`delete-${id}-${version}`}>
      Delete {id}
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/ReviewDetail', () => {
  const React = require('react');
  const ReviewDetailMock = ({ processId, processVersion }: any) => {
    const [open, setOpen] = React.useState(false);
    return (
      <div>
        <button type='button' onClick={() => setOpen((prev: boolean) => !prev)}>
          View review {processId}
        </button>
        {open ? <div data-testid='review-panel'>{`${processId}@${processVersion}`}</div> : null}
      </div>
    );
  };
  return {
    __esModule: true,
    default: ReviewDetailMock,
  };
});

jest.mock('@/pages/Processes/Components/create', () => {
  const React = require('react');
  const { message } = require('antd');

  const ProcessCreateMock = ({ actionRef, importData = [], actionType = 'create' }: any) => {
    const [open, setOpen] = React.useState(false);
    const importCount = Array.isArray(importData) ? importData.length : 0;

    const labels: Record<string, { trigger: string; submit: string }> = {
      create: {
        trigger: 'Create Process',
        submit: 'Submit Process',
      },
      copy: {
        trigger: 'Copy Process',
        submit: 'Submit Copy',
      },
      createVersion: {
        trigger: 'Create Version',
        submit: 'Submit Version',
      },
    };

    const current = labels[actionType] ?? labels.create;

    return (
      <div data-testid={`process-create-${actionType}`}>
        <button type='button' onClick={() => setOpen(true)}>
          {current.trigger}
        </button>
        <span data-testid={`process-import-count-${actionType}`}>{importCount}</span>
        {open ? (
          <div data-testid={`process-create-panel-${actionType}`}>
            <button
              type='button'
              onClick={() => {
                message.success(`${current.trigger} success`);
                actionRef?.current?.reload?.();
                setOpen(false);
              }}
            >
              {current.submit}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return {
    __esModule: true,
    default: ProcessCreateMock,
  };
});

jest.mock('@/pages/Processes/Components/edit', () => {
  const React = require('react');
  const { message } = require('antd');

  const ProcessEditMock = ({
    id,
    version,
    actionRef,
    autoOpen = false,
    setViewDrawerVisible = (visible: boolean) => {
      void visible;
    },
  }: any) => {
    const [open, setOpen] = React.useState(autoOpen);

    const close = () => {
      setOpen(false);
      setViewDrawerVisible?.(false);
    };

    return (
      <div data-testid={`process-edit-${id}-${version}`}>
        <button type='button' onClick={() => setOpen(true)}>
          Edit process {id}
        </button>
        {open ? (
          <div data-testid={`edit-panel-${id}`}>
            <span>{`${id}@${version}`}</span>
            <button
              type='button'
              onClick={() => {
                message.success(`Saved ${id}`);
                actionRef?.current?.reload?.();
                close();
              }}
            >
              Save edit {id}
            </button>
            <button type='button' onClick={close}>
              Close edit {id}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return {
    __esModule: true,
    default: ProcessEditMock,
  };
});

jest.mock('@/services/processes/api', () => ({
  getProcessTableAll: jest.fn(),
  getProcessTablePgroongaSearch: jest.fn(),
  process_hybrid_search: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  getTeamById: jest.fn(),
}));

const { getProcessTableAll, getProcessTablePgroongaSearch, process_hybrid_search } =
  jest.requireMock('@/services/processes/api');
const { getTeamById } = jest.requireMock('@/services/teams/api');
const { message } = jest.requireMock('antd');

const setLocation = (pathWithSearch: string) => {
  const [path, search = ''] = pathWithSearch.split('?');
  setTestLocation(path, search);
};

const baseRow = {
  id: 'process-1',
  version: '01.00.000',
  name: 'Solar panel manufacturing',
  generalComment: 'General comment',
  classification: 'Energy',
  typeOfDataSet: 'unitProcessesBlackBox',
  referenceYear: '2024',
  location: 'CN',
  modifiedAt: '2024-01-01T00:00:00Z',
  teamId: 'team-1',
};

describe('Processes workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocation('/mydata/processes?tid=team-1');
    getTeamById.mockResolvedValue({
      data: [
        {
          json: {
            title: [
              {
                '@xml:lang': 'en',
                '#text': 'Energy Team',
              },
            ],
          },
        },
      ],
    });
    getProcessTableAll.mockResolvedValue({
      data: [baseRow],
      success: true,
      total: 1,
    });
    getProcessTablePgroongaSearch.mockResolvedValue({
      data: [baseRow],
      success: true,
      total: 1,
    });
    process_hybrid_search.mockResolvedValue({
      data: [baseRow],
      success: true,
      total: 1,
    });
  });

  it('allows creating, editing, importing, and reviewing processes', async () => {
    const user = userEvent.setup();

    const renderResult = renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Solar panel manufacturing')).toBeInTheDocument();
    expect(screen.getByTestId('page-container-title')).toHaveTextContent('Energy Team');

    await user.click(screen.getByTestId('import-data'));
    expect(screen.getByTestId('process-import-count-create')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'Create Process' }));
    await user.click(screen.getByRole('button', { name: 'Submit Process' }));

    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(2));
    expect(message.success).toHaveBeenCalledWith('Create Process success');

    await user.click(screen.getByRole('button', { name: 'View review process-1' }));
    expect(screen.getByTestId('review-panel')).toHaveTextContent('process-1@01.00.000');

    await user.click(screen.getByRole('button', { name: 'Edit process process-1' }));
    expect(screen.getByTestId('edit-panel-process-1')).toHaveTextContent('process-1@01.00.000');

    await user.click(screen.getByRole('button', { name: 'Save edit process-1' }));
    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(3));
    expect(message.success).toHaveBeenCalledWith('Saved process-1');

    await user.click(screen.getByRole('button', { name: 'Filter Published' }));
    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(4));
    const lastCall = getProcessTableAll.mock.calls[getProcessTableAll.mock.calls.length - 1];
    expect(lastCall[5]).toBe('published');

    renderResult.unmount();

    setLocation('/mydata/processes?tid=team-1&id=process-2&version=02.00.000');

    const updatedRow = {
      ...baseRow,
      id: 'process-2',
      version: '02.00.000',
      name: 'Wind turbine maintenance',
    };

    getProcessTableAll.mockResolvedValueOnce({
      data: [updatedRow],
      success: true,
      total: 1,
    });

    const secondRender = renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(5));
    expect(await screen.findByText('Wind turbine maintenance')).toBeInTheDocument();
    expect(screen.getByTestId('edit-panel-process-2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close edit process-2' }));
    await waitFor(() =>
      expect(screen.queryByTestId('edit-panel-process-2')).not.toBeInTheDocument(),
    );

    secondRender.unmount();
  });
});
