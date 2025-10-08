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
    'pages.table.filter.all': 'All',
    'pages.table.filter.unreviewed': 'Unreviewed',
    'pages.table.filter.reviewing': 'Reviewing',
    'pages.table.filter.reviewed': 'Reviewed',
  };

  return {
    FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
      <>{defaultMessage ?? messages[id] ?? id}</>
    ),
  };
});

jest.mock('antd', () => {
  const React = jest.requireActual('react');

  const Select = ({ children, defaultValue, onChange, disabled, ...rest }: any) => {
    const options = React.Children.toArray(children) as React.ReactElement[];
    const valueMap = new Map(
      options.map((child) => [String(child.props.value), child.props.value]),
    );

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
        {options.map((child) =>
          React.cloneElement(child, {
            value: String(child.props.value),
          }),
        )}
      </select>
    );
  };

  Select.Option = ({ value, children, ...optionRest }: any) => (
    <option value={String(value)} {...optionRest}>
      {children}
    </option>
  );

  return {
    Select,
  };
});

const renderComponent = (overrideProps: Partial<TableFilterProps> = {}) => {
  const onChange = overrideProps.onChange ?? jest.fn();
  const props: TableFilterProps = {
    onChange,
    disabled: overrideProps.disabled ?? false,
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
      'All',
      'Unreviewed',
      'Reviewing',
      'Reviewed',
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

  it('respects the disabled state and prevents interaction', () => {
    const { onChange } = renderComponent({ disabled: true });
    const select = screen.getByRole('combobox') as HTMLSelectElement;

    expect(select).toBeDisabled();

    fireEvent.change(select, { target: { value: '20' } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
