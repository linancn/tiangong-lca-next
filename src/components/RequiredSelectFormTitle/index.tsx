import { Form, theme } from 'antd';
import { ReactNode } from 'react';
import { FormattedMessage } from 'umi';

type RequiredSelectFormTitleProps = {
  label: ReactNode;
  ruleErrorState: boolean;
  requiredRules: any[];
  errRef?: any;
};

const RequiredSelectFormTitle = ({
  label,
  ruleErrorState,
  requiredRules,
  errRef,
}: RequiredSelectFormTitleProps) => {
  const { token } = theme.useToken();

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
          {errRef && (
            <span style={{ color: token.colorError, marginLeft: '5px', fontWeight: 'normal' }}>
              {errRef?.type === 1 ? (
                <FormattedMessage
                  id='pages.select.unRuleVerification'
                  defaultMessage='Data is incomplete'
                />
              ) : errRef?.type === 2 ? (
                <FormattedMessage
                  id='pages.select.nonExistentRef'
                  defaultMessage='Data does not exist'
                />
              ) : (
                ''
              )}
            </span>
          )}
        </label>
      </span>
    </Form.Item>
  );
};

export default RequiredSelectFormTitle;
