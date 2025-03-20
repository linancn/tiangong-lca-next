import { deleteContact } from '@/services/contacts/api';
import { DeleteOutlined } from '@ant-design/icons';
import { ActionType } from '@ant-design/pro-components';
import { Button, message, Modal, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  id: string;
  version: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const ContactDelete: FC<Props> = ({ id, version, buttonType, actionRef, setViewDrawerVisible }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const intl = useIntl();

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleOk = useCallback(() => {
    deleteContact(id, version).then(async (result: any) => {
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
          <Tooltip title={<FormattedMessage id='pages.button.delete' defaultMessage='Delete' />}>
            <Button shape='circle' icon={<DeleteOutlined />} size='small' onClick={showModal} />
          </Tooltip>
          <Modal
            title={
              <FormattedMessage
                id='pages.contact.drawer.title.delete'
                defaultMessage='Delete Contact'
              />
            }
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
          >
            <FormattedMessage
              id='pages.button.delete.confirm'
              defaultMessage='Are you sure want to delete this data?'
            />
          </Modal>
        </>
      ) : (
        <>
          <Button size='small' onClick={showModal}>
            <FormattedMessage id='pages.button.delete' defaultMessage='Delete' />
          </Button>
          <Modal
            title={<FormattedMessage id='pages.button.delete' defaultMessage='Delete' />}
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
          >
            <FormattedMessage
              id='pages.button.delete.confirm'
              defaultMessage='Are you sure want to delete this data?'
            />
          </Modal>
        </>
      )}{' '}
    </>
  );
};

export default ContactDelete;
