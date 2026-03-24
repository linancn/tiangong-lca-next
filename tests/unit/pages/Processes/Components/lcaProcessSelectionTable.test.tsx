import LcaProcessSelectionTable from '@/pages/Processes/Components/lcaProcessSelectionTable';
import { fireEvent, render, screen } from '@testing-library/react';
import { resetUmiMocks } from '../../../../mocks/umi';

jest.mock('umi', () => require('@/tests/mocks/umi').createUmiMock());
jest.mock('antd', () => {
  const base = require('@/tests/mocks/antd').createAntdMock();

  const resolveRowKey = (row: any, rowKey: any, rowIndex: number) => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    if (typeof rowKey === 'string') {
      return row?.[rowKey];
    }
    return row?.key ?? rowIndex;
  };

  return {
    ...base,
    Table: ({ columns = [], dataSource = [], rowKey, rowSelection, locale, footer }: any) => (
      <div>
        <table data-testid='table'>
          <thead>
            <tr>
              {columns.map((column: any, index: number) => (
                <th key={column.key ?? column.dataIndex ?? index}>{column.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(dataSource ?? []).map((row: any, rowIndex: number) => (
              <tr key={String(resolveRowKey(row, rowKey, rowIndex))}>
                {columns.map((column: any, columnIndex: number) => {
                  const dataIndex = column?.dataIndex;
                  const value = Array.isArray(dataIndex)
                    ? dataIndex.reduce((current, key) => current?.[key], row)
                    : dataIndex
                      ? row?.[dataIndex]
                      : undefined;
                  const content = column?.render ? column.render(value, row, rowIndex) : value;
                  return <td key={column.key ?? dataIndex ?? columnIndex}>{content}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {Array.isArray(dataSource) && dataSource.length === 0 ? (
          <div>{locale?.emptyText}</div>
        ) : null}
        {footer ? <div>{footer()}</div> : null}
        {rowSelection
          ? dataSource.map((row: any, rowIndex: number) => {
              const resolvedRowKey = String(resolveRowKey(row, rowKey, rowIndex));
              return (
                <button
                  key={`select-${resolvedRowKey}`}
                  type='button'
                  onClick={() => rowSelection.onChange?.([resolvedRowKey])}
                >
                  {`select-${resolvedRowKey}`}
                </button>
              );
            })
          : null}
      </div>
    ),
  };
});

const processOptions = [
  {
    selectionKey: 'process-1:01.00.000',
    value: 'process-1',
    processId: 'process-1',
    name: 'Solar panel manufacturing',
    version: '01.00.000',
    label: 'Solar panel manufacturing (01.00.000)',
  },
  {
    selectionKey: 'process-2:01.00.000',
    value: 'process-2',
    processId: 'process-2',
    name: 'Battery pack assembly',
    version: '01.00.000',
    label: 'Battery pack assembly (01.00.000)',
  },
  {
    selectionKey: 'process-3:02.00.000',
    value: 'process-3',
    processId: 'process-3',
    name: 'Wind turbine maintenance',
    version: '02.00.000',
    label: 'Wind turbine maintenance (02.00.000)',
  },
];

describe('LcaProcessSelectionTable', () => {
  beforeEach(() => {
    resetUmiMocks();
  });

  it('filters the current view and can show selected processes from other pages', () => {
    render(
      <LcaProcessSelectionTable
        processOptions={[processOptions[0], processOptions[2]]}
        selectedProcessIds={['process-2:01.00.000']}
        selectedProcessOptions={[processOptions[1]]}
        totalProcessCount={12}
        titleMessage={{
          id: 'title',
          defaultMessage: 'Process selection',
        }}
        hintMessage={{
          id: 'hint',
          defaultMessage: '{selectedCount} processes selected from {totalCount} available options.',
        }}
        emptyMessage={{
          id: 'empty',
          defaultMessage: 'No processes available.',
        }}
        onSelectionChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Solar panel manufacturing')).toBeInTheDocument();
    expect(screen.getByText('Wind turbine maintenance')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Selection visibility'), {
      target: { value: 'selected' },
    });

    expect(screen.queryByText('Solar panel manufacturing')).not.toBeInTheDocument();
    expect(screen.getByText('Battery pack assembly')).toBeInTheDocument();
    expect(screen.queryByText('Wind turbine maintenance')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Selection visibility'), {
      target: { value: 'unselected' },
    });

    expect(screen.getByText('Solar panel manufacturing')).toBeInTheDocument();
    expect(screen.queryByText('Battery pack assembly')).not.toBeInTheDocument();
    expect(screen.getByText('Wind turbine maintenance')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter processes in the current view'), {
      target: { value: 'solar' },
    });

    expect(screen.getByText('Solar panel manufacturing')).toBeInTheDocument();
    expect(screen.queryByText('Wind turbine maintenance')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 processes in the current view.')).toBeInTheDocument();
  });

  it('filters out selected rows from the unselected view and forwards rowSelection changes', () => {
    const onSelectionChange = jest.fn();

    render(
      <LcaProcessSelectionTable
        processOptions={processOptions}
        selectedProcessIds={['process-2:01.00.000']}
        selectedProcessOptions={processOptions}
        titleMessage={{
          id: 'title',
          defaultMessage: 'Process selection',
        }}
        hintMessage={{
          id: 'hint',
          defaultMessage: '{selectedCount} processes selected from {totalCount} available options.',
        }}
        emptyMessage={{
          id: 'empty',
          defaultMessage: 'No processes available.',
        }}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Selection visibility'), {
      target: { value: 'unselected' },
    });

    expect(screen.getByText('Solar panel manufacturing')).toBeInTheDocument();
    expect(screen.queryByText('Battery pack assembly')).not.toBeInTheDocument();
    expect(screen.getByText('Wind turbine maintenance')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'select-process-1:01.00.000' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['process-1:01.00.000']);
  });

  it('defaults selectedProcessOptions to an empty array when the prop is omitted', () => {
    render(
      <LcaProcessSelectionTable
        processOptions={processOptions}
        selectedProcessIds={['process-2:01.00.000']}
        titleMessage={{
          id: 'title',
          defaultMessage: 'Process selection',
        }}
        hintMessage={{
          id: 'hint',
          defaultMessage: '{selectedCount} processes selected from {totalCount} available options.',
        }}
        emptyMessage={{
          id: 'empty',
          defaultMessage: 'No processes available.',
        }}
        onSelectionChange={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Selection visibility'), {
      target: { value: 'selected' },
    });

    expect(screen.queryByText('Battery pack assembly')).not.toBeInTheDocument();
    expect(screen.getByText('No processes available.')).toBeInTheDocument();
  });

  it('renders pagination controls alongside the table footer', () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();

    render(
      <LcaProcessSelectionTable
        processOptions={processOptions}
        selectedProcessIds={[]}
        totalProcessCount={12}
        pagination={{
          current: 2,
          totalPages: 4,
          rangeStart: 11,
          rangeEnd: 20,
          onPrevious,
          onNext,
        }}
        titleMessage={{
          id: 'title',
          defaultMessage: 'Process selection',
        }}
        hintMessage={{
          id: 'hint',
          defaultMessage: '{selectedCount} processes selected from {totalCount} available options.',
        }}
        emptyMessage={{
          id: 'empty',
          defaultMessage: 'No processes available.',
        }}
        onSelectionChange={jest.fn()}
      />,
    );

    expect(screen.getByText('Showing 11-20 on page 2 of 4.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('hides pagination controls when showing selected processes only', () => {
    render(
      <LcaProcessSelectionTable
        processOptions={processOptions}
        selectedProcessIds={['process-2:01.00.000']}
        selectedProcessOptions={processOptions}
        totalProcessCount={12}
        pagination={{
          current: 2,
          totalPages: 4,
          rangeStart: 11,
          rangeEnd: 20,
          onPrevious: jest.fn(),
          onNext: jest.fn(),
        }}
        titleMessage={{
          id: 'title',
          defaultMessage: 'Process selection',
        }}
        hintMessage={{
          id: 'hint',
          defaultMessage: '{selectedCount} processes selected from {totalCount} available options.',
        }}
        emptyMessage={{
          id: 'empty',
          defaultMessage: 'No processes available.',
        }}
        onSelectionChange={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Selection visibility'), {
      target: { value: 'selected' },
    });

    expect(screen.queryByText('Showing 11-20 on page 2 of 4.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});
