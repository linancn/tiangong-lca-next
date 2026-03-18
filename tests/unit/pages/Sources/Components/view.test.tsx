// @ts-nocheck
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../../helpers/testUtils';

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

const mockGetSourceDetail = jest.fn();
const mockGenSourceFromData = jest.fn();
const mockGetClassificationValues = jest.fn(() => ['source-class']);
const mockIsValidURL = jest.fn(() => false);

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  getLocale: () => 'en-US',
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  LinkOutlined: () => <span>link-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('@/components/FileViewer/gallery', () => ({
  __esModule: true,
  default: () => <div data-testid='file-gallery'>file-gallery</div>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='level-desc'>{toText(data)}</div>,
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='contact-desc'>contact-desc</div>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getClassificationValues: (...args: any[]) => mockGetClassificationValues(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  isValidURL: (...args: any[]) => mockIsValidURL(...args),
}));

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourceDetail: (...args: any[]) => mockGetSourceDetail(...args),
}));

jest.mock('@/services/sources/util', () => ({
  __esModule: true,
  genSourceFromData: (...args: any[]) => mockGenSourceFromData(...args),
}));

jest.mock('@/pages/Sources/Components/optiondata', () => ({
  __esModule: true,
  getPublicationTypeLabel: (value: string) => `publication:${value || '-'}`,
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, icon, href, target }: any) => (
    <button
      type='button'
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-href={href}
      data-target={target}
    >
      {icon}
      {toText(children)}
    </button>
  );
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Drawer = ({ open, title, extra, children, onClose, getContainer }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div data-testid='drawer-container'>
          {getContainer?.() === globalThis.document?.body ? 'body' : 'custom'}
        </div>
        <div>{children}</div>
      </section>
    ) : null;
  const Card = ({ tabList = [], activeTabKey, onTabChange, title, children }: any) => (
    <section>
      {title ? <div>{toText(title)}</div> : null}
      <div data-testid='active-tab'>{activeTabKey}</div>
      <div>
        {tabList.map((tab: any) => (
          <button type='button' key={tab.key} onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </section>
  );
  const Descriptions: any = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={String(spinning)}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    Button,
    Card,
    ConfigProvider,
    Descriptions,
    Divider,
    Drawer,
    Space,
    Spin,
    Tooltip,
  };
});

describe('SourceView', () => {
  const SourceView = require('@/pages/Sources/Components/view').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSourceDetail.mockResolvedValue({
      data: { json: { sourceDataSet: { from: 'api' } } },
    });
    mockGenSourceFromData.mockReturnValue({
      sourceInformation: {
        dataSetInformation: {
          'common:UUID': 'source-1',
          'common:shortName': [{ '@xml:lang': 'en', '#text': 'Source Name' }],
          classificationInformation: {
            'common:classification': { 'common:class': ['source-class'] },
          },
          sourceCitation: 'Citation text',
          publicationType: 'book',
          sourceDescriptionOrComment: [{ '@xml:lang': 'en', '#text': 'Source comment' }],
          referenceToDigitalFile: [{ name: 'file.pdf' }],
          referenceToContact: {},
          referenceToLogo: [],
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': '2024-01-01',
          'common:referenceToDataSetFormat': [],
        },
        publicationAndOwnership: {
          'common:dataSetVersion': '1.0',
          'common:referenceToOwnershipOfDataSet': {},
          'common:referenceToPrecedingDataSetVersion': [],
          'common:permanentDataSetURI': 'uri:source',
        },
      },
    });
  });

  it('loads source detail data and renders both source tabs', async () => {
    renderWithProviders(<SourceView id='source-1' version='1.0' lang='en' buttonType='icon' />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetSourceDetail).toHaveBeenCalledWith('source-1', '1.0'));
    expect(mockGenSourceFromData).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /View Source/i })).toBeInTheDocument();
    expect(screen.getByTestId('file-gallery')).toBeInTheDocument();
    expect(screen.getByText('Citation text')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Administrative information/i }));
    expect(screen.getByTestId('contact-desc')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument();
  });

  it('renders the URL citation branch, supports the text trigger, and closes from both close actions', async () => {
    mockIsValidURL.mockReturnValue(true);
    mockGenSourceFromData.mockReturnValue({
      sourceInformation: {
        dataSetInformation: {
          sourceCitation: 'https://example.com/source',
        },
      },
      administrativeInformation: {},
    });

    renderWithProviders(<SourceView id='source-2' version='2.0' lang='en' buttonType='text' />);

    await userEvent.click(screen.getByRole('button', { name: /^view$/i }));

    await waitFor(() => expect(mockGetSourceDetail).toHaveBeenCalledWith('source-2', '2.0'));
    expect(screen.getByTestId('drawer-container')).toHaveTextContent('body');
    const citationLinkButton = document.querySelector(
      'button[data-href="https://example.com/source"]',
    );
    expect(citationLinkButton).not.toBeNull();
    expect(citationLinkButton).toHaveAttribute('data-href', 'https://example.com/source');
    expect(citationLinkButton).toHaveAttribute('data-target', 'blank');

    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));
    expect(screen.queryByRole('dialog', { name: /View Source/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^view$/i }));
    await screen.findByRole('dialog', { name: /View Source/i });
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByRole('dialog', { name: /View Source/i })).not.toBeInTheDocument();
  });

  it('falls back to an empty source dataset when the detail payload is missing', async () => {
    mockGetSourceDetail.mockResolvedValue({
      data: null,
    });

    renderWithProviders(<SourceView id='source-3' version='3.0' lang='en' buttonType='icon' />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGenSourceFromData).toHaveBeenCalledWith({}));
    expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
    expect(screen.getByRole('dialog', { name: /View Source/i })).toBeInTheDocument();
  });
});
