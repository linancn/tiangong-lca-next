// @ts-nocheck
import LocationCodeSelect from '@/components/LocationTextItem/codeSelect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetILCDLocationAll = jest.fn();

jest.mock('@/services/locations/api', () => ({
  __esModule: true,
  getILCDLocationAll: (...args: any[]) => mockGetILCDLocationAll(...args),
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('antd', () => ({
  __esModule: true,
  Select: ({
    allowClear,
    filterOption,
    loading,
    onChange,
    options = [],
    placeholder,
    value,
    'data-testid': dataTestId,
  }: any) => (
    <div>
      <select
        data-testid={dataTestId}
        aria-label={placeholder}
        data-loading={String(loading)}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value || undefined)}
      >
        <option value=''>empty</option>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {allowClear ? (
        <button type='button' data-testid={`${dataTestId}-clear`} onClick={() => onChange?.()}>
          clear
        </button>
      ) : null}
      <span data-testid={`${dataTestId}-filter-search`}>
        {String(filterOption?.('china', { searchText: 'CN China' }))}
      </span>
      <span data-testid={`${dataTestId}-filter-label`}>
        {String(filterOption?.('global', { label: 'GLO (Global)' }))}
      </span>
      <span data-testid={`${dataTestId}-filter-value`}>
        {String(filterOption?.('rer', { value: 'RER' }))}
      </span>
      <span data-testid={`${dataTestId}-filter-empty`}>
        {String(filterOption?.('missing', undefined))}
      </span>
    </div>
  ),
}));

describe('LocationCodeSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetILCDLocationAll.mockResolvedValue({
      data: [
        {
          location: [
            { '@value': 'CN', '#text': 'China' },
            { '@value': 'GLO', '#text': 'Global' },
          ],
        },
      ],
      success: true,
    });
  });

  it('loads localized location labels and returns the selected plain code', async () => {
    const onChange = jest.fn();
    const onData = jest.fn();

    render(<LocationCodeSelect lang='en' onChange={onChange} onData={onData} data-testid='loc' />);

    await waitFor(() => {
      expect(screen.getByText('CN (China)')).toBeInTheDocument();
      expect(screen.getByText('GLO (Global)')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('loc'), { target: { value: 'CN' } });

    expect(onChange).toHaveBeenCalledWith('CN');
    expect(onData).toHaveBeenCalledTimes(1);
  });

  it('keeps a legacy plain string value visible when it is not in the location list', async () => {
    render(<LocationCodeSelect lang='en' value='CUSTOM-REGION' data-testid='loc' />);

    await waitFor(() => {
      expect(screen.getByText('CUSTOM-REGION')).toBeInTheDocument();
    });
  });

  it('normalizes legacy multilingual values and clears to undefined', async () => {
    const onChange = jest.fn();

    render(
      <LocationCodeSelect
        lang='en'
        value={[{ '@xml:lang': 'en', '#text': 'CN' }]}
        onChange={onChange}
        data-testid='loc'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveValue('CN');
    });

    fireEvent.click(screen.getByTestId('loc-clear'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('ignores invalid location entries and falls back to the code when localized text is missing', async () => {
    mockGetILCDLocationAll.mockResolvedValueOnce({
      data: [
        {
          location: [{ '#text': 'Missing code' }, { '@value': 'RER' }],
        },
      ],
      success: true,
    });

    render(<LocationCodeSelect lang='en' data-testid='loc' />);

    await waitFor(() => {
      expect(screen.getByText('RER')).toBeInTheDocument();
    });

    expect(screen.queryByText('Missing code')).not.toBeInTheDocument();
  });

  it('loads a single location object response', async () => {
    mockGetILCDLocationAll.mockResolvedValueOnce({
      data: [
        {
          location: { '@value': 'US', '#text': 'United States' },
        },
      ],
      success: true,
    });

    render(<LocationCodeSelect lang='en' data-testid='loc' />);

    await waitFor(() => {
      expect(screen.getByText('US (United States)')).toBeInTheDocument();
    });
  });

  it('renders no options when the location response has no data', async () => {
    mockGetILCDLocationAll.mockResolvedValueOnce({
      success: true,
    });

    render(<LocationCodeSelect lang='en' data-testid='loc' />);

    await waitFor(() => {
      expect(screen.getByTestId('loc')).toHaveAttribute('data-loading', 'false');
    });

    expect(screen.queryByText('CN (China)')).not.toBeInTheDocument();
  });

  it('filters by search text, label, value, and empty option fallbacks', async () => {
    render(<LocationCodeSelect lang='en' data-testid='loc' />);

    await waitFor(() => {
      expect(screen.getByText('CN (China)')).toBeInTheDocument();
    });

    expect(screen.getByTestId('loc-filter-search')).toHaveTextContent('true');
    expect(screen.getByTestId('loc-filter-label')).toHaveTextContent('true');
    expect(screen.getByTestId('loc-filter-value')).toHaveTextContent('true');
    expect(screen.getByTestId('loc-filter-empty')).toHaveTextContent('false');
  });
});
