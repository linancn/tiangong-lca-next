import { renderTableSelectionClearAction } from '@/components/TableSelectionAlert';
import { fireEvent, render, screen } from '@testing-library/react';

describe('TableSelectionAlert', () => {
  it('returns no action when the clean callback is missing', () => {
    const actions = renderTableSelectionClearAction('Clear selection')({
      selectedRowKeys: ['row-1'],
    });

    expect(actions).toEqual([]);
  });

  it('returns no action when nothing is selected', () => {
    const actions = renderTableSelectionClearAction('Clear selection')({
      onCleanSelected: jest.fn(),
      selectedRowKeys: [],
    });

    expect(actions).toEqual([]);
  });

  it('returns no action when selectedRowKeys is omitted', () => {
    const actions = renderTableSelectionClearAction('Clear selection')({
      onCleanSelected: jest.fn(),
    });

    expect(actions).toEqual([]);
  });

  it('renders a button and clears the selection when clicked', () => {
    const onCleanSelected = jest.fn();
    const actions = renderTableSelectionClearAction('Clear selection')({
      onCleanSelected,
      selectedRowKeys: ['row-1'],
    });

    render(<>{actions}</>);

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(onCleanSelected).toHaveBeenCalledTimes(1);
  });
});
