import { formatAccountRole } from '@/pages/Account/roleMessage';
import { formatDatasetTabLabel } from '@/pages/Utils/validation/tabMessages';

const createIntl = (messages: Record<string, string>) => ({
  formatMessage: (
    { defaultMessage, id }: { defaultMessage?: string; id: string },
    values?: Record<string, string | number | undefined>,
  ) =>
    Object.entries(values ?? {}).reduce(
      (message, [key, value]) => message.replace(`{${key}}`, String(value)),
      messages[id] ?? defaultMessage ?? id,
    ),
});

describe('runtime i18n boundaries', () => {
  it('maps known JWT roles and localizes an unknown JWT role without using it as an id', () => {
    const intl = createIntl({
      'pages.account.profile.role.authenticated': 'Member',
      'pages.account.profile.role.unknown': 'Unknown role ({role})',
    });

    expect(formatAccountRole(intl, 'authenticated')).toBe('Member');
    expect(formatAccountRole(intl, 'future-jwt-role')).toBe('Unknown role (future-jwt-role)');
  });

  it('maps known persisted tab tokens and localizes unknown tokens without using them as ids', () => {
    const intl = createIntl({
      'pages.process.view.exchanges': 'Inputs and Outputs',
      'pages.validationIssues.tab.unknown': 'Unknown section ({tab})',
    });

    expect(formatDatasetTabLabel(intl, 'process data set', 'exchanges')).toBe('Inputs and Outputs');
    expect(formatDatasetTabLabel(createIntl({}), 'process data set', 'exchanges')).toBe(
      'Inputs and Outputs',
    );
    expect(formatDatasetTabLabel(intl, 'process data set', 'future-tab')).toBe(
      'Unknown section (future-tab)',
    );
    expect(formatDatasetTabLabel(intl, 'future data set', 'exchanges')).toBe(
      'Unknown section (exchanges)',
    );
    expect(formatDatasetTabLabel(intl, 'future data set', '   ')).toBe('Unknown section (-)');
  });
});
