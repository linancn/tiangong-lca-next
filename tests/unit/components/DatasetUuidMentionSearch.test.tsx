import DatasetUuidMentionSearch from '@/components/DatasetUuidMentionSearch';
import { searchDatasetJsonUuidMentions } from '@/services/datasetUuidMentionSearch/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@ant-design/icons', () => ({
  SearchOutlined: () => <span data-testid='search-icon' />,
}));

jest.mock('antd', () => {
  return {
    Alert: ({ message, type }: any) => (
      <div data-type={type} role='alert'>
        {message}
      </div>
    ),
    Button: ({ children, icon, loading, onClick }: any) => (
      <button aria-busy={loading ? 'true' : 'false'} onClick={onClick} type='button'>
        {icon}
        {children}
      </button>
    ),
    Space: ({ children }: any) => <div>{children}</div>,
    Table: ({ columns, dataSource, rowKey }: any) => (
      <table>
        <tbody>
          {dataSource.map((row: any) => (
            <tr key={rowKey(row)}>
              {columns.map((column: any) => {
                const value = row[column.dataIndex];
                return (
                  <td key={String(column.dataIndex)}>
                    {column.render ? column.render(value, row) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    ),
    Typography: {
      Text: ({ children }: any) => <span>{children}</span>,
    },
  };
});

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/services/datasetUuidMentionSearch/api', () => {
  const actual = jest.requireActual('@/services/datasetUuidMentionSearch/api');
  return {
    ...actual,
    searchDatasetJsonUuidMentions: jest.fn(),
  };
});

const searchDatasetJsonUuidMentionsMock = searchDatasetJsonUuidMentions as jest.Mock;

const uuid = 'd1380000-0000-4000-8000-000000000001';

describe('DatasetUuidMentionSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchDatasetJsonUuidMentionsMock.mockResolvedValue({ data: [], success: true });
  });

  it('does not render for non-UUID queries', () => {
    const { container } = render(
      <DatasetUuidMentionSearch
        dataSource='my'
        queryText='process'
        sourceEntityKinds={['process']}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('searches UUID mentions and renders an empty result', async () => {
    render(
      <DatasetUuidMentionSearch
        dataSource='my'
        getStateCodeFilter={() => '20'}
        queryText={uuid}
        sourceEntityKinds={['process']}
        teamId='team-1'
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(searchDatasetJsonUuidMentionsMock).toHaveBeenCalledWith({
        dataSource: 'my',
        sourceEntityKinds: ['process'],
        stateCode: '20',
        teamId: 'team-1',
        uuid,
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('pages.datasetUuidMention.empty');
  });

  it('renders mention rows with entity labels, name fallbacks, and copied ids', async () => {
    searchDatasetJsonUuidMentionsMock.mockResolvedValue({
      data: [
        {
          matched_by: 'json_uuid',
          matched_entity_table: 'flows',
          rank: 1,
          source_entity_kind: 'flow',
          source_id: uuid,
          source_name: 'Flow A',
          source_version: '01.00.000',
        },
        {
          matched_by: 'json_uuid',
          matched_entity_table: 'unknown',
          rank: 2,
          source_entity_kind: 'unknown',
          source_id: 'd1380000-0000-4000-8000-000000000002',
          source_name: null,
          source_version: '01.00.000',
        },
      ],
      success: true,
    });

    render(
      <DatasetUuidMentionSearch dataSource='tg' queryText={uuid} sourceEntityKinds={['flow']} />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Flow')).toBeInTheDocument();
    expect(screen.getByText('Flow A')).toBeInTheDocument();
    expect(screen.getByText('unknown')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText(uuid)).toBeInTheDocument();
  });

  it('renders service errors with and without backend messages', async () => {
    searchDatasetJsonUuidMentionsMock
      .mockResolvedValueOnce({ data: [], error: 'backend failed', success: false })
      .mockResolvedValueOnce({ data: [], success: false });

    const { rerender } = render(
      <DatasetUuidMentionSearch dataSource='my' queryText={uuid} sourceEntityKinds={['process']} />,
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('pages.datasetUuidMention.error');
    });

    rerender(
      <DatasetUuidMentionSearch
        dataSource='my'
        queryText='d1380000-0000-4000-8000-000000000002'
        sourceEntityKinds={['process']}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('pages.datasetUuidMention.error');
    });
  });

  it('renders thrown search failures', async () => {
    searchDatasetJsonUuidMentionsMock
      .mockRejectedValueOnce(new Error('network failed'))
      .mockRejectedValueOnce('string failure');

    const { rerender } = render(
      <DatasetUuidMentionSearch dataSource='my' queryText={uuid} sourceEntityKinds={['process']} />,
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('pages.datasetUuidMention.error');
    });

    rerender(
      <DatasetUuidMentionSearch
        dataSource='my'
        queryText='d1380000-0000-4000-8000-000000000002'
        sourceEntityKinds={['process']}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('pages.datasetUuidMention.error');
    });
  });
});
