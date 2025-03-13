import { Form } from 'antd';
import { FormattedMessage } from 'umi';

interface IProps  { id: string; defaultMessage: string,errorId?:string,errorMessage?:string,showError?:boolean }

const RequiredMark = ({ id, defaultMessage,errorId='',errorMessage='',showError=false }: IProps) => {
  return (
    <Form.Item style={{ display: 'inline' }} required>
      <span className="ant-form-item-label">
        <label className="ant-form-item-required">
          <FormattedMessage id={id} defaultMessage={defaultMessage} />
          {
            showError&&errorId && errorMessage && (
              <span className='ant-form-item-explain-error' style={{ fontWeight:'normal',marginLeft:'5px' }}>
                <FormattedMessage id={errorId} defaultMessage={errorMessage} />
              </span>
            )
          }
        </label>
      </span>
   
    </Form.Item>
  );
};

export default RequiredMark;
