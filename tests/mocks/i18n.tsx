import React from 'react';

type SharedIcuFormatter = {
  formatIcuMessage: (message: string, values?: Record<string, unknown>, locale?: string) => string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { formatIcuMessage } =
  require('../../scripts/i18n/icu-message-parser.cjs') as SharedIcuFormatter;

const hasOnlyPrimitiveValues = (values: Record<string, unknown>): boolean =>
  Object.values(values).every(
    (value) =>
      value !== null &&
      value !== undefined &&
      typeof value !== 'function' &&
      typeof value !== 'object',
  );

type MessageDescriptor = {
  id?: string;
  defaultMessage?: string;
};

export type IntlShape = {
  locale: string;
  formatMessage: (descriptor: MessageDescriptor, values?: Record<string, unknown>) => string;
};

export const defaultIntl: IntlShape = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }, values) => {
    const message = defaultMessage ?? id ?? '';
    return values && hasOnlyPrimitiveValues(values)
      ? formatIcuMessage(message, values, 'en-US')
      : message;
  },
};

export const renderMessageWithValues = (message: string, values?: Record<string, any>) => {
  if (!values) return message;
  if (hasOnlyPrimitiveValues(values)) return formatIcuMessage(message, values, 'en-US');

  const parts = message.split(/(\{[^}]+\})/g);
  return parts.map((part, index) => {
    const match = part.match(/^\{(.+)\}$/);
    if (!match) {
      return <React.Fragment key={index}>{part}</React.Fragment>;
    }
    const value = values[match[1]];
    return <React.Fragment key={index}>{value}</React.Fragment>;
  });
};
