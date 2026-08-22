import { RefCheckType } from '@/contexts/refCheckContext';
import { theme } from 'antd';
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
      <FormattedMessage
        id='pages.select.unRuleVerification'
        defaultMessage='Data validation failed'
      />
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
    return <FormattedMessage id='pages.select.underReview' defaultMessage='Data is under review' />;
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
    <span style={{ display: 'inline' }}>
      <span aria-hidden style={{ color: token.colorError, marginRight: 4 }}>
        *
      </span>
      {label}
      {ruleErrorState &&
        requiredRules.map((rule: any, index: number) => {
          return (
            <span
              key={index}
              role='alert'
              style={{ color: token.colorError, fontWeight: 'normal', marginLeft: 5 }}
            >
              {rule.message}
            </span>
          );
        })}
      {!ruleErrorState && errRef && (
        <span role='alert' style={{ color: token.colorError, marginLeft: 5, fontWeight: 'normal' }}>
          <ErrRefTipMessage errRef={errRef} />
        </span>
      )}
    </span>
  );
};

export default RequiredSelectFormTitle;
