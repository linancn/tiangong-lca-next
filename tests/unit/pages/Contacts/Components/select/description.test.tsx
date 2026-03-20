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

jest.mock('@/pages/Contacts/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <div data-testid='contact-view'>{`${id}:${version}`}</div>,
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

describe('ContactSelectDescription', () => {
  const ContactSelectDescription =
    require('@/pages/Contacts/Components/select/description').default;

  it('renders fallback content when no contact reference is provided', () => {
    renderWithProviders(<ContactSelectDescription title='Contact' lang='en' />);

    expect(screen.queryByTestId('contact-view')).not.toBeInTheDocument();
  });

  it('normalizes array references and renders linked contact details', () => {
    renderWithProviders(
      <ContactSelectDescription
        title='Contact'
        lang='en'
        data={[
          {
            '@refObjectId': 'contact-1',
            '@version': '1.0',
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Contact short desc' }],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('contact-view')).toHaveTextContent('contact-1:1.0');
    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.getByText('Contact short desc')).toBeInTheDocument();
  });
});
