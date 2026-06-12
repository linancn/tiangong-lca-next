import { Form, Input } from 'antd';
import type { ReactNode } from 'react';
import { useIntl } from 'umi';

type DatasetCreateVersionFormItemProps = {
  children: ReactNode;
  createVersion?: boolean;
  label: ReactNode;
  name: (string | number)[];
  rules?: unknown[];
};

const NOTICE_MESSAGE_ID = 'pages.createVersion.versionAutoAllocationNotice';
const NOTICE_DEFAULT_MESSAGE = 'The new version will be generated automatically.';

export default function DatasetCreateVersionFormItem({
  children,
  createVersion,
  label,
  name,
  rules,
}: DatasetCreateVersionFormItemProps) {
  const intl = useIntl();

  if (!createVersion) {
    return (
      <Form.Item required={false} label={label} name={name} rules={rules as any[] | undefined}>
        {children}
      </Form.Item>
    );
  }

  const message = intl.formatMessage({
    id: NOTICE_MESSAGE_ID,
    defaultMessage: NOTICE_DEFAULT_MESSAGE,
  });

  return (
    <>
      <Form.Item hidden name={name} rules={rules as any[] | undefined}>
        <Input type='hidden' />
      </Form.Item>
      <Form.Item required={false} label={label}>
        <Input
          data-testid='dataset-create-version-auto-message'
          disabled
          readOnly
          value={message}
        />
      </Form.Item>
    </>
  );
}
