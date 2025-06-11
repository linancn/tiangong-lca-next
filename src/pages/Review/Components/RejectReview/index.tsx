import { getReviewsDetail, updateReviewApi } from '@/services/reviews/api';
import { FileExcelOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Form, FormInstance, Input, message, Modal, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface RejectReviewProps {
  reviewId: string;
}

const RejectReview: React.FC<RejectReviewProps> = ({ reviewId }) => {
  const formRef = useRef<FormInstance>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (!open) {
      formRef?.current?.resetFields();
    }
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleOk = async () => {
    try {
      const values = await formRef?.current?.validateFields();
      setLoading(true);
      const oldReviews = await getReviewsDetail(reviewId);
      const { json: oldReviewJson } = oldReviews ?? {};
      const { error } = await updateReviewApi([reviewId], {
        state_code: -1,
        json: {
          ...oldReviewJson,
          comment: {
            message: values.reason,
          },
        },
      });

      if (!error) {
        message.success(
          intl.formatMessage({
            id: 'component.rejectReview.success',
            defaultMessage: 'Rejected successfully!',
          }),
        );

        formRef?.current?.resetFields();
        setOpen(false);
      }
    } catch (error) {
      message.error(
        intl.formatMessage({
          id: 'component.rejectReview.error',
          defaultMessage: 'Failed to reject, please try again!',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip
        title={intl.formatMessage({
          id: 'component.rejectReview.button.tooltip',
          defaultMessage: 'Reject',
        })}
      >
        <Button size='small' shape='circle' icon={<FileExcelOutlined />} onClick={handleOpen} />
      </Tooltip>
      <Modal
        title={
          <FormattedMessage
            id='component.rejectReview.modal.title'
            defaultMessage='Reject Review'
          />
        }
        open={open}
        onCancel={handleCancel}
        onOk={handleOk}
        confirmLoading={loading}
        okText={
          <FormattedMessage
            id='component.rejectReview.modal.confirm'
            defaultMessage='Confirm Reject'
          />
        }
        cancelText={
          <FormattedMessage id='component.rejectReview.modal.cancel' defaultMessage='Cancel' />
        }
        width={600}
      >
        <Form ref={formRef} layout='vertical'>
          <Form.Item
            name='reason'
            label={
              <FormattedMessage
                id='component.rejectReview.reason.label'
                defaultMessage='Reject Reason'
              />
            }
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id='component.rejectReview.reason.required'
                    defaultMessage='Please enter the reject reason!'
                  />
                ),
              },
              {
                max: 500,
                message: (
                  <FormattedMessage
                    id='component.rejectReview.reason.maxLength'
                    defaultMessage='Reject reason cannot exceed 500 characters!'
                  />
                ),
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder={intl.formatMessage({
                id: 'component.rejectReview.reason.placeholder',
                defaultMessage:
                  'Please provide detailed reasons for rejection so that the submitter can understand what needs to be modified...',
              })}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RejectReview;
