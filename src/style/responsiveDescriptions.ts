import type { DescriptionsProps } from 'antd';

/**
 * Lets translated labels size from their content while keeping long copy
 * within the viewport. Consumers must not choose widths by locale.
 */
export const RESPONSIVE_DESCRIPTION_ITEM_STYLES: NonNullable<DescriptionsProps['styles']> = {
  label: {
    width: 'auto',
    maxWidth: 'min(42vw, 22rem)',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  },
};
