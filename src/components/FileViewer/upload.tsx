import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { FC } from 'react';
import { FormattedMessage } from 'umi';

export const UploadButton: FC = () => {
  return (
    <button style={{ border: 0, background: 'none' }} type='button'>
      {false ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>
        <FormattedMessage id='pages.button.upload' defaultMessage='Upload' />
      </div>
    </button>
  );
};
