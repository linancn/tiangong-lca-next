import { addSystemMemberApi } from '@/services/roles/api';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Form, Input, message, Modal, FormInstance } from 'antd';
import { useEffect, useState, useRef } from 'react';
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
      const result = await addSystemMemberApi(values.email);

      if (!result?.success) {
        if (result?.error === 'notRegistered') {
          message.error(
            intl.formatMessage({
              id: 'teams.members.add.notRegistered',
              defaultMessage: 'User is not registered!',
            }),
          );
        } else {
          message.error(
            intl.formatMessage({
              id: 'teams.members.add.error',
              defaultMessage: 'Failed to add member!',
            }),
          );
        }
      } else {
        message.success(
          intl.formatMessage({
            id: 'teams.members.add.success',
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
      title={<FormattedMessage id="teams.members.add.title" defaultMessage="Add Team Member" />}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
    >
      <Form ref={formRef} layout="vertical">
        <Form.Item
          name="email"
          label={<FormattedMessage id="teams.members.email" defaultMessage="Email" />}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="teams.members.email.required"
                  defaultMessage="Please enter an email address!"
                />
              ),
            },
            {
              type: 'email',
              message: (
                <FormattedMessage
                  id="teams.members.email.invalid"
                  defaultMessage="Please enter a valid email address!"
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
