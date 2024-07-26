import { DeleteOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-table';
import { Button, message, Modal, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  data: any;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onData: (data: any) => void;
};

const ProcessExchangeDelete: FC<Props> = ({
  id,
  data,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  onData,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

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
      <FormattedMessage
        id="pages.button.deletesuccess"
        defaultMessage="Selected data has been deleted."
      />,
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
                id="pages.button.deleteMessage.areyousureyouwanttodeletethisdata"
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
                id="pages.button.deleteMessage.areyousureyouwanttodeletethisdata"
                defaultMessage="Are you sure you want to delete this data?"
              />
            </Modal>
          </>
        )}{' '}
      </Tooltip>
    </>
  );
};

export default ProcessExchangeDelete;
