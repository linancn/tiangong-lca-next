import { isValidElement, ReactNode } from 'react';

/**
 * Convert a React node (including FormattedMessage) into plain text for assertions.
 * Handles arrays, numeric values, and nested children.
 */
export const toText = (node: ReactNode): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => toText(child)).join('');
  }

  if (isValidElement(node)) {
    const props = (node as any).props ?? {};
    if (props.defaultMessage) return props.defaultMessage;
    if (props.id) return props.id;
    if (props.children) return toText(props.children);
  }

  return '';
};

export const toPlainText = toText;
