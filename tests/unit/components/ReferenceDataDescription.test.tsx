/**
 * Tests for ReferenceData description component
 * Path: src/components/ReferenceData/description.tsx
 */

import ReferenceDataDescription from '@/components/ReferenceData/description';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid='lang-text-item' />),
}));

jest.mock('antd', () => {
  const Card = ({ title, children }: any) => (
    <div data-testid='card'>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );

  const Descriptions: any = ({ children }: any) => <div>{children}</div>;

  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );

  const Divider = ({ children }: any) => <div>{children}</div>;

  return {
    Card,
    Descriptions,
    Divider,
  };
});

describe('ReferenceDataDescription', () => {
  const LangTextItemDescriptionMock = jest.requireMock('@/components/LangTextItem/description')
    .default as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provided metadata fields', () => {
    const data = {
      '@type': 'LCI Source',
      '@refObjectId': 'ref-123',
      '@uri': 'http://example.com',
      '@version': '1.0.0',
      'common:shortDescription': { value: 'Short description' },
    };

    render(<ReferenceDataDescription title='Reference Info' data={data} />);

    expect(screen.getByText('Reference Info')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('LCI Source')).toBeInTheDocument();
    expect(screen.getByText('Ref Object Id')).toBeInTheDocument();
    expect(screen.getByText('ref-123')).toBeInTheDocument();
    expect(screen.getByText('URI')).toBeInTheDocument();
    expect(screen.getByText('http://example.com')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Short Description')).toBeInTheDocument();
    expect(screen.getByTestId('lang-text-item')).toBeInTheDocument();
    expect(LangTextItemDescriptionMock).toHaveBeenCalledWith(
      { data: data['common:shortDescription'] },
      {},
    );
  });

  it('falls back to placeholder values when metadata is missing', () => {
    render(<ReferenceDataDescription title='Reference Info' data={undefined} />);

    const placeholders = screen.getAllByText('-');
    // Type, Ref Object Id, URI, Version each render a fallback dash
    expect(placeholders).toHaveLength(4);
    expect(LangTextItemDescriptionMock).toHaveBeenCalledWith({ data: undefined }, {});
  });
});
