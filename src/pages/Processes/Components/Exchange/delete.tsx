import { ProcessExchangeData } from '@/services/processes/data';
import { DeleteOutlined } from '@ant-design/icons';
import { Button, message, Modal, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  id: string;
  data: ProcessExchangeData[];
  buttonType: string;
  // actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: ProcessExchangeData[]) => void;
  disabled?: boolean;
};

const ProcessExchangeDelete: FC<Props> = ({
  id,
  data,
  buttonType,
  // actionRef,
  setViewDrawerVisible,
  onData,
  disabled = false,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const intl = useIntl();

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleOk = useCallback(() => {
    const filteredData = data.filter((item) => item['@dataSetInternalID'] !== id);
    onData(
      filteredData.map((item, index: number) => {
        return {
          ...item,
          '@dataSetInternalID': index.toString(),
        };
      }),
    );
    message.success(
      intl.formatMessage({
        id: 'pages.button.delete.success',
        defaultMessage: 'Selected record has been deleted.',
      }),
    );
    setViewDrawerVisible(false);
    setIsModalVisible(false);
    // actionRef.current?.reload();
  }, [id, setViewDrawerVisible]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return (
    <>
      <Tooltip title={<FormattedMessage id='pages.button.delete' defaultMessage='Delete' />}>
        {buttonType === 'icon' ? (
          <>
            <Button
              disabled={disabled}
              shape='circle'
              icon={<DeleteOutlined />}
              size='small'
              onClick={showModal}
            />
            <Modal
              title={<FormattedMessage id='pages.button.delete' defaultMessage='Delete' />}
              open={isModalVisible}
              onOk={handleOk}
              onCancel={handleCancel}
            >
              <FormattedMessage
                id='pages.button.deleteMessage.areyousureyouwanttodeletethisdata'
                defaultMessage='Are you sure you want to delete this data?'
              />
            </Modal>
          </>
        ) : (
          <>
            <Button disabled={disabled} size='small' onClick={showModal}>
              <FormattedMessage id='pages.button.delete' defaultMessage='Delete' />
            </Button>
            <Modal
              title={<FormattedMessage id='pages.button.delete' defaultMessage='Delete' />}
              open={isModalVisible}
              onOk={handleOk}
              onCancel={handleCancel}
            >
              <FormattedMessage
                id='pages.button.deleteMessage.areyousureyouwanttodeletethisdata'
                defaultMessage='Are you sure you want to delete this data?'
              />
            </Modal>
          </>
        )}{' '}
      </Tooltip>
    </>
  );
};

export default ProcessExchangeDelete;
