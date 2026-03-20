// @ts-nocheck
import DataQualityIndicatorItemView from '@/pages/Processes/Components/Review/DataQualityIndicator/view';
import { render, screen } from '../../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  dataQualityIndicatorNameOptions: [
    { value: 'temporal-correlation', label: 'Temporal correlation' },
  ],
  dataQualityIndicatorValueOptions: [{ value: 'very-good', label: 'Very good' }],
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../../helpers/nodeToText');

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  return {
    __esModule: true,
    Row,
    Col,
    Descriptions,
  };
});

describe('ProcessReviewDataQualityIndicatorView', () => {
  it('renders mapped indicator labels and falls back to raw values for unknown entries', () => {
    render(
      <DataQualityIndicatorItemView
        data={[
          {
            '@name': 'temporal-correlation',
            '@value': 'very-good',
          },
          {
            '@name': 'custom-name',
            '@value': 'custom-value',
          },
        ]}
      />,
    );

    expect(screen.getByText('Temporal correlation')).toBeInTheDocument();
    expect(screen.getByText('Very good')).toBeInTheDocument();
    expect(screen.getByText('custom-name')).toBeInTheDocument();
    expect(screen.getByText('custom-value')).toBeInTheDocument();
  });

  it('renders nothing when indicator data is missing', () => {
    const { container } = render(<DataQualityIndicatorItemView data={undefined as any} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('falls back to dashes when indicator name or value is missing', () => {
    render(
      <DataQualityIndicatorItemView
        data={[
          {
            '@name': undefined,
            '@value': undefined,
          },
        ]}
      />,
    );

    expect(screen.getAllByText('-')).toHaveLength(2);
  });
});
