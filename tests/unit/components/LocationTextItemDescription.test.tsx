/**
 * Tests for LocationTextItemDescription component
 * Path: src/components/LocationTextItem/description.tsx
 */

import LocationTextItemDescription from '@/components/LocationTextItem/description';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetILCDLocationByValue = jest.fn();

jest.mock('@/services/ilcd/api', () => ({
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
        labelStyle={{ width: 120 }}
      />,
    );

    expect(mockGetILCDLocationByValue).toHaveBeenCalledWith('en', 'US');

    await waitFor(() => {
      expect(screen.getByText('United States')).toBeInTheDocument();
    });

    expect(screen.getByTestId('location-spin')).toHaveAttribute('data-spinning', 'false');
  });

  it('does not trigger fetch when data is missing', () => {
    render(
      <LocationTextItemDescription
        lang='en'
        data={null}
        label='Location'
        labelStyle={{ width: 120 }}
      />,
    );

    expect(mockGetILCDLocationByValue).not.toHaveBeenCalled();
    expect(screen.getByTestId('location-spin')).toHaveAttribute('data-spinning', 'false');
  });
});
