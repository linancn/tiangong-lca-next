// @ts-nocheck
import ComplianceItemView from '@/pages/Review/Components/Compliance/view';
import { render, screen } from '../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    locale: 'en-US',
  }),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLang: () => 'en',
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='source-description'>{`${lang}:${data?.['@refObjectId']}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  approvalOfOverallComplianceOptions: [{ value: 'approved', label: 'Approved' }],
  nomenclatureComplianceOptions: [{ value: 'nomenclature-ok', label: 'Nomenclature OK' }],
  methodologicalComplianceOptions: [{ value: 'method-ok', label: 'Method OK' }],
  reviewComplianceOptions: [{ value: 'review-ok', label: 'Review OK' }],
  documentationComplianceOptions: [{ value: 'docs-ok', label: 'Docs OK' }],
  qualityComplianceOptions: [{ value: 'quality-ok', label: 'Quality OK' }],
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../helpers/nodeToText');

  const Card = ({ children, title }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Space = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    Card,
    Descriptions,
    Space,
  };
});

describe('ReviewComplianceView', () => {
  it('renders mapped compliance labels and keeps unknown values as-is', () => {
    render(
      <ComplianceItemView
        data={[
          {
            'common:approvalOfOverallCompliance': 'approved',
            'common:nomenclatureCompliance': 'nomenclature-ok',
            'common:methodologicalCompliance': 'method-ok',
            'common:reviewCompliance': 'review-ok',
            'common:documentationCompliance': 'docs-ok',
            'common:qualityCompliance': 'custom-quality',
            'common:referenceToComplianceSystem': {
              '@refObjectId': 'source-1',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Nomenclature OK')).toBeInTheDocument();
    expect(screen.getByText('Method OK')).toBeInTheDocument();
    expect(screen.getByText('Review OK')).toBeInTheDocument();
    expect(screen.getByText('Docs OK')).toBeInTheDocument();
    expect(screen.getByText('custom-quality')).toBeInTheDocument();
    expect(screen.getByTestId('source-description')).toHaveTextContent(
      'en:source-1:Compliance system',
    );
  });

  it('renders nothing when compliance data is absent', () => {
    const { container } = render(<ComplianceItemView data={null as any} />);

    expect(container).toBeEmptyDOMElement();
  });
});
