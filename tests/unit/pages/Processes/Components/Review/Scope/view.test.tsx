// @ts-nocheck
import ScopeItemView from '@/pages/Processes/Components/Review/Scope/view';
import { render, screen } from '../../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  scopeNameOptions: [{ value: 'gate-to-gate', label: 'Gate to gate' }],
  methodNameOptions: [{ value: 'review-method', label: 'Review method' }],
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

describe('ProcessReviewScopeView', () => {
  it('renders mapped scope and method labels, including array-based methods', () => {
    render(
      <ScopeItemView
        data={[
          {
            '@name': 'gate-to-gate',
            'common:method': [{ '@name': 'review-method' }],
          },
          {
            '@name': 'custom-scope',
            'common:method': { '@name': 'custom-method' },
          },
        ]}
      />,
    );

    expect(screen.getByText('Gate to gate')).toBeInTheDocument();
    expect(screen.getByText('Review method')).toBeInTheDocument();
    expect(screen.getByText('custom-scope')).toBeInTheDocument();
    expect(screen.getByText('custom-method')).toBeInTheDocument();
  });

  it('renders nothing when review scope data is missing', () => {
    const { container } = render(<ScopeItemView data={undefined as any} />);

    expect(container).toBeEmptyDOMElement();
  });
});
