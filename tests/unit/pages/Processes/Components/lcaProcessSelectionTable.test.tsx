import LcaProcessSelectionTable from '@/pages/Processes/Components/lcaProcessSelectionTable';
import { fireEvent, render, screen } from '@testing-library/react';
import { resetUmiMocks } from '../../../../mocks/umi';

jest.mock('umi', () => require('@/tests/mocks/umi').createUmiMock());
jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

const processOptions = [
  {
    value: 'process-1',
    name: 'Solar panel manufacturing',
    version: '01.00.000',
    label: 'Solar panel manufacturing (01.00.000)',
  },
  {
    value: 'process-2',
    name: 'Battery pack assembly',
    version: '01.00.000',
    label: 'Battery pack assembly (01.00.000)',
  },
  {
    value: 'process-3',
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
        selectedProcessIds={['process-2']}
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
});
