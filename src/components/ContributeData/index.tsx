import { Button, Modal, Tooltip } from 'antd';
import { FormattedMessage, useIntl } from 'umi';

import type { FC } from 'react';

import { ShareAltOutlined } from '@ant-design/icons';

interface ContributeDataProps {
  onOk: () => void;
  disabled: boolean;
}

const ContributeData: FC<ContributeDataProps> = ({ onOk, disabled }) => {
  const intl = useIntl();
  return (
    <Tooltip
      title={<FormattedMessage id="pages.button.contribute" defaultMessage="Contribute to team" />}
    >
      <Button
        disabled={disabled}
        shape="circle"
        icon={<ShareAltOutlined />}
        size="small"
        onClick={() => {
          Modal.confirm({
            okButtonProps: {
              type: 'primary',
              style: { backgroundColor: '#5C246A' },
            },
            cancelButtonProps: {
              style: { borderColor: '#5C246A', color: '#5C246A' },
            },
            title: intl.formatMessage({
              id: 'component.contributeData.confirm',
              defaultMessage: 'Contribute data',
            }),
            content: intl.formatMessage({
              id: 'component.contributeData.confirmContent',
              defaultMessage: 'Are you sure you want to contribute this data?',
            }),
            okText: intl.formatMessage({
              id: 'component.contributeData.confirm.ok',
              defaultMessage: 'Confirm',
            }),
            cancelText: intl.formatMessage({
              id: 'component.contributeData.confirm.cancel',
              defaultMessage: 'Cancel',
            }),
            onOk: onOk,
          });
        }}
      />
    </Tooltip>
  );
};

export default ContributeData;
