import { DeleteOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  id: string;
  data: any;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: any) => void;
};

const UnitDelete: FC<Props> = ({
  id,
  data,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  onData,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const intl = useIntl();

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleOk = useCallback(() => {
    const filteredData = data.filter((item: any) => item['@dataSetInternalID'] !== id);
    onData(
      filteredData.map((item: any, index: number) => {
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
    actionRef.current?.reload();
  }, [actionRef, id, setViewDrawerVisible]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return (
    <>
      <Tooltip title={<FormattedMessage id="pages.button.delete" defaultMessage="Delete" />}>
        {buttonType === 'icon' ? (
          <>
            <Button shape="circle" icon={<DeleteOutlined />} size="small" onClick={showModal} />
            <Modal
              title={<FormattedMessage id="pages.button.delete" defaultMessage="Delete" />}
              open={isModalVisible}
              onOk={handleOk}
              onCancel={handleCancel}
            >
              <FormattedMessage
                id="pages.button.deleteMessage"
                defaultMessage="Are you sure you want to delete this data?"
              />
            </Modal>
          </>
        ) : (
          <>
            <Button size="small" onClick={showModal}>
              <FormattedMessage id="pages.button.delete" defaultMessage="Delete" />
            </Button>
            <Modal
              title={<FormattedMessage id="pages.button.delete" defaultMessage="Delete" />}
              open={isModalVisible}
              onOk={handleOk}
              onCancel={handleCancel}
            >
              <FormattedMessage
                id="pages.button.deleteMessage"
                defaultMessage="Are you sure you want to delete this data?"
              />
            </Modal>
          </>
        )}{' '}
      </Tooltip>
    </>
  );
};

export default UnitDelete;
