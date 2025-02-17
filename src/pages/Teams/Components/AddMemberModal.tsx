import { addTeamMemberApi } from '@/services/teams/api';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Form, Input, message, Modal } from 'antd';
import { useEffect, useState } from 'react';

interface AddMemberModalProps {
  open: boolean;
  onCancel: () => void;
  teamId: string | null;
  onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onCancel, teamId, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (!teamId) return;

      setLoading(true);
      const result = await addTeamMemberApi(teamId, values.email);

      if (result && result.error) {
        if (result.error.message === 'exists') {
          message.error(
            intl.formatMessage({
              id: 'teams.members.add.exists',
              defaultMessage: 'User already exists in the team!',
            }),
          );
        }else if(result.error.message === 'notRegistered'){
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
        form.resetFields();
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
      <Form form={form} layout="vertical">
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
