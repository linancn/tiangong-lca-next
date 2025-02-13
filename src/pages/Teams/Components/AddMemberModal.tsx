import { Modal, Form, Input, message } from 'antd';
import { useIntl } from '@umijs/max';
import { useState } from 'react';
import { addTeamMemberApi } from '@/services/teams/api';

interface AddMemberModalProps {
    open: boolean;
    onCancel: () => void;
    teamId: string | null;
    onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
    open,
    onCancel,
    teamId,
    onSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const intl = useIntl();

    const handleOk = async () => {

        try {
            const values = await form.validateFields();
            if (!teamId) return;

            setLoading(true);
            const { error } = await addTeamMemberApi(teamId, values.email);

            if (error) {
                console.log('添加成员失败', error)
                if (error.message === 'exists') {
                    message.error(
                        intl.formatMessage({
                            id: 'teams.members.add.exists',
                            defaultMessage: '该用户已在团队中！'
                        })
                    );
                } else {
                    message.error(
                        intl.formatMessage({
                            id: 'teams.members.add.error',
                            defaultMessage: '添加成员失败！'
                        })
                    );
                }
            } else {
                message.success(
                    intl.formatMessage({
                        id: 'teams.members.add.success',
                        defaultMessage: '添加成员成功！'
                    })
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
            title={intl.formatMessage({
                id: 'teams.members.add.title',
                defaultMessage: '添加团队成员'
            })}
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            confirmLoading={loading}
        >
            <Form form={form} layout="vertical">
                <Form.Item
                    name="email"
                    label={intl.formatMessage({
                        id: 'teams.members.email',
                        defaultMessage: '邮箱'
                    })}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({
                                id: 'teams.members.email.required',
                                defaultMessage: '请输入邮箱！'
                            })
                        },
                        {
                            type: 'email',
                            message: intl.formatMessage({
                                id: 'teams.members.email.invalid',
                                defaultMessage: '请输入有效的邮箱地址！'
                            })
                        }
                    ]}
                >
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddMemberModal; 