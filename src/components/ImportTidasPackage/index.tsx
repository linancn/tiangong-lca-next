import HeaderActionIcon from '@/components/HeaderActionIcon';
import { ImportTidasPackageResponse, importTidasPackageApi } from '@/services/general/api';
import { CloudUploadOutlined, InboxOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Modal, Typography, Upload, message, theme } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { FC } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';

type Props = {
  onImported?: () => void;
};

const DOCS_BASE_URL = 'https://docs.tiangong.earth';
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

const buildImportReportHumanSummary = (response: ImportTidasPackageResponse) => ({
  zh_CN: `导入结果：${response.code}。总记录 ${response.summary.total_entries} 条，开放数据跳过 ${response.summary.filtered_open_data_count} 条，用户数据冲突 ${response.summary.user_conflict_count} 条，成功导入 ${response.summary.imported_count ?? response.summary.importable_count} 条，校验问题 ${response.summary.validation_issue_count ?? 0} 条。`,
  en_US: `Import result: ${response.code}. Total records: ${response.summary.total_entries}, skipped open-data records: ${response.summary.filtered_open_data_count}, user conflicts: ${response.summary.user_conflict_count}, imported: ${response.summary.imported_count ?? response.summary.importable_count}, validation issues: ${response.summary.validation_issue_count ?? 0}.`,
});

const buildImportReportReadmeMarkdown = () => ({
  zh_CN: `# 如何查看这个导入报告

这个文件中的 \`report\` 是系统导入接口最终返回的完整结果，里面既可能有“用户数据冲突”，也可能有“数据校验失败”的详细信息。

## 先看什么

1. 先看 \`report.code\`：
   - \`VALIDATION_FAILED\`：数据包内容本身有问题，系统已阻止导入。
   - 其他失败码且 \`user_conflicts\` 不为空：目标环境里已有冲突的用户数据。
2. 再看 \`report.summary\`：
   - \`total_entries\`：数据包里一共有多少条记录。
   - \`filtered_open_data_count\`：被跳过的开放数据数量。
   - \`user_conflict_count\`：与当前用户数据冲突的记录数量。
   - \`validation_issue_count\`：校验问题数量。

## 如果是校验失败，去哪里找问题

看 \`report.validation_issues\` 数组。每一条问题里最重要的是：

- \`file_path\`：问题出在哪个文件。
- \`location\`：问题在文件里的哪个字段路径。
- \`message\`：系统直接告诉你的错误说明。
- \`issue_code\`：问题类型。
- \`severity\`：严重级别，通常 \`error\` 需要先修复，\`warning\` 建议检查。
- \`context\`：补充上下文，给开发或高级用户排查用。

如果你看不懂 \`location\`，最简单的方法是：

1. 先解压原始 ZIP 数据包。
2. 打开 \`file_path\` 对应的文件。
3. 在文件里按 \`location\` 提示逐层查找字段。
4. 对照 \`message\` 修改数据后重新打包导入。

## 如果是用户数据冲突，去哪里找问题

看 \`report.user_conflicts\` 数组。每一条冲突记录里最重要的是：

- \`table\`：冲突的数据表类型。
- \`id\`：冲突记录的主 ID。
- \`version\`：冲突记录的版本。
- \`state_code\`：当前系统里这条记录的状态。
- \`user_id\`：如果有值，表示这条冲突数据关联到哪个用户。

常见处理方法：

1. 先确认目标系统中是否已经有同一条用户数据。
2. 如果已有数据且应该保留，修改导入包中的 \`id\` / \`version\` 或删除重复记录。
3. 如果目标系统中的旧数据不再需要，先在系统中处理旧数据，再重新导入。

## 被跳过的开放数据是什么意思

\`report.filtered_open_data\` 里的记录表示：这些数据属于开放数据，导入时被系统自动跳过，没有写入你的用户数据空间。

这通常不是错误，除非你本来就预期它们应该作为用户数据导入。
`,
  en_US: `# How to read this import report

The \`report\` object in this file is the final result returned by the import API. It may contain detailed validation failures, user-data conflicts, or skipped open-data records.

## What to check first

1. Start with \`report.code\`:
   - \`VALIDATION_FAILED\`: the package content itself is invalid, so the import was blocked.
   - Other failure codes with non-empty \`user_conflicts\`: the target environment already has conflicting user-owned data.
2. Then review \`report.summary\`:
   - \`total_entries\`: total records found in the package.
   - \`filtered_open_data_count\`: open-data records skipped during import.
   - \`user_conflict_count\`: records conflicting with existing user data.
   - \`validation_issue_count\`: total validation issues found.

## If validation failed, where is the problem

Check the \`report.validation_issues\` array. The most important fields are:

- \`file_path\`: which file contains the problem.
- \`location\`: which field path inside that file is problematic.
- \`message\`: the direct explanation from the validator.
- \`issue_code\`: the issue type.
- \`severity\`: the severity level. Usually \`error\` must be fixed first, while \`warning\` should still be reviewed.
- \`context\`: extra debugging context for developers or advanced users.

If \`location\` is hard to read, use this simple workflow:

1. Extract the original ZIP package.
2. Open the file shown in \`file_path\`.
3. Follow the field path from \`location\`.
4. Fix the data according to \`message\`, then rebuild and re-import the package.

## If there are user-data conflicts, where is the problem

Check the \`report.user_conflicts\` array. The most important fields are:

- \`table\`: which table or dataset type conflicts.
- \`id\`: the conflicting record ID.
- \`version\`: the conflicting record version.
- \`state_code\`: the current state of that existing record in the system.
- \`user_id\`: when present, which user owns or is linked to that conflicting record.

Common ways to resolve conflicts:

1. Confirm whether the target system already contains the same user-owned data.
2. If the existing record should stay, update the package \`id\` / \`version\` or remove the duplicate record from the package.
3. If the old record in the target system is no longer needed, handle that old data first and then import again.

## What skipped open-data records mean

Records in \`report.filtered_open_data\` were recognized as open data and skipped automatically. They were not imported into your user data space.

This is usually expected behavior unless you intended those records to be imported as user-owned data.
`,
});

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

const getDocsUrl = (locale: string) =>
  `${DOCS_BASE_URL}${locale.toLowerCase().startsWith('en') ? '/en' : ''}${TIDAS_PACKAGE_IMPORT_DOCS_PATH}`;

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
                    defaultMessage='See the API import documentation for the full request flow and integration details.'
                  />
                </Typography.Text>
                <Typography.Link href={docsUrl} rel='noreferrer' target='_blank'>
                  <FormattedMessage
                    id='component.tidasPackage.import.apiGuide.docs'
                    defaultMessage='Open API import docs'
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
