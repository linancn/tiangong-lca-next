import { exportDataApi } from '@/services/general/api';
import { DownloadOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, message, Spin, Tooltip } from 'antd';
import { FC, useState } from 'react';

interface ExportDataProps {
  tableName: string;
  id: string;
  version: string;
}

const ExportData: FC<ExportDataProps> = ({ tableName, id, version }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const intl = useIntl();

  const handleExport = async () => {
    try {
      setLoading(true);
      const { data, error } = await exportDataApi(tableName, id, version);
      if (error) {
        throw error;
      }
      if (!data || data.length === 0) {
        return;
      }
      const jsonData =
        tableName === 'lifecyclemodels'
          ? data.map((item: any) => ({ ...item?.json_ordered, json_tg: item?.json_tg }))
          : data.map((item) => item?.json_ordered);
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${tableName}_${id}_${version}.json`;
      document.body.appendChild(link);
      link.click();

      URL.revokeObjectURL(url);
      document.body.removeChild(link);

      message.success(
        intl.formatMessage({
          id: 'page.exportData.success',
          defaultMessage: 'Export data successfully',
        }),
      );
    } catch (error) {
      message.error(
        intl.formatMessage({
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
