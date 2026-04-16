import { FormattedMessage } from '@umijs/max';

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
      <h3>
        <FormattedMessage id={titleId} defaultMessage={titleDefaultMessage} />
      </h3>
      <p>
        <FormattedMessage id={messageId} defaultMessage={messageDefaultMessage} />
      </p>
    </div>
  );
}
