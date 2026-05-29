import { addTeamMemberApi } from '@/services/teams/api';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Form, FormInstance, Input, message, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface AddMemberModalProps {
  open: boolean;
  onCancel: () => void;
  teamId: string | null;
  onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onCancel, teamId, onSuccess }) => {
  const formRef = useRef<FormInstance>(null);
  const [loading, setLoading] = useState(false);
  const intl = useIntl();

  const errorMessages: Record<string, { id: string; defaultMessage: string }> = {
    exists: {
      id: 'teams.members.add.exists',
      defaultMessage: 'User already exists in the team!',
    },
    notRegistered: {
      id: 'teams.members.add.notRegistered',
      defaultMessage: 'User is not registered!',
    },
    alreadyInTeam: {
      id: 'teams.members.add.alreadyInTeam',
      defaultMessage: 'This user already belongs to another team and cannot be invited.',
    },
    alreadyInvitedToTeam: {
      id: 'teams.members.add.alreadyInvitedToTeam',
      defaultMessage:
        'This user already has a pending invitation to another team and cannot be invited.',
    },
    forbidden: {
      id: 'teams.members.add.forbidden',
      defaultMessage: 'You do not have permission to invite members to this team.',
    },
    reinviteRequired: {
      id: 'teams.members.add.reinviteRequired',
      defaultMessage: 'This user rejected a previous invitation. Use re-invite instead.',
    },
  };

  useEffect(() => {
    if (!open) {
      formRef?.current?.resetFields();
    }
  }, [open]);

  const handleOk = async () => {
    try {
      const values = await formRef?.current?.validateFields();
      if (!teamId) return;

      setLoading(true);
      const result = await addTeamMemberApi(teamId, values.email);

      if (result && result.error) {
        const messageConfig = errorMessages[result.error.message] ?? {
          id: 'teams.members.add.error',
          defaultMessage: 'Failed to add member!',
        };
        message.error(intl.formatMessage(messageConfig));
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
      title={<FormattedMessage id='teams.members.add.title' defaultMessage='Add Team Member' />}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
    >
      <Form ref={formRef} layout='vertical'>
        <Form.Item
          name='email'
          label={<FormattedMessage id='teams.members.email' defaultMessage='Email' />}
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id='teams.members.email.required'
                  defaultMessage='Please enter an email address!'
                />
              ),
            },
            {
              type: 'email',
              message: (
                <FormattedMessage
                  id='teams.members.email.invalid'
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
