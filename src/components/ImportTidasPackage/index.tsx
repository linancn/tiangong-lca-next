import { ImportTidasPackageResponse, importTidasPackageApi } from '@/services/general/api';
import { CloudUploadOutlined, InboxOutlined } from '@ant-design/icons';
import { Modal, Tooltip, Upload, message } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { CSSProperties, FC } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  onImported?: () => void;
};

const headerActionStyle: CSSProperties = {
  fontSize: 16,
  opacity: 0.5,
  cursor: 'pointer',
};

const formatConflicts = (response: ImportTidasPackageResponse) => {
  const openDataLines = response.filtered_open_data
    .map((item) => `${item.table}: ${item.id}@${item.version}`)
    .slice(0, 10);
  const userConflictLines = response.user_conflicts
    .map((item) => `${item.table}: ${item.id}@${item.version}`)
    .slice(0, 10);

  return (
    <div>
      <p>
        <FormattedMessage
          id='component.tidasPackage.import.summary'
          defaultMessage='Total: {total}, filtered open data: {filtered}, user conflicts: {conflicts}, imported: {imported}'
          values={{
            total: response.summary.total_entries,
            filtered: response.summary.filtered_open_data_count,
            conflicts: response.summary.user_conflict_count,
            imported: response.summary.imported_count ?? response.summary.importable_count,
          }}
        />
      </p>
      {openDataLines.length > 0 ? (
        <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{openDataLines.join('\n')}</pre>
      ) : null}
      {userConflictLines.length > 0 ? (
        <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
          {userConflictLines.join('\n')}
        </pre>
      ) : null}
    </div>
  );
};

const ImportTidasPackage: FC<Props> = ({ onImported = () => {} }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<RcFile[]>([]);
  const intl = useIntl();

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning(
        intl.formatMessage({
          id: 'component.tidasPackage.import.noFile',
          defaultMessage: 'Please select a ZIP package to import',
        }),
      );
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await importTidasPackageApi(fileList[0]);
      const payload = data as ImportTidasPackageResponse | null;
      const hasSummary = payload && payload.summary;

      if (error && !payload) {
        throw error;
      }

      if (payload?.ok) {
        message.success(
          intl.formatMessage({
            id: 'component.tidasPackage.import.success',
            defaultMessage: 'TIDAS package imported successfully',
          }),
        );

        if (payload.summary.filtered_open_data_count > 0) {
          Modal.info({
            title: intl.formatMessage({
              id: 'component.tidasPackage.import.filtered.title',
              defaultMessage: 'Some open datasets were skipped',
            }),
            content: formatConflicts(payload),
          });
        }

        setOpen(false);
        setFileList([]);
        window.dispatchEvent(new Event('tidas-package-imported'));
        onImported();
        return;
      }

      if (!hasSummary) {
        throw error ?? new Error(payload?.message ?? 'Import failed');
      }

      Modal.error({
        title: intl.formatMessage({
          id: 'component.tidasPackage.import.conflict.title',
          defaultMessage: 'Import rejected because of conflicts',
        }),
        content: payload ? formatConflicts(payload) : null,
      });
    } catch (_error) {
      message.error(
        intl.formatMessage({
          id: 'component.tidasPackage.import.error',
          defaultMessage: 'Failed to import TIDAS package',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.zip',
    multiple: false,
    maxCount: 1,
    fileList: fileList as any,
    beforeUpload: (file) => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        message.error(
          intl.formatMessage({
            id: 'component.tidasPackage.import.fileTypeError',
            defaultMessage: 'Only ZIP packages are supported',
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
      <Tooltip
        title={
          <FormattedMessage
            id='component.tidasPackage.import.tooltip'
            defaultMessage='Import TIDAS ZIP Package'
          />
        }
      >
        <CloudUploadOutlined style={headerActionStyle} onClick={() => setOpen(true)} />
      </Tooltip>
      <Modal
        title={intl.formatMessage({
          id: 'component.tidasPackage.import.title',
          defaultMessage: 'Import TIDAS ZIP Package',
        })}
        open={open}
        confirmLoading={loading}
        onOk={handleImport}
        onCancel={() => {
          if (!loading) {
            setOpen(false);
            setFileList([]);
          }
        }}
        okText={intl.formatMessage({
          id: 'component.tidasPackage.import.confirm',
          defaultMessage: 'Import',
        })}
        cancelText={intl.formatMessage({
          id: 'component.tidasPackage.cancel',
          defaultMessage: 'Cancel',
        })}
      >
        <Upload.Dragger {...uploadProps}>
          <p className='ant-upload-drag-icon'>
            <InboxOutlined />
          </p>
          <p className='ant-upload-text'>
            <FormattedMessage
              id='component.tidasPackage.import.uploadText'
              defaultMessage='Click or drag a ZIP package to this area to upload'
            />
          </p>
          <p className='ant-upload-hint'>
            <FormattedMessage
              id='component.tidasPackage.import.uploadHint'
              defaultMessage='The package will be validated before any data is imported'
            />
          </p>
        </Upload.Dragger>
      </Modal>
    </>
  );
};

export default ImportTidasPackage;
