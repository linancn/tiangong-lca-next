// @ts-nocheck
import ReviewItemView from '@/pages/Review/Components/ReviewForm/view';
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

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='contact-description'>
      {`${lang}:${data?.['@refObjectId']}:${title?.props?.defaultMessage ?? title}`}
    </div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='source-description'>
      {`${lang}:${data?.['@refObjectId']}:${title?.props?.defaultMessage ?? title}`}
    </div>
  ),
}));

jest.mock('@/pages/Review/Components/ReviewForm/Scope/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='scope-view'>{String(data?.length ?? 0)}</div>,
}));

jest.mock('@/pages/Review/Components/ReviewForm/DataQualityIndicator/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='dqi-view'>{String(data?.length ?? 0)}</div>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-description'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  reviewTypeOptions: [{ value: 'peer-review', label: 'Peer review' }],
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
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    Card,
    Descriptions,
    Divider,
    Space,
  };
});

describe('ReviewFormView', () => {
  it('renders mapped review type and preserves raw type values when unmapped', () => {
    render(
      <ReviewItemView
        data={[
          {
            '@type': 'peer-review',
            'common:scope': [{ '@name': 'scope-a' }],
            'common:dataQualityIndicators': {
              'common:dataQualityIndicator': [{ '@name': 'indicator-a', '@value': 'good' }],
            },
            'common:reviewDetails': [{ '@xml:lang': 'en', '#text': 'Review details' }],
            'common:otherReviewDetails': [{ '@xml:lang': 'en', '#text': 'Other details' }],
            'common:referenceToNameOfReviewerAndInstitution': {
              '@refObjectId': 'contact-1',
            },
            'common:referenceToCompleteReviewReport': {
              '@refObjectId': 'source-1',
            },
          },
          {
            '@type': 'custom-review',
            'common:scope': [],
            'common:dataQualityIndicators': {
              'common:dataQualityIndicator': [],
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('Peer review')).toBeInTheDocument();
    expect(screen.getByText('custom-review')).toBeInTheDocument();
    expect(screen.getAllByTestId('contact-description')[0]).toHaveTextContent(
      'en:contact-1:Reviewer name and institution',
    );
    expect(screen.getAllByTestId('source-description')[0]).toHaveTextContent(
      'en:source-1:Complete review report',
    );
  });

  it('renders nothing when the review form array is empty', () => {
    const { container } = render(<ReviewItemView data={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
