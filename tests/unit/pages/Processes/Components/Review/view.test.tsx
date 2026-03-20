// @ts-nocheck
import ReviewItemView from '@/pages/Processes/Components/Review/view';
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
  jsonToList: (value: any) => (Array.isArray(value) ? value : value ? [value] : []),
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

jest.mock('@/pages/Processes/Components/Review/Scope/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='scope-view'>{String(data?.length ?? 0)}</div>,
}));

jest.mock('@/pages/Processes/Components/Review/DataQualityIndicator/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='dqi-view'>{String(data?.length ?? 0)}</div>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-description'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  reviewTypeOptions: [{ value: 'critical-review', label: 'Critical review' }],
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

describe('ProcessReviewView', () => {
  it('renders mapped review type, nested scope and indicator views, and reviewer references', () => {
    render(
      <ReviewItemView
        data={{
          '@type': 'critical-review',
          'common:scope': { '@name': 'scope-a' },
          'common:dataQualityIndicators': {
            'common:dataQualityIndicator': { '@name': 'indicator-a', '@value': 'good' },
          },
          'common:reviewDetails': [{ '@xml:lang': 'en', '#text': 'Review details' }],
          'common:otherReviewDetails': [{ '@xml:lang': 'en', '#text': 'Other details' }],
          'common:referenceToNameOfReviewerAndInstitution': {
            '@refObjectId': 'contact-1',
          },
          'common:referenceToCompleteReviewReport': {
            '@refObjectId': 'source-1',
          },
        }}
      />,
    );

    expect(screen.getByText('Critical review')).toBeInTheDocument();
    expect(screen.getByTestId('scope-view')).toHaveTextContent('1');
    expect(screen.getByTestId('dqi-view')).toHaveTextContent('1');
    expect(screen.getByTestId('contact-description')).toHaveTextContent(
      'en:contact-1:Reviewer name and institution',
    );
    expect(screen.getByTestId('source-description')).toHaveTextContent(
      'en:source-1:Complete review report',
    );
    expect(screen.getAllByTestId('lang-description')).toHaveLength(2);
  });

  it('renders nothing when review data is absent', () => {
    const { container } = render(<ReviewItemView data={null as any} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('uses the default empty review array when the data prop is omitted', () => {
    const { container } = render(<ReviewItemView {...({} as any)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('falls back to raw review types and dash placeholders when values are missing', () => {
    render(
      <ReviewItemView
        data={[
          {
            '@type': 'peer-review',
            'common:scope': [],
            'common:dataQualityIndicators': {},
          },
          {},
        ]}
      />,
    );

    expect(screen.getByText('peer-review')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('scope-view')).toHaveLength(2);
    expect(screen.getAllByTestId('dqi-view')).toHaveLength(2);
  });
});
