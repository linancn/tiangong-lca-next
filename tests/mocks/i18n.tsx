import React from 'react';

type MessageDescriptor = {
  id?: string;
  defaultMessage?: string;
};

export type IntlShape = {
  locale: string;
  formatMessage: (descriptor: MessageDescriptor) => string;
};

export const defaultIntl: IntlShape = {
  locale: 'en-US',
  formatMessage: ({ defaultMessage, id }) => (defaultMessage ?? id ?? '') as string,
};

export const renderMessageWithValues = (message: string, values?: Record<string, any>) => {
  if (!values) return message;
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
