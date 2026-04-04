import { rejectReviewApi } from '@/services/reviews/api';
import { FileExcelOutlined } from '@ant-design/icons';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Button, Form, FormInstance, Input, message, Modal, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface RejectReviewProps {
  reviewId: string;
  dataId: string;
  dataVersion: string;
  isModel: boolean;
  actionRef: any;
  buttonType?: 'icon' | 'text';
  onOk?: (reason: string) => void | Promise<void>;
}

const RejectReview: React.FC<RejectReviewProps> = ({
  reviewId,
  isModel,
  actionRef,
  buttonType = 'icon',
  onOk,
}) => {
  const formRef = useRef<FormInstance>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (!open) {
      formRef?.current?.resetFields();
      actionRef?.current?.reload();
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
      setLoading(true);
      const values = await formRef?.current?.validateFields();
      if (onOk) {
        await onOk(values.reason);
        setOpen(false);
        return;
      }
      const result = await rejectReviewApi(
        reviewId,
        isModel ? 'lifecyclemodels' : 'processes',
        values.reason,
      );

      if (result.error) {
        throw result.error;
      }
      message.success(
        intl.formatMessage({
          id: 'component.rejectReview.success',
          defaultMessage: 'Rejected successfully!',
        }),
      );
      formRef?.current?.resetFields();
      setOpen(false);
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
      {buttonType === 'icon' ? (
        <Tooltip
          title={intl.formatMessage({
            id: 'component.rejectReview.button.tooltip',
            defaultMessage: 'Reject',
          })}
        >
          <Button size='small' shape='circle' icon={<FileExcelOutlined />} onClick={handleOpen} />
        </Tooltip>
      ) : (
        <Button onClick={handleOpen}>
          <FormattedMessage
            id='pages.review.ReviewProcessDetail.assigned.reject'
            defaultMessage='Reject Review'
          />
        </Button>
      )}
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
                max: 1000,
                message: (
                  <FormattedMessage
                    id='component.rejectReview.reason.maxLength'
                    defaultMessage='Reject reason cannot exceed 1000 characters!'
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
              maxLength={1000}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default RejectReview;
