// @ts-nocheck
import ProcessLciaResultsPanel from '@/pages/Processes/Components/processLciaResultsPanel';
import { act, render, screen, waitFor } from '@testing-library/react';

const mockGetDataSource = jest.fn();
const mockGetLangText = jest.fn();
const mockGetReferenceQuantityFromMethod = jest.fn();
const mockQueryLcaResults = jest.fn();
const mockIsLcaFunctionInvokeError = jest.fn();
const mockUseLocation = jest.fn();

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
  useLocation: () => mockUseLocation(),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLangJson: (value: any) => value,
  getLangText: (...args: any[]) => mockGetLangText(...args),
}));

jest.mock('@/services/lciaMethods/util', () => ({
  __esModule: true,
  cacheAndDecompressMethod: jest.fn(),
  getDecompressedMethod: jest.fn(),
  getReferenceQuantityFromMethod: (...args: any[]) => mockGetReferenceQuantityFromMethod(...args),
}));

jest.mock('@/services/lca', () => ({
  __esModule: true,
  isLcaFunctionInvokeError: (...args: any[]) => mockIsLcaFunctionInvokeError(...args),
  queryLcaResults: (...args: any[]) => mockQueryLcaResults(...args),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='aligned-number'>{value}</span>,
}));

jest.mock('@/pages/Processes/Components/lcaProfileSummary', () => ({
  __esModule: true,
  default: ({ loading, rows }: any) => (
    <div data-testid='lca-profile-summary' data-loading={String(loading)}>
      {rows.length}
    </div>
  ),
}));

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: ({ columns = [], dataSource = [], rowKey }: any) => {
    const resolveRowKey = (row: any, index: number) => {
      if (typeof rowKey === 'function') return rowKey(row);
      if (typeof rowKey === 'string') return row?.[rowKey];
      return row.key ?? index;
    };

    return (
      <div data-testid='pro-table'>
        {dataSource.map((row: any, rowIndex: number) => (
          <div
            key={resolveRowKey(row, rowIndex)}
            data-testid={`pro-row-${resolveRowKey(row, rowIndex)}`}
          >
            {columns.map((column: any, columnIndex: number) => (
              <span key={column.dataIndex ?? columnIndex}>
                {column.render
                  ? column.render(row[column.dataIndex], row, rowIndex)
                  : toText(row[column.dataIndex])}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

jest.mock('antd', () => {
  const Button = ({ children, loading, onClick }: any) => (
    <button type='button' data-loading={String(loading)} onClick={onClick}>
      {toText(children)}
    </button>
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Typography = {
    Text: ({ children, type }: any) => (
      <span data-testid={`typography-${type ?? 'default'}`}>{children}</span>
    ),
  };

  return {
    __esModule: true,
    Button,
    Space,
    Tooltip,
    Typography,
  };
});

describe('ProcessLciaResultsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDataSource.mockReturnValue('');
    mockGetLangText.mockImplementation((value: any) => {
      if (typeof value === 'string') return value;
      if (typeof value?.['#text'] === 'string') return value['#text'];
      return '';
    });
    mockGetReferenceQuantityFromMethod.mockResolvedValue(undefined);
    mockIsLcaFunctionInvokeError.mockReturnValue(false);
    mockQueryLcaResults.mockResolvedValue({
      snapshot_id: 'snapshot-1',
      result_id: 'result-1',
      source: 'latest_ready',
      meta: { computed_at: '2026-04-28T00:00:00Z' },
      data: { values: [] },
    });
    mockUseLocation.mockReturnValue({ pathname: '/mydata/processes', search: '' });
  });

  it('normalizes missing base rows and queries solver without optional version or scope', async () => {
    mockUseLocation.mockReturnValue({ pathname: undefined, search: '' });

    render(<ProcessLciaResultsPanel baseRows={undefined} lang='en' processId='process-1' />);

    await waitFor(() =>
      expect(mockQueryLcaResults).toHaveBeenCalledWith({
        scope: 'dev-v1',
        mode: 'process_all_impacts',
        process_id: 'process-1',
        allow_fallback: false,
      }),
    );

    expect(mockGetDataSource).toHaveBeenCalledWith('');
    expect(screen.getByTestId('pro-table')).toBeInTheDocument();
  });

  it('skips state updates when base-row enrichment resolves after unmount', async () => {
    let resolveReferenceQuantity: () => void = () => {};
    mockGetReferenceQuantityFromMethod.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReferenceQuantity = resolve;
        }),
    );

    const { unmount } = render(
      <ProcessLciaResultsPanel
        baseRows={[
          {
            key: 'base-row',
            meanAmount: 3,
            referenceToLCIAMethodDataSet: { '@refObjectId': 'impact-1' },
          },
        ]}
        enableSolverRefresh={false}
        lang='en'
      />,
    );

    unmount();

    await act(async () => {
      resolveReferenceQuantity();
    });

    expect(mockGetReferenceQuantityFromMethod).toHaveBeenCalledTimes(1);
    expect(mockQueryLcaResults).not.toHaveBeenCalled();
  });
});
