// @ts-nocheck
import { renderWithProviders, screen } from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.['#text']) return String(node['#text']);
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  getLocale: () => 'en-US',
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/pages/Sources/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <div data-testid='source-view'>{`${id}:${version}`}</div>,
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ title, children }: any) => (
    <section>
      <div>{toText(title)}</div>
      <div>{children}</div>
    </section>
  );
  const Space = ({ children }: any) => <div>{children}</div>;
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  return {
    __esModule: true,
    Card,
    ConfigProvider,
    Descriptions,
    Divider,
    Space,
  };
});

describe('SourceSelectDescription', () => {
  const SourceSelectDescription = require('@/pages/Sources/Components/select/description').default;

  it('renders a placeholder card when there are no source references', () => {
    renderWithProviders(<SourceSelectDescription title='Source' lang='en' />);

    expect(screen.queryByTestId('source-view')).not.toBeInTheDocument();
  });

  it('renders all referenced sources and their descriptions', () => {
    renderWithProviders(
      <SourceSelectDescription
        title='Source'
        lang='en'
        data={[
          {
            '@refObjectId': 'source-1',
            '@version': '1.0',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Source one' }],
          },
          {
            '@refObjectId': 'source-2',
            '@version': '2.0',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Source two' }],
          },
        ]}
      />,
    );

    expect(screen.getAllByTestId('source-view')).toHaveLength(2);
    expect(screen.getByText('Source one')).toBeInTheDocument();
    expect(screen.getByText('Source two')).toBeInTheDocument();
  });
});
