import { Form } from 'antd';
import { ReactNode } from 'react';
import { FormattedMessage } from 'umi';
interface IProps  { label:ReactNode,errorLabel?:ReactNode,showError:boolean }

const RequiredMark = ({ label,errorLabel,showError=false }: IProps) => {
  return (
    <Form.Item style={{ display: 'inline' }} required>
      <span className="ant-form-item-label">
        <label className="ant-form-item-required">
          {label}
          {
            showError && (
              <span className='ant-form-item-explain-error' style={{ fontWeight:'normal',marginLeft:'5px' }}>
                {errorLabel?errorLabel:<FormattedMessage id="validator.lang.mustBeEnglish" defaultMessage="English is a required language!" />}
              </span>
            )
          }
        </label>
      </span>
   
    </Form.Item>
  );
};

export default RequiredMark;
