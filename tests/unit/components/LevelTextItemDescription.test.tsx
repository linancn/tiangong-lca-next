/**
 * Tests for LevelTextItemDescription component
 * Path: src/components/LevelTextItem/description.tsx
 */

import LevelTextItemDescription from '@/components/LevelTextItem/description';
import { SUPPORTED_CONTENT_LANGUAGES } from '@/services/general/contentLanguageRegistry';
import { act, render, screen, waitFor } from '@testing-library/react';

const mockGenClassStr = jest.fn();
const mockGetILCDClassification = jest.fn();
const mockGetILCDFlowCategorization = jest.fn();

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolver, rejecter) => {
    resolve = resolver;
    reject = rejecter;
  });
  return { promise, reject, resolve };
};

jest.mock('@/services/general/util', () => ({
  genClassStr: (...args: any[]) => mockGenClassStr(...args),
}));

jest.mock('@/services/classifications/api', () => ({
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

  it('refreshes on parent language/category changes and ignores the stale response', async () => {
    const [initialLanguage, nextLanguage] = SUPPORTED_CONTENT_LANGUAGES;
    expect(nextLanguage).toBeDefined();
    const initialRequest = deferred<any>();
    mockGetILCDClassification.mockReturnValueOnce(initialRequest.promise);
    mockGetILCDFlowCategorization.mockResolvedValueOnce({
      data: [{ id: 'flow-class', label: 'Current flow class' }],
      success: true,
    });
    mockGenClassStr.mockImplementation((_data, _index, nodes) => nodes[0].label);

    const { rerender } = render(
      <LevelTextItemDescription
        data={['class-id']}
        lang={initialLanguage}
        categoryType='Process'
        flowType='Product flow'
      />,
    );
    rerender(
      <LevelTextItemDescription
        data={['class-id']}
        lang={nextLanguage}
        categoryType='Flow'
        flowType='Elementary flow'
      />,
    );

    expect(await screen.findByText('Current flow class')).toBeInTheDocument();
    expect(mockGetILCDFlowCategorization).toHaveBeenCalledWith(nextLanguage, ['class-id']);

    await act(async () => {
      initialRequest.resolve({
        data: [{ id: 'class-id', label: 'Stale process class' }],
        success: true,
      });
      await initialRequest.promise;
    });

    expect(screen.queryByText('Stale process class')).not.toBeInTheDocument();
    expect(screen.getByText('Current flow class')).toBeInTheDocument();
  });

  it('clears the previous locale and contains active and stale request failures', async () => {
    const [initialLanguage, staleLanguage, currentLanguage] = SUPPORTED_CONTENT_LANGUAGES;
    expect(currentLanguage).toBeDefined();
    const staleRequest = deferred<any>();
    mockGetILCDClassification
      .mockResolvedValueOnce({
        data: [{ id: 'class-id', label: 'Initial class' }],
        success: true,
      })
      .mockReturnValueOnce(staleRequest.promise)
      .mockRejectedValueOnce(new Error('current locale failed'));
    mockGenClassStr.mockImplementation((_data, _index, nodes) => nodes[0].label);

    const renderControl = (lang: string) => (
      <LevelTextItemDescription
        data={['class-id']}
        lang={lang}
        categoryType='Process'
        flowType='Product flow'
      />
    );
    const { rerender } = render(renderControl(initialLanguage));

    expect(await screen.findByText('Initial class')).toBeInTheDocument();
    rerender(renderControl(staleLanguage));
    await waitFor(() => {
      expect(mockGetILCDClassification).toHaveBeenCalledWith('Process', staleLanguage, [
        'class-id',
      ]);
    });

    rerender(renderControl(currentLanguage));
    await waitFor(() => {
      expect(mockGetILCDClassification).toHaveBeenCalledWith('Process', currentLanguage, [
        'class-id',
      ]);
      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getByTestId('level-spin')).toHaveAttribute('data-spinning', 'false');
    });

    await act(async () => {
      staleRequest.reject(new Error('stale locale failed'));
      await staleRequest.promise.catch(() => undefined);
    });

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText('Initial class')).not.toBeInTheDocument();
  });
});
