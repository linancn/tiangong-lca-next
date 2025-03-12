import { Form, } from 'antd';
import { FormattedMessage } from 'umi';

const RequiredMark = ({ id, defaultMessage }: { id: string, defaultMessage: string }) => {
    return (
        <Form.Item style={{ display: 'inline' }} required>
            <span className="ant-form-item-label">
                <label className="ant-form-item-required">
                    <FormattedMessage
                        id={id}
                        defaultMessage={defaultMessage}
                    />
                </label>
            </span>

        </Form.Item>
    );
};

export default RequiredMark;