import { formatLocaleList } from '@/utils/localeFormatting';

type IntlShapeLike = {
  locale?: string;
  formatMessage: (
    descriptor: { defaultMessage?: string; id: string },
    values?: Record<string, string | number | undefined>,
  ) => string;
};

/** Owns the complete validation sentence so each locale controls its own word order. */
export const formatDataCheckErrorWithSections = (
  intl: IntlShapeLike,
  sectionLabels: readonly string[],
) =>
  intl.formatMessage(
    {
      id: 'pages.button.check.errorWithSections',
      defaultMessage: 'Data check failed in {sections}. Please check the data!',
    },
    {
      sections: formatLocaleList(sectionLabels, intl.locale),
    },
  );
