import { submitDatasetReviewApi, type ReviewSubmitDatasetTable } from '@/services/reviews/api';
import { useAntdAppApi } from '@/contexts/AntdAppContext';
import { Button } from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import { useIntl } from 'umi';

type Props = {
  table: Exclude<ReviewSubmitDatasetTable, 'processes'>;
  id: string;
  version: string;
  disabled?: boolean;
  beforeSubmit: () => Promise<boolean>;
  onSuccess?: (result: unknown) => void | Promise<void>;
};

const DatasetSubmitReviewButton: FC<Props> = ({
  table,
  id,
  version,
  disabled = false,
  beforeSubmit,
  onSuccess,
}) => {
  const { message } = useAntdAppApi();
  const [submitting, setSubmitting] = useState(false);
  const intl = useIntl();

  const submit = async () => {
    setSubmitting(true);
    try {
      const validationPassed = await beforeSubmit();
      if (!validationPassed) {
        return;
      }

      const result = await submitDatasetReviewApi(table, id, version);
      if (result.error) {
        message.error(
          result.error.message ||
            intl.formatMessage({
              id: 'pages.review.submit.error',
              defaultMessage: 'Submit review failed.',
            }),
        );
        return;
      }

      message.success(
        intl.formatMessage({
          id: 'pages.process.review.submitSuccess',
          defaultMessage: 'Review submitted successfully',
        }),
      );
      await onSuccess?.(result.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button disabled={disabled} loading={submitting} onClick={submit}>
      {intl.formatMessage({
        id: 'pages.review.submit.button',
        defaultMessage: 'Submit Review',
      })}
    </Button>
  );
};

export default DatasetSubmitReviewButton;
