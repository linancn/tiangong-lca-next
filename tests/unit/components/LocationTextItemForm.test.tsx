import LocationTextItemForm from '@/components/LocationTextItem/form';
import { getILCDLocationAll } from '@/services/ilcd/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, Form } from 'antd';

let latestSelectProps: any = null;

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

jest.mock('@/services/ilcd/api', () => ({
  getILCDLocationAll: jest.fn(),
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const React = require('react');

  const Select = ({ options = [], onChange, filterOption }: any) => {
    const [keyword, setKeyword] = React.useState('');
    latestSelectProps = { options, filterOption };

    const filteredOptions = options.filter((option: any) =>
      filterOption ? filterOption(keyword, option) : true,
    );

    return (
      <div>
        <input
          aria-label='location-select'
          role='combobox'
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        {filteredOptions.map((option: any, index: number) => (
          <button
            key={`${option?.value ?? 'empty'}-${index}`}
            type='button'
            onClick={() => onChange?.(option?.value)}
          >
            {option?.label}
          </button>
        ))}
      </div>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  return {
    ...actual,
    Select,
    Space,
  };
});

const mockGetILCDLocationAll = getILCDLocationAll as jest.MockedFunction<any>;

describe('LocationTextItemForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestSelectProps = null;
    mockGetILCDLocationAll.mockResolvedValue({
      success: true,
      data: [
        {
          location: [
            { '@value': 'CN', '#text': 'China' },
            { '@value': 'US', '#text': 'United States' },
            { '@value': 'NULL', '#text': '' },
          ],
        },
      ],
    });
  });

  const Wrapper = ({ children }: any) => (
    <ConfigProvider>
      <Form initialValues={{ loc: undefined }}>{children}</Form>
    </ConfigProvider>
  );

  it('renders and loads options', async () => {
    render(
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang='en' onData={jest.fn()} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith('en');
    });

    await waitFor(() => {
      expect(screen.getByText('CN (China)')).toBeInTheDocument();
      expect(screen.getByText('US (United States)')).toBeInTheDocument();
    });
  });

  it('calls onData when selection changes', async () => {
    const onData = jest.fn();
    render(
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang='en' onData={onData} />
      </Wrapper>,
    );

    const option = await screen.findByRole('button', { name: 'CN (China)' });
    fireEvent.click(option);

    expect(onData).toHaveBeenCalled();
  });

  it('supports filtering by label', async () => {
    render(
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang='en' onData={jest.fn()} />
      </Wrapper>,
    );

    const combobox = await screen.findByRole('combobox');
    fireEvent.change(combobox, { target: { value: 'china' } });

    await waitFor(() => {
      // filtered list should still include matching option
      expect(screen.getByText('CN (China)')).toBeInTheDocument();
    });
  });

  it('renders the required label variant and filters out non-matching options', async () => {
    const { container } = render(
      <Wrapper>
        <LocationTextItemForm
          name='loc'
          label='Location'
          lang='en'
          onData={jest.fn()}
          showRequiredLable
        />
      </Wrapper>,
    );

    const combobox = await screen.findByRole('combobox');
    fireEvent.change(combobox, { target: { value: 'zzz' } });

    await waitFor(() => {
      expect(screen.queryByText('CN (China)')).not.toBeInTheDocument();
    });

    expect(container.querySelector('.ant-form-item-required')).toHaveTextContent('Location');
  });

  it('falls back to an empty option list when the service payload has no locations', async () => {
    mockGetILCDLocationAll.mockResolvedValueOnce({
      success: true,
      data: undefined,
    });

    render(
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang='en' onData={jest.fn()} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith('en');
    });

    expect(screen.queryByText('CN (China)')).not.toBeInTheDocument();
    expect(screen.queryByText('US (United States)')).not.toBeInTheDocument();
  });

  it('leaves options empty when the location request is unsuccessful', async () => {
    mockGetILCDLocationAll.mockResolvedValueOnce({
      success: false,
      data: [
        {
          location: [{ '@value': 'JP', '#text': 'Japan' }],
        },
      ],
    });

    render(
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang='en' onData={jest.fn()} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith('en');
    });

    expect(screen.queryByText('JP (Japan)')).not.toBeInTheDocument();
  });

  it('handles sparse location entries and safely filters when option metadata is missing', async () => {
    mockGetILCDLocationAll.mockResolvedValueOnce({
      success: true,
      data: [
        {
          location: [undefined],
        },
      ],
    });

    render(
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang='en' onData={jest.fn()} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith('en');
    });

    expect(screen.getByRole('button', { name: 'undefined (undefined)' })).toBeInTheDocument();
    expect(latestSelectProps.filterOption('cn', undefined)).toBe(false);
  });
});
