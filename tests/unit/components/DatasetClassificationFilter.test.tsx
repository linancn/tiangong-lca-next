import DatasetClassificationFilter from '@/components/DatasetClassificationFilter';
import { getILCDClassification, getILCDFlowCategorization } from '@/services/classifications/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/services/classifications/api', () => ({
  getILCDClassification: jest.fn(),
  getILCDFlowCategorization: jest.fn(),
}));
jest.mock('umi', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  FormattedMessage: ({ id }: { id: string }) => id,
}));

const classification = jest.mocked(getILCDClassification);
const elementary = jest.mocked(getILCDFlowCategorization);
const nodes = [
  {
    id: 'C',
    label: 'Manufacturing',
    value: 'Manufacturing',
    children: [{ id: '23', label: 'Mineral products', value: 'Mineral products', children: [] }],
  },
];
const label = 'pages.table.title.classification';

describe('DatasetClassificationFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    classification.mockResolvedValue({ success: true, data: nodes });
    elementary.mockResolvedValue({
      success: true,
      data: [{ id: 'air', label: 'Emissions to air', value: 'Emissions to air', children: [] }],
    });
  });

  it('selects an ancestor using stable codes, then a complete descendant path', async () => {
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(classification).toHaveBeenCalledWith('Process', 'en', ['all']));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
    fireEvent.click(await screen.findByText('Manufacturing'));
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'classification', code: 'C', path: ['C'] },
    ]);
    fireEvent.click(await screen.findByText('Mineral products'));
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'classification', code: '23', path: ['C', '23'] },
    ]);
  });

  it('offers both flow scopes without mixing localized labels into the query', async () => {
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter datasetKind='flow' lang='zh' value={[]} onChange={onChange} />,
    );
    await waitFor(() => expect(elementary).toHaveBeenCalledWith('zh', ['all']));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
    fireEvent.click(await screen.findByText('Emissions to air'));
    expect(onChange).toHaveBeenLastCalledWith([
      { scope: 'elementary', code: 'air', path: ['air'] },
    ]);
  });

  it('does not load CPC options for an elementary-only selector', async () => {
    render(
      <DatasetClassificationFilter
        datasetKind='flow'
        flowType='Elementary flow'
        lang='en'
        value={[]}
        onChange={jest.fn()}
      />,
    );
    await waitFor(() => expect(elementary).toHaveBeenCalled());
    expect(classification).not.toHaveBeenCalled();
  });

  it('ignores a stale language response and retains the controlled code path', async () => {
    let resolveOld!: (value: { success: boolean; data: typeof nodes }) => void;
    classification.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const props = { datasetKind: 'process' as const, value: [], onChange: jest.fn() };
    const { rerender } = render(<DatasetClassificationFilter {...props} lang='en' />);
    rerender(<DatasetClassificationFilter {...props} lang='zh' />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
    await screen.findByText('Manufacturing');
    resolveOld({ success: true, data: [{ ...nodes[0], label: 'Stale label' }] });
    await waitFor(() => expect(screen.queryByText('Stale label')).not.toBeInTheDocument());
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
  });

  it('shows a retry action when the taxonomy fails, without clearing an applied filter', async () => {
    classification.mockResolvedValueOnce({ success: false, data: [] });
    const onChange = jest.fn();
    render(
      <DatasetClassificationFilter
        datasetKind='process'
        lang='en'
        value={[{ scope: 'classification', code: 'C', path: ['C'] }]}
        onChange={onChange}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
    fireEvent.click(await screen.findByText('pages.classification.retry'));
    await waitFor(() => expect(classification).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText('pages.classification.retry')).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText('Manufacturing').length).toBeGreaterThan(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});
