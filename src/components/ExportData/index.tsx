import { TidasPackageRootTable } from '@/services/general/api';
import { submitTidasPackageExportTask } from '@/services/tidasPackage/taskCenter';
import { DownloadOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, message, Spin, Tooltip } from 'antd';
import { FC, useState } from 'react';

interface ExportDataProps {
  tableName: TidasPackageRootTable;
  id: string;
  version: string;
}

const ExportData: FC<ExportDataProps> = ({ tableName, id, version }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const intl = useIntl();

  const handleExport = async () => {
    try {
      setLoading(true);
      submitTidasPackageExportTask({
        roots: [{ table: tableName, id, version }],
      });

      message.success(
        intl.formatMessage({
          id: 'component.tidasPackage.export.submitted',
          defaultMessage: 'Export task submitted. Check the task center for progress and download.',
        }),
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : intl.formatMessage({
              id: 'page.exportData.error',
              defaultMessage: 'Export data failed',
            }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Tooltip title={<FormattedMessage id={'pages.button.export'} defaultMessage='Export Data' />}>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExport}
          shape='circle'
          size='small'
        ></Button>
      </Tooltip>
    </Spin>
  );
};

export default ExportData;
