import { getReviewRejectionDetails, type ReviewRejectionDetail } from '@/services/reviews/api';
import { getUsersByIds } from '@/services/users/api';
import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Descriptions, Drawer, Empty, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';

type RejectionDetailsButtonProps = {
  reviewId: string;
};

type DisplayRejectionDetail = ReviewRejectionDetail & {
  actorName: string;
};

const REJECTION_REASON_MAX_LINES = 10;
const REJECTION_REASON_LINE_HEIGHT = 1.5715;
const REJECTION_DETAIL_LABEL_WIDTH = 96;

export default function RejectionDetailsButton({ reviewId }: RejectionDetailsButtonProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<DisplayRejectionDetail[]>([]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const result = await getReviewRejectionDetails(reviewId);
      if (result.error) throw result.error;
      const actorIds = Array.from(
        new Set(result.data.map((item) => item.actor_id).filter((id): id is string => Boolean(id))),
      );
      const users = actorIds.length > 0 ? await getUsersByIds(actorIds) : [];
      setDetails(
        result.data.map((item) => ({
          ...item,
          actorName:
            users?.find((user: any) => user.id === item.actor_id)?.display_name ??
            intl.formatMessage({
              id:
                item.source === 'review-admin'
                  ? 'pages.review.rejection.admin'
                  : 'pages.review.rejection.reviewer',
              defaultMessage: item.source === 'review-admin' ? 'Review admin' : 'Reviewer',
            }),
        })),
      );
    } catch (error) {
      console.error(error);
      setDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const showDrawer = () => {
    setOpen(true);
    void loadDetails();
  };

  return (
    <>
      <Tooltip
        title={intl.formatMessage({
          id: 'pages.review.rejection.viewDetails',
          defaultMessage: 'View rejection reasons',
        })}
      >
        <Button
          type='text'
          size='small'
          shape='circle'
          danger
          icon={<MessageOutlined />}
          aria-label={intl.formatMessage({
            id: 'pages.review.rejection.viewDetails',
            defaultMessage: 'View rejection reasons',
          })}
          onClick={showDrawer}
        />
      </Tooltip>
      <Drawer
        destroyOnHidden
        title={
          <FormattedMessage
            id='pages.review.rejection.drawer.title'
            defaultMessage='Rejection reasons'
          />
        }
        size={560}
        open={open}
        onClose={() => setOpen(false)}
        closable={false}
        extra={
          <Button
            type='text'
            icon={<CloseOutlined />}
            aria-label={intl.formatMessage({
              id: 'pages.review.rejection.close',
              defaultMessage: 'Close rejection reasons',
            })}
            onClick={() => setOpen(false)}
          />
        }
      >
        <Spin spinning={loading}>
          {details.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <FormattedMessage
                  id='pages.review.rejection.empty'
                  defaultMessage='No visible rejection reason'
                />
              }
            />
          ) : (
            <Space orientation='vertical' size='middle' style={{ width: '100%' }}>
              {details.map((item, index) => (
                <Descriptions
                  key={`${item.source}-${item.actor_id ?? 'unknown'}-${item.submitted_at ?? index}`}
                  bordered
                  size='small'
                  column={1}
                  styles={{
                    label: {
                      width: REJECTION_DETAIL_LABEL_WIDTH,
                      whiteSpace: 'nowrap',
                    },
                  }}
                  items={[
                    {
                      key: 'source',
                      label: intl.formatMessage({
                        id: 'pages.review.rejection.source',
                        defaultMessage: 'Source',
                      }),
                      children: (
                        <Space size='small'>
                          <Tag color={item.source === 'review-admin' ? 'volcano' : 'red'}>
                            {intl.formatMessage({
                              id:
                                item.source === 'review-admin'
                                  ? 'pages.review.rejection.admin'
                                  : 'pages.review.rejection.reviewer',
                              defaultMessage:
                                item.source === 'review-admin' ? 'Review admin' : 'Reviewer',
                            })}
                          </Tag>
                          <span>{item.actorName}</span>
                          {item.reviewer_status === 'revoked' && (
                            <Tag>
                              <FormattedMessage
                                id='pages.review.rejection.revoked'
                                defaultMessage='Assignment revoked'
                              />
                            </Tag>
                          )}
                        </Space>
                      ),
                    },
                    {
                      key: 'reason',
                      label: intl.formatMessage({
                        id: 'pages.review.rejection.reason',
                        defaultMessage: 'Reason',
                      }),
                      children: (
                        <Typography.Paragraph
                          style={{
                            marginBottom: 0,
                            lineHeight: REJECTION_REASON_LINE_HEIGHT,
                            maxHeight: `${REJECTION_REASON_MAX_LINES * REJECTION_REASON_LINE_HEIGHT}em`,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.reason}
                        </Typography.Paragraph>
                      ),
                    },
                    ...(item.submitted_at
                      ? [
                          {
                            key: 'submitted-at',
                            label: intl.formatMessage({
                              id: 'pages.review.rejection.submittedAt',
                              defaultMessage: 'Submitted at',
                            }),
                            children: new Date(item.submitted_at).toLocaleString(),
                          },
                        ]
                      : []),
                  ]}
                />
              ))}
            </Space>
          )}
        </Spin>
      </Drawer>
    </>
  );
}
