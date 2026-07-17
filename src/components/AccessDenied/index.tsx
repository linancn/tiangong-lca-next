import { FormattedMessage } from '@umijs/max';
import { Result } from 'antd';

export default function AccessDenied() {
  return (
    <div data-testid='access-denied'>
      <Result
        status='403'
        title={<FormattedMessage id='pages.accessDenied.title' defaultMessage='403' />}
        subTitle={
          <FormattedMessage
            id='pages.accessDenied.message'
            defaultMessage='You do not have permission to access this page.'
          />
        }
      />
    </div>
  );
}
