import { FormattedMessage } from '@umijs/max';
import { Result } from 'antd';

type AccessDeniedProps = {
  titleId?: string;
  titleDefaultMessage?: string;
  messageId?: string;
  messageDefaultMessage?: string;
};

export default function AccessDenied({
  titleId = 'pages.accessDenied.title',
  titleDefaultMessage = '403',
  messageId = 'pages.accessDenied.message',
  messageDefaultMessage = 'You do not have permission to access this page.',
}: AccessDeniedProps) {
  return (
    <div data-testid='access-denied'>
      <Result
        status='403'
        title={<FormattedMessage id={titleId} defaultMessage={titleDefaultMessage} />}
        subTitle={<FormattedMessage id={messageId} defaultMessage={messageDefaultMessage} />}
      />
    </div>
  );
}
