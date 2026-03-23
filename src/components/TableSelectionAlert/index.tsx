import { Button } from 'antd';
import type { Key, ReactNode } from 'react';

type TableSelectionAlertArgs = {
  onCleanSelected?: () => void;
  selectedRowKeys?: Key[];
};

export const renderTableSelectionClearAction =
  (label: ReactNode) =>
  ({ onCleanSelected, selectedRowKeys = [] }: TableSelectionAlertArgs) => {
    if (!onCleanSelected || selectedRowKeys.length === 0) {
      return [];
    }

    return [
      <Button key='clear-selection' size='small' onClick={onCleanSelected}>
        {label}
      </Button>,
    ];
  };
