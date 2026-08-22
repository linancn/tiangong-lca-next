/**
 * Tests for TableFilter component
 * Path: src/components/TableFilter/index.tsx
 */

import TableFilter from '@/components/TableFilter';
import { fireEvent, render, screen, within } from '@testing-library/react';

type TableFilterProps = {
  onChange: (value: string | number) => void;
  disabled?: boolean;
};

jest.mock('umi', () => {
  const messages: Record<string, string> = {
    'pages.table.filter.all.workflowStatus': 'All workflow statuses',
    'pages.table.filter.workflowStatus.workingDraft': 'Working draft',
    'pages.table.filter.workflowStatus.finalDraftForExternalReview':
      'Final draft for external review',
    'pages.table.filter.workflowStatus.dataSetFinalised': 'Data set finalised; entirely published',
  };

  const formatMessage = ({ id, defaultMessage }: { id?: string; defaultMessage?: string }) =>
    defaultMessage ?? (id ? messages[id] : undefined) ?? id ?? '';

  return {
    useIntl: () => ({
      formatMessage,
    }),
    FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
      <>{formatMessage({ id, defaultMessage })}</>
    ),
  };
});

jest.mock('antd', () => {
  const Select = ({ defaultValue, onChange, disabled, options = [], ...rest }: any) => {
    const valueMap = new Map(options.map((option: any) => [String(option.value), option.value]));

    return (
      <select
        defaultValue={String(defaultValue ?? '')}
        disabled={disabled}
        onChange={(event) => {
          if (disabled) {
            return;
          }

          const rawValue = event.target.value;
          onChange?.(valueMap.get(rawValue) ?? rawValue);
        }}
        {...rest}
      >
        {options.map((option: any) => (
          <option key={String(option.value)} title={option.title} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return {
    Select,
  };
});

const renderComponent = (overrideProps: Partial<TableFilterProps> = {}) => {
  const onChange = overrideProps.onChange ?? jest.fn();
  const props: TableFilterProps = {
    onChange,
    ...overrideProps,
  };

  return { ...render(<TableFilter {...props} />), onChange };
};

describe('TableFilter Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter select with default value and all options', () => {
    renderComponent();

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('all');

    const options = within(select).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'All workflow statuses',
      'Working draft',
      'Final draft for external review',
      'Data set finalised; entirely published',
    ]);
    expect(options.map((option) => option.getAttribute('title'))).toEqual([
      'All workflow statuses',
      'Working draft',
      'Final draft for external review',
      'Data set finalised; entirely published',
    ]);
  });

  it('notifies about selection changes using the provided callback', () => {
    const { onChange } = renderComponent();
    const select = screen.getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: '0' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0);
    expect(select).toHaveValue('0');
  });

  it('maps reviewing and reviewed options back to numeric state codes', () => {
    const { onChange } = renderComponent();
    const select = screen.getByRole('combobox') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: '20' } });
    fireEvent.change(select, { target: { value: '100' } });

    expect(onChange).toHaveBeenNthCalledWith(1, 20);
    expect(onChange).toHaveBeenNthCalledWith(2, 100);
    expect(select).toHaveValue('100');
  });

  it('respects the disabled state and prevents interaction', () => {
    const { onChange } = renderComponent({ disabled: true });
    const select = screen.getByRole('combobox') as HTMLSelectElement;

    expect(select).toBeDisabled();

    fireEvent.change(select, { target: { value: '20' } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
