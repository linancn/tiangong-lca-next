import HeaderActionIcon from '@/components/HeaderActionIcon';
import {
  ImportTidasPackageResponse,
  TidasPackageValidationIssue,
  importTidasPackageApi,
} from '@/services/general/api';
import { CloudUploadOutlined, InboxOutlined } from '@ant-design/icons';
import { Modal, Upload, message } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  onImported?: () => void;
};

const MAX_VALIDATION_ISSUES = 10;
const DOCS_BASE_URL = 'https://docs.tiangong.earth';
const TIDAS_PACKAGE_IMPORT_DOCS_PATH = '/docs/openapi/tidas-package-import';

const VALIDATION_ISSUE_MESSAGE_MAP: Record<string, { id: string; defaultMessage: string }> = {
  schema_error: {
    id: 'component.tidasPackage.import.validation.issue.schemaError',
    defaultMessage: 'Schema mismatch',
  },
  validation_error: {
    id: 'component.tidasPackage.import.validation.issue.validationError',
    defaultMessage: 'Validation runtime error',
  },
  localized_text_language_error: {
    id: 'component.tidasPackage.import.validation.issue.localizedTextLanguageError',
    defaultMessage: 'Localized text language mismatch',
  },
  classification_hierarchy_error: {
    id: 'component.tidasPackage.import.validation.issue.classificationHierarchyError',
    defaultMessage: 'Classification hierarchy is invalid',
  },
  invalid_json: {
    id: 'component.tidasPackage.import.validation.issue.invalidJson',
    defaultMessage: 'Invalid JSON file',
  },
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

const getValidationIssues = (response: ImportTidasPackageResponse) =>
  response.validation_issues ?? [];

const getDocsUrl = (locale: string) =>
  `${DOCS_BASE_URL}${locale.toLowerCase().startsWith('en') ? '/en' : ''}${TIDAS_PACKAGE_IMPORT_DOCS_PATH}`;

const formatValidationIssueMessage = (
  intl: ReturnType<typeof useIntl>,
  issue: TidasPackageValidationIssue,
) => {
  const descriptor = VALIDATION_ISSUE_MESSAGE_MAP[issue.issue_code] ?? {
    id: 'component.tidasPackage.import.validation.issue.unknown',
    defaultMessage: 'Data validation issue',
  };

  return intl.formatMessage({
    id: descriptor.id,
    defaultMessage: descriptor.defaultMessage,
  });
};

const formatValidationIssues = (
  intl: ReturnType<typeof useIntl>,
  response: ImportTidasPackageResponse,
) => {
  const validationIssues = getValidationIssues(response);
  const visibleIssues = validationIssues.slice(0, MAX_VALIDATION_ISSUES);

  return (
    <div>
      <p>
        <FormattedMessage
          id='component.tidasPackage.import.validation.summary'
          defaultMessage='Validation blocked import. Errors: {errors}, warnings: {warnings}, total issues: {issues}.'
          values={{
            errors: response.summary.error_count ?? 0,
            warnings: response.summary.warning_count ?? 0,
            issues: response.summary.validation_issue_count ?? validationIssues.length,
          }}
        />
      </p>
      <ul style={{ paddingLeft: 18, marginBottom: visibleIssues.length ? 12 : 0 }}>
        {visibleIssues.map((issue, index) => (
          <li
            key={`${issue.issue_code}-${issue.file_path}-${issue.location}-${index}`}
            style={{ marginBottom: 12 }}
          >
            <div>
              <strong>{formatValidationIssueMessage(intl, issue)}</strong>
            </div>
            <div>{issue.message}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              <FormattedMessage
                id='component.tidasPackage.import.validation.meta'
                defaultMessage='Severity: {severity} | Category: {category} | File: {filePath} | Location: {location}'
                values={{
                  severity: issue.severity,
                  category: issue.category,
                  filePath: issue.file_path,
                  location: issue.location,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {validationIssues.length > visibleIssues.length ? (
        <p style={{ marginBottom: 0 }}>
          <FormattedMessage
            id='component.tidasPackage.import.validation.more'
            defaultMessage='Showing the first {count} issues. Download or inspect the import report for the full list.'
            values={{ count: visibleIssues.length }}
          />
        </p>
      ) : null}
    </div>
  );
};

const ImportTidasPackage: FC<Props> = ({ onImported = () => {} }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<RcFile[]>([]);
  const intl = useIntl();
  const docsUrl = getDocsUrl(intl.locale || 'zh-CN');

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

      if (payload.code === 'VALIDATION_FAILED') {
        Modal.error({
          title: intl.formatMessage({
            id: 'component.tidasPackage.import.validation.title',
            defaultMessage: 'Import blocked by validation issues',
          }),
          content: formatValidationIssues(intl, payload),
        });
        return;
      }

      Modal.error({
        title: intl.formatMessage({
          id: 'component.tidasPackage.import.conflict.title',
          defaultMessage: 'Import rejected because of conflicts',
        }),
        content: formatConflicts(payload),
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
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: '1px solid rgba(5, 5, 5, 0.1)',
            borderRadius: 8,
            background: 'rgba(0, 0, 0, 0.02)',
          }}
        >
          <p style={{ marginBottom: 8, fontWeight: 600 }}>
            <FormattedMessage
              id='component.tidasPackage.import.apiGuide.title'
              defaultMessage='API import'
            />
          </p>
          <p style={{ marginBottom: 8 }}>
            <FormattedMessage
              id='component.tidasPackage.import.apiGuide.summary'
              defaultMessage='See the API import documentation for the full request flow and integration details.'
            />
          </p>
          <a href={docsUrl} target='_blank' rel='noreferrer'>
            <FormattedMessage
              id='component.tidasPackage.import.apiGuide.docs'
              defaultMessage='Open API import docs'
            />
          </a>
        </div>
      </Modal>
    </>
  );
};

export default ImportTidasPackage;
