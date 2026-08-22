import {
  submitAdminReviewBatchDecision,
  submitReviewerBatchDecision,
  type ReviewBatchDecision,
  type ReviewBatchDecisionResult,
} from '@/services/reviews/api';
import { FileExcelOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { App, Button, Form, Input, Modal, Space, theme, Tooltip } from 'antd';
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
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ reason: string }>();
  const { message, modal } = App.useApp();
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
      <Space size={token.marginXS}>
        {allowApprove && (
          <Tooltip
            title={intl.formatMessage({
              id: 'pages.review.batch.approve',
              defaultMessage: 'Batch approve',
            })}
          >
            <Button
              type='text'
              size='large'
              style={{
                width: token.controlHeightSM,
                height: token.controlHeight,
                paddingInline: 0,
              }}
              aria-label={intl.formatMessage({
                id: 'pages.review.batch.approve',
                defaultMessage: 'Batch approve',
              })}
              icon={<SafetyCertificateOutlined />}
              loading={loading}
              disabled={disabled || reviewIds.length === 0}
              onClick={confirmApprove}
            />
          </Tooltip>
        )}
        <Tooltip
          title={intl.formatMessage({
            id: 'pages.review.batch.reject',
            defaultMessage: 'Batch reject',
          })}
        >
          <Button
            type='text'
            size='large'
            style={{
              width: token.controlHeightSM,
              height: token.controlHeight,
              paddingInline: 0,
            }}
            aria-label={intl.formatMessage({
              id: 'pages.review.batch.reject',
              defaultMessage: 'Batch reject',
            })}
            icon={<FileExcelOutlined />}
            loading={loading}
            disabled={disabled || reviewIds.length === 0}
            onClick={() => setRejectOpen(true)}
          />
        </Tooltip>
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
