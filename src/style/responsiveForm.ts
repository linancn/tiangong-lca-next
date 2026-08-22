import type { SpaceProps } from 'antd';
import type { CSSProperties } from 'react';

export const RESPONSIVE_REFERENCE_SELECTOR_SPACE_PROPS = {
  orientation: 'horizontal',
  wrap: true,
  style: { width: '100%' },
  styles: { item: { minWidth: 0, maxWidth: '100%' } },
} satisfies SpaceProps;

export const RESPONSIVE_REFERENCE_SELECTOR_FORM_ITEM_STYLE: CSSProperties = {
  width: '350px',
  maxWidth: '100%',
};

export const RESPONSIVE_REFERENCE_SELECTOR_INPUT_STYLE: CSSProperties = {
  width: '100%',
  maxWidth: '100%',
};
