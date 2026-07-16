import { formatDataCheckErrorWithSections } from '@/pages/Utils/validation/feedbackMessages';

describe('formatDataCheckErrorWithSections', () => {
  it.each([
    ['en-US', 'Data check failed in Overview and Contact information. Please check the data!'],
    [
      'de-DE',
      'Die Datenprüfung ist in folgenden Bereichen fehlgeschlagen: Übersicht und Kontaktinformationen. Prüfen Sie die Daten.',
    ],
    ['zh-CN', '以下部分的数据校验失败：概览和联系信息。请检查数据！'],
  ])('keeps the complete %s sentence under locale ownership', (locale, expected) => {
    const messages: Record<string, string> = {
      'en-US': 'Data check failed in {sections}. Please check the data!',
      'de-DE':
        'Die Datenprüfung ist in folgenden Bereichen fehlgeschlagen: {sections}. Prüfen Sie die Daten.',
      'zh-CN': '以下部分的数据校验失败：{sections}。请检查数据！',
    };
    const labels: Record<string, string[]> = {
      'en-US': ['Overview', 'Contact information'],
      'de-DE': ['Übersicht', 'Kontaktinformationen'],
      'zh-CN': ['概览', '联系信息'],
    };
    const intl = {
      locale,
      formatMessage: (_descriptor: unknown, values?: Record<string, string | number | undefined>) =>
        messages[locale].replace('{sections}', String(values?.sections ?? '')),
    };

    expect(formatDataCheckErrorWithSections(intl, labels[locale])).toBe(expected);
  });
});
