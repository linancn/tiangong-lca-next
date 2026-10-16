import ResultSetDirectory from '@/pages/DataProcessing/ResultSetDirectory';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

jest.mock('@umijs/max', () => ({
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage }: any, values: any = {}) =>
      Object.entries(values).reduce(
        (text: string, [key, value]) => text.replace(`{${key}}`, String(value)),
        defaultMessage,
      ),
  }),
}));
const records = Array.from({ length: 61 }, (_, index) => ({
  schemaVersion: 'lcia.result-set.v1' as const,
  resultSetId: `set-${index}`,
  name: `Calculation ${String(index).padStart(2, '0')}`,
  createdAt: new Date(2026, 0, index + 1).toISOString(),
}));
const open = jest.fn();
const refresh = jest.fn();
const create = jest.fn();
function Directory({ search = '', error = null }: { search?: string; error?: string | null }) {
  const [query, setQuery] = useState(search);
  return (
    <>
      <output data-testid='query'>{query}</output>
      <ResultSetDirectory
        resultSets={records}
        tasks={[]}
        publications={[]}
        loading={false}
        error={error}
        search={query}
        onQueryChange={setQuery}
        onOpen={open}
        onRefresh={refresh}
        onCreate={create}
      />
    </>
  );
}
beforeEach(() => jest.clearAllMocks());
test('native pagination renders 50 rows, preserves query scope and supports opening a later page', () => {
  render(<Directory search='?keep=yes' />);
  expect(screen.getByText(/61 records loaded/)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Calculation / })).toHaveLength(50);
  expect(screen.queryByRole('button', { name: 'Calculation 00' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle('2'));
  expect(screen.getAllByRole('button', { name: /^Calculation / })).toHaveLength(11);
  expect(screen.getByTestId('query')).toHaveTextContent('keep=yes&rsPage=2&rsSize=50');
  fireEvent.click(screen.getByRole('button', { name: 'Calculation 00' }));
  expect(open).toHaveBeenCalledWith(expect.objectContaining({ resultSetId: 'set-0' }));
  fireEvent.click(
    within(screen.getByTestId('data-processing-result-set-set-0')).getByRole('button', {
      name: 'Start check',
    }),
  );
  expect(open).toHaveBeenCalledTimes(2);
});
test('loaded-record search resets paging, supports IDs, and distinguishes unavailable states', () => {
  render(<Directory search='?rsPage=2&rsSize=20&rsOrder=oldest' />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'set-60' } });
  expect(screen.getAllByRole('button', { name: /^Calculation / })).toHaveLength(1);
  expect(screen.getByTestId('query')).toHaveTextContent('rsPage=1');
  expect(screen.getAllByText('Status unavailable')).toHaveLength(3);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  expect(screen.getByTestId('query')).not.toHaveTextContent('rsQuery');
  expect(screen.queryByText('Not calculated')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  fireEvent.click(screen.getByRole('button', { name: 'Create result set' }));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledTimes(1);
});
test('clamps malformed paging and displays loading failures without claiming an empty backend', () => {
  render(
    <Directory search='?rsPage=999&rsSize=bad&rsStatus=ready' error='Directory unavailable' />,
  );
  expect(screen.getByText('Directory unavailable')).toBeInTheDocument();
  expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
});

test('native sort and state selectors update only the directory query', async () => {
  render(<Directory search='?rsPage=2' />);
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Creation order' }));
  });
  await act(async () => {
    fireEvent.click(screen.getByText('Oldest first'));
  });
  expect(screen.getByTestId('query')).toHaveTextContent('rsOrder=oldest');
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Calculation' }));
  });
  await act(async () => {
    fireEvent.click(screen.getByText('Calculation failed'));
  });
  expect(screen.getByTestId('query')).toHaveTextContent('rsStatus=failed');
});

test('keeps deterministic ordering for equal creation times', () => {
  render(
    <ResultSetDirectory
      resultSets={[records[0], { ...records[1], createdAt: records[0].createdAt }]}
      tasks={[]}
      publications={[]}
      loading={false}
      error={null}
      search=''
      onQueryChange={jest.fn()}
      onOpen={open}
      onCreate={create}
      onRefresh={refresh}
    />,
  );
  expect(screen.getByRole('button', { name: 'Calculation 00' })).toBeInTheDocument();
});

test('changing page size resets the current directory page', async () => {
  render(<Directory search='?rsPage=2' />);
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Page Size' }));
  });
  await act(async () => {
    fireEvent.click(screen.getByText('20 / page'));
  });
  expect(screen.getByTestId('query')).toHaveTextContent('rsPage=1&rsSize=20');
});
