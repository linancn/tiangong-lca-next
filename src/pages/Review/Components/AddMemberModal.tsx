import { addReviewMemberApi } from '@/services/roles/api';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Form, FormInstance, Input, message, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';
interface AddMemberModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onCancel, onSuccess }) => {
  const formRef = useRef<FormInstance>(null);
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (!open) {
      formRef?.current?.resetFields();
    }
  }, [open]);

  const handleOk = async () => {
    try {
      const values = await formRef?.current?.validateFields();

      setLoading(true);
      const result = await addReviewMemberApi(values.email);

      if (!result?.success) {
        if (result?.error === 'notRegistered') {
          message.error(
            intl.formatMessage({
              id: 'pages.review.members.addError',
              defaultMessage: 'User is not registered!',
            }),
          );
        } else {
          message.error(
            intl.formatMessage({
              id: 'pages.review.members.addError',
              defaultMessage: 'Failed to add member!',
            }),
          );
        }
      } else {
        message.success(
          intl.formatMessage({
            id: 'pages.review.members.addSuccess',
            defaultMessage: 'Member added successfully!',
          }),
        );
        formRef?.current?.resetFields();
        onSuccess();
        onCancel();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<FormattedMessage id='pages.review.members.add' defaultMessage='添加成员' />}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
    >
      <Form ref={formRef} layout='vertical'>
        <Form.Item
          name='email'
          label={<FormattedMessage id='pages.review.members.email' defaultMessage='Email' />}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='pages.review.members.email.required'
                  defaultMessage='Please enter an email address!'
                />
              ),
            },
            {
              type: 'email',
              message: (
                <FormattedMessage
                  id='pages.review.members.email.invalid'
                  defaultMessage='Please enter a valid email address!'
                />
              ),
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddMemberModal;
