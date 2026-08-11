import {
  submitAdminReviewBatchDecision,
  submitReviewerBatchDecision,
  type ReviewBatchDecision,
  type ReviewBatchDecisionResult,
} from '@/services/reviews/api';
import { useIntl } from '@umijs/max';
import { Button, Form, Input, message, Modal, Space } from 'antd';
import { useState } from 'react';

type BatchReviewActionsProps = {
  role: 'admin' | 'reviewer';
  reviewIds: React.Key[];
  allowApprove: boolean;
  disabled?: boolean;
  onFinished: () => void;
};

const BatchReviewActions = ({
  role,
  reviewIds,
  allowApprove,
  disabled = false,
  onFinished,
}: BatchReviewActionsProps) => {
  const intl = useIntl();
  const [form] = Form.useForm<{ reason: string }>();
  const [modal, modalContextHolder] = Modal.useModal();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (decision: ReviewBatchDecision, reason?: string) => {
    setLoading(true);
    try {
      const result =
        role === 'admin'
          ? await submitAdminReviewBatchDecision(reviewIds, decision, reason)
          : await submitReviewerBatchDecision(reviewIds, decision, reason);
      if (result.error) throw result.error;

      const payload = result.data?.[0] as ReviewBatchDecisionResult | undefined;
      if (!payload) throw new Error('Missing batch result');

      if (payload.summary.failed > 0) {
        message.warning(
          intl.formatMessage(
            {
              id: 'pages.review.batch.partial',
              defaultMessage: '{succeeded} succeeded and {failed} failed.',
            },
            payload.summary,
          ),
        );
      } else {
        message.success(
          intl.formatMessage(
            {
              id: 'pages.review.batch.success',
              defaultMessage: '{count} reviews processed successfully.',
            },
            { count: payload.summary.succeeded },
          ),
        );
      }

      setRejectOpen(false);
      form.resetFields();
      onFinished();
    } catch {
      message.error(
        intl.formatMessage({
          id: 'pages.review.batch.error',
          defaultMessage: 'Unable to process the selected reviews.',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const submitReject = async () => {
    const { reason } = await form.validateFields();
    await submit('reject', reason);
  };

  const confirmApprove = () => {
    modal.confirm({
      title: intl.formatMessage(
        {
          id: 'pages.review.batch.approve.confirm',
          defaultMessage: 'Approve {count} selected reviews?',
        },
        { count: reviewIds.length },
      ),
      okText: intl.formatMessage({
        id: 'pages.review.batch.approve',
        defaultMessage: 'Batch approve',
      }),
      onOk: () => submit('approve'),
    });
  };

  return (
    <>
      {modalContextHolder}
      <Space>
        {allowApprove && (
          <Button
            type='primary'
            loading={loading}
            disabled={disabled || reviewIds.length === 0}
            onClick={confirmApprove}
          >
            {intl.formatMessage({
              id: 'pages.review.batch.approve',
              defaultMessage: 'Batch approve',
            })}
          </Button>
        )}
        <Button
          danger
          loading={loading}
          disabled={disabled || reviewIds.length === 0}
          onClick={() => setRejectOpen(true)}
        >
          {intl.formatMessage({
            id: 'pages.review.batch.reject',
            defaultMessage: 'Batch reject',
          })}
        </Button>
      </Space>
      <Modal
        open={rejectOpen}
        title={intl.formatMessage(
          {
            id: 'pages.review.batch.reject.confirm',
            defaultMessage: 'Reject {count} selected reviews',
          },
          { count: reviewIds.length },
        )}
        okText={intl.formatMessage({
          id: 'pages.review.batch.reject',
          defaultMessage: 'Batch reject',
        })}
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
        onCancel={() => setRejectOpen(false)}
        onOk={submitReject}
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='reason'
            label={intl.formatMessage({
              id: 'component.rejectReview.reason.label',
              defaultMessage: 'Reject Reason',
            })}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea rows={4} maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BatchReviewActions;
