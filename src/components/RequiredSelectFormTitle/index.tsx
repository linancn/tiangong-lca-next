import { Form } from 'antd';
import { ReactNode } from 'react';

type RequiredSelectFormTitleProps = {
  label: ReactNode;
  ruleErrorState: boolean;
  requiredRules: any[];
};

const RequiredSelectFormTitle = ({
  label,
  ruleErrorState,
  requiredRules,
}: RequiredSelectFormTitleProps) => {
  return (
    <Form.Item style={{ display: 'inline' }} required>
      <span className='ant-form-item-label'>
        <label className='ant-form-item-required'>
          {label}
          {ruleErrorState &&
            requiredRules.map((rule: any, index: number) => {
              return (
                <span
                  key={index}
                  className='ant-form-item-explain-error'
                  style={{ fontWeight: 'normal', marginLeft: '5px' }}
                >
                  {rule.message}
                </span>
              );
            })}
        </label>
      </span>
    </Form.Item>
  );
};

export default RequiredSelectFormTitle;
