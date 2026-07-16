const DEFAULT_FORMATTING_LOCALE = 'en-US';

type ListFormatter = { format: (items: readonly string[]) => string };
type ListFormatterConstructor = new (
  locale?: string | string[],
  options?: { style?: 'long' | 'short' | 'narrow'; type?: 'conjunction' | 'disjunction' | 'unit' },
) => ListFormatter;

const nonEmptyStrings = (items: readonly string[]) =>
  items.map((item) => item.trim()).filter((item) => item.length > 0);

const fallbackConjunction = (items: readonly string[], locale: string): string => {
  if (items.length < 2) {
    return items[0] ?? '';
  }

  const language = locale.toLowerCase().split(/[-_]/, 1)[0];
  const lastItem = items[items.length - 1];
  if (language === 'zh') {
    return `${items.slice(0, -1).join('、')}和${lastItem}`;
  }

  const conjunction = language === 'de' ? ' und ' : ' and ';
  if (items.length === 2) {
    return items.join(conjunction);
  }

  if (language === 'de') {
    return `${items.slice(0, -1).join(', ')}${conjunction}${lastItem}`;
  }

  return `${items.slice(0, -1).join(', ')},${conjunction}${lastItem}`;
};

/**
 * Formats user-visible labels using the active app locale. Callers must pass the
 * canonical React Intl locale; dataset-language selection does not belong here.
 */
export const formatLocaleList = (items: readonly string[], locale?: string): string => {
  const values = nonEmptyStrings(items);
  const formattingLocale = locale?.trim() || DEFAULT_FORMATTING_LOCALE;

  try {
    const ListFormat = (Intl as typeof Intl & { ListFormat?: ListFormatterConstructor }).ListFormat;
    if (!ListFormat) {
      return fallbackConjunction(values, formattingLocale);
    }
    return new ListFormat(formattingLocale, {
      style: 'long',
      type: 'conjunction',
    }).format(values);
  } catch {
    return fallbackConjunction(values, formattingLocale);
  }
};

/** Returns the literal rendered between two adjacent items in a localized list. */
export const getLocaleListSeparator = (
  itemIndex: number,
  itemCount: number,
  locale?: string,
): string => {
  if (itemIndex < 0 || itemIndex >= itemCount - 1) {
    return '';
  }

  const placeholders = Array.from({ length: itemCount }, (_, index) => `__item_${index}__`);
  const formatted = formatLocaleList(placeholders, locale);
  const current = placeholders[itemIndex];
  const next = placeholders[itemIndex + 1];
  const currentEnd = formatted.indexOf(current) + current.length;
  const nextStart = formatted.indexOf(next, currentEnd);

  return currentEnd >= current.length && nextStart >= currentEnd
    ? formatted.slice(currentEnd, nextStart)
    : ', ';
};

/** Formats a display timestamp without changing the raw value used for sorting. */
export const formatLocaleDateTime = (value: string, locale?: string): string => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const formattingLocale = locale?.trim() || DEFAULT_FORMATTING_LOCALE;
  try {
    return new Intl.DateTimeFormat(formattingLocale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString(DEFAULT_FORMATTING_LOCALE);
  }
};
