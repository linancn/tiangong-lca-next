import HeaderActionIcon from '@/components/HeaderActionIcon';
import { ImportTidasPackageResponse, importTidasPackageApi } from '@/services/general/api';
import { getDocumentationUrl } from '@/services/general/runtimeLocale';
import { CloudUploadOutlined, InboxOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Modal, Typography, Upload, message, theme } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { buildImportReportHumanSummary, buildImportReportReadmeMarkdown } from './reportContent';

type Props = {
  onImported?: () => void;
};

const TIDAS_PACKAGE_IMPORT_DOCS_PATH = '/docs/openapi/tidas-package-import';

const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const buildReportFilename = (suffix: string, extension: string) => {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  return `tidas-import-${suffix}-${timestamp}.${extension}`;
};

const downloadImportReportJson = (response: ImportTidasPackageResponse) => {
  const exportPayload = {
    report_format: 'tidas-import-report-with-guide',
    report_format_version: 1,
    generated_at: new Date().toISOString(),
    human_summary: buildImportReportHumanSummary(response),
    readme_markdown: buildImportReportReadmeMarkdown(),
    report: response,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  downloadBlob(blob, buildReportFilename('report', 'json'));
};

const formatConflicts = (
  intl: ReturnType<typeof useIntl>,
  response: ImportTidasPackageResponse,
  contentGap: number,
) => {
  return (
    <Flex vertical gap={contentGap}>
      <Typography.Paragraph strong style={{ marginBottom: 0 }}>
        {intl.formatMessage(
          {
            id: 'component.tidasPackage.import.summary',
            defaultMessage:
              'Total: {total}, filtered open data: {filtered}, user conflicts: {conflicts}, imported: {imported}',
          },
          {
            total: response.summary.total_entries,
            filtered: response.summary.filtered_open_data_count,
            conflicts: response.summary.user_conflict_count,
            imported: response.summary.imported_count ?? response.summary.importable_count,
          },
        )}
      </Typography.Paragraph>
      <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
        {intl.formatMessage({
          id: 'component.tidasPackage.import.report.hint.conflict',
          defaultMessage:
            'Download the full details to review skipped open-data records and conflicting user records.',
        })}
      </Typography.Paragraph>
      <Flex justify='flex-end'>
        <Button size='small' type='link' onClick={() => downloadImportReportJson(response)}>
          {intl.formatMessage({
            id: 'component.tidasPackage.import.report.download',
            defaultMessage: 'Download full details',
          })}
        </Button>
      </Flex>
    </Flex>
  );
};

const getValidationIssues = (response: ImportTidasPackageResponse) =>
  response.validation_issues ?? [];

const getDocsUrl = (locale?: string | null) =>
  `${getDocumentationUrl(locale)}${TIDAS_PACKAGE_IMPORT_DOCS_PATH}`;

const formatValidationIssues = (
  intl: ReturnType<typeof useIntl>,
  response: ImportTidasPackageResponse,
  contentGap: number,
) => {
  const validationIssues = getValidationIssues(response);

  return (
    <Flex vertical gap={contentGap}>
      <Typography.Paragraph strong style={{ marginBottom: 0 }}>
        {intl.formatMessage(
          {
            id: 'component.tidasPackage.import.validation.summary',
            defaultMessage:
              'Validation blocked import. Errors: {errors}, warnings: {warnings}, total issues: {issues}.',
          },
          {
            errors: response.summary.error_count ?? 0,
            warnings: response.summary.warning_count ?? 0,
            issues: response.summary.validation_issue_count ?? validationIssues.length,
          },
        )}
      </Typography.Paragraph>
      <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
        {intl.formatMessage({
          id: 'component.tidasPackage.import.report.hint.validation',
          defaultMessage:
            'Download the full details to inspect file paths, issue locations, and validation context.',
        })}
      </Typography.Paragraph>
      <Flex justify='flex-end'>
        <Button size='small' type='link' onClick={() => downloadImportReportJson(response)}>
          {intl.formatMessage({
            id: 'component.tidasPackage.import.report.download',
            defaultMessage: 'Download full details',
          })}
        </Button>
      </Flex>
    </Flex>
  );
};

const ImportTidasPackage: FC<Props> = ({ onImported = () => {} }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<RcFile[]>([]);
  const intl = useIntl();
  const { token } = theme.useToken();
  const docsUrl = getDocsUrl(intl.locale);

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
            content: formatConflicts(intl, payload, token.marginSM),
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

      if (payload.code === 'VALIDATION_FAILED') {
        Modal.error({
          title: intl.formatMessage({
            id: 'component.tidasPackage.import.validation.title',
            defaultMessage: 'Import blocked by validation issues',
          }),
          content: formatValidationIssues(intl, payload, token.marginSM),
        });
        return;
      }

      Modal.error({
        title: intl.formatMessage({
          id: 'component.tidasPackage.import.conflict.title',
          defaultMessage: 'Import rejected because of conflicts',
        }),
        content: formatConflicts(intl, payload, token.marginSM),
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
      <HeaderActionIcon
        title={
          <FormattedMessage
            id='component.tidasPackage.import.tooltip'
            defaultMessage='Import TIDAS ZIP Package'
          />
        }
        icon={<CloudUploadOutlined />}
        onClick={() => setOpen(true)}
      />
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
        <Flex vertical gap={token.marginMD}>
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
          <Alert
            description={
              <Flex vertical gap={token.marginXXS}>
                <Typography.Text>
                  <FormattedMessage
                    id='component.tidasPackage.import.apiGuide.summary'
                    defaultMessage='See the English API import documentation for the full request flow and integration details.'
                  />
                </Typography.Text>
                <Typography.Link href={docsUrl} rel='noreferrer' target='_blank'>
                  <FormattedMessage
                    id='component.tidasPackage.import.apiGuide.docs'
                    defaultMessage='Open English API import docs'
                  />
                </Typography.Link>
              </Flex>
            }
            message={
              <FormattedMessage
                id='component.tidasPackage.import.apiGuide.title'
                defaultMessage='API import'
              />
            }
            showIcon
            type='info'
          />
        </Flex>
      </Modal>
    </>
  );
};

export default ImportTidasPackage;
