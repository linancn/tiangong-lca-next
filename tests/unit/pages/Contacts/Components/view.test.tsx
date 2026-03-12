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

const mockGetContactDetail = jest.fn();
const mockGenContactFromData = jest.fn();
const mockGetClassificationValues = jest.fn(() => ['sector-a']);

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  getLocale: () => 'en-US',
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-desc'>{toText(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='level-desc'>{toText(data)}</div>,
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='source-desc'>source-desc</div>,
}));

jest.mock('@/pages/Utils', () => ({
  __esModule: true,
  getClassificationValues: (...args: any[]) => mockGetClassificationValues(...args),
}));

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  getContactDetail: (...args: any[]) => mockGetContactDetail(...args),
}));

jest.mock('@/services/contacts/util', () => ({
  __esModule: true,
  genContactFromData: (...args: any[]) => mockGenContactFromData(...args),
}));

jest.mock('antd', () => {
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled}>
      {icon}
      {toText(children)}
    </button>
  );
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Drawer = ({ open, title, extra, children, onClose }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
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

describe('ContactView', () => {
  const ContactView = require('@/pages/Contacts/Components/view').default;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContactDetail.mockResolvedValue({
      data: { json: { contactDataSet: { from: 'api' } } },
    });
    mockGenContactFromData.mockReturnValue({
      contactInformation: {
        dataSetInformation: {
          'common:UUID': 'contact-1',
          'common:name': [{ '@xml:lang': 'en', '#text': 'Contact Name' }],
          'common:shortName': [{ '@xml:lang': 'en', '#text': 'CN' }],
          classificationInformation: {
            'common:classification': { 'common:class': ['sector-a'] },
          },
          telephone: '123456',
          email: 'contact@example.com',
          WWWAddress: 'https://example.com',
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': '2024-01-01',
          'common:referenceToDataSetFormat': {},
        },
        publicationAndOwnership: {
          'common:dataSetVersion': '1.1',
          'common:referenceToOwnershipOfDataSet': {},
          'common:referenceToPrecedingDataSetVersion': {},
          'common:permanentDataSetURI': 'uri:contact',
        },
      },
    });
  });

  it('loads contact detail data and switches between information tabs', async () => {
    renderWithProviders(<ContactView id='contact-1' version='1.0' lang='en' buttonType='icon' />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetContactDetail).toHaveBeenCalledWith('contact-1', '1.0'));
    expect(mockGenContactFromData).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /View Contact/i })).toBeInTheDocument();
    expect(screen.getByTestId('level-desc')).toHaveTextContent('sector-a');

    await userEvent.click(screen.getByRole('button', { name: /Administrative information/i }));
    expect(screen.getByTestId('source-desc')).toBeInTheDocument();
    expect(screen.getByText('1.1')).toBeInTheDocument();
  });
});
