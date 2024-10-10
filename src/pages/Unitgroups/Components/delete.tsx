import { deleteUnitGroup } from '@/services/unitgroups/api';
import { DeleteOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-table';
import { Button, message, Modal, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const UnitGroupDelete: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const intl = useIntl();

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleOk = useCallback(() => {
    deleteUnitGroup(id).then(async (result: any) => {
      if (result.status === 204) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.delete.success',
            defaultMessage: 'Selected record has been deleted.',
          }),
        );
        setViewDrawerVisible(false);
        setIsModalVisible(false);
        actionRef.current?.reload();
      } else {
        message.error(result.error.message ?? 'Error');
      }
    });
  }, [actionRef, id, setViewDrawerVisible]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return (
    <>
      {buttonType === 'icon' ? (
        <>
          <Tooltip
            title={
              <FormattedMessage id="pages.button.delete" defaultMessage="Delete"></FormattedMessage>
            }
          >
            <Button
              shape="circle"
              icon={<DeleteOutlined />}
              size="small"
              onClick={showModal}
            ></Button>
          </Tooltip>
          <Modal
            title={
              <FormattedMessage id="pages.button.delete" defaultMessage="Delete"></FormattedMessage>
            }
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
          >
            <FormattedMessage
              id="pages.button.delete.confirm"
              defaultMessage="Delete"
            ></FormattedMessage>
          </Modal>
        </>
      ) : (
        <>
          <Button size="small" onClick={showModal}>
            <FormattedMessage id="pages.button.delete" defaultMessage="Delete"></FormattedMessage>
          </Button>
          <Modal
            title={
              <FormattedMessage id="pages.button.delete" defaultMessage="Delete"></FormattedMessage>
            }
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
          >
            <FormattedMessage
              id="pages.button.delete.confirm"
              defaultMessage="Delete"
            ></FormattedMessage>
          </Modal>
        </>
      )}
    </>
  );
};

export default UnitGroupDelete;
