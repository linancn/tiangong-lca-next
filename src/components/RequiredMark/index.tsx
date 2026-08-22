import { theme } from 'antd';
import { ReactNode } from 'react';
import { FormattedMessage } from 'umi';
interface IProps {
  label: ReactNode;
  errorLabel?: ReactNode;
  showError: boolean;
}

const RequiredMark = ({ label, errorLabel, showError = false }: IProps) => {
  const { token } = theme.useToken();
  return (
    <span style={{ display: 'inline' }}>
      <span aria-hidden style={{ color: token.colorError, marginRight: 4 }}>
        *
      </span>
      {label}
      {showError && (
        <span role='alert' style={{ color: token.colorError, fontWeight: 'normal', marginLeft: 5 }}>
          {errorLabel ? (
            errorLabel
          ) : (
            <FormattedMessage
              id='validator.lang.mustBeEnglish'
              defaultMessage='English is a required language'
            />
          )}
        </span>
      )}
    </span>
  );
};

export default RequiredMark;
