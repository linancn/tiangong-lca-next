import {
  createReviewReportDownloads,
  triggerReviewReportDownloads,
} from '@/services/reviews/reportDownload';
import { App, Button } from 'antd';
import { useState } from 'react';
import { useIntl } from 'umi';

type Props = {
  processId: string;
  processVersion: string;
  sourceId: string;
  sourceVersion: string;
};

const ReviewReportDownloadButton = ({
  processId,
  processVersion,
  sourceId,
  sourceVersion,
}: Props) => {
  const { message } = App.useApp();
  const intl = useIntl();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const result = await createReviewReportDownloads({
        processId,
        processVersion,
        sourceId,
        sourceVersion,
      });
      if (result.error || !result.data) {
        message.error(
          intl.formatMessage({
            id:
              result.error?.code === 'REVIEW_REPORT_NO_ATTACHMENTS'
                ? 'pages.process.reviewReport.noAttachments'
                : 'pages.process.reviewReport.downloadFailed',
            defaultMessage:
              result.error?.code === 'REVIEW_REPORT_NO_ATTACHMENTS'
                ? 'The review report has no current attachments.'
                : 'Failed to download the review report.',
          }),
        );
        return;
      }
      triggerReviewReportDownloads(result.data);
    } catch {
      message.error(
        intl.formatMessage({
          id: 'pages.process.reviewReport.downloadFailed',
          defaultMessage: 'Failed to download the review report.',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button loading={loading} onClick={handleDownload}>
      {intl.formatMessage({
        id: 'pages.process.reviewReport.download',
        defaultMessage: 'Download report',
      })}
    </Button>
  );
};

export default ReviewReportDownloadButton;
