/**
 * Tests for LevelTextItemDescription component
 * Path: src/components/LevelTextItem/description.tsx
 */

import LevelTextItemDescription from '@/components/LevelTextItem/description';
import { render, screen, waitFor } from '@testing-library/react';

const mockGenClassStr = jest.fn();
const mockGetILCDClassification = jest.fn();
const mockGetILCDFlowCategorization = jest.fn();

jest.mock('@/services/general/util', () => ({
  genClassStr: (...args: any[]) => mockGenClassStr(...args),
}));

jest.mock('@/services/ilcd/api', () => ({
  getILCDClassification: (...args: any[]) => mockGetILCDClassification(...args),
  getILCDFlowCategorization: (...args: any[]) => mockGetILCDFlowCategorization(...args),
}));

jest.mock('umi', () => ({
  FormattedMessage: ({ defaultMessage, id }: { defaultMessage?: string; id: string }) => (
    <span>{defaultMessage ?? id}</span>
  ),
}));

jest.mock('antd', () => {
  const Spin = ({ spinning, children }: any) => (
    <div data-testid='level-spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <span>{typeof label === 'string' ? label : label}</span>
      <span>{children}</span>
    </div>
  );

  return { Descriptions, Spin };
});

describe('LevelTextItemDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fallback when no classification data is provided', () => {
    render(
      <LevelTextItemDescription
        data={null}
        lang='en'
        categoryType='Process'
        flowType='Product flow'
      />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(mockGetILCDClassification).not.toHaveBeenCalled();
    expect(mockGetILCDFlowCategorization).not.toHaveBeenCalled();
    expect(screen.getByTestId('level-spin')).toHaveAttribute('data-spinning', 'false');
  });

  it('fetches flow categorization for elementary flows and renders the generated classification string', async () => {
    mockGetILCDFlowCategorization.mockResolvedValue({
      data: [{ id: 'flow-class', label: 'Flow Class' }],
      success: true,
    });
    mockGenClassStr.mockReturnValue('Flow Class > Sub Class');

    render(
      <LevelTextItemDescription
        data={['flow-class', 'flow-sub']}
        lang='en'
        categoryType='Flow'
        flowType='Elementary flow'
      />,
    );

    await waitFor(() => {
      expect(mockGetILCDFlowCategorization).toHaveBeenCalledWith('en', ['flow-class']);
    });

    expect(mockGenClassStr).toHaveBeenCalledWith(['flow-class', 'flow-sub'], 0, [
      { id: 'flow-class', label: 'Flow Class' },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Flow Class > Sub Class')).toBeInTheDocument();
      expect(screen.getByTestId('level-spin')).toHaveAttribute('data-spinning', 'false');
    });
  });

  it('fetches classification for other category types', async () => {
    mockGetILCDClassification.mockResolvedValue({
      data: [{ id: 'proc', label: 'Process Class' }],
      success: true,
    });
    mockGenClassStr.mockReturnValue('Process Class > Leaf');

    render(
      <LevelTextItemDescription
        data={['proc', 'leaf']}
        lang='en'
        categoryType='Process'
        flowType='Product flow'
      />,
    );

    await waitFor(() => {
      expect(mockGetILCDClassification).toHaveBeenCalledWith('Process', 'en', ['proc']);
    });

    await waitFor(() => {
      expect(screen.getByText('Process Class > Leaf')).toBeInTheDocument();
    });
  });
});
