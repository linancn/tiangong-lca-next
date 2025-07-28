import ToolBarButton from '@/components/ToolBarButton';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { Modal, Upload, message } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
interface ImportDataProps {
  onJsonData: (data: any) => void;
}

const ImportData: FC<ImportDataProps> = ({ onJsonData }) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [fileList, setFileList] = useState<RcFile[]>([]);
  const intl = useIntl();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setFileList([]);
  };

  const handleOk = async () => {
    if (fileList.length === 0) {
      message.warning(
        intl.formatMessage({
          id: 'component.importData.noFile',
          defaultMessage: 'Please select a file to import',
        }),
      );
      return;
    }

    try {
      const file = fileList[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const jsonData = JSON.parse(content);

          onJsonData(jsonData);

          handleCancel();
        } catch (error) {
          message.error(
            intl.formatMessage({
              id: 'component.importData.parseError',
              defaultMessage: 'Failed to parse JSON file, please ensure the file format is correct',
            }),
          );
        }
      };

      reader.onerror = () => {
        message.error(
          intl.formatMessage({
            id: 'component.importData.readError',
            defaultMessage: 'Failed to read file',
          }),
        );
      };

      reader.readAsText(file);
    } catch (error) {
      message.error(
        intl.formatMessage({
          id: 'component.importData.error',
          defaultMessage: 'Import failed',
        }),
      );
    }
  };

  const uploadProps: UploadProps = {
    accept: '.json',
    multiple: false,
    maxCount: 1,
    fileList: fileList as any,
    beforeUpload: (file) => {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        message.error(
          intl.formatMessage({
            id: 'component.importData.fileTypeError',
            defaultMessage: 'Only JSON files are supported',
          }),
        );
        return false;
      }

      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  return (
    <>
      {/* <Button
        style={{ width: 'inherit', paddingInline: '4px' }}
        onClick={showModal}
        size='large'
        icon={<UploadOutlined />}
        type='text'
      ></Button> */}
      <ToolBarButton
        icon={<UploadOutlined />}
        tooltip={<FormattedMessage id='component.importData.import' defaultMessage='Import' />}
        onClick={showModal}
      />
      <Modal
        title={intl.formatMessage({
          id: 'component.importData.title',
          defaultMessage: 'Import JSON Data',
        })}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={intl.formatMessage({ id: 'component.importData.import', defaultMessage: 'Import' })}
        cancelText={intl.formatMessage({
          id: 'component.importData.cancel',
          defaultMessage: 'Cancel',
        })}
      >
        <Upload.Dragger {...uploadProps}>
          <p className='ant-upload-drag-icon'>
            <InboxOutlined />
          </p>
          <p className='ant-upload-text'>
            <FormattedMessage
              id='component.importData.uploadText'
              defaultMessage='Click or drag file to this area to upload'
            />
          </p>
          <p className='ant-upload-hint'>
            <FormattedMessage
              id='component.importData.uploadHint'
              defaultMessage='Only supports uploading a single JSON file'
            />
          </p>
        </Upload.Dragger>
      </Modal>
    </>
  );
};

export default ImportData;
