import { Button, Modal, Tooltip, theme } from 'antd';
import { FormattedMessage, useIntl } from 'umi';

import type { FC } from 'react';

import { CloudUploadOutlined } from '@ant-design/icons';

interface ContributeDataProps {
  onOk: () => void;
  disabled: boolean;
}

const ContributeData: FC<ContributeDataProps> = ({ onOk, disabled }) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  return (
    <Tooltip
      title={<FormattedMessage id='pages.button.contribute' defaultMessage='Contribute to team' />}
    >
      <Button
        disabled={disabled}
        shape='circle'
        icon={<CloudUploadOutlined />}
        size='small'
        onClick={() => {
          Modal.confirm({
            okButtonProps: {
              type: 'primary',
              style: { backgroundColor: token.colorPrimary },
            },
            cancelButtonProps: {
              style: { borderColor: token.colorPrimary, color: token.colorPrimary },
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
