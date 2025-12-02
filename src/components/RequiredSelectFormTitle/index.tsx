import { RefCheckType } from '@/contexts/refCheckContext';
import { Form, theme } from 'antd';
import { ReactNode } from 'react';
import { FormattedMessage } from 'umi';

type RequiredSelectFormTitleProps = {
  label: ReactNode;
  ruleErrorState: boolean;
  requiredRules: any[];
  errRef?: any;
};

export const ErrRefTipMessage = ({ errRef }: { errRef: RefCheckType }) => {
  if (errRef?.ruleVerification === false) {
    return (
      <FormattedMessage id='pages.select.unRuleVerification' defaultMessage='Data is incomplete' />
    );
  }
  if (errRef?.nonExistent === true) {
    return (
      <FormattedMessage id='pages.select.nonExistentRef' defaultMessage='Data does not exist' />
    );
  }
  const isUnderReviewState =
    errRef?.stateCode !== undefined && errRef?.stateCode >= 20 && errRef?.stateCode < 100;
  const hasSameVersionUnderReview =
    errRef?.underReviewVersion !== undefined &&
    errRef?.version !== undefined &&
    errRef?.underReviewVersion === errRef?.version;

  if (isUnderReviewState || hasSameVersionUnderReview) {
    return <FormattedMessage id='pages.select.underReview' defaultMessage='Under review' />;
  } else if (errRef?.versionUnderReview === true) {
    return (
      <FormattedMessage
        id='pages.select.versionUnderReview'
        defaultMessage='The current dataset already has version {underReviewVersion} under review. Your version {currentVersion} cannot be submitted.'
        values={{
          underReviewVersion: errRef?.underReviewVersion,
          currentVersion: errRef?.version,
        }}
      />
    );
  }

  if (errRef?.versionIsInTg === true) {
    return (
      <FormattedMessage
        id='pages.select.versionIsInTg'
        defaultMessage='The current dataset version is lower than the published version. Please create a new version based on the latest published version for corrections and updates, then submit for review.'
      />
    );
  }
  return <></>;
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
          {!ruleErrorState && errRef && (
            <span style={{ color: token.colorError, marginLeft: '5px', fontWeight: 'normal' }}>
              <ErrRefTipMessage errRef={errRef} />
            </span>
          )}
        </label>
      </span>
    </Form.Item>
  );
};

export default RequiredSelectFormTitle;
