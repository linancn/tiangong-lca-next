import LocationTextItemForm from '@/components/LocationTextItem/form';
import { getILCDLocationAll } from '@/services/ilcd/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, Form } from 'antd';

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

const mockGetILCDLocationAll = getILCDLocationAll as jest.MockedFunction<any>;

describe('LocationTextItemForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    // open select to see options
    const combobox = screen.getByRole('combobox');
    fireEvent.mouseDown(combobox);

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

    const combobox = await screen.findByRole('combobox');
    fireEvent.mouseDown(combobox);

    const option = await screen.findByText('CN (China)');
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
    fireEvent.mouseDown(combobox);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'china' } });

    await waitFor(() => {
      // filtered list should still include matching option
      expect(screen.getByText('CN (China)')).toBeInTheDocument();
    });
  });
});
