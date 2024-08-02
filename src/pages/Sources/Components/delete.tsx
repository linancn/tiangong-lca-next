import { getFileUrls, removeFile } from '@/services/general/util';
import { deleteSource, getSourceDetail } from '@/services/sources/api';
import { genSourceFromData } from '@/services/sources/util';
import { supabaseStorageBucket } from '@/services/supabase/key';
import { DeleteOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-table';
import { Button, message, Modal, Tooltip } from 'antd';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { FormattedMessage } from 'umi';

type Props = {
  id: string;
  buttonType: string;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
};
const SourceDelete: FC<Props> = ({ id, buttonType, actionRef, setViewDrawerVisible }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const deleteData = () => {
    deleteSource(id).then(async (result: any) => {
      if (result.status === 204) {
        message.success(
          <FormattedMessage
            id="pages.button.deletesuccess"
            defaultMessage="Selected source has been deleted."
          />,
        );
        setViewDrawerVisible(false);
        setIsModalVisible(false);
        actionRef.current?.reload();
      } else {
        message.error(result.error.message ?? 'Error');
      }
    });
  };

  const handleOk = useCallback(async () => {
    await getSourceDetail(id).then(async (result: any) => {
      const dataSet = genSourceFromData(result.data?.json?.sourceDataSet ?? {});
      const initFile = await getFileUrls(
        dataSet.sourceInformation?.dataSetInformation?.referenceToDigitalFile?.['@uri'],
      );
      if (initFile.length > 0) {
        const { error } = await removeFile(
          initFile.map((file) => file.uid.replace(`../${supabaseStorageBucket}/`, '')),
        );
        if (error) {
          message.error(error.message);
          return;
        }
        deleteData();
      } else {
        deleteData();
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
          <Tooltip title={<FormattedMessage id="pages.button.delete" defaultMessage="Delete" />}>
            <Button shape="circle" icon={<DeleteOutlined />} size="small" onClick={showModal} />
          </Tooltip>
          <Modal
            title={<FormattedMessage id="pages.button.delete" defaultMessage="Delete" />}
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
          >
            <FormattedMessage
              id="pages.button.deleteMessage.Are you sure you want to delete this data"
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
    </>
  );
};

export default SourceDelete;
