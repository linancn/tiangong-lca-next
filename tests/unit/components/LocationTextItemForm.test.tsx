import LocationTextItemForm from '@/components/LocationTextItem/form';
import { SUPPORTED_CONTENT_LANGUAGES } from '@/services/general/contentLanguageRegistry';
import { getILCDLocationAll } from '@/services/locations/api';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, Form } from 'antd';

let latestSelectProps: any = null;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolver, rejecter) => {
    resolve = resolver;
    reject = rejecter;
  });
  return { promise, resolve, reject };
};

jest.mock('umi', () => ({
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

jest.mock('@/services/locations/api', () => ({
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

  it('refreshes for every registry content language selected by its parent', async () => {
    const renderControl = (lang: string) => (
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang={lang} onData={jest.fn()} />
      </Wrapper>
    );
    const { rerender } = render(renderControl(SUPPORTED_CONTENT_LANGUAGES[0]));

    for (const languageCode of SUPPORTED_CONTENT_LANGUAGES) {
      rerender(renderControl(languageCode));
      await waitFor(() => {
        expect(mockGetILCDLocationAll).toHaveBeenCalledWith(languageCode);
      });
    }
  });

  it('ignores a stale location response after the parent switches language', async () => {
    const [initialLanguage, nextLanguage] = SUPPORTED_CONTENT_LANGUAGES;
    expect(nextLanguage).toBeDefined();
    const initialRequest = deferred<any>();
    mockGetILCDLocationAll.mockReturnValueOnce(initialRequest.promise).mockResolvedValueOnce({
      success: true,
      data: [{ location: [{ '@value': 'DE', '#text': 'Current location' }] }],
    });
    const renderControl = (lang: string) => (
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang={lang} onData={jest.fn()} />
      </Wrapper>
    );
    const { rerender } = render(renderControl(initialLanguage));

    rerender(renderControl(nextLanguage));
    expect(
      await screen.findByRole('button', { name: 'DE (Current location)' }),
    ).toBeInTheDocument();

    await act(async () => {
      initialRequest.resolve({
        success: true,
        data: [{ location: [{ '@value': 'OLD', '#text': 'Stale location' }] }],
      });
      await initialRequest.promise;
    });

    expect(screen.queryByRole('button', { name: 'OLD (Stale location)' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DE (Current location)' })).toBeInTheDocument();
  });

  it('keeps options empty when the current language request rejects', async () => {
    const [initialLanguage, nextLanguage] = SUPPORTED_CONTENT_LANGUAGES;
    expect(nextLanguage).toBeDefined();
    const nextRequest = deferred<any>();
    mockGetILCDLocationAll.mockResolvedValueOnce({
      success: true,
      data: [{ location: [{ '@value': 'EN', '#text': 'Initial location' }] }],
    });
    mockGetILCDLocationAll.mockReturnValueOnce(nextRequest.promise);
    const renderControl = (lang: string) => (
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang={lang} onData={jest.fn()} />
      </Wrapper>
    );
    const { rerender } = render(renderControl(initialLanguage));

    expect(
      await screen.findByRole('button', { name: 'EN (Initial location)' }),
    ).toBeInTheDocument();

    rerender(renderControl(nextLanguage));
    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith(nextLanguage);
    });

    await act(async () => {
      nextRequest.reject(new Error('location request failed'));
      await nextRequest.promise.catch(() => undefined);
    });

    expect(screen.queryByRole('button', { name: 'EN (Initial location)' })).not.toBeInTheDocument();
    expect(latestSelectProps.options).toEqual([]);
  });

  it('ignores rejected requests after a language switch and after unmount', async () => {
    const [initialLanguage, nextLanguage] = SUPPORTED_CONTENT_LANGUAGES;
    expect(nextLanguage).toBeDefined();
    const staleRequest = deferred<any>();
    const unmountedRequest = deferred<any>();
    mockGetILCDLocationAll
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(unmountedRequest.promise);
    const renderControl = (lang: string) => (
      <Wrapper>
        <LocationTextItemForm name='loc' label='Location' lang={lang} onData={jest.fn()} />
      </Wrapper>
    );
    const { rerender, unmount } = render(renderControl(initialLanguage));

    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith(initialLanguage);
    });
    rerender(renderControl(nextLanguage));
    await waitFor(() => {
      expect(mockGetILCDLocationAll).toHaveBeenCalledWith(nextLanguage);
    });

    await act(async () => {
      staleRequest.reject(new Error('stale location request failed'));
      await staleRequest.promise.catch(() => undefined);
    });

    unmount();
    await act(async () => {
      unmountedRequest.reject(new Error('unmounted location request failed'));
      await unmountedRequest.promise.catch(() => undefined);
    });

    expect(mockGetILCDLocationAll).toHaveBeenCalledTimes(2);
  });
});
