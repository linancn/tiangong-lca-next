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

jest.mock('@/pages/Unitgroups/Components/select/descriptionMini', () => ({
  __esModule: true,
  default: ({ id, version, idType }: any) => (
    <div data-testid='unitgroup-mini'>{`${id}:${version}:${idType}`}</div>
  ),
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <div data-testid='flowproperty-view'>{`${id}:${version}`}</div>
  ),
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

describe('FlowpropertySelectDescription', () => {
  const FlowpropertySelectDescription =
    require('@/pages/Flowproperties/Components/select/description').default;

  it('renders fallback content when no flow property reference is provided', () => {
    renderWithProviders(
      <FlowpropertySelectDescription title='Flow property' lang='en' data={null} />,
    );

    expect(screen.queryByTestId('flowproperty-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-mini')).toHaveTextContent('::flowproperty');
  });

  it('renders linked flow property details and the reference unit summary', () => {
    renderWithProviders(
      <FlowpropertySelectDescription
        title='Flow property'
        lang='en'
        data={{
          '@refObjectId': 'flowproperty-1',
          '@version': '1.0',
          'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Flow property short desc' }],
        }}
      />,
    );

    expect(screen.getByTestId('flowproperty-view')).toHaveTextContent('flowproperty-1:1.0');
    expect(screen.getByText('Flow property short desc')).toBeInTheDocument();
    expect(screen.getByTestId('unitgroup-mini')).toHaveTextContent(
      'flowproperty-1:1.0:flowproperty',
    );
  });
});
