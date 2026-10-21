import {
  getReviewBatchEligibility,
  submitAdminReviewBatchDecision,
  submitReviewerBatchDecision,
  type ReviewBatchEligibility,
  type ReviewBatchDecision,
  type ReviewBatchDecisionResult,
} from '@/services/reviews/api';
import { getCommentApi } from '@/services/comments/api';
import { hasCurrentReviewerApproval } from '@/services/reviews/util';
import { FileExcelOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { App, Button, Form, Input, Modal, Space, theme, Tooltip } from 'antd';
import { useState } from 'react';

type BatchReviewActionsProps = {
  role: 'admin' | 'reviewer';
  reviewIds: React.Key[];
  allowApprove: boolean;
  disabled?: boolean;
  onFinished: (failedReviewIds: string[]) => void;
  getReviewName?: (reviewId: string) => string | undefined;
};

type BatchPreview = {
  items: ReviewBatchEligibility[];
  submittedOpinions: Record<string, number | null>;
};

const BatchReviewActions = ({
  role,
  reviewIds,
  allowApprove,
  disabled = false,
  onFinished,
  getReviewName,
}: BatchReviewActionsProps) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [form] = Form.useForm<{ reason: string }>();
  const { message, modal } = App.useApp();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BatchPreview>({ items: [], submittedOpinions: {} });

  const operationFor = (decision: ReviewBatchDecision) =>
    `${role === 'admin' ? 'admin' : 'reviewer'}-${decision}` as const;

  const prepare = async (decision: ReviewBatchDecision) => {
    setLoading(true);
    try {
      const result = await getReviewBatchEligibility(reviewIds, operationFor(decision));
      if (result.error) throw result.error;
      const items = result.data.map((item) =>
        role === 'admin' &&
        decision === 'approve' &&
        item.eligible &&
        !hasCurrentReviewerApproval(item.reviewer_count, item.approve_opinion_count)
          ? { ...item, eligible: false, reason_code: 'REVIEWER_APPROVAL_REQUIRED' }
          : item,
      );
      const submittedOpinions: Record<string, number | null> = {};
      if (role === 'reviewer') {
        const alreadySubmitted = items.filter(
          (item) => !item.eligible && item.reason_code === 'OPINION_ALREADY_SUBMITTED',
        );
        for (let index = 0; index < alreadySubmitted.length; index += 5) {
          await Promise.all(
            alreadySubmitted.slice(index, index + 5).map(async (item) => {
              try {
                const comment = await getCommentApi(item.review_id, 'review');
                submittedOpinions[item.review_id] = comment.error
                  ? null
                  : (comment.data[0]?.state_code ?? null);
              } catch {
                submittedOpinions[item.review_id] = null;
              }
            }),
          );
        }
      }
      const nextPreview = { items, submittedOpinions };
      setPreview(nextPreview);
      return nextPreview;
    } catch {
      message.error(
        intl.formatMessage({
          id: 'pages.review.batch.previewError',
          defaultMessage: 'Unable to check the selected review scope.',
        }),
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const previewSummary = (
    { items, submittedOpinions }: BatchPreview,
    decision: ReviewBatchDecision,
  ) => {
    const eligibleCount = items.filter((item) => item.eligible).length;
    const skipped = items.filter((item) => !item.eligible);
    const reasonFor = (item: ReviewBatchEligibility) => {
      if (item.reason_code === 'OPINION_ALREADY_SUBMITTED') {
        const state = submittedOpinions[item.review_id];
        if (state === 1) {
          return intl.formatMessage({
            id: 'pages.review.batch.reason.submittedApprove',
            defaultMessage: 'You already submitted an approve opinion.',
          });
        }
        if (state === -3) {
          return intl.formatMessage({
            id: 'pages.review.batch.reason.submittedReject',
            defaultMessage: 'You already submitted a reject opinion.',
          });
        }
        if (state === null) {
          return intl.formatMessage({
            id: 'pages.review.batch.reason.submittedUnknown',
            defaultMessage: 'Opinion submitted; its outcome is temporarily unavailable.',
          });
        }
        return intl.formatMessage({
          id: 'pages.review.batch.reason.opinionChanged',
          defaultMessage: 'Your opinion status has changed; you cannot submit again.',
        });
      }
      switch (item.reason_code) {
        case 'REVIEWER_APPROVAL_REQUIRED':
          return intl.formatMessage({
            id: 'pages.review.approve.disabled.approvalRequired',
            defaultMessage: 'At least one assigned reviewer must approve before final approval.',
          });
        case 'REVIEW_NOT_FOUND':
          return intl.formatMessage({
            id: 'pages.review.batch.reason.REVIEW_NOT_FOUND',
            defaultMessage: 'Review not found or unavailable.',
          });
        case 'REVIEW_ALREADY_COMPLETED':
          return intl.formatMessage({
            id: 'pages.review.batch.reason.REVIEW_ALREADY_COMPLETED',
            defaultMessage: 'This review is already completed.',
          });
        case 'REVIEW_NOT_IN_PROGRESS':
          return intl.formatMessage({
            id: 'pages.review.batch.reason.REVIEW_NOT_IN_PROGRESS',
            defaultMessage: 'This review is not in progress.',
          });
        case 'REVIEWER_REQUIRED':
          return intl.formatMessage({
            id: 'pages.review.batch.reason.REVIEWER_REQUIRED',
            defaultMessage: 'No reviewer is assigned, or you are not assigned to this review.',
          });
        case 'REVIEWER_OPINIONS_PENDING':
          return intl.formatMessage({
            id: 'pages.review.batch.reason.REVIEWER_OPINIONS_PENDING',
            defaultMessage: 'Some reviewers have not submitted their opinions.',
          });
        default:
          return intl.formatMessage({
            id: 'pages.review.batch.reason.NOT_APPLICABLE',
            defaultMessage: 'This review cannot be processed.',
          });
      }
    };
    const counts = [
      intl.formatMessage(
        { id: 'pages.review.batch.count.selected', defaultMessage: 'Selected {count}' },
        { count: items.length },
      ),
      intl.formatMessage(
        { id: 'pages.review.batch.count.eligible', defaultMessage: 'Can process {count}' },
        { count: eligibleCount },
      ),
      intl.formatMessage(
        { id: 'pages.review.batch.count.skipped', defaultMessage: 'Skipped {count}' },
        { count: skipped.length },
      ),
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {counts.map((count, index) => (
            <span
              key={count}
              style={{
                paddingInlineEnd: index < counts.length - 1 ? 16 : 0,
                borderInlineEnd:
                  index < counts.length - 1 ? `1px solid ${token.colorBorderSecondary}` : 'none',
              }}
            >
              {count}
            </span>
          ))}
        </div>
        <span style={{ color: token.colorTextSecondary }}>
          {decision === 'reject'
            ? intl.formatMessage(
                {
                  id: 'pages.review.batch.scopeHint.reject',
                  defaultMessage: 'Only the {count} eligible tasks will receive a reject opinion.',
                },
                { count: eligibleCount },
              )
            : intl.formatMessage(
                {
                  id: 'pages.review.batch.scopeHint.approve',
                  defaultMessage: 'Only the {count} eligible tasks will be approved.',
                },
                { count: eligibleCount },
              )}
        </span>
        {skipped.length > 0 && (
          <section
            aria-label={intl.formatMessage({
              id: 'pages.review.batch.notApplicable',
              defaultMessage: 'Items not processed',
            })}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
              <strong>
                {intl.formatMessage(
                  {
                    id: 'pages.review.batch.notApplicableCount',
                    defaultMessage: 'Items not processed ({count})',
                  },
                  { count: skipped.length },
                )}
              </strong>
              <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                {intl.formatMessage({
                  id: 'pages.review.batch.notApplicableHint',
                  defaultMessage: 'These items will not be included in this batch.',
                })}
              </span>
            </div>
            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                maxHeight: 208,
                overflowY: 'auto',
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillQuaternary,
              }}
            >
              {skipped.map((item, index) => {
                const name =
                  getReviewName?.(item.review_id)?.trim() ||
                  intl.formatMessage({
                    id: 'pages.review.batch.nameUnavailable',
                    defaultMessage: 'Review name unavailable',
                  });
                const reason = reasonFor(item);
                return (
                  <li
                    key={item.review_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      minWidth: 0,
                      padding: '10px 16px',
                      borderBottom:
                        index < skipped.length - 1
                          ? `1px solid ${token.colorBorderSecondary}`
                          : 'none',
                    }}
                  >
                    <span style={{ flex: '0 0 24px', color: token.colorTextSecondary }}>
                      {index + 1}.
                    </span>
                    <span
                      title={name}
                      style={{
                        flex: '1 1 50%',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      {name}
                    </span>
                    <span
                      title={reason}
                      style={{
                        flex: '1 1 50%',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'right',
                        color: token.colorTextSecondary,
                      }}
                    >
                      {reason}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    );
  };

  const submit = async (
    decision: ReviewBatchDecision,
    reason?: string,
    preparedPreview = preview,
  ) => {
    const eligibleReviewIds = preparedPreview.items
      .filter((item) => item.eligible)
      .map((item) => item.review_id);
    if (eligibleReviewIds.length === 0) {
      message.warning(
        intl.formatMessage({
          id: 'pages.review.batch.noneEligible',
          defaultMessage: 'None of the selected reviews can be processed.',
        }),
      );
      return;
    }
    setLoading(true);
    try {
      const result =
        role === 'admin'
          ? await submitAdminReviewBatchDecision(eligibleReviewIds, decision, reason)
          : await submitReviewerBatchDecision(eligibleReviewIds, decision, reason);
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
      const failedReviewIds = [
        ...preparedPreview.items.filter((item) => !item.eligible).map((item) => item.review_id),
        ...payload.results.filter((item) => !item.ok).map((item) => item.reviewId),
      ];
      onFinished(Array.from(new Set(failedReviewIds)));
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
    void prepare('approve').then((items) => {
      if (!items) return;
      modal.confirm({
        title: intl.formatMessage(
          {
            id: 'pages.review.batch.approve.confirm',
            defaultMessage: 'Approve {count} selected reviews?',
          },
          { count: items.items.filter((item) => item.eligible).length },
        ),
        content: previewSummary(items, 'approve'),
        okText: intl.formatMessage({
          id: 'pages.review.batch.approve',
          defaultMessage: 'Batch approve',
        }),
        onOk: () => submit('approve', undefined, items),
      });
    });
  };

  const openReject = () => {
    void prepare('reject').then((items) => {
      if (!items) return;
      setRejectOpen(true);
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
            onClick={openReject}
          />
        </Tooltip>
      </Space>
      <Modal
        open={rejectOpen}
        width={760}
        title={intl.formatMessage(
          {
            id: 'pages.review.batch.reject.confirm',
            defaultMessage: 'Reject {count} selected reviews',
          },
          { count: reviewIds.length },
        )}
        okText={intl.formatMessage(
          {
            id: 'pages.review.batch.rejectCount',
            defaultMessage: 'Batch reject {count} items',
          },
          { count: preview.items.filter((item) => item.eligible).length },
        )}
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
        onCancel={() => setRejectOpen(false)}
        onOk={submitReject}
      >
        {previewSummary(preview, 'reject')}
        <Form form={form} layout='vertical'>
          <Form.Item
            name='reason'
            label={intl.formatMessage({
              id: 'component.rejectReview.reason.label',
              defaultMessage: 'Reject Reason',
            })}
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder={intl.formatMessage(
                {
                  id: 'pages.review.batch.reasonPlaceholder',
                  defaultMessage: 'Enter a reject reason for the {count} eligible tasks',
                },
                { count: preview.items.filter((item) => item.eligible).length },
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BatchReviewActions;
