/**
 * Tests for LangTextItemDescription component
 * Path: src/components/LangTextItem/description.tsx
 */

import LangTextItemDescription from '@/components/LangTextItem/description';
import { render, screen } from '@testing-library/react';

const mockGetLangList = jest.fn();

jest.mock('@/services/general/util', () => ({
  getLangList: (...args: any[]) => mockGetLangList(...args),
}));

jest.mock('antd', () => {
  const Descriptions: any = ({ children }: any) => <div data-testid='descriptions'>{children}</div>;

  Descriptions.Item = ({ label, children }: any) => (
    <div>
      {typeof label === 'string' ? <span>{label}</span> : label}
      <span>{children}</span>
    </div>
  );

  return { Descriptions };
});

describe('LangTextItemDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fallback markup when no data is provided', () => {
    render(<LangTextItemDescription data={null} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(mockGetLangList).not.toHaveBeenCalled();
  });

  it('renders language entries with localized labels', () => {
    const rawData = { items: [] };
    mockGetLangList.mockReturnValue([
      { '@xml:lang': 'en', '#text': 'Hello in English' },
      { '@xml:lang': 'zh', '#text': '你好' },
      { '@xml:lang': 'fr', '#text': 'Bonjour' },
    ]);

    render(<LangTextItemDescription data={rawData} />);

    expect(mockGetLangList).toHaveBeenCalledWith(rawData);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Hello in English')).toBeInTheDocument();
    expect(screen.getByText('简体中文')).toBeInTheDocument();
    expect(screen.getByText('你好')).toBeInTheDocument();
    // Non-mapped languages fall back to '-'
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});
