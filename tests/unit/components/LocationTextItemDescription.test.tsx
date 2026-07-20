/**
 * Tests for LocationTextItemDescription component
 * Path: src/components/LocationTextItem/description.tsx
 */

import LocationTextItemDescription from '@/components/LocationTextItem/description';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetILCDLocationByValue = jest.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

jest.mock('@/services/locations/api', () => ({
  getILCDLocationByValue: (...args: any[]) => mockGetILCDLocationByValue(...args),
}));

jest.mock('antd', () => {
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;

  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );

  const Spin = ({ spinning, children }: any) => (
    <div data-testid='location-spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  return {
    Descriptions,
    Spin,
  };
});

describe('LocationTextItemDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and renders location details for provided data', async () => {
    mockGetILCDLocationByValue.mockResolvedValue({ data: 'United States' });

    render(
      <LocationTextItemDescription
        lang='en'
        data='US'
        label='Location'
        styles={{ label: { width: 120 } }}
      />,
    );

    expect(mockGetILCDLocationByValue).toHaveBeenCalledWith('en', 'US');

    await waitFor(() => {
      expect(screen.getByText('United States')).toBeInTheDocument();
    });

    expect(screen.getByTestId('reference-resource-location')).toHaveAttribute(
      'data-reference-language',
      'en',
    );
    expect(screen.getByTestId('reference-resource-location')).toHaveAttribute(
      'data-reference-pending',
      'false',
    );
    expect(screen.getByTestId('location-spin')).toHaveAttribute('data-spinning', 'false');
  });

  it('does not trigger fetch when data is missing', () => {
    render(
      <LocationTextItemDescription
        lang='en'
        data={null}
        label='Location'
        styles={{ label: { width: 120 } }}
      />,
    );

    expect(mockGetILCDLocationByValue).not.toHaveBeenCalled();
    expect(screen.getByTestId('location-spin')).toHaveAttribute('data-spinning', 'false');
  });

  it('reloads for the new language and ignores the stale response', async () => {
    const german = deferred<{ data: string }>();
    const french = deferred<{ data: string }>();
    mockGetILCDLocationByValue
      .mockReturnValueOnce(german.promise)
      .mockReturnValueOnce(french.promise);

    const { rerender } = render(
      <LocationTextItemDescription lang='de' data='GLO' label='Location' />,
    );
    rerender(<LocationTextItemDescription lang='fr' data='GLO' label='Location' />);

    french.resolve({ data: 'Monde' });
    await waitFor(() => expect(screen.getByText('Monde')).toBeInTheDocument());

    german.resolve({ data: 'Global' });
    await waitFor(() => expect(screen.queryByText('Global')).not.toBeInTheDocument());
    expect(mockGetILCDLocationByValue).toHaveBeenNthCalledWith(1, 'de', 'GLO');
    expect(mockGetILCDLocationByValue).toHaveBeenNthCalledWith(2, 'fr', 'GLO');
  });

  it('clears a current failed lookup without accepting a stale failure', async () => {
    const stale = deferred<{ data: string }>();
    const current = deferred<{ data: string }>();
    mockGetILCDLocationByValue
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise);

    const { rerender } = render(
      <LocationTextItemDescription lang='de' data='DE' label='Location' />,
    );
    rerender(<LocationTextItemDescription lang='fr' data='FR' label='Location' />);

    stale.reject(new Error('stale'));
    current.reject(new Error('current'));

    await waitFor(() =>
      expect(screen.getByTestId('location-spin')).toHaveAttribute('data-spinning', 'false'),
    );
    expect(screen.queryByText('stale')).not.toBeInTheDocument();
  });
});
